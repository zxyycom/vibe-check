/** Compact archival view, not another experiment. Deduplicate traces/scene arrays, drop duplicate
 * successful stdout, normalize ephemeral sandbox paths, and prove measured DTO round-trip equality.
 * Usage: bun run <this file> <owned experiment directory> <fresh destination JSON>
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const hash = (b: string | Uint8Array) => createHash("sha256").update(b).digest("hex");
const traceKeys = new Set(["trace", "growthTrace", "collectionTrace"]);
const sequenceKeys = new Set(["cases", "readChainCases", "cancellations", "readChainCancellations", "collectionCancellations"]);
const eventFields = ["stage", "op", "path", "flags", "size", "file", "requested", "returned", "closed"];
const normalize = (v: any): any => typeof v === "string" ? v.replace(/\/tmp\/mdlink-io-safety-[^/]+/gu, "$W") :
  Array.isArray(v) ? v.map(normalize) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, normalize(x)])) : v;

export function unpackSafety(archive: any): any {
  if (archive.archiveEncoding !== "mdlink-safety-interned-v1") return archive;
  function unpack(v: any): any {
    if (Array.isArray(v)) return v.map(unpack);
    if (!v || typeof v !== "object") return v;
    if ("$trace" in v) return archive.traces[v.$trace].map((tuple: any[]) => Object.fromEntries(tuple.flatMap((x, i) => x === null ? [] : [[eventFields[i],
      i === 0 ? archive.stages[x] : i === 1 ? archive.operations[x] : i === 2 ? archive.paths[x] : x]])));
    if ("$sequence" in v) return unpack(archive.sequences[v.$sequence]);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, unpack(x)]));
  }
  return { ...archive.metadata, retention: archive.retention, samples: archive.samples.map((s: any) => s.kind !== "safety" ? s :
    { ...s, measured: { ...unpack(s.measured), runtime: archive.runtimeVersions[s.runtime] } }) };
}

if (import.meta.main) {
  const [directory, destination] = process.argv.slice(2);
  if (!directory || !destination) throw Error("Pass owned experiment directory and fresh destination JSON");
  const raw = readFileSync(path.join(directory, "io-experiment-safety.json"));
  const original = JSON.parse(raw.toString("utf8")); assert.equal(original.normalizedBehaviorAndTracesEqual, true);
  const paths: string[] = [], operations: string[] = [], stages = ["before", "after"], traces: any[] = [], sequences: any[] = [];
  const pathIds = new Map<string, number>(), traceIds = new Map<string, number>(), sequenceIds = new Map<string, number>();
  function intern<T>(v: T, pool: T[], ids: Map<string, number>) {
    const key = JSON.stringify(v), old = ids.get(key); if (old !== undefined) return old;
    const i = pool.length; ids.set(key, i); pool.push(v); return i;
  }
  function event(e: any) {
    assert.ok(Object.keys(e).every(k => eventFields.includes(k)), "Unknown event field must not be discarded");
    const tuple = eventFields.map((k, i) => {
      const v = e[k]; if (v === undefined) return null; assert.notEqual(v, null);
      if (i === 0) { const n = stages.indexOf(v); assert.ok(n >= 0); return n; }
      if (i === 1) { let n = operations.indexOf(v); if (n < 0) { n = operations.length; operations.push(v); } return n; }
      if (i === 2) return intern(v, paths, pathIds); return v;
    });
    while (tuple.at(-1) === null) tuple.pop(); return tuple;
  }
  function pack(v: any, key = ""): any {
    if (Array.isArray(v)) {
      if (traceKeys.has(key)) return { $trace: intern(v.map(event), traces, traceIds) };
      const a = v.map(x => pack(x));
      return sequenceKeys.has(key) ? { $sequence: intern(a, sequences, sequenceIds) } : a;
    }
    return v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, pack(x, k)])) : v;
  }
  const runtimeVersions: any = {};
  const samples = original.samples.map((s: any) => {
    assert.equal(s.exitCode, 0); assert.equal(s.timedOut, false);
    const base = { runtime: s.runtime, variant: s.variant, ...(s.depth === undefined ? {} : { depth: s.depth }), kind: s.kind,
      exitCode: s.exitCode, timedOut: s.timedOut, stdoutSha256: hash(s.stdout), stderrSha256: hash(s.stderr) };
    if (s.kind === "regression") {
      const log = s.stdout + "\n" + s.stderr;
      const tests = Number((log.match(/(?:# tests |ℹ tests )(\d+)/u) ?? log.match(/(\d+) pass\b/u))?.[1]);
      assert.equal(tests, 29); return { ...base, regressionTests: tests };
    }
    assert.equal(s.stderr, ""); const dto = normalize(s.measured), { runtime, ...body } = dto;
    if (runtimeVersions[s.runtime]) assert.deepEqual(runtimeVersions[s.runtime], runtime); else runtimeVersions[s.runtime] = runtime;
    return { ...base, measured: pack(body) };
  });
  const { samples: _, ...metadata } = original;
  const archive = { archiveEncoding: "mdlink-safety-interned-v1", retention: {
    originalRawSha256: hash(raw), originalBytes: raw.byteLength, methodSha256: hash(readFileSync(import.meta.filename)),
    policy: "Measured DTOs retained exactly after ephemeral sandbox normalization. Ordered event tuples and scene arrays interned without semantic truncation. Successful duplicate stdout and regression success logs replaced by hashes/counts; full raw is temporary.",
    measuredRoundTripEqual: true }, metadata, eventFields, stages, operations, paths, traces, sequences, runtimeVersions, samples };
  const restored = unpackSafety(archive);
  for (let i = 0; i < original.samples.length; i++) if (original.samples[i].kind === "safety")
    assert.deepEqual(restored.samples[i].measured, normalize(original.samples[i].measured), "Measured DTO loss");
  // Keep dictionary/header fields readable; one row per shared trace/scene sequence prevents whitespace inflation.
  const text = "{\n" + Object.entries(archive).map(([key, value]) => "  " + JSON.stringify(key) + ": " +
    (["traces", "sequences"].includes(key) ? "[\n" + (value as any[]).map(v => "    " + JSON.stringify(v)).join(",\n") + "\n  ]" : JSON.stringify(value, null, 2).replaceAll("\n", "\n  "))).join(",\n") + "\n}\n";
  assert.ok(Buffer.byteLength(text) < 512 * 1024, "Archival view exceeds 512 KiB; reduce duplication, not validation limits");
  writeFileSync(destination, text, { flag: "wx" });
  console.log(JSON.stringify({ originalBytes: raw.byteLength, retainedBytes: Buffer.byteLength(text), samples: samples.length,
    sharedTraces: traces.length, sharedSequences: sequences.length, measuredRoundTripEqual: true }));
}
