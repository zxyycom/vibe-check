import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = import.meta.dirname;
const directory = resolve(root, "raw/formal");

function requireObject(value, label) {
  assert(
    value !== null && typeof value === "object" && !Array.isArray(value),
    `${label}: expected object`
  );
  return value;
}

function readObservation(file) {
  const fileIdentity =
    /^(node|bun)-(independent|chain)-(\d+)-p(\d+)-([0-3])-(before|candidate)\.json$/.exec(file);
  assert(fileIdentity, `${file}: expected a formal observation filename`);
  const [, runtime, shape, sizeText, parallelText, , side] = fileIdentity;
  const path = resolve(directory, file);
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (cause) {
    throw new Error(`${path}: cannot read observation JSON`, { cause });
  }
  const raw = requireObject(parsed, file);
  assert.equal(raw.shape, shape, `${file}: shape differs from filename`);
  assert.equal(raw.size, Number(sizeText), `${file}: size differs from filename`);
  assert.equal(raw.parallel, Number(parallelText), `${file}: parallel differs from filename`);
  assert(
    [raw.size, raw.parallel].every((value) => Number.isSafeInteger(value) && value > 0),
    `${file}: size/parallel must be positive safe integers`
  );
  assert.equal(raw.samples, 9, `${file}: expected 9 samples`);
  assert.equal(raw.warmups, 3, `${file}: expected 3 warmups`);
  assert(Array.isArray(raw.observations), `${file}: observations must be an array`);
  assert.equal(raw.observations.length, 12, `${file}: expected 12 observations`);
  for (const [index, value] of raw.observations.entries()) {
    const observation = requireObject(value, `${file}: observations[${index}]`);
    assert.equal(observation.index, index, `${file}: observation index mismatch`);
    assert.equal(observation.warmup, index < raw.warmups, `${file}: warmup marker mismatch`);
    assert(
      Number.isFinite(observation.wallMs) && observation.wallMs >= 0,
      `${file}: wallMs must be finite and nonnegative`
    );
  }
  const runtimeFacts = requireObject(raw.runtime, `${file}: runtime`);
  assert.equal(
    runtimeFacts.version,
    runtime === "node" ? "v24.18.0" : "v24.3.0",
    `${file}: runtime version mismatch`
  );
  if (runtime === "bun") {
    const versions = requireObject(runtimeFacts.versions, `${file}: runtime.versions`);
    assert.equal(versions.bun, "1.3.14", `${file}: Bun version mismatch`);
  }
  assert(
    typeof raw.sourceRoot === "string" && raw.sourceRoot.endsWith(`/${side}`),
    `${file}: sourceRoot differs from side`
  );
  for (const field of [
    "sourceManifestSha256",
    "scriptSha256",
    "signature",
    "snapshotDigest",
    "declarativeFingerprint"
  ]) {
    assert(
      typeof raw[field] === "string" && /^[a-f0-9]{64}$/.test(raw[field]),
      `${file}: ${field} must be SHA-256 hex`
    );
  }
  return { raw, runtime, side };
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  assert(sorted.length > 0, "median requires samples");
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function distribution(values) {
  const middle = median(values);
  return {
    median: middle,
    mad: median(values.map((value) => Math.abs(value - middle))),
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

const groups = new Map();
for (const file of readdirSync(directory)
  .filter((file) => file.endsWith(".json"))
  .sort()) {
  const { raw, runtime, side } = readObservation(file);
  const samples = raw.observations
    .filter((sample) => !sample.warmup)
    .map((sample) => sample.wallMs);
  const key = `${runtime}-${raw.shape}-${raw.size}-p${raw.parallel}`;
  const group = groups.get(key) ?? [];
  group.push({
    file,
    sourceManifestSha256: raw.sourceManifestSha256,
    scriptSha256: raw.scriptSha256,
    signature: raw.signature,
    snapshotDigest: raw.snapshotDigest,
    declarativeFingerprint: raw.declarativeFingerprint,
    side,
    ...distribution(samples),
    samples
  });
  groups.set(key, group);
}

const workloads = [];
for (const [key, processes] of groups) {
  assert.equal(processes.length, 4, `${key}: expected four ABBA processes`);
  assert.deepEqual(
    processes.map((process) => process.side),
    ["before", "candidate", "candidate", "before"],
    `${key}: expected ABBA order`
  );
  for (const field of ["scriptSha256", "signature", "snapshotDigest", "declarativeFingerprint"]) {
    assert.equal(
      new Set(processes.map((process) => process[field])).size,
      1,
      `${key}: ${field} differs`
    );
  }
  for (const side of ["before", "candidate"]) {
    const identities = processes
      .filter((process) => process.side === side)
      .map((process) => process.sourceManifestSha256);
    assert.equal(new Set(identities).size, 1, `${key}: ${side} source identity differs`);
  }
  const before = distribution(
    processes.filter((process) => process.side === "before").flatMap((process) => process.samples)
  );
  const candidate = distribution(
    processes
      .filter((process) => process.side === "candidate")
      .flatMap((process) => process.samples)
  );
  const pairChangesPct = [
    (processes[1].median / processes[0].median - 1) * 100,
    (processes[2].median / processes[3].median - 1) * 100
  ];
  workloads.push({
    key,
    before,
    candidate,
    medianChangePct: (candidate.median / before.median - 1) * 100,
    pairChangesPct,
    processes
  });
}
assert.equal(workloads.length, 14, "expected 14 formal workloads");
writeFileSync(
  resolve(root, "summary.json"),
  JSON.stringify(
    {
      scope:
        "supported Node public sourceAPI primary; Bun independently reported; no installed package/Gate claim; pooled 18 samples not independent host experiments",
      processCount: 56,
      workloads
    },
    null,
    2
  ),
  { flag: "wx" }
);
for (const workload of workloads) {
  console.log(
    `${workload.key}: ${workload.before.median.toFixed(3)} -> ${workload.candidate.median.toFixed(3)} ms (${workload.medianChangePct.toFixed(1)}%), paired ${workload.pairChangesPct.map((change) => change.toFixed(1)).join("/")}%`
  );
}
