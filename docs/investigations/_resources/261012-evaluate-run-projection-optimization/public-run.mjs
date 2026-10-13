import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const [source, shape, sizeText, parallelText, output, warmupsText = "3", samplesText = "9"] =
  process.argv.slice(2);
const size = Number(sizeText);
const parallel = Number(parallelText);
const warmups = Number(warmupsText);
const samples = Number(samplesText);
assert(
  process.argv.length >= 7 && process.argv.length <= 9,
  "usage: public-run.mjs <source> <independent|chain> <size> <parallel> <output> [warmups] [samples]"
);
assert(
  [size, parallel, warmups, samples].every((n) => Number.isSafeInteger(n) && n > 0),
  "size, parallel, warmups and samples must be positive safe integers"
);
assert(shape === "independent" || shape === "chain", "shape must be independent or chain");
assert(source && output, "source and output paths must be nonempty");
const sourceRoot = resolve(source);
const sha256 = (text) => createHash("sha256").update(text).digest("hex");
function compareEntryNames(left, right) {
  if (left.name < right.name) return -1;
  if (left.name > right.name) return 1;
  return 0;
}
function manifest(directory, prefix = "") {
  const files = [];
  const entries = readdirSync(directory, { withFileTypes: true }).sort(compareEntryNames);
  for (const entry of entries) {
    const relative = prefix + entry.name;
    const path = resolve(directory, entry.name);
    assert(!entry.isSymbolicLink(), `source manifest refuses symlink: ${path}`);
    if (entry.isDirectory()) {
      files.push(...manifest(path, relative + "/"));
    } else {
      assert(entry.isFile(), `source manifest requires a regular file: ${path}`);
      files.push({ path: relative, sha256: sha256(readFileSync(path)) });
    }
  }
  return files;
}
const beforeIdentity = sha256(JSON.stringify(manifest(resolve(sourceRoot, "src"))));
const { defineConfig, run } = await import(pathToFileURL(resolve(sourceRoot, "src/index.ts")).href);
const ids = Array.from({ length: size }, (_, i) => `task-${String(i).padStart(6, "0")}`);
const definition = defineConfig({
  checks: ids.map((checkId, i) => ({
    checkId,
    displayName: checkId,
    execute: () => ({ status: "passed", data: {} }),
    ...(shape === "chain" && i > 0 ? { dependsOn: [ids[i - 1]] } : {})
  })),
  scheduler: { maxParallel: parallel, admissionPolicy: { kind: "static" } },
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});
let signature;
let snapshotDigest;
let declarativeFingerprint;
function verify(result) {
  assert.equal(result.kind, "completed");
  assert.equal(result.aggregate, "passed");
  assert.equal(result.snapshot.checks.length, size);
  assert.equal(result.snapshot.records.length, 0);
  assert.deepEqual(
    result.snapshot.checks.map((check) => check.checkId),
    ids
  );
  assert(result.snapshot.checks.every((check) => check.outcome.status === "passed"));
  assert.deepEqual(result.checkMessages, []);
  assert.deepEqual(result.definitionWarnings, []);
  for (const output of Object.values(result.outputs)) {
    assert.equal(output.enabled, false);
    assert.equal(output.status, "disabled");
  }
  for (const channel of Object.values(result.outputs.diagnosticLogging.channels)) {
    assert.equal(channel.enabled, false);
    assert.equal(channel.status, "disabled");
    assert.equal(channel.file, null);
  }
  assert.deepEqual(
    result.checkDurations.map((duration) => duration.checkId),
    ids
  );
  assert(
    result.checkDurations.every(
      (duration) =>
        typeof duration.durationMs === "number" &&
        Number.isFinite(duration.durationMs) &&
        duration.durationMs >= 0
    )
  );
  const digest = sha256(JSON.stringify(result.snapshot));
  const current = sha256(
    JSON.stringify({
      ...result,
      checkDurations: result.checkDurations.map(({ checkId }) => ({
        checkId,
        durationMs: "finite-nonnegative"
      }))
    })
  );
  if (signature !== undefined) {
    assert.equal(current, signature);
    assert.equal(digest, snapshotDigest);
    assert.equal(result.declarativeFingerprint, declarativeFingerprint);
  }
  signature = current;
  snapshotDigest = digest;
  declarativeFingerprint = result.declarativeFingerprint;
}
const observations = [];
for (let index = 0; index < warmups + samples; index++) {
  const start = performance.now();
  const result = await run(definition, { projectRoot: "/workspace/vibe-check" });
  const wallMs = performance.now() - start;
  verify(result);
  observations.push({ index, warmup: index < warmups, wallMs });
}
assert.equal(sha256(JSON.stringify(manifest(resolve(sourceRoot, "src")))), beforeIdentity);
const evidence = {
  sourceRoot,
  sourceManifestSha256: beforeIdentity,
  scriptSha256: sha256(readFileSync(import.meta.filename)),
  shape,
  size,
  parallel,
  warmups,
  samples,
  runtime: { version: process.version, versions: process.versions, execPath: process.execPath },
  scope:
    "complete public sourceAPI run; import/Definition/verification/IO excluded; not installed package or Gate",
  signature,
  snapshotDigest,
  declarativeFingerprint,
  observations,
  processMemory: process.memoryUsage(),
  processResourceUsage: process.resourceUsage()
};
writeFileSync(output, JSON.stringify(evidence, null, 2), { flag: "wx" });
console.log(JSON.stringify({ shape, size, parallel, sourceRoot, signature, output }));
