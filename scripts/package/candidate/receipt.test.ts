import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  assessReusableArtifact,
  candidatePaths,
  clearCandidateState,
  writeReceipt
} from "./receipt.ts";

test("rejects malformed and stale receipts before artifact reuse", () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "vibe-check-candidate-receipt-"));
  const paths = candidatePaths(temporaryRoot, {
    buildDirectory: join(temporaryRoot, "build"),
    stateDirectory: join(temporaryRoot, "state")
  });
  const candidateVersion = "0.0.0-local.current";
  const currentFingerprint = "current-input-fingerprint";
  const assessCurrentArtifact = (): ReturnType<typeof assessReusableArtifact> =>
    assessReusableArtifact({
      candidateVersion,
      expectedDocuments: [],
      expectedJSDocExamplePayloads: [],
      expectedMachineMaterials: [],
      expectedReadme: "",
      inputFingerprint: currentFingerprint,
      paths
    });

  try {
    mkdirSync(paths.stateDirectory, { recursive: true });
    writeFileSync(paths.receiptPath, "not JSON\n", "utf8");
    assert.deepEqual(assessCurrentArtifact(), { status: "rejected", reason: "receipt-invalid" });

    writeReceipt({
      artifact: {
        artifactPath: join(paths.artifactDirectory, "stale.tgz"),
        candidateVersion,
        files: [],
        inputFingerprint: "stale-input-fingerprint",
        sha256: "stale-sha256",
        stagingDirectory: paths.stagingDirectory
      },
      consumerDirectory: join(temporaryRoot, "consumer"),
      installation: {
        installedPackageDirectory: join(temporaryRoot, "consumer/node_modules/vibe-check"),
        resolvedEntryPath: join(temporaryRoot, "consumer/node_modules/vibe-check/index.mjs"),
        resolvedEntrySha256: "stale-entry-sha256"
      },
      receiptPath: paths.receiptPath
    });
    assert.deepEqual(assessCurrentArtifact(), {
      status: "rejected",
      reason: "receipt-input-mismatch"
    });

    mkdirSync(paths.legacyArtifactDirectory, { recursive: true });
    mkdirSync(paths.legacyStagingDirectory, { recursive: true });
    writeFileSync(join(paths.legacyArtifactDirectory, "old.tgz"), "old\n", "utf8");
    writeFileSync(join(paths.legacyStagingDirectory, "README.md"), "old\n", "utf8");
    clearCandidateState(paths);
    assert.equal(existsSync(paths.legacyArtifactDirectory), false);
    assert.equal(existsSync(paths.legacyStagingDirectory), false);
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});
