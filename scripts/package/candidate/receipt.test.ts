import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { assessReusableArtifact, candidatePaths, writeReceipt } from "./receipt.ts";

test("rejects malformed and stale receipts before artifact reuse", () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "vibe-check-candidate-receipt-"));
  const paths = candidatePaths(temporaryRoot, join(temporaryRoot, "state"));
  const candidateVersion = "0.0.0-local.current";
  const currentFingerprint = "current-input-fingerprint";
  const assessCurrentArtifact = (): ReturnType<typeof assessReusableArtifact> =>
    assessReusableArtifact({
      candidateVersion,
      expectedDocuments: [],
      expectedJSDocExamplePayloads: [],
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
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});
