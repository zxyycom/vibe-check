import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PreparedPackageCandidate } from "../../../package/candidate/prepare.ts";

import type { ProjectGateContext } from "./result-contributor.ts";
import { createProjectGateResult } from "./result.ts";
import type { ProjectGatePerformanceBaseline } from "./performance-baseline.ts";
import { contributeProjectGatePerformanceMessages } from "./performance-observation.ts";

const runtime = Object.freeze({ architecture: "x64", bunVersion: "1.3.14", platform: "linux" });
const baseline = Object.freeze({
  medianMs: 90,
  p90Ms: 100,
  samplesMs: Object.freeze([80, 90, 100]),
  thresholdMs: 135,
  workload: Object.freeze({
    candidatePreparation: "reuse" as const,
    declarativeFingerprint: "fixture-fingerprint",
    profile: "required" as const,
    runtime
  })
} satisfies ProjectGatePerformanceBaseline);

describe("Project Gate performance observation", () => {
  it("contributes one advisory message without changing the initial Gate result", () => {
    const initialResult = createProjectGateResult("passed", [
      { code: "existing", level: "info", message: "kept" }
    ]);
    const withinRange = contributeProjectGatePerformanceMessages(
      Object.freeze({ ...context({ elapsedToInitialResultMs: 135 }), initialResult }),
      [baseline],
      runtime
    );
    assert.deepEqual(withinRange, [
      {
        code: "project-gate-performance-elapsed-to-initial-result",
        level: "info",
        message:
          "elapsed-to-initial-result 135.0ms (candidate preparation 20.0ms; adapter/setup 30.0ms; Product Run 85.0ms) was within advisory range (threshold 135.0ms)"
      }
    ]);
    assert.equal(initialResult.status, "passed");
    assert.equal(initialResult.messages.length, 1);

    const outsideRange = contributeProjectGatePerformanceMessages(
      Object.freeze({
        ...context({ elapsedToInitialResultMs: 136 }),
        initialResult: createProjectGateResult("passed")
      }),
      [baseline],
      runtime
    );
    assert.equal(outsideRange[0]?.code, "project-gate-performance-outside-range");

    const notComparable = contributeProjectGatePerformanceMessages(
      Object.freeze({
        ...context({ elapsedToInitialResultMs: 120 }),
        initialResult: createProjectGateResult("unavailable")
      }),
      [baseline],
      runtime
    );
    assert.match(notComparable[0]?.message ?? "", /initial result was not passed/);
  });
});

function context(
  overrides: Readonly<{ readonly elapsedToInitialResultMs: number }>
): ProjectGateContext {
  return Object.freeze({
    invocationLogDirectory: "/tmp/project-gate-observation",
    preparedCandidate,
    repositoryRoot: "/workspace/vibe-check",
    runResult: Object.freeze({
      checkDurations: [],
      declarativeFingerprint: "fixture-fingerprint",
      kind: "completed"
    }),
    selection: Object.freeze({ kind: "required" as const }),
    timing: Object.freeze({
      adapterSetupMs: 30,
      candidatePreparationMs: 20,
      elapsedToInitialResultMs: overrides.elapsedToInitialResultMs,
      initialResultAtMs: overrides.elapsedToInitialResultMs,
      productRunMs: overrides.elapsedToInitialResultMs - 50,
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
