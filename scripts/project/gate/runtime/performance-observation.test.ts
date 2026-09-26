import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

import type { PreparedPackageCandidate } from "../../../package/candidate/prepare.ts";

import type { ProjectGateContext } from "./result-contributor.ts";
import { createProjectGateResult } from "./result.ts";
import {
  loadLocalPerformanceBaselines,
  LOCAL_PERFORMANCE_BASELINE_PATH,
  type ProjectGatePerformanceBaseline
} from "./performance-baseline.ts";
import { evaluateProjectGatePerformance } from "./performance-observation.ts";

const runtime = Object.freeze({ architecture: "x64", bunVersion: "1.3.14", platform: "linux" });
const baseline = Object.freeze({
  declarativeFingerprint: "a".repeat(64),
  maxElapsedMs: 135,
  profile: "required" as const,
  runtime
} satisfies ProjectGatePerformanceBaseline);

describe("Project Gate performance limit", () => {
  it("blocks missing, invalid, or exceeded standard-workload limits and preserves initial facts", () => {
    const initialResult = createProjectGateResult("passed", [
      { code: "existing", level: "info", message: "kept" }
    ]);
    const within = evaluateProjectGatePerformance(
      Object.freeze({ ...context(135), initialResult }),
      runtime
    );
    assert.equal(within.blocks, false);
    assert.match(within.messages[0]?.message ?? "", /within hard limit 135\.0ms/);
    assert.equal(initialResult.status, "passed");
    assert.equal(initialResult.messages.length, 1);

    const exceeded = evaluateProjectGatePerformance(
      Object.freeze({ ...context(136), initialResult }),
      runtime
    );
    assert.equal(exceeded.blocks, true);
    assert.equal(exceeded.messages[0]?.code, "project-gate-performance-limit-exceeded");

    for (const performanceBaselines of [
      [],
      [{ ...baseline, profile: "all" as const }],
      [{ ...baseline, runtime: { ...runtime, architecture: "arm64" } }],
      [{ ...baseline, runtime: { ...runtime, bunVersion: "other" } }],
      [{ ...baseline, runtime: { ...runtime, platform: "darwin" } }]
    ]) {
      const missing = evaluateProjectGatePerformance(
        Object.freeze({ ...context(120), initialResult, performanceBaselines }),
        runtime
      );
      assert.equal(missing.blocks, true);
      assert.equal(missing.messages[0]?.code, "project-gate-performance-baseline-missing");
      assert.match(missing.messages[0]?.message ?? "", /elapsed-to-initial-result 120\.0ms/);
    }

    const invalid = evaluateProjectGatePerformance(
      Object.freeze({
        ...context(Number.NaN),
        initialResult
      }),
      runtime
    );
    assert.equal(invalid.blocks, true);
    assert.equal(invalid.messages[0]?.code, "project-gate-performance-invalid-timing");
    assert.doesNotMatch(invalid.messages[0]?.message ?? "", /candidate preparation/);

    const invalidFacts = evaluateProjectGatePerformance(
      Object.freeze({ ...context(120), initialResult, runResult: { kind: "completed" } }),
      runtime
    );
    assert.equal(invalidFacts.blocks, true);
    assert.equal(invalidFacts.messages[0]?.code, "project-gate-performance-invalid-run-facts");

    const alreadyFailed = evaluateProjectGatePerformance(
      Object.freeze({
        ...context(136),
        initialResult: createProjectGateResult("failed")
      }),
      runtime
    );
    assert.equal(alreadyFailed.blocks, false);
  });

  it("enforces profile and runtime budgets independently of fingerprint metadata without rewriting them", () => {
    const fingerprint = "b".repeat(64);
    for (const profile of ["required", "all"] as const) {
      for (const [elapsedMs, productMs, blocks] of [
        [120, 70, false],
        [135, 85, false],
        [136, 86, true]
      ] as const) {
        for (const metadata of [{ declarativeFingerprint: baseline.declarativeFingerprint }, {}]) {
          const initial = context(elapsedMs);
          const configured = { ...metadata, maxElapsedMs: 135, profile, runtime };
          const baselines = Object.freeze([Object.freeze(configured)]);
          const result = evaluateProjectGatePerformance(
            Object.freeze({
              ...initial,
              initialResult: createProjectGateResult("passed"),
              performanceBaselines: baselines,
              runResult: Object.freeze({
                checkDurations: [],
                declarativeFingerprint: fingerprint,
                kind: "completed"
              }),
              selection: Object.freeze({ kind: profile })
            }),
            runtime
          );
          assert.equal(result.blocks, blocks);
          assert.equal(result.messages.length, 1);
          assert.equal(
            result.messages[0]?.code,
            blocks
              ? "project-gate-performance-limit-exceeded"
              : "project-gate-performance-within-limit"
          );
          assert.equal(result.messages[0]?.level, blocks ? "error" : "info");
          const message = result.messages[0]?.message ?? "";
          for (const detail of [
            `elapsed-to-initial-result ${elapsedMs}.0ms`,
            "candidate preparation 20.0ms",
            "adapter/setup 30.0ms",
            `Product Run ${productMs}.0ms`,
            "hard limit 135.0ms"
          ]) {
            assert.ok(message.includes(detail), detail);
          }
          assert.doesNotMatch(message, /no matching|manually update|fingerprint/);
          assert.deepEqual(baselines, [configured]);
        }
      }
    }
  });

  it("loads only an explicit regular local JSON file with fixed, unique limits", () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-performance-baseline-"));
    const path = join(root, LOCAL_PERFORMANCE_BASELINE_PATH);
    try {
      assert.deepEqual(loadLocalPerformanceBaselines(root), { kind: "missing" });
      mkdirSync(dirname(path), { recursive: true });
      const legacySource = JSON.stringify({ schemaVersion: 1, baselines: [baseline] });
      writeFileSync(path, legacySource);
      assert.deepEqual(loadLocalPerformanceBaselines(root), {
        kind: "loaded",
        baselines: [baseline]
      });
      assert.equal(readFileSync(path, "utf8"), legacySource);
      const withoutFingerprint = { maxElapsedMs: 135, profile: "required", runtime };
      writeFileSync(path, JSON.stringify({ schemaVersion: 1, baselines: [withoutFingerprint] }));
      assert.deepEqual(loadLocalPerformanceBaselines(root), {
        kind: "loaded",
        baselines: [withoutFingerprint]
      });
      writeFileSync(path, JSON.stringify({ schemaVersion: 1, baselines: [baseline, baseline] }));
      assert.deepEqual(loadLocalPerformanceBaselines(root), { kind: "invalid" });
      for (const duplicate of [
        withoutFingerprint,
        { ...baseline, declarativeFingerprint: "b".repeat(64), maxElapsedMs: 999 }
      ]) {
        writeFileSync(path, JSON.stringify({ schemaVersion: 1, baselines: [baseline, duplicate] }));
        assert.deepEqual(loadLocalPerformanceBaselines(root), { kind: "invalid" });
      }
      for (const invalid of [
        { ...baseline, declarativeFingerprint: null },
        { ...baseline, declarativeFingerprint: "invalid" },
        { ...withoutFingerprint, unexpected: true }
      ]) {
        writeFileSync(path, JSON.stringify({ schemaVersion: 1, baselines: [invalid] }));
        assert.deepEqual(loadLocalPerformanceBaselines(root), { kind: "invalid" });
      }
      writeFileSync(
        path,
        JSON.stringify({ schemaVersion: 1, baselines: [{ ...baseline, maxElapsedMs: 0 }] })
      );
      assert.deepEqual(loadLocalPerformanceBaselines(root), { kind: "invalid" });
      rmSync(path);
      const target = join(root, "outside.json");
      writeFileSync(target, JSON.stringify({ schemaVersion: 1, baselines: [baseline] }));
      symlinkSync(target, path);
      assert.deepEqual(loadLocalPerformanceBaselines(root), { kind: "invalid" });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});

function context(elapsedToInitialResultMs: number): ProjectGateContext {
  return Object.freeze({
    invocationLogDirectory: "/tmp/project-gate-observation",
    preparedCandidate,
    performanceBaselines: [baseline],
    repositoryRoot: "/workspace/vibe-check",
    runResult: Object.freeze({
      checkDurations: [],
      declarativeFingerprint: "a".repeat(64),
      kind: "completed"
    }),
    selection: Object.freeze({ kind: "required" as const }),
    timing: Object.freeze({
      adapterSetupMs: 30,
      candidatePreparationMs: 20,
      elapsedToInitialResultMs,
      initialResultAtMs: elapsedToInitialResultMs,
      productRunMs: elapsedToInitialResultMs - 50,
      startedAtMs: 0
    })
  });
}

const preparedCandidate = Object.freeze({
  artifactPath: "/tmp/vibe-check.tgz",
  candidateVersion: "0.0.0-local.fixture",
  consumerDirectory: "/tmp/consumer",
  files: ["package/index.mjs"],
  inputFingerprint: "a".repeat(64),
  installedPackageDirectory: "/tmp/consumer/node_modules/@zxyycom/vibe-check",
  preparationAction: "reuse" as const,
  preparationReason: "installation-current" as const,
  resolvedEntryPath: "/tmp/consumer/node_modules/@zxyycom/vibe-check/index.mjs",
  reused: true,
  sha256: "b".repeat(64),
  stagingDirectory: "/tmp/staging"
} satisfies PreparedPackageCandidate);
