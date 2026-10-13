import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

// 只复核本报告的冻结材料；不导入产品、不创建 fixture、不采样。
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function record(value: unknown): Record<string, unknown> {
  assert.ok(isRecord(value), "Expected a JSON object");
  return value;
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function array(value: unknown): readonly unknown[] {
  assert.ok(isUnknownArray(value), "Expected a JSON array");
  return value;
}

function text(value: unknown): string {
  assert.ok(typeof value === "string" && value.length > 0, "Expected a nonempty string");
  return value;
}

function finite(value: unknown): number {
  assert.ok(typeof value === "number" && Number.isFinite(value), "Expected a finite number");
  return value;
}

function variant(value: unknown): "before" | "after" {
  assert.ok(value === "before" || value === "after", "Unexpected experiment variant");
  return value;
}

function workloadName(value: unknown): "shallow" | "bounded-deep" {
  assert.ok(value === "shallow" || value === "bounded-deep", "Unexpected workload");
  return value;
}

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function median(values: readonly number[]): number {
  assert.equal(values.length, 12, "Each median must use all 12 observations");
  const sorted = [...values].sort((left, right) => left - right);
  const lower = sorted[5];
  const upper = sorted[6];
  assert.ok(lower !== undefined && upper !== undefined);
  return (lower + upper) / 2;
}

const root = process.argv[2];
assert.ok(root !== undefined && root.length > 0, "Pass the managed resource directory");
const resourceRoot: string = root;
const experiment = process.argv[3];
const read = (name: string): Promise<Buffer> => readFile(path.join(resourceRoot, name));
async function json(name: string): Promise<unknown> {
  const value: unknown = JSON.parse((await read(name)).toString("utf8"));
  return value;
}

const rawBytes = await read("raw/node-measure.json");
const rawValue: unknown = JSON.parse(rawBytes.toString("utf8"));
const raw = record(rawValue);
const summary = record(await json("summary.json"));
assert.equal(sha(rawBytes), text(summary.rawSha256));
const samples = array(raw.samples).map((value) => {
  const sample = record(value);
  const pair = finite(sample.pair);
  const milliseconds = finite(sample.milliseconds);
  assert.ok(Number.isSafeInteger(pair) && pair >= 0 && pair < 12);
  assert.ok(milliseconds > 0);
  return {
    workload: workloadName(sample.workload),
    pair,
    variant: variant(sample.variant),
    milliseconds
  };
});
assert.equal(samples.length, 48);
const workloads = array(raw.workloads).map((value) => workloadName(record(value).name));
assert.deepEqual(workloads, ["shallow", "bounded-deep"]);
const summaries = array(summary.summary).map(record);
const fixtures = array(summary.fixtures).map(record);
assert.equal(summaries.length, 2);
assert.equal(fixtures.length, 2);
const recomputed = [];
for (const workload of workloads) {
  const before: number[] = [];
  const after: number[] = [];
  const deltas: number[] = [];
  for (let pair = 0; pair < 12; pair += 1) {
    const paired = samples.filter((sample) => sample.workload === workload && sample.pair === pair);
    assert.deepEqual(
      paired.map((sample) => sample.variant),
      pair % 2 === 0 ? ["before", "after"] : ["after", "before"]
    );
    const beforeSample = paired.find((sample) => sample.variant === "before");
    const afterSample = paired.find((sample) => sample.variant === "after");
    assert.ok(beforeSample !== undefined && afterSample !== undefined);
    before.push(beforeSample.milliseconds);
    after.push(afterSample.milliseconds);
    deltas.push((afterSample.milliseconds / beforeSample.milliseconds - 1) * 100);
  }
  const beforeMedian = median(before);
  const afterMedian = median(after);
  const item = {
    workload,
    beforeMedian,
    afterMedian,
    changePercent: (afterMedian / beforeMedian - 1) * 100,
    beforeMad: median(before.map((value) => Math.abs(value - beforeMedian))),
    afterMad: median(after.map((value) => Math.abs(value - afterMedian))),
    beforeRange: [Math.min(...before), Math.max(...before)],
    afterRange: [Math.min(...after), Math.max(...after)],
    pairedChangesPercent: deltas,
    pairedMedianChangePercent: median(deltas),
    pairsFaster: deltas.filter((value) => value < 0).length,
    pairsSlower: deltas.filter((value) => value > 0).length,
    beforeP95: Math.max(...before),
    afterP95: Math.max(...after)
  };
  const published = summaries.find((value) => workloadName(value.workload) === workload);
  assert.ok(published !== undefined);
  for (const [key, value] of Object.entries(item)) {
    const publishedValue: unknown = published[key];
    let parsed: string | number | number[];
    if (typeof value === "string") parsed = text(publishedValue);
    else if (typeof value === "number") parsed = finite(publishedValue);
    else parsed = array(publishedValue).map(finite);
    assert.deepEqual(value, parsed);
  }
  const fixture = fixtures.find((value) => workloadName(value.name) === workload);
  assert.ok(fixture !== undefined);
  assert.equal(
    sha(Buffer.from("# Source\n\n[target](target.md#target)\n")),
    text(fixture.sourceSha256)
  );
  assert.equal(sha(Buffer.from("# Target\n")), text(fixture.targetSha256));
  assert.equal(finite(fixture.sourceBytes), 37);
  recomputed.push(item);
}

const trace = record(await json("raw/node-trace-parity.json"));
const evidence = array(trace.evidence).map(record);
assert.equal(evidence.length, 21);
const traces = [];
for (const item of evidence) {
  const name = text(item.name);
  assert.equal(item.parity, true);
  const observation = record(item.observation);
  const events = array(observation.events).map(text);
  const result = record(observation.result);
  const settlement = record(observation.settlement);
  assert.equal(finite(settlement.activeOperations), 0);
  let pending: string | null = null;
  let peak = 0;
  for (const event of events) {
    if (event.startsWith("start:")) {
      assert.equal(pending, null);
      pending = event.slice(6);
      peak = 1;
    } else {
      assert.ok(event.startsWith("end:"));
      assert.equal(event.slice(4), pending);
      pending = null;
    }
  }
  assert.equal(pending, null);
  assert.equal(finite(settlement.peakOperations), peak);
  if (name === "ordinary-file" || name === "depth-128") {
    assert.deepEqual(array(item.remainingArraySlotCopies).map(finite), [
      name === "ordinary-file" ? 3 : 8128,
      0
    ]);
  }
  if (name === "lexical-outside") assert.deepEqual(events, []);
  if (name === "symlink-external") {
    assert.ok(events.every((event) => !event.includes("/semantics/outside/")));
  }
  if (["exact-40-hops", "exceeds-40-hops", "symlink-loop"].includes(name)) {
    assert.equal(events.filter((event) => event.startsWith("start:readlink:")).length, 40);
  }
  traces.push({ name, result, eventCount: events.length, peak });
}

const hashes: Record<string, string> = {};
for (const name of [
  "methods/measured-harness.mts",
  "methods/typed-harness.mts",
  "methods/trace-harness.mts",
  "methods/io-trace.mts",
  "candidate.patch",
  "raw/node-measure.json"
]) {
  hashes[name] = sha(await read(name));
}
const identities = array(raw.identities).map(record);
assert.deepEqual(
  identities.map((identity) => variant(identity.variant)),
  ["before", "after"]
);
for (const identity of identities) {
  const source = `sources/${variant(identity.variant)}-filesystem-probes.ts`;
  const bundle = `node_modules/${variant(identity.variant)}/dist/index.js`;
  hashes[source] = sha(await read(source));
  assert.equal(hashes[source], text(identity.sourceSha256));
  if (experiment !== undefined) {
    hashes[bundle] = sha(await readFile(path.join(experiment, bundle)));
    assert.equal(hashes[bundle], text(identity.bundleSha256));
  }
}
if (experiment !== undefined) {
  hashes.originalCandidatePatch = sha(await readFile(path.join(experiment, "candidate.patch")));
  assert.equal(
    hashes.originalCandidatePatch,
    "a4a999b52760d4bf3e4ce559e36acd6007fc0dd77632b22016afb3322d43611e"
  );
}
assert.equal(
  hashes["methods/measured-harness.mts"],
  "b5d69864218094f8220d04f047852abedc8b3cff348ffae5d014991173143ea8"
);
assert.equal(
  hashes["methods/typed-harness.mts"],
  "b61024e63f609cc57c4a9851ae3bd83e44cbaba15dc3daa1f258dd0bf3d9e86b"
);
console.log(
  JSON.stringify(
    {
      auditAt: new Date().toISOString(),
      noMeasurementOrFixtureMutation: true,
      bundlesVerifiedFromOriginalExperiment: experiment !== undefined,
      hashes,
      recomputed,
      traces
    },
    null,
    2
  )
);
