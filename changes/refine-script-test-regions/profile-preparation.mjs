// Change-local diagnostic; retain with this Change's evidence until closeout.
// Uses real preparation functions with no persistent cache or fixture reuse; reruns replace the JSON.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveProjectGateTestLanes } from "../../scripts/project/gate/checks/test-execution/lanes.ts";
import { createArtifactFingerprint } from "../../scripts/package/artifact/fingerprint.ts";
import { copyArtifactFingerprintFixture } from "../../scripts/package/artifact/fingerprint.test-support.ts";
import { typeScriptToolchainFingerprint } from "../../scripts/package/compiler-toolchain.ts";
import { createPackageApiDocumentationFixture } from "../../scripts/docs/package-api/test-support.ts";

const repositoryRoot = process.cwd();
const preparationSteps = [
  { name: "lane-discovery", prepare: () => resolveProjectGateTestLanes(repositoryRoot) },
  { name: "toolchain-fingerprint", prepare: () => typeScriptToolchainFingerprint() },
  { name: "artifact-fingerprint", prepare: () => createArtifactFingerprint(repositoryRoot) },
  { name: "artifact-fixture-copy", prepare: copyAndCleanArtifactFixture },
  { name: "docs-fixture-copy", prepare: createAndCleanDocumentationFixture }
];

function copyAndCleanArtifactFixture() {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "gate-prep-profile-"));
  try {
    copyArtifactFingerprintFixture({ repositoryRoot, fixtureRoot: join(temporaryRoot, "fixture") });
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function createAndCleanDocumentationFixture() {
  const fixtureRoot = createPackageApiDocumentationFixture();
  rmSync(fixtureRoot, { recursive: true, force: true });
}

const samples = [];
for (let round = 0; round < 6; round++) {
  for (const { name, prepare } of preparationSteps) {
    const startedAtMs = performance.now();
    prepare();
    samples.push({ round, warmup: round === 0, name, wallMs: performance.now() - startedAtMs });
  }
}

writeFileSync(
  new URL("./preparation-profile.json", import.meta.url),
  JSON.stringify(
    {
      formedAt: new Date().toISOString(),
      bun: Bun.version,
      note: "In-process diagnostic after imports; 1 warmup + 5 repeats; fixture measurements include cleanup, not test bodies. Toolchain fingerprint is a nested part of artifact fingerprint: do not add them.",
      samples
    },
    null,
    2
  ) + "\n"
);
console.log("preparation profile completed");
