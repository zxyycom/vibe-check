/** Virtual Product measurement entry. Deterministic behavior probes are investigation evidence, not new registered tests.
 * Operation barriers are safety-only; responsiveness trials below deliberately disable them.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { probeRootContainedPath, readRegularFile } from "./filesystem-probes.ts";
import { createProbeSession, closeProbeSession } from "mdlink-probe-experiment";
import { executeMarkdownLinkValidation } from "./execution.ts";
import { execute, MARKDOWN_LINK_OPTIONS } from "./constructor.test-support.ts";
import { createdResolver, readSource, requestFor } from "./local-resolver.test-support.ts";

declare const __BATCH_VARIANT__: string;
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "mdlink-batch-safety-"));
const root = path.join(workspace, "root"), outside = path.join(workspace, "outside");
fs.mkdirSync(root); fs.mkdirSync(outside);
const cases: any[] = [], cancellations: any[] = [], responsiveness: any[] = [];
let trace: any[] = [], action: any, handles = 0;
const normalize = (p: string) => p.replaceAll(workspace, "$W");
const reset = () => { trace = []; action = undefined; (globalThis as any).__batchOptions = {}; };
const write = (p: string, body = "# Target\n") => { const file = path.join(root, p); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body); };
const save = (name: string, result: any) => cases.push({ name, result: JSON.parse(JSON.stringify(result).replaceAll(workspace, "$W")), trace: [...trace] });
(globalThis as any).__batchObserve = (event: any) => {
  if (event.stage === "before") trace.push({ op: event.op, path: normalize(event.path) });
  action?.(event);
};
(globalThis as any).__candidateObserve = async (op: string, p: string, args: any[], invoke: any) => {
  trace.push({ op, path: normalize(p), flags: args[0] });
  action?.({ stage: "before", op, path: p });
  const h = await invoke(); handles++;
  const read = h.read.bind(h), close = h.close.bind(h);
  h.read = async (...a: any[]) => { const r = await read(...a); trace.push({ op: "read", path: normalize(p), requested: a[2], returned: r.bytesRead }); return r; };
  h.close = async () => { try { return await close(); } finally { handles--; trace.push({ op: "close", path: normalize(p) }); } };
  action?.({ stage: "after", op, path: p, value: h });
  return h;
};
const options = { ...MARKDOWN_LINK_OPTIONS, limits: { ...MARKDOWN_LINK_OPTIONS.limits, maxOccurrences: false, maxTargetReads: false } };
async function probe(relative: string, signal = new AbortController().signal) {
  const session = createProbeSession(signal);
  try { return await probeRootContainedPath(root, path.join(root, relative), signal, session); }
  finally { await closeProbeSession(session); }
}
try {
  write("ordinary/a.md"); fs.mkdirSync(path.join(root, "directory"));
  fs.symlinkSync("ordinary", path.join(root, "inside")); fs.symlinkSync(root, path.join(root, "reset"));
  fs.writeFileSync(path.join(outside, "secret.md"), "# Outside\n");
  fs.symlinkSync(root, path.join(outside, "back")); fs.symlinkSync(outside, path.join(root, "escape"));
  fs.symlinkSync("loop", path.join(root, "loop"));
  for (let i = 0; i <= 40; i++) fs.symlinkSync(i === 40 ? "ordinary/a.md" : `hop-${i + 1}`, path.join(root, `hop-${i}`));
  for (const [p, kind] of [["ordinary/a.md", "contained"], ["directory", "contained"], ["", "contained"], ["missing/a.md", "missing"],
    ["ordinary/a.md/child", "unavailable"], ["inside/a.md", "contained"], ["reset/ordinary/a.md", "contained"],
    ["escape/secret.md", "outside"], ["escape/back/ordinary/a.md", "outside"], ["hop-1", "contained"], ["hop-0", "unavailable"], ["loop", "unavailable"]]) {
    reset(); const result = await probe(p!); assert.equal(result.kind, kind); save("probe:" + p, result);
    if (p!.startsWith("escape/")) assert.equal(trace.some(t => t.path.startsWith("$W/outside") || t.path.startsWith("$W/root/escape/")), false);
  }
  reset(); action = (e: any) => { if (e.stage === "before" && e.op === "lstat" && e.path.endsWith("a.md")) throw Object.assign(Error("injected"), { code: "EACCES" }); };
  const denied = await probe("ordinary/a.md"); assert.equal(denied.kind, "unavailable"); save("injected-permission-denied", denied);
  write("source.md", "# Source\n[x](escape/secret.md#outside)\n");
  for (const mode of ["ignore", "report", "validate"] as const) {
    reset(); const checked = await execute(executeMarkdownLinkValidation, { ...options, rootExternalTargetMode: mode }, root, { patterns: ["source.md"] });
    assert.equal(checked.result.status, mode === "report" ? "failed" : "passed");
    if (mode !== "validate") assert.equal(trace.some(t => t.path.startsWith("$W/outside") || t.path.startsWith("$W/root/escape/")), false);
    save("external-policy:" + mode, checked);
  }
  write("shared/a.md"); write("shared/b.md");
  const resolver = await createdResolver(root, 20); const source = await readSource(resolver, "source.md");
  try {
    reset(); const first = await resolver.resolve(requestFor(source, "shared/a.md")); assert.equal(first.kind, "valid"); save("prefix-first-node", first);
    fs.rmSync(path.join(root, "shared"), { recursive: true }); fs.symlinkSync(outside, path.join(root, "shared"));
    reset(); const second = await resolver.resolve(requestFor(source, "shared/b.md")); assert.equal((second as any).reason, "target-outside-project-root");
    assert.equal(trace.some(t => t.path.includes("shared/b.md")), false); save("prefix-replaced-new-node", second);
    reset(); assert.deepEqual(await resolver.resolve(requestFor(source, "shared/a.md")), first); assert.equal(trace.length, 0); save("same-node-fixed", first);
  } finally { await resolver.finalize(); }
  write("victim.md", "# Victim\n"); reset();
  action = (e: any) => { if (e.stage === "after" && e.op === "lstat" && e.path === path.join(root, "victim.md")) {
    fs.rmSync(e.path); fs.symlinkSync(path.join(outside, "secret.md"), e.path);
  } };
  const replaced = await execute(executeMarkdownLinkValidation, options, root, { patterns: ["victim.md"] });
  assert.equal(replaced.result.status, "unavailable"); assert.equal(replaced.records.length, 0);
  assert.ok(trace.some(t => t.op === "open" && (t.flags & fs.constants.O_NOFOLLOW) !== 0)); save("no-follow-final-leaf", replaced);
  write("growing.md", "x".repeat(16)); reset();
  action = (e: any) => { if (e.stage === "after" && e.op === "open" && e.path.endsWith("growing.md")) {
    const stat = e.value.stat.bind(e.value); e.value.stat = async () => { const old = await stat(); fs.appendFileSync(e.path, "x".repeat(64)); return old; };
  } };
  const grew = await readRegularFile(path.join(root, "growing.md"), 32); assert.deepEqual(grew, { ok: false, reason: "too-large" });
  assert.equal(trace.filter(t => t.op === "read").reduce((n, t) => n + t.returned, 0), 33);
  // Request capacities differ intentionally for adaptive; compare actual bound and result, retain its trace separately.
  const growthTrace = [...trace]; cases.push({ name: "growth-bounded-max-plus-one", result: grew, returned: 33 });
  for (const [name, body, limit, reason] of [["empty", "", 32, undefined], ["exact-limit", "x".repeat(32), 32, undefined],
    ["over-limit", "x".repeat(33), 32, "too-large"]] as const) {
    write("bounded.md", body); reset(); const r = await readRegularFile(path.join(root, "bounded.md"), limit);
    assert.equal(r.ok, reason === undefined); if (!r.ok) assert.equal(r.reason, reason); else assert.equal(r.bytes.length, body.length);
    cases.push({ name, result: r.ok ? { ok: true, bytes: r.bytes.length } : r });
  }
  const deep = Array.from({ length: 25 }, () => "d").join("/"); write(`${deep}/source.md`, "# Source\n");
  for (const phase of ["source", "target", "symlink"] as const) {
    reset(); const controller = new AbortController(); let armed = false, at = 0;
    write("source.md", phase === "target" ? "[x](ordinary/a.md#target)\n" : "[x](inside/a.md#target)\n");
    action = (e: any) => {
      const match = phase === "source" ? e.op === "lstat" && e.path === path.join(root, "d/d") :
        phase === "target" ? e.op === "lstat" && e.path === path.join(root, "ordinary") : e.op === "readlink";
      if (!armed && e.stage === "after" && match) { armed = true; controller.abort(); at = trace.length; }
    };
    const checked = await execute(executeMarkdownLinkValidation, options, root, { patterns: [phase === "source" ? `${deep}/source.md` : "source.md"] }, controller.signal);
    assert.ok(armed); assert.equal((checked.result as any).reason.code, "cancelled"); assert.equal(checked.records.length, 0); assert.equal("data" in checked.result, false);
    cancellations.push({ phase, newOperationsAfterAbort: trace.slice(at).filter(t => ["lstat", "readlink", "open", "read"].includes(t.op)).length, checked });
  }
  reset();
  for (const trigger of ["timer", "io"] as const) {
    const controller = new AbortController(); const r = await createdResolver(root, false, { enabled: false }, controller.signal);
    const s = await readSource(r, "source.md"); let abortAt = 0;
    const pending = trigger === "timer" ? new Promise<void>(resolve => setTimeout(() => { controller.abort(); abortAt = performance.now(); resolve(); }, 0)) :
      fsp.readFile(path.join(root, "source.md")).then(() => { controller.abort(); abortAt = performance.now(); });
    const result = await r.resolveAll(Array.from({ length: 8000 }, () => requestFor(s, "#source"))); await pending; await r.finalize();
    assert.equal((result as any).kind, "unavailable"); cancellations.push({ phase: "unhooked-8000-edges", trigger, abortAt, result });
  }
  // No per-operation observation barrier: compare main-thread response to one controlled 100 ms host operation.
  (globalThis as any).__batchObserve = undefined; (globalThis as any).__candidateObserve = undefined;
  for (const delay of [0, 100]) {
    (globalThis as any).__batchOptions = { slowMs: delay };
    const controller = new AbortController(), session = createProbeSession(controller.signal);
    let deliveredAt = 0, armedAt = 0, resolveTimer: any;
    const timer = new Promise<void>(resolve => { resolveTimer = resolve; });
    const arm = () => { if (armedAt) return; armedAt = performance.now(); setTimeout(() => { deliveredAt = performance.now(); controller.abort(); resolveTimer(); }, 5); };
    (globalThis as any).__batchSlowArmed = arm;
    if (!delay) arm();
    const result = await probeRootContainedPath(root, path.join(root, deep, "source.md"), controller.signal, session);
    const returnedAt = performance.now(); await timer; await closeProbeSession(session); (globalThis as any).__batchSlowArmed = undefined;
    responsiveness.push({ delayMs: delay, armedAt, deliveredAt, returnedAt, deliveryMs: deliveredAt - armedAt, result });
  }
  if (__BATCH_VARIANT__.startsWith("worker-")) {
    (globalThis as any).__batchOptions = { fault: true };
    const checked = await execute(executeMarkdownLinkValidation, options, root, { patterns: ["source.md"] });
    assert.equal(checked.result.status, "unavailable"); assert.equal(checked.records.length, 0); assert.equal("data" in checked.result, false);
    cases.push({ name: "worker-abnormal-exit", result: checked.result });
  }
  assert.equal(handles, 0);
  const counters = (globalThis as any).__batchSnapshot();
  assert.equal(counters.workersStarted ?? 0, counters.workersExited ?? 0);
  process.stdout.write(JSON.stringify({ variant: __BATCH_VARIANT__, runtime: process.versions, cases, cancellations, growthTrace,
    responsiveness, counters, handlesAtEnd: handles }) + "\n");
} finally { (globalThis as any).__batchObserve = undefined; (globalThis as any).__candidateObserve = undefined; fs.rmSync(workspace, { recursive: true, force: true }); }
