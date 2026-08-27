import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  CANDIDATE_ARTIFACT_PATH_ENV,
  CANDIDATE_ARTIFACT_SHA256_ENV
} from "../candidate/acceptance-input.ts";
import { sha256File } from "../pack.ts";
import {
  CANDIDATE_STAGING_DIRECTORY_ENV,
  readGateArtifactAcceptanceInput
} from "./acceptance-input.ts";

test("accepts provider-owned artifact staging material", () => {
  const fixture = createFixture();
  try {
    assert.deepEqual(readGateArtifactAcceptanceInput(fixture.environment), {
      artifactPath: fixture.artifactPath,
      files: ["package/index.mjs"],
      stagingDirectory: fixture.stagingDirectory
    });
  } finally {
    rmSync(fixture.root, { force: true, recursive: true });
  }
});

test("rejects incomplete or unrelated artifact staging material", () => {
  const fixture = createFixture();
  try {
    assert.throws(
      () =>
        readGateArtifactAcceptanceInput({
          [CANDIDATE_ARTIFACT_PATH_ENV]: fixture.artifactPath,
          [CANDIDATE_ARTIFACT_SHA256_ENV]: sha256File(fixture.artifactPath)
        }),
      /incomplete or invalid/
    );
    const unrelatedStaging = join(fixture.root, "unrelated", "staging");
    mkdirSync(unrelatedStaging, { recursive: true });
    assert.throws(
      () =>
        readGateArtifactAcceptanceInput({
          ...fixture.environment,
          [CANDIDATE_STAGING_DIRECTORY_ENV]: unrelatedStaging
        }),
      /incomplete or invalid/
    );
  } finally {
    rmSync(fixture.root, { force: true, recursive: true });
  }
});

function createFixture(): Readonly<{
  readonly artifactPath: string;
  readonly environment: NodeJS.ProcessEnv;
  readonly root: string;
  readonly stagingDirectory: string;
}> {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-artifact-input-"));
  const stateDirectory = join(root, "state");
  const artifactPath = join(stateDirectory, "artifacts", "vibe-check.tgz");
  const stagingDirectory = join(stateDirectory, "staging");
  mkdirSync(join(stateDirectory, "artifacts"), { recursive: true });
  mkdirSync(stagingDirectory, { recursive: true });
  writeFileSync(artifactPath, "artifact\n", "utf8");
  writeFileSync(join(stagingDirectory, "index.mjs"), "export {};\n", "utf8");
  return Object.freeze({
    artifactPath,
    environment: Object.freeze({
      [CANDIDATE_ARTIFACT_PATH_ENV]: artifactPath,
      [CANDIDATE_ARTIFACT_SHA256_ENV]: sha256File(artifactPath),
      [CANDIDATE_STAGING_DIRECTORY_ENV]: stagingDirectory
    }),
    root,
    stagingDirectory
  });
}
