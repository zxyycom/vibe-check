/** Serial public-Run comparison. No source writes, network, or shared worker between invocations.
 * Usage: bun run <this file> <owned built directory> <safety|performance|profiles>
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeConsumerFixture } from "./consumer-fixture.ts";

const [directory, phase] = process.argv.slice(2);
if (!directory || !["safety", "performance", "profiles"].includes(phase ?? "")) throw Error("Pass owned built directory and phase");
const output = path.resolve(directory);
const variants = ["fast", "reader-direct", "reader-worker", "collection-local", "collection-prefix", "combined"];
const depths = [10, 30, 60];
const hash = (b: string | Uint8Array) => createHash("sha256").update(b).digest("hex");
const read = (file: string) => JSON.parse(readFileSync(path.join(output, file), "utf8"));
const identities = read("io-experiment-identities.json");
function verify() {
  for (const [f, h] of Object.entries(identities.inputs)) assert.equal(hash(readFileSync(f)), h, "Input drift: " + f);
  for (const [f, h] of Object.entries(identities.methods)) assert.equal(hash(readFileSync(path.join(path.dirname(import.meta.filename), f))), h, "Method drift: " + f);
  for (const [f, h] of Object.entries(identities.bundles)) assert.equal(hash(readFileSync(path.join(output, f))), h, "Bundle drift: " + f);
}
verify();
const evidenceFile = "io-experiment-" + phase + ".json";
if (existsSync(path.join(output, evidenceFile))) throw Error("Use a fresh directory; retained evidence must not be overwritten");
const evidence: any = {
  startedAt: new Date().toISOString(), identitySha256: hash(readFileSync(path.join(output, "io-experiment-identities.json"))),
  driverSha256: hash(readFileSync(import.meta.filename)),
  environment: { bun: Bun.version, node: execFileSync("node", ["--version"], { encoding: "utf8" }).trim(),
    kernel: os.release(), cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length,
    head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() },
  baseline: "fast = retained worker-sync contained probe with native async regular-file reader",
  scope: "Virtual Product entry replacements; body reads remain after authorization/budget; one serial worker per resolver, creation/exit inside Run; no Product edits",
  samples: []
};
const save = () => writeFileSync(path.join(output, evidenceFile), JSON.stringify(evidence, null, 2) + "\n");
async function child(command: string[], timeoutMs = 180_000) {
  const p = Bun.spawn(command, { stdout: "pipe", stderr: "pipe" }); let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; p.kill(); }, timeoutMs);
  try {
    const [stdout, stderr, exitCode] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
    return { stdout, stderr, exitCode, timedOut };
  } finally { clearTimeout(timeout); }
}
if (phase === "safety") {
  for (const runtime of ["bun", "node"]) for (const variant of variants) {
    for (const depth of depths) {
      const result = await child([runtime, path.join(output, variant + "-safety-parent.mjs"), String(depth)]);
      evidence.samples.push({ runtime, variant, depth, kind: "safety", ...result,
        ...(result.exitCode === 0 ? { measured: JSON.parse(result.stdout.trim()) } : {}) }); save();
      assert.equal(result.exitCode, 0, result.stderr + result.stdout);
      console.log(JSON.stringify({ runtime, variant, phase, depth, passed: true }));
    }
    const result = await child(runtime === "bun" ? [runtime, "test", path.join(output, variant + "-regression-parent.test.mjs")] :
      [runtime, "--test", path.join(output, variant + "-regression-parent.test.mjs")]);
    evidence.samples.push({ runtime, variant, kind: "regression", ...result }); save();
    assert.equal(result.exitCode, 0, result.stderr + result.stdout);
  }
  // Compare independent observable results and access order, excluding deliberately stronger cancellation behavior.
  for (const runtime of ["bun", "node"]) for (const depth of depths) {
    const rows = evidence.samples.filter((s: any) => s.kind === "safety" && s.runtime === runtime && s.depth === depth);
    const normalized = (s: any) => ({ cases: s.measured.cases,
      readCases: s.measured.readChainCases.filter((c:any)=>c.name!=="worker-abnormal-read-job-exit"),
      collectionCancellations:s.measured.collectionCancellations });
    for (const s of rows) assert.deepEqual(normalized(s), normalized(rows[0]), `${runtime}/${depth}/${s.variant} safety result/trace drift`);
  }
  evidence.normalizedBehaviorAndTracesEqual = true;
} else {
  const safety = read("io-experiment-safety.json");
  assert.equal(safety.normalizedBehaviorAndTracesEqual, true); assert.equal(safety.identitySha256, evidence.identitySha256);
  evidence.timing = "New process per sample; one untimed cache warmup then public single-Check Run; import/generation/extraction excluded; worker creation, communication, close/exit included. No OS cache flush; host not exclusive.";
  if (phase === "performance") {
    evidence.fixtures = depths.map(depth => {
      const { sourceManifest, ...fixture } = makeConsumerFixture(path.join(output, `io-depth-${depth}.tgz`), 1824, depth, true);
      return { ...fixture, sourceManifestSha256: hash(JSON.stringify(sourceManifest)) };
    });
    const order = [0, 1, 5, 2, 4, 3];
    evidence.orders = Array.from({ length: 6 }, (_, round) => order.map(v => variants[(v + round) % variants.length])); save();
    for (let round = 0; round < 6; round++) for (let p = 0; p < depths.length; p++) {
      const depth = depths[(p + round) % depths.length]!;
      for (const variant of evidence.orders[round]) await sample("bun", depth, variant, "plain", round + 1);
    }
    for (let round = 0; round < 3; round++) for (const variant of evidence.orders[round]) await sample("node", 60, variant, "plain", round + 1);
  } else {
    const performanceEvidence = read("io-experiment-performance.json");
    assert.equal(performanceEvidence.identitySha256, evidence.identitySha256); evidence.fixtures = performanceEvidence.fixtures;
    for (const depth of depths) for (const variant of variants) await sample("bun", depth, variant, "profile", 1);
  }
}
verify(); evidence.finishedAt = new Date().toISOString(); save();

async function sample(runtime: string, depth: number, variant: string, mode: string, round: number) {
  const startedAt = new Date().toISOString(), loadBefore = os.loadavg();
  const result = await child([runtime, path.join(output, `${variant}-${mode}-parent.mjs`), path.join(output, `io-depth-${depth}.tgz`), "real", "1824", String(depth), "hit"]);
  assert.equal(result.exitCode, 0, result.stderr + result.stdout);
  const measured = JSON.parse(result.stdout.trim());
  assert.deepEqual(measured.outcome.data, { sourceFileCount: 1824, occurrenceCount: 1193, targetReadCount: 777, findingCount: 0, rejectedInputCount: 0 });
  assert.equal(measured.outcome.status, "passed");
  if (mode === "profile") {
    const c = measured.counters;
    assert.equal(c.lstatCalls, 1984 * depth);
    for (const key of ["openCalls", "fstatCalls", "closeCalls"]) assert.equal(c[key], 1856, key);
    assert.equal(c.fileHandleReadCalls, 3712); assert.equal(c.fileHandleReturnedBytes, 3320800);
    assert.equal(c.bufferAllocationBytes, 1946158912); assert.equal(c.readerLiveHandles, 0);
    assert.equal(c.workersStarted, 1); assert.equal(c.workersExited, 1); assert.equal(c.workerExitCodeSum, 0);
    assert.equal(c.workerRequests, ["reader-worker", "combined"].includes(variant) ? 3840 : 1984);
    assert.equal(c.listenerRegistrationFallbacks ?? 0, 0);
    assert.equal(measured.metrics["markdown-parser.ts:parseMarkdownLinkFacts"]?.calls ?? 0, 0);
    assert.equal(measured.metrics["source-traversal.ts:checkpoint"].calls, 1835);
    assert.equal(measured.metrics["resolver-engine.ts:#checkpoint"].calls, 307);
  }
  evidence.samples.push({ runtime, variant, mode, depth, round, startedAt, finishedAt: new Date().toISOString(), loadBefore, loadAfter: os.loadavg(), ...measured }); save();
  console.log(JSON.stringify({ runtime, variant, mode, depth, round, elapsedMs: measured.elapsedMs }));
}
