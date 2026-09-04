import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { PACKAGE_CANDIDATE_INTEGRATION_INVOCATION } from "./integration-command.ts";
import { installCandidate } from "./install.ts";
import { assessPackageCandidatePreparation } from "./prepare.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("package candidate preparation contracts", () => {
  it("rejects overlapping package build and cache roots", () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-candidate-overlap-"));
    try {
      assert.throws(
        () =>
          assessPackageCandidatePreparation({
            buildDirectory: root,
            consumerDirectory: join(root, "consumer"),
            repositoryRoot,
            stateDirectory: root
          }),
        /buildDirectory and stateDirectory must not overlap/
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("rejects invalid private consumer manifests", () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "vibe-check-candidate-diagnostics-"));
    try {
      const input = {
        artifactPath: join(temporaryRoot, "unreachable-artifact.tgz"),
        candidateVersion: "0.0.0-local.manifest-diagnostics",
        consumerDirectory: join(temporaryRoot, "consumer"),
        expectedJSDocExamplePayloads: [],
        expectedReadme: ""
      };

      assert.throws(
        () => installCandidate(input),
        /private candidate consumer package manifest is missing/
      );
      mkdirSync(input.consumerDirectory, { recursive: true });
      writeFileSync(join(input.consumerDirectory, "package.json"), "{not JSON\n", "utf8");
      assert.throws(
        () => installCandidate(input),
        /could not parse private candidate consumer package manifest/
      );
      writeFileSync(join(input.consumerDirectory, "package.json"), '{"private":false}\n', "utf8");
      assert.throws(() => installCandidate(input), /candidate consumer must set private: true/);
    } finally {
      rmSync(temporaryRoot, { force: true, recursive: true });
    }
  });

  it("keeps the explicit cold integration target outside routine discovery with hard timeout", () => {
    assert.equal(PACKAGE_CANDIDATE_INTEGRATION_INVOCATION.command, process.execPath);
    assert.equal(PACKAGE_CANDIDATE_INTEGRATION_INVOCATION.timeout, 30_000);
    assert.deepEqual(PACKAGE_CANDIDATE_INTEGRATION_INVOCATION.args.slice(0, 1), ["test"]);
    const target = PACKAGE_CANDIDATE_INTEGRATION_INVOCATION.args[1];
    assert.ok(target);
    assert.equal(isAbsolute(target), true);
    assert.equal(basename(target), "candidate.integration.ts");
    assert.deepEqual(PACKAGE_CANDIDATE_INTEGRATION_INVOCATION.args.slice(2), ["--reporter=dots"]);
  });
});
