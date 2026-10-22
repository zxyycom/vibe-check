// Change-local benchmark, not a Gate entry. Retain scripts and frozen-source evidence until closeout.
// Plain implementation and full existing tests; no mocks. Reruns replace stage measurement JSON.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { cpus, loadavg, tmpdir } from "node:os";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const repositoryRoot = process.cwd();
const changeDirectory = import.meta.dir;
const stage = process.argv[2];
assert.ok(["before", "after"].includes(stage), "Expected stage: before | after");
const { copyArtifactFingerprintFixture } = await import(
  pathToFileURL(join(repositoryRoot, "scripts/package/artifact/fingerprint.test-support.ts")).href
);
const { createArtifactFingerprint } = await import(
  pathToFileURL(join(repositoryRoot, "scripts/package/artifact/fingerprint.ts")).href
);
const { resolveProjectGateTestLanes } = await import(
  pathToFileURL(join(repositoryRoot, "scripts/project/gate/checks/test-execution/lanes.ts")).href
);

function collectProjectSourceDigests() {
  const projectFiles = [];
  function visitDirectory(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visitDirectory(path);
      else if (entry.isFile()) projectFiles.push(path);
    }
  }
  visitDirectory(join(repositoryRoot, "scripts/project"));
  return Object.fromEntries(
    projectFiles.map((path) => [
      relative(repositoryRoot, path),
      createHash("sha256").update(readFileSync(path)).digest("hex")
    ])
  );
}

function fixtureInventory(directory) {
  let files = 0;
  let bytes = 0;
  function visitDirectory(currentDirectory) {
    for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
      const path = join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        visitDirectory(path);
      } else {
        files++;
        bytes += lstatSync(path).size;
      }
    }
  }
  visitDirectory(directory);
  return { files, bytes };
}

const statePath = join(changeDirectory, "snapshot.json");
if (stage === "before") {
  assert.equal(await Bun.file(statePath).exists(), false, "do not overwrite the original baseline");
  const snapshotOwnerRoot = mkdtempSync(join(tmpdir(), "gate-preparation-frozen-"));
  const snapshot = join(snapshotOwnerRoot, "repository");
  try {
    copyArtifactFingerprintFixture({ repositoryRoot, fixtureRoot: snapshot });
    const frozenState = {
      formedAt: new Date().toISOString(),
      snapshot,
      fingerprint: createArtifactFingerprint(snapshot),
      projectSourceDigests: collectProjectSourceDigests()
    };
    writeFileSync(statePath, JSON.stringify(frozenState, null, 2) + "\n");
    // A committed snapshot is retained for before/after parity, not cleaned with individual samples.
  } catch (error) {
    rmSync(snapshotOwnerRoot, { recursive: true, force: true });
    throw error;
  }
}
const frozen = JSON.parse(readFileSync(statePath, "utf8"));
assert.equal(
  createArtifactFingerprint(frozen.snapshot),
  frozen.fingerprint,
  "same frozen input fingerprint before/after"
);
const logs = join(repositoryRoot, ".log/gate-preparation-implementation", randomUUID());
mkdirSync(logs, { recursive: true });
const sourceIdentityPaths = [
  "scripts/package/artifact/fingerprint.ts",
  "scripts/package/artifact/fingerprint.test-support.ts",
  "scripts/package/artifact/manifest.test.ts",
  "scripts/validation/workspace.ts",
  "scripts/validation/workspace.test.ts"
];
const report = {
  stage,
  formedAt: new Date().toISOString(),
  environment: { bun: Bun.version, platform: process.platform, cpus: cpus().length },
  logs,
  frozen,
  sourceDigests: Object.fromEntries(
    sourceIdentityPaths.map((path) => [
      path,
      createHash("sha256").update(readFileSync(path)).digest("hex")
    ])
  ),
  note: "Frozen-source helper comparison is identical before/after. Full-test timings use same files/lanes but after includes added regression assertions; warm OS cache, 1 warmup + 5 measured, sequential. No mocks; full Gate is separate.",
  copy: [],
  tests: []
};
function saveReport() {
  writeFileSync(
    join(changeDirectory, stage + "-measurements.json"),
    JSON.stringify(report, null, 2) + "\n"
  );
}

for (let round = 0; round < 6; round++) {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "gate-preparation-measure-"));
  const destination = join(temporaryRoot, "repository");
  let copyMs;
  let cleanupMs;
  let inventory;
  try {
    const copyStartedAtMs = performance.now();
    copyArtifactFingerprintFixture({ repositoryRoot: frozen.snapshot, fixtureRoot: destination });
    copyMs = performance.now() - copyStartedAtMs;
    assert.equal(createArtifactFingerprint(destination), frozen.fingerprint);
    inventory = fixtureInventory(destination);
  } finally {
    const cleanupStartedAtMs = performance.now();
    rmSync(temporaryRoot, { recursive: true, force: true });
    cleanupMs = performance.now() - cleanupStartedAtMs;
  }
  // Only fully copied, validated and cleaned fixtures become successful measurement samples.
  report.copy.push({
    round,
    warmup: round === 0,
    copyMs,
    cleanupMs,
    files: inventory.files,
    bytes: inventory.bytes,
    loadAfter: loadavg()
  });
  saveReport();
}

const workloads = {
  fingerprintTests: [
    "scripts/package/artifact/manifest.test.ts",
    "scripts/docs/package-documents.test.ts"
  ],
  validationLane: resolveProjectGateTestLanes(repositoryRoot).scriptsValidation
};
for (let round = 0; round < 6; round++) {
  for (const [name, files] of Object.entries(workloads)) {
    const loadBefore = loadavg();
    const startedAtMs = performance.now();
    const child = Bun.spawn([process.execPath, "test", ...files], {
      cwd: repositoryRoot,
      stdout: "pipe",
      stderr: "pipe"
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited
    ]);
    const wallMs = performance.now() - startedAtMs;
    const log = join(logs, `${round}-${name}.log`);
    writeFileSync(log, stdout + stderr);
    assert.equal(exitCode, 0, log + "\n" + stderr);
    report.tests.push({
      round,
      warmup: round === 0,
      name,
      files,
      wallMs,
      loadBefore,
      loadAfter: loadavg(),
      passed: stderr.split("\n").filter((line) => line.startsWith("(pass)")),
      log
    });
    saveReport();
  }
  console.log(JSON.stringify({ stage, round, samples: report.tests.length }));
}
