import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { defineConfig, run as packageRun } from "vibe-check";

import { sha256File } from "../../package/pack.ts";
import type { PreparedPackageCandidate } from "../../package/candidate/prepare.ts";
import {
  createPreparedCandidateCheck,
  parseProjectGatePreparedCandidateData
} from "./prepared-candidate-check.ts";

describe("prepared package candidate Check", () => {
  it("publishes versioned typed candidate data and rejects malformed dependency facts", async () => {
    const fixture = createCandidateFixture();
    try {
      const check = createPreparedCandidateCheck(fixture.candidate);
      const runResult = await packageRun(
        defineConfig({
          checks: [check],
          outputs: {
            machinePublication: { enabled: false },
            progressRendering: { enabled: false }
          }
        }),
        { projectRoot: fixture.root }
      );
      assert.equal(runResult.kind, "completed");
      if (runResult.kind !== "completed") throw new Error("fixture Run must complete");
      const outcome = runResult.snapshot.checks[0]?.outcome;
      assert.equal(outcome?.status, "passed");
      if (outcome?.status !== "passed") throw new Error("fixture provider must pass");
      assert.deepEqual(parseProjectGatePreparedCandidateData(outcome.data), {
        ...fixture.candidate,
        schemaVersion: 2
      });
      assert.throws(
        () => parseProjectGatePreparedCandidateData({ ...outcome.data, unexpected: true }),
        /invalid shape/
      );
      assert.throws(
        () =>
          parseProjectGatePreparedCandidateData({ ...outcome.data, artifactPath: "relative.tgz" }),
        /must be absolute/
      );
      assert.throws(
        () => parseProjectGatePreparedCandidateData({ ...outcome.data, files: [""] }),
        /invalid shape/
      );
      assert.throws(
        () =>
          parseProjectGatePreparedCandidateData({
            ...outcome.data,
            preparationAction: "rebuild",
            preparationReason: "installation-current",
            reused: true
          }),
        /invalid preparation fact/
      );
    } finally {
      rmSync(fixture.root, { force: true, recursive: true });
    }
  });

  it("fails closed when the prepared artifact no longer matches its digest", async () => {
    const fixture = createCandidateFixture();
    try {
      const check = createPreparedCandidateCheck(fixture.candidate);
      writeFileSync(fixture.candidate.artifactPath, "tampered artifact\n", "utf8");
      assert.deepEqual(await invokeCheck(check), {
        status: "unavailable",
        reason: { code: "prepared-candidate-invalid" }
      });
    } finally {
      rmSync(fixture.root, { force: true, recursive: true });
    }
  });
});

function createCandidateFixture(): Readonly<{
  readonly candidate: PreparedPackageCandidate;
  readonly root: string;
}> {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-prepared-candidate-"));
  const artifactPath = join(root, "artifacts", "vibe-check.tgz");
  const consumerDirectory = join(root, "consumer");
  const installedPackageDirectory = join(consumerDirectory, "node_modules", "vibe-check");
  const resolvedEntryPath = join(installedPackageDirectory, "index.mjs");
  const stagingDirectory = join(root, "staging");
  mkdirSync(join(root, "artifacts"), { recursive: true });
  mkdirSync(installedPackageDirectory, { recursive: true });
  mkdirSync(stagingDirectory, { recursive: true });
  writeFileSync(artifactPath, "candidate artifact\n", "utf8");
  writeFileSync(resolvedEntryPath, "export {};\n", "utf8");
  return Object.freeze({
    candidate: Object.freeze({
      artifactPath,
      candidateVersion: "0.0.0-local.fixture",
      consumerDirectory,
      files: Object.freeze(["package/index.mjs"]),
      inputFingerprint: "a".repeat(64),
      installedPackageDirectory,
      preparationAction: "reuse",
      preparationReason: "installation-current",
      resolvedEntryPath,
      reused: true,
      sha256: sha256File(artifactPath),
      stagingDirectory
    }),
    root
  });
}

async function invokeCheck(
  check: ReturnType<typeof createPreparedCandidateCheck>
): Promise<Awaited<ReturnType<NonNullable<typeof check.execution>>>> {
  const execution = check.execution;
  if (execution === undefined) throw new Error("fixture Check must be executable");
  return execution({
    dependencies: {
      get: (checkId) => ({
        ok: false,
        error: { code: "dependency-not-declared", checkId }
      })
    },
    options: {},
    project: { flags: [], root: process.cwd() },
    records: { report: () => undefined },
    signal: new AbortController().signal
  });
}
