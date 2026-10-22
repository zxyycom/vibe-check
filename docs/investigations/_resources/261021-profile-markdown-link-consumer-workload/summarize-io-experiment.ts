/** Read-only reconstruction from retained inputs. Prints JSON; never rewrites evidence. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { unpackSafety } from "./retain-io-evidence.ts";
const [directory] = process.argv.slice(2);
if (!directory) throw Error("Pass evidence directory");
const bytes = (f: string) => readFileSync(path.join(f === "probe-batch-safety.json" ? path.dirname(import.meta.filename) : directory, f));
const read = (f: string) => JSON.parse(bytes(f).toString("utf8"));
const hash = (b: string | Uint8Array) => createHash("sha256").update(b).digest("hex");
const perf = read("io-experiment-performance.json"), safe = unpackSafety(read("io-experiment-safety.json")), prof = read("io-experiment-profiles.json");
if (safe.retention) assert.equal(safe.retention.methodSha256, hash(readFileSync(new URL("./retain-io-evidence.ts", import.meta.url))));
const identity = read("io-experiment-identities.json");
const identityHash = hash(readFileSync(path.join(directory, "io-experiment-identities.json")));
for (const e of [perf, safe, prof]) { assert.equal(e.identitySha256, identityHash); assert.ok(e.finishedAt); }
assert.equal(safe.normalizedBehaviorAndTracesEqual, true);
const variants = ["fast", "reader-direct", "reader-worker", "collection-local", "collection-prefix", "combined"], depths = [10, 30, 60];
for (const runtime of ["bun", "node"]) for (const depth of depths) {
  const rows = safe.samples.filter((s:any)=>s.kind==="safety"&&s.runtime===runtime&&s.depth===depth);
  assert.equal(rows.length,6);
  const shared=(s:any)=>({cases:s.measured.cases,readCases:s.measured.readChainCases.filter((c:any)=>c.name!=="worker-abnormal-read-job-exit"),collection:s.measured.collectionCancellations});
  for(const row of rows)assert.deepEqual(shared(row),shared(rows[0]),"Restored shared results/ordered traces differ");
}
const median = (v: number[]) => { const a = [...v].sort((a, b) => a - b), i = Math.floor(a.length / 2); return a.length % 2 ? a[i]! : (a[i - 1]! + a[i]!) / 2; };
const stats = (v: number[]) => { const m = median(v); return { n: v.length, median: m, min: Math.min(...v), max: Math.max(...v), mad: median(v.map(x => Math.abs(x - m))) }; };
const groups: any[] = [];
for (const runtime of ["bun", "node"]) for (const depth of runtime === "bun" ? depths : [60]) for (const variant of variants) {
  const rows = perf.samples.filter((s: any) => s.runtime === runtime && s.depth === depth && s.variant === variant);
  const baseline = perf.samples.filter((s: any) => s.runtime === runtime && s.depth === depth && s.variant === "fast");
  assert.equal(rows.length, runtime === "bun" ? 6 : 3);
  for (const s of rows) { assert.equal(s.mode, "plain"); assert.equal(s.outcome.status, "passed"); assert.deepEqual(s.outcome.data,
    { sourceFileCount: 1824, occurrenceCount: 1193, targetReadCount: 777, findingCount: 0, rejectedInputCount: 0 }); }
  const ratios = rows.map((s: any) => s.elapsedMs / baseline.find((b: any) => b.round === s.round).elapsedMs);
  groups.push({ runtime, depth, variant, elapsedMs: stats(rows.map((s: any) => s.elapsedMs)),
    pairedSavedFraction: stats(ratios.map((r: number) => 1 - r)), fasterPairs: ratios.filter((r: number) => r < 1).length,
    cpuMs: stats(rows.map((s: any) => (s.cpu.user + s.cpu.system) / 1000)), peakRssKiB: stats(rows.map((s: any) => s.maxRssKiB)) });
}
assert.equal(perf.samples.length, 126); assert.equal(prof.samples.length, 18);
const profiles = prof.samples.map((s: any) => {
  const c = s.counters, d = s.depth;
  assert.equal(c.lstatCalls, (1824 + 296 - 136) * d);
  for (const key of ["openCalls", "fstatCalls", "closeCalls"]) assert.equal(c[key], 1824 + 32);
  assert.equal(c.fileHandleReadCalls, 2 * (1824 + 32)); assert.equal(c.fileHandleReturnedBytes, 3320000 + 32 * 25);
  assert.equal(c.bufferAllocationBytes, 1856 * 1048577); assert.equal(c.readerLiveHandles, 0);
  assert.equal(c.workersStarted, 1); assert.equal(c.workersExited, 1); assert.equal(c.workerExitCodeSum, 0);
  assert.equal(c.workerRequests, ["reader-worker", "combined"].includes(s.variant) ? 1984 + 1856 : 1984);
  assert.equal(c.listenerRegistrationFallbacks ?? 0, 0);
  assert.equal(s.metrics["markdown-parser.ts:parseMarkdownLinkFacts"]?.calls ?? 0, 0);
  assert.equal(s.metrics["source-traversal.ts:checkpoint"].calls, 1835); assert.equal(s.metrics["resolver-engine.ts:#checkpoint"].calls, 307);
  assert.equal(c["collection.directory.misses"], c["collection.physical.readdirSync.calls"]);
  const baseline = prof.samples.find((b: any) => b.depth === d && b.variant === "fast").counters;
  for (const key of ["collection.physical.readdirSync.calls", "collection.physical.lstatSync.calls", "collection.selectedPaths", "collection.targetEntry.componentVisits"])
    assert.equal(c[key], baseline[key], `${s.variant}/${d}/${key}`);
  const calls = (k: string) => c["collection." + k] ?? 0;
  assert.equal(calls("noDemand.requests"), calls("noDemand.computations") + calls("noDemand.hits"));
  assert.equal(calls("prune.prefix.requests"), calls("prune.prefix.computations") + calls("prune.prefix.hits"));
  return { variant: s.variant, depth: d, elapsedMs: s.elapsedMs,
    readerMs: s.metrics["filesystem-probes.ts:readRegularFile"].inclusiveMs,
    collectionMs: s.metrics["collection.collectProjectFiles"].inclusiveMs,
    bodyReads: c.fileHandleReadCalls, bodyBytes: c.fileHandleReturnedBytes, containmentLstat: c.lstatCalls,
    collectionReaddir: calls("physical.readdirSync.calls"), collectionLstat: calls("physical.lstatSync.calls"),
    logicalComponentVisits: calls("targetEntry.componentVisits"), matcherCalls: calls("prune.matcherCalls"),
    prefixComputations: calls("prune.prefix.computations"), policyComputations: calls("noDemand.computations") };
});
const legacy = read("probe-batch-safety.json");
const common24 = (cases: any[]) => cases.slice(0, 24).map(({ name, result, returned }: any) => ({ name, result, ...(returned === undefined ? {} : { returned }) }));
const safety = safe.samples.filter((s: any) => s.kind === "safety").map((s: any) => {
  const m = s.measured;
  assert.equal(s.exitCode, 0); assert.equal(m.handlesAtEnd, 0); assert.equal(m.counters.readerLiveHandles ?? 0, 0);
  assert.equal(m.counters.workersStarted ?? 0, m.counters.workersExited ?? 0);
  assert.equal(m.cases.length, 24); assert.equal(m.readChainCases.length, ["reader-worker", "combined"].includes(s.variant) ? 16 : 15);
  assert.equal(m.cancellations.length, 5); assert.equal(m.readChainCancellations.length, 12); assert.equal(m.collectionCancellations.length, 2);
  assert.deepEqual(common24(m.cases), common24(legacy.samples.find((x: any) => x.kind === "safety" && x.runtime === s.runtime && x.variant === "worker-sync").measured.cases));
  for (const c of [...m.cancellations, ...m.readChainCancellations, ...m.collectionCancellations]) {
    if (c.checked) { assert.equal(c.checked.result.status, "unavailable"); assert.equal(c.checked.result.reason.code, "cancelled");
      assert.equal(c.checked.records.length, 0); assert.equal("data" in c.checked.result, false); }
    if (c.stopNewOperationsRequired) assert.equal(c.newOperationsAfterAbort, 0);
  }
  const cancel = (c:any) => ({ phase:c.phase, ...(c.trigger?{trigger:c.trigger}:{}),
    ...(c.newOperationsAfterAbort===undefined?{}:{newOperationsAfterAbort:c.newOperationsAfterAbort}),
    ...(c.stopNewOperationsRequired===undefined?{}:{stopNewOperationsRequired:c.stopNewOperationsRequired}),
    ...(c.checked?{status:c.checked.result.status,reason:c.checked.result.reason.code,records:c.checked.records.length,hasData:"data" in c.checked.result}:{}),
    ...(c.bodyProbeOperations===undefined?{}:{bodyProbeOperations:c.bodyProbeOperations,collectionOperationsAfterAbort:c.collectionOperationsAfterAbort}) });
  return { runtime: s.runtime, variant: s.variant, depth: s.depth, commonCases: 24, readChainCases: m.readChainCases.length,
    cancellations: m.cancellations.map(cancel), readChainCancellations: m.readChainCancellations.map(cancel),
    collectionCancellations: m.collectionCancellations.map(cancel),
    responsiveness: m.responsiveness.map((r:any)=>({operation:r.operation,surrogateDelayMs:r.surrogateDelayMs,deliveryMs:r.deliveryMs,waitAfterDeliveryMs:r.returnedAt-r.deliveredAt})),
    workersStarted: m.counters.workersStarted, workersExited: m.counters.workersExited, handlesAtEnd: m.handlesAtEnd };
});
assert.equal(safety.length, 36);
const regressions = safe.samples.filter((s: any) => s.kind === "regression").map((s: any) => {
  assert.equal(s.exitCode, 0); const log = s.stdout + "\n" + s.stderr;
  const n = s.regressionTests ?? Number((log.match(/(?:# tests |ℹ tests )(\d+)/u) ?? log.match(/(\d+) pass\b/u))?.[1]);
  assert.equal(n, 29); return { runtime: s.runtime, variant: s.variant, tests: n };
}); assert.equal(regressions.length, 12);
console.log(JSON.stringify({ scope: perf.scope, baseline: perf.baseline, startedAt: perf.startedAt, finishedAt: perf.finishedAt,
  allAssertionsPassed: true, plainSamples: perf.samples.length, profileSamples: profiles.length,
  safetyCombinations: safety.length, legacyCommon24ResultsEqual: true, groups, profiles, safety, regressions,
  bounds: "Profile timers are nested and instrumented, not additive/plain medians. Native operations remain non-preemptible. Synthetic depth and fixed bytes do not establish external root cause or slow-storage latency.",
  summaryMethodSha256: hash(readFileSync(import.meta.filename)), driverSha256: perf.driverSha256,
  evidenceSha256: Object.fromEntries(["io-experiment-identities.json", "io-experiment-performance.json", "io-experiment-profiles.json", "io-experiment-safety.json", "probe-batch-safety.json"].map(f => [f, hash(bytes(f))])),
  identities: { sourceInputCount: Object.keys(identity.inputs).length, methods: identity.methods }
}, null, 2));
