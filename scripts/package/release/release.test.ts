import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { isNonArrayRecord } from "../../value-guards.ts";
import { processFailureFromResult, runProcessSync } from "../../process-execution/execution.ts";
import { packageCandidatePaths } from "../build-contract.ts";
import { sha256File } from "../pack.ts";
import { parseFormalReleaseVersion, parseReleaseTag } from "./identity.ts";
import { createFormalReleasePaths } from "./paths.ts";
import {
  parseFormalReleaseReceipt,
  verifyFormalReleaseReceipt,
  writeFormalReleaseReceipt
} from "./receipt.ts";
import { readCleanReleaseSource } from "./source.ts";

describe("formal package release", () => {
  it("accepts only explicit canonical prestable versions and conservative tags", () => {
    assert.equal(parseFormalReleaseVersion("0.0.1"), "0.0.1");
    assert.equal(parseFormalReleaseVersion("0.0.9007199254740991"), "0.0.9007199254740991");
    for (const version of ["0.0.0", "0.0.01", "0.1.0", "1.0.0", "0.0.9007199254740992"]) {
      assert.throws(() => parseFormalReleaseVersion(version), /canonical 0\.0/);
    }
    assert.equal(parseReleaseTag("latest"), "latest");
    assert.equal(parseReleaseTag("release-candidate-1"), "release-candidate-1");
    for (const tag of ["Latest", "0.0.1", "next_tag", "-next", ""]) {
      assert.throws(() => parseReleaseTag(tag), /formal release tag/);
    }
  });

  it("writes a portable sanitized receipt and rejects identity or artifact drift", () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-release-receipt-"));
    try {
      const paths = createFormalReleasePaths(root, "0.0.1");
      mkdirSync(paths.artifactDirectory, { recursive: true });
      mkdirSync(paths.stagingDirectory, { recursive: true });
      writeFileSync(paths.artifactPath, "formal artifact\n", "utf8");
      writeFileSync(join(paths.stagingDirectory, "README.md"), "# Fixture\n", "utf8");
      const artifact = {
        artifactPath: paths.artifactPath,
        candidateVersion: "0.0.1",
        files: ["package/LICENSE", "package/index.mjs"],
        inputFingerprint: "a".repeat(64),
        sha256: sha256File(paths.artifactPath),
        stagingDirectory: paths.stagingDirectory
      } as const;
      const receipt = writeFormalReleaseReceipt({
        artifact,
        receiptPath: paths.receiptPath,
        repositoryRoot: root,
        sourceCommit: "b".repeat(40),
        tag: "latest"
      });
      assert.equal(Object.isFrozen(receipt), true);
      assert.equal(receipt.artifact.path, "build/artifacts/vibe-check-0.0.1.tgz");
      assert.equal(receipt.staging.path, "build/release-package");
      assert.match(receipt.artifact.integrity, /^sha512-/u);
      const source = readFileSync(paths.receiptPath, "utf8");
      assert.equal(source.includes(root), false);
      assert.doesNotMatch(source, /consumer|credential|token|npmrc/iu);
      assert.deepEqual(parseFormalReleaseReceipt(JSON.parse(source)), receipt);

      const escapedPath = mutableReceipt(receipt);
      escapedPath.artifact.path = "../vibe-check-0.0.1.tgz";
      assert.throws(() => parseFormalReleaseReceipt(escapedPath), /artifact identity/);

      const duplicatedInventory = mutableReceipt(receipt);
      duplicatedInventory.artifact.files = ["package/index.mjs", "package/index.mjs"];
      assert.throws(() => parseFormalReleaseReceipt(duplicatedInventory), /artifact identity/);

      const reorderedInventory = mutableReceipt(receipt);
      reorderedInventory.artifact.files = ["package/index.mjs", "package/LICENSE"];
      assert.throws(() => parseFormalReleaseReceipt(reorderedInventory), /artifact identity/);

      const wrongContract = mutableReceipt(receipt);
      wrongContract.contract.bunEngine = ">=1.0.0";
      assert.throws(() => parseFormalReleaseReceipt(wrongContract), /package contract/);

      const extraField = mutableReceipt(receipt);
      extraField.consumer = "/tmp/consumer";
      assert.throws(() => parseFormalReleaseReceipt(extraField), /top-level shape/);

      const foreignReceiptPath = join(root, "foreign.release.json");
      assert.throws(
        () =>
          writeFormalReleaseReceipt({
            artifact,
            receiptPath: foreignReceiptPath,
            repositoryRoot: root,
            sourceCommit: "b".repeat(40),
            tag: "latest"
          }),
        /version-owned artifact, staging, and receipt paths/
      );
      assert.equal(existsSync(foreignReceiptPath), false);

      assert.throws(
        () =>
          writeFormalReleaseReceipt({
            artifact: { ...artifact, sha256: "0".repeat(64) },
            receiptPath: paths.receiptPath,
            repositoryRoot: root,
            sourceCommit: "b".repeat(40),
            tag: "latest"
          }),
        /SHA-256 identity/
      );
      assert.equal(readFileSync(paths.receiptPath, "utf8"), source);

      writeFileSync(paths.artifactPath, "drifted artifact\n", "utf8");
      assert.throws(
        () => verifyFormalReleaseReceipt({ receiptPath: paths.receiptPath, repositoryRoot: root }),
        /receipted digests/
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("isolates formal staging and receipt state from the default local candidate", () => {
    const root = "/fixture/repository";
    const local = packageCandidatePaths(root);
    const formal = createFormalReleasePaths(root, "0.0.1");
    assert.equal(formal.artifactDirectory, local.artifactDirectory);
    assert.notEqual(formal.stagingDirectory, local.packageDirectory);
    assert.notEqual(formal.stateDirectory, local.stateDirectory);
    assert.notEqual(formal.receiptPath, local.receiptPath);
    assert.match(formal.receiptPath, /build\/releases\/vibe-check-0\.0\.1\.release\.json$/u);
  });

  it("requires one exact clean Git worktree revision before formal preparation", () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-release-source-"));
    try {
      runGitFixtureCommand(root, ["init", "--quiet"]);
      runGitFixtureCommand(root, ["config", "user.name", "Vibe Check Tests"]);
      runGitFixtureCommand(root, ["config", "user.email", "tests@example.invalid"]);
      writeFileSync(join(root, "tracked.txt"), "tracked\n", "utf8");
      runGitFixtureCommand(root, ["add", "tracked.txt"]);
      runGitFixtureCommand(root, ["commit", "--quiet", "-m", "fixture"]);
      const source = readCleanReleaseSource(root);
      assert.match(source.commit, /^[a-f0-9]{40}$/u);

      writeFileSync(join(root, "untracked.txt"), "dirty\n", "utf8");
      assert.throws(() => readCleanReleaseSource(root), /worktree and index must be clean/);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});

type MutableReceiptFixture = {
  [key: string]: unknown;
  artifact: { [key: string]: unknown; files: string[]; path: string };
  contract: { [key: string]: unknown; bunEngine: string };
};

function mutableReceipt(value: unknown): MutableReceiptFixture {
  const parsed: unknown = JSON.parse(JSON.stringify(value));
  if (!isMutableReceiptFixture(parsed)) {
    throw new TypeError("fixture receipt must contain mutable artifact and contract objects");
  }
  return parsed;
}

function isMutableReceiptFixture(value: unknown): value is MutableReceiptFixture {
  if (!isNonArrayRecord(value)) return false;
  const artifact = value.artifact;
  const contract = value.contract;
  return (
    isNonArrayRecord(artifact) &&
    typeof artifact.path === "string" &&
    Array.isArray(artifact.files) &&
    artifact.files.every((file) => typeof file === "string") &&
    isNonArrayRecord(contract) &&
    typeof contract.bunEngine === "string"
  );
}

function runGitFixtureCommand(root: string, args: readonly string[]): void {
  const result = runProcessSync({ args, command: "git", cwd: root });
  const failure = processFailureFromResult(result);
  if (failure !== null) throw failure;
}
