/** Investigation-only virtual Product entry. These deterministic probes are not registered tests or Cases.
 * Synchronous observation barriers are safety instrumentation, absent from plain timing builds.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { probeRootContainedPath, readRegularFile as experimentalReadRegularFile } from "./filesystem-probes.ts";
import { createProbeSession, closeProbeSession } from "mdlink-probe-experiment";
import { executeMarkdownLinkValidation } from "./execution.ts";
import { execute, MARKDOWN_LINK_OPTIONS } from "./constructor.test-support.ts";
import { createdResolver, readSource, requestFor } from "./local-resolver.test-support.ts";

declare const __BATCH_VARIANT__: string;
declare const __IO_VARIANT__: string;
const __IO_DEPTH__ = Number(process.argv[2] ?? 30);
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "mdlink-io-safety-"));
const root = path.join(workspace, "root"), outside = path.join(workspace, "outside");
fs.mkdirSync(root); fs.mkdirSync(outside);
assert.ok(Number.isInteger(__IO_DEPTH__) && __IO_DEPTH__ >= 1);
// Depth counts path components relative to the canonical project root, including the leaf.
const deep = Array.from({ length: __IO_DEPTH__ - 1 }, () => "d").join("/");
const deepSource = path.posix.join(deep, "source.md"), deepRead = path.posix.join(deep, "read.md");
const cancellableRead = ["reader-direct", "reader-worker", "combined"].includes(__IO_VARIANT__);
const cases: any[] = [], readChainCases: any[] = [], cancellations: any[] = [], collectionCancellations: any[] = [], readChainCancellations: any[] = [], responsiveness: any[] = [];
let trace: any[] = [], action: ((event: any) => any) | undefined, handles = 0;
const normalize = (p: string) => p.replaceAll(workspace, "$W");
const normalized = (value: any) => JSON.parse(JSON.stringify(value).replaceAll(workspace, "$W"));
const reset = () => { trace = []; action = undefined; (globalThis as any).__batchOptions = {}; };
const write = (p: string, body = "# Target\n") => {
  const file = path.join(root, p); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body); return file;
};
const save = (name: string, result: any) => cases.push({ name, result: normalized(result), trace: [...trace] });
const saveRead = (name: string, result: any) => readChainCases.push({ name, result: normalized(result), trace: [...trace] });
const observe = (event: any) => {
  const item = { ...event, path: normalize(event.path) };
  // Only serializable operation facts are retained, never native handles or raw buffers.
  delete item.value;
  trace.push(item);
  if (event.stage === "after" && event.op === "open") handles++;
  if (event.stage === "after" && event.op === "close") {
    assert.equal(event.closed, true, "after close must observe an already closed native handle");
    handles--;
    assert.ok(handles >= 0, "close cannot exceed successful open");
  }
  return action?.(event);
};
(globalThis as any).__batchObserve = observe;
const options = { ...MARKDOWN_LINK_OPTIONS, limits: { ...MARKDOWN_LINK_OPTIONS.limits, maxOccurrences: false, maxTargetReads: false } };
const after = (op: string) => trace.filter(t => t.stage === "after" && t.op === op);
const before = (op: string) => trace.filter(t => t.stage === "before" && t.op === op);
const visibleRead = (value: any) => value.ok ? { ok: true, bytes: value.bytes.length } : value;
const assertClosed = (count: number) => {
  assert.equal(after("open").length, count);
  assert.equal(before("close").length, count);
  assert.equal(after("close").length, count);
  assert.equal(handles, 0);
};
async function probe(relative: string, signal = new AbortController().signal) {
  const session = createProbeSession(signal);
  try { return await probeRootContainedPath(root, path.join(root, relative), signal, session); }
  finally { await closeProbeSession(session); }
}
async function readFile(file: string, limit: number, signal = new AbortController().signal) {
  const session = createProbeSession(signal);
  try { return await experimentalReadRegularFile(file, limit, signal, session); }
  finally { await closeProbeSession(session); }
}
function assertCancelled(checked: any) {
  assert.equal(checked.result.status, "unavailable");
  assert.equal(checked.result.reason.code, "cancelled");
  assert.equal(checked.records.length, 0);
  assert.equal("data" in checked.result, false);
}
function assertNoNewIo(at: number, required = true) {
  const newOperations = trace.slice(at).filter(t => t.stage === "before" && ["lstat", "readlink", "open", "fstat", "read"].includes(t.op));
  if (required) assert.equal(newOperations.length, 0, "cancelled work must not start another operation except close");
  return newOperations.length;
}
try {
  // The preceding investigation's 24 common behavioral cases retain their inputs and outcomes.
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
  reset(); action = e => { if (e.stage === "before" && e.op === "lstat" && e.path.endsWith("a.md")) throw Object.assign(Error("injected"), { code: "EACCES" }); };
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
  action = e => { if (e.stage === "after" && e.op === "lstat" && e.path === path.join(root, "victim.md")) {
    fs.rmSync(e.path); fs.symlinkSync(path.join(outside, "secret.md"), e.path);
  } };
  const replaced = await execute(executeMarkdownLinkValidation, options, root, { patterns: ["victim.md"] });
  assert.equal(replaced.result.status, "unavailable"); assert.equal(replaced.records.length, 0);
  assert.ok(before("open").some(t => (t.flags & fs.constants.O_NOFOLLOW) !== 0)); save("no-follow-final-leaf", replaced);
  write("growing.md", "x".repeat(16)); reset();
  action = e => { if (e.stage === "after" && e.op === "fstat" && e.path.endsWith("growing.md")) fs.appendFileSync(e.path, "x".repeat(64)); };
  const grew = await readFile(path.join(root, "growing.md"), 32); assert.deepEqual(grew, { ok: false, reason: "too-large" });
  assert.equal(after("read").reduce((n, t) => n + t.returned, 0), 33); assertClosed(1);
  const growthTrace = [...trace]; cases.push({ name: "growth-bounded-max-plus-one", result: grew, returned: 33 });
  for (const [name, body, limit, reason] of [["empty", "", 32, undefined], ["exact-limit", "x".repeat(32), 32, undefined],
    ["over-limit", "x".repeat(33), 32, "too-large"]] as const) {
    write("bounded.md", body); reset(); const r = await readFile(path.join(root, "bounded.md"), limit);
    assert.equal(r.ok, reason === undefined); if (!r.ok) assert.equal(r.reason, reason); else assert.equal(r.bytes.length, body.length);
    assertClosed(1); cases.push({ name, result: visibleRead(r) });
  }
  assert.equal(cases.length, 24);

  const body = "short reads must continue to EOF\n", deepFile = write(deepRead, body);
  reset(); action = e => e.stage === "before" && e.op === "read" ? { readLimit: 3 } : undefined;
  const short = await readFile(deepFile, 128);
  assert.equal(short.ok, true); if (short.ok) assert.equal(Buffer.from(short.bytes).toString("utf8"), body);
  assert.ok(after("read").length > 2); assert.equal(after("read").at(-1)?.returned, 0);
  assert.equal(after("read").reduce((n, t) => n + t.returned, 0), Buffer.byteLength(body));
  assert.ok(after("read").every(t => t.requested <= 3)); assertClosed(1); saveRead("short-reads-reach-eof", visibleRead(short));

  reset(); const nonregular = await readFile(path.join(root, "directory"), 32);
  assert.deepEqual(nonregular, { ok: false, reason: "unavailable" }); assert.equal(before("fstat").length, 1); assert.equal(before("read").length, 0); assertClosed(1);
  saveRead("fstat-nonregular-no-read", nonregular);
  write("oversize.md", "x".repeat(33)); reset(); const oversize = await readFile(path.join(root, "oversize.md"), 32);
  assert.deepEqual(oversize, { ok: false, reason: "too-large" }); assert.equal(before("read").length, 0); assertClosed(1); saveRead("fstat-oversize-no-read", oversize);

  for (const op of ["open", "fstat", "read"] as const) {
    reset(); action = e => { if (e.stage === "before" && e.op === op) throw Object.assign(Error("injected"), { code: op === "open" ? "EACCES" : "EIO" }); };
    const result = await readFile(deepFile, 128);
    assert.deepEqual(result, { ok: false, reason: "unavailable" }); assert.equal(after(op).length, 0); assertClosed(op === "open" ? 0 : 1);
    saveRead(`injected-${op}-error`, result);
  }
  // Closing errors retain the prior best-effort close semantics, but never prevent native close.
  reset(); action = e => { if (e.stage === "after" && e.op === "close") throw Object.assign(Error("injected close failure"), { code: "EIO" }); };
  const closeError = await readFile(deepFile, 128);
  assert.equal(closeError.ok, true); if (closeError.ok) assert.equal(Buffer.from(closeError.bytes).toString("utf8"), body);
  assertClosed(1); saveRead("close-error-does-not-rewrite-success", visibleRead(closeError));
  reset(); action = e => { if (e.stage === "after" && e.op === "close") throw Object.assign(Error("injected close failure"), { code: "EIO" }); };
  const closeAfterReject = await readFile(path.join(root, "oversize.md"), 32);
  assert.deepEqual(closeAfterReject, { ok: false, reason: "too-large" }); assertClosed(1); saveRead("close-error-does-not-rewrite-rejection", closeAfterReject);

  for (const owner of ["source", "target"] as const) for (const op of ["open", "fstat", "read"] as const) {
    write(deepSource, "# Source\n[x](read.md#target)\n"); write(deepRead, "# Target\n"); reset(); let injected = 0;
    const rejected = path.join(root, owner === "source" ? deepSource : deepRead);
    action = e => { if (e.stage === "before" && e.op === op && e.path === rejected) {
      injected++; throw Object.assign(Error("injected read-chain failure"), { code: "EIO" });
    } };
    const checked = await execute(executeMarkdownLinkValidation, options, root, { patterns: [deepSource] });
    assert.equal(injected, 1); assert.equal(checked.result.status, "unavailable"); assert.equal(checked.records.length, 0); assert.equal("data" in checked.result, false);
    assert.equal((checked.result as any).reason.code, owner === "source" ? "source-unavailable" : "target-unavailable");
    assertClosed(after("open").length); saveRead(`check-${owner}-${op}-error-no-partial-output`, checked);
  }

  // Probe cancellation retains the prior source / target / symlink observations at the configured source depth.
  write(deepSource, "# Source\n");
  for (const phase of ["source", "target", "symlink"] as const) {
    reset(); const controller = new AbortController(); let armed = false, at = 0;
    write("source.md", phase === "target" ? "[x](ordinary/a.md#target)\n" : "[x](inside/a.md#target)\n");
    action = e => {
      const sourceComponent = __IO_DEPTH__ === 1 ? path.join(root, deepSource) : path.join(root, ...Array.from({ length: Math.min(2, __IO_DEPTH__ - 1) }, () => "d"));
      const match = phase === "source" ? e.op === "lstat" && e.path === sourceComponent :
        phase === "target" ? e.op === "lstat" && e.path === path.join(root, "ordinary") : e.op === "readlink";
      if (!armed && e.stage === "after" && match) { armed = true; controller.abort(); at = trace.length; }
    };
    const checked = await execute(executeMarkdownLinkValidation, options, root, { patterns: [phase === "source" ? deepSource : "source.md"] }, controller.signal);
    assert.ok(armed); assertCancelled(checked);
    cancellations.push({ phase, newOperationsAfterAbort: assertNoNewIo(at), checked: normalized(checked) });
  }
  for (const trigger of ["timer", "io"] as const) {
    reset(); write("edges-source.md", "# Source\n");
    const controller = new AbortController(), r = await createdResolver(root, false, { enabled: false }, controller.signal);
    try {
      const s = await readSource(r, "edges-source.md"); let delivered = false;
      const pending = trigger === "timer" ? new Promise<void>(resolve => setTimeout(() => { controller.abort(); delivered = true; resolve(); }, 0)) :
        fsp.readFile(path.join(root, "edges-source.md")).then(() => { controller.abort(); delivered = true; });
      const result = await r.resolveAll(Array.from({ length: 8000 }, () => requestFor(s, "#source"))); await pending;
      assert.ok(delivered); assert.equal((result as any).kind, "unavailable"); assert.equal((result as any).reason, "target-unavailable");
      cancellations.push({ phase: "unhooked-8000-edges", trigger, delivered, result });
    } finally { await r.finalize(); }
  }
  assert.equal(cancellations.length, 5);

  // Collection is synchronous and has no AbortSignal contract. It may finish collection after abort,
  // but the next owner boundary must stop before source containment/body I/O and publication.
  for (const operation of ["lstat", "readdir"] as const) {
    reset(); const controller = new AbortController(), collectionTrace: any[] = []; let armed = false, at = 0;
    (globalThis as any).__collectionObserve = (event: any) => {
      collectionTrace.push({ ...event, path: normalize(event.path) });
      if (!armed && event.stage === "after" && event.op === operation) {
        armed = true; controller.abort(); at = collectionTrace.length;
      }
    };
    try {
      const checked = await execute(executeMarkdownLinkValidation, options, root, { patterns: [deepSource] }, controller.signal);
      assert.ok(armed, `real collection ${operation} observation must run`); assertCancelled(checked);
      assert.equal(trace.length, 0, "collection cancellation must not start source containment or file-body I/O");
      collectionCancellations.push({ phase: `collection-after-${operation}`, checked: normalized(checked), bodyProbeOperations: trace.length,
        collectionOperationsAfterAbort: collectionTrace.slice(at).filter(e => e.stage === "before").length, collectionTrace });
    } finally { (globalThis as any).__collectionObserve = undefined; }
  }
  assert.equal(collectionCancellations.length, 2);

  write(deepRead, body);
  for (const point of ["already-aborted", "before-open", "after-open", "after-fstat", "before-read", "after-read"] as const) {
    reset(); const controller = new AbortController(); let armed = point === "already-aborted", at = 0;
    if (armed) controller.abort();
    action = e => {
      if (!armed && point === `${e.stage}-${e.op}`) { armed = true; controller.abort(); at = trace.length; }
      if (e.stage === "before" && e.op === "read") return { readLimit: 3 };
    };
    const result = await readFile(deepFile, 128, controller.signal);
    assert.ok(armed);
    if (cancellableRead) {
      assert.deepEqual(result, { ok: false, reason: "unavailable" });
      assertClosed(point === "already-aborted" || point === "before-open" ? 0 : 1);
    } else {
      // Original async readers may finish the current node; their owner checks cancellation at the node boundary.
      if (result.ok) assert.equal(Buffer.from(result.bytes).toString("utf8"), body);
      else assert.equal(result.reason, "unavailable");
      assert.ok(after("open").length <= 1); assertClosed(after("open").length);
    }
    const newOperationsAfterAbort = assertNoNewIo(at, cancellableRead);
    readChainCancellations.push({ phase: point, result: visibleRead(result), stopNewOperationsRequired: cancellableRead, newOperationsAfterAbort, trace: [...trace] });
  }
  // Check-level cancellation must not turn a rejected read into a normal partial outcome.
  for (const owner of ["source", "target"] as const) for (const op of ["open", "fstat", "read"] as const) {
    reset(); const controller = new AbortController(); let armed = false, at = 0;
    const relative = owner === "source" ? deepSource : deepRead;
    write(deepSource, owner === "source" ? "# Source\n" : "# Source\n[x](read.md#target)\n");
    if (owner === "target") write(deepRead, "# Target\n");
    action = e => {
      if (!armed && e.stage === "after" && e.op === op && e.path === path.join(root, relative)) { armed = true; controller.abort(); at = trace.length; }
    };
    const checked = await execute(executeMarkdownLinkValidation, options, root, { patterns: [deepSource] }, controller.signal);
    assert.ok(armed, `read ${owner}/${op} injection must run`); assertCancelled(checked); assert.equal(handles, 0);
    readChainCancellations.push({ phase: `check-${owner}-${op}`, stopNewOperationsRequired: cancellableRead,
      newOperationsAfterAbort: assertNoNewIo(at, cancellableRead), checked: normalized(checked), trace: [...trace] });
  }
  if (__BATCH_VARIANT__.startsWith("worker-")) {
    reset(); (globalThis as any).__batchOptions = { fault: true };
    const checked = await execute(executeMarkdownLinkValidation, options, root, { patterns: ["source.md"] });
    assert.equal(checked.result.status, "unavailable"); assert.equal(checked.records.length, 0); assert.equal("data" in checked.result, false);
    readChainCases.push({ name: "worker-abnormal-probe-exit", result: checked.result });
  }
  if (["reader-worker", "combined"].includes(__IO_VARIANT__)) {
    reset(); (globalThis as any).__batchOptions = { fault: "read" };
    const checked = await execute(executeMarkdownLinkValidation, options, root, { patterns: [deepSource] });
    assert.equal(checked.result.status, "unavailable"); assert.equal(checked.records.length, 0); assert.equal("data" in checked.result, false);
    assert.equal(before("open").length, 0, "read-job exit is injected before native open");
    readChainCases.push({ name: "worker-abnormal-read-job-exit", result: checked.result });
  }

  // Mechanism demonstrations only: one controlled 100 ms blocking-host-operation surrogate, not a real slow disk.
  // There are no per-operation observation barriers and no elapsed-time pass/fail thresholds here.
  reset(); (globalThis as any).__batchObserve = undefined;
  write(deepRead, "# Target\n");
  for (const operation of ["probe", "read"] as const) for (const delay of [0, 100]) {
    (globalThis as any).__batchOptions = { slowMs: delay, ...(operation === "read" ? { slowOp: "read" } : {}) };
    const controller = new AbortController(), session = createProbeSession(controller.signal);
    let deliveredAt = 0, armedAt = 0, resolveTimer: () => void = () => undefined;
    const timer = new Promise<void>(resolve => { resolveTimer = resolve; });
    const arm = () => { if (armedAt) return; armedAt = performance.now(); setTimeout(() => { deliveredAt = performance.now(); controller.abort(); resolveTimer(); }, 5); };
    (globalThis as any).__batchSlowArmed = arm;
    if (!delay) arm();
    try {
      const result = operation === "probe" ? await probeRootContainedPath(root, path.join(root, deepSource), controller.signal, session) :
        await experimentalReadRegularFile(path.join(root, deepRead), 128, controller.signal, session);
      const returnedAt = performance.now(); await timer;
      responsiveness.push({ operation, surrogateDelayMs: delay, armedAt, deliveredAt, returnedAt, deliveryMs: deliveredAt - armedAt,
        result: operation === "read" ? visibleRead(result) : result });
    } finally { await closeProbeSession(session); (globalThis as any).__batchSlowArmed = undefined; }
  }
  assert.equal(handles, 0);
  const counters = (globalThis as any).__batchSnapshot();
  assert.equal(counters.workersStarted ?? 0, counters.workersExited ?? 0);
  process.stdout.write(JSON.stringify({ variant: __IO_VARIANT__, backend: __BATCH_VARIANT__, depth: __IO_DEPTH__, runtime: process.versions,
    cases, readChainCases, cancellations, collectionCancellations, readChainCancellations, growthTrace, responsiveness, counters, handlesAtEnd: handles }) + "\n");
} finally {
  (globalThis as any).__batchObserve = undefined; (globalThis as any).__collectionObserve = undefined; (globalThis as any).__batchSlowArmed = undefined;
  (globalThis as any).__batchOptions = {};
  fs.rmSync(workspace, { recursive: true, force: true });
}
