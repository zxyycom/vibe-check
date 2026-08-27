import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { sha256File } from "../pack.ts";
import {
  CANDIDATE_ARTIFACT_PATH_ENV,
  CANDIDATE_ARTIFACT_SHA256_ENV,
  resolveCandidateAcceptanceArtifact
} from "./acceptance-input.ts";

test("accepts an exact Gate candidate artifact input", async () => {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-acceptance-input-"));
  const artifactPath = join(root, "candidate.tgz");
  try {
    writeFileSync(artifactPath, "candidate\n", "utf8");
    const sha256 = sha256File(artifactPath);
    assert.deepEqual(
      await resolveCandidateAcceptanceArtifact({
        [CANDIDATE_ARTIFACT_PATH_ENV]: artifactPath,
        [CANDIDATE_ARTIFACT_SHA256_ENV]: sha256
      }),
      { artifactPath, sha256 }
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("rejects incomplete or mismatched Gate candidate artifact input", async () => {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-acceptance-input-"));
  const artifactPath = join(root, "candidate.tgz");
  try {
    writeFileSync(artifactPath, "candidate\n", "utf8");
    await assert.rejects(
      resolveCandidateAcceptanceArtifact({ [CANDIDATE_ARTIFACT_PATH_ENV]: artifactPath }),
      /incomplete or invalid/
    );
    await assert.rejects(
      resolveCandidateAcceptanceArtifact({
        [CANDIDATE_ARTIFACT_PATH_ENV]: artifactPath,
        [CANDIDATE_ARTIFACT_SHA256_ENV]: "0".repeat(64)
      }),
      /incomplete or invalid/
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});
