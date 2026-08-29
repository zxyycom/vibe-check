import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PreparedPackageCandidate } from "../../package/candidate/prepare.ts";

import type { ProjectGateContext } from "./run.ts";
import { createProjectGateResult } from "./result.ts";
import type { ProjectGatePerformanceBaseline } from "./performance-baseline.ts";
import { observeProjectGatePerformance } from "./performance-observation.ts";

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
  it("emits elapsed observations and preserves Gate status across comparable advisory outcomes", () => {
    const existingMessage = Object.freeze({
      code: "existing",
      level: "info" as const,
      message: "kept"
    });
    const withinRange = observeProjectGatePerformance(
      createProjectGateResult("passed", [existingMessage]),
      context({ elapsedToInitialResultMs: 135 }),
      [baseline],
      runtime
    );
    assert.deepEqual(withinRange, {
      messages: [
        existingMessage,
        {
          code: "project-gate-performance-elapsed",
          level: "info",
          message: "elapsed 135.0ms was within advisory range (threshold 135.0ms)"
        }
      ],
      status: "passed"
    });

    const outsideRange = observeProjectGatePerformance(
      createProjectGateResult("passed"),
      context({ elapsedToInitialResultMs: 136 }),
      [baseline],
      runtime
    );
    assert.deepEqual(outsideRange, {
      messages: [
        {
          code: "project-gate-performance-outside-range",
          level: "warning",
          message:
            "elapsed 136.0ms exceeded advisory threshold 135.0ms; slowest Checks: lint-product=70.0ms, typecheck-scripts=60.0ms, format-check=20.0ms"
        }
      ],
      status: "passed"
    });

    const notComparable = observeProjectGatePerformance(
      createProjectGateResult("unavailable"),
      context({ elapsedToInitialResultMs: 120 }),
      [baseline],
      runtime
    );
    assert.deepEqual(notComparable, {
      messages: [
        {
          code: "project-gate-performance-elapsed",
          level: "info",
          message: "elapsed 120.0ms was not comparable (initial result was not passed)"
        }
      ],
      status: "unavailable"
    });

    const tagOverride = observeProjectGatePerformance(
      createProjectGateResult("passed"),
      context({ elapsedToInitialResultMs: 120, enabledTags: ["package-tests"] }),
      [baseline],
      runtime
    );
    assert.match(tagOverride.messages.at(-1)?.message ?? "", /not comparable \(tag override\)/);

    const malformedDurations = observeProjectGatePerformance(
      createProjectGateResult("passed"),
      context({
        checkDurations: [{ checkId: "lint-product", durationMs: -1 }],
        elapsedToInitialResultMs: 120
      }),
      [baseline],
      runtime
    );
    assert.match(
      malformedDurations.messages.at(-1)?.message ?? "",
      /not comparable \(Run facts were incomplete\)/
    );

    const invalidBaseline = observeProjectGatePerformance(
      createProjectGateResult("passed"),
      context({ elapsedToInitialResultMs: 135 }),
      [{ ...baseline, thresholdMs: 0 }],
      runtime
    );
    assert.match(
      invalidBaseline.messages.at(-1)?.message ?? "",
      /not comparable \(no matching baseline\)/
    );
  });
});

function context(
  overrides: Readonly<{
    readonly checkDurations?: readonly Readonly<{
      readonly checkId: string;
      readonly durationMs: number | null;
    }>[];
    readonly elapsedToInitialResultMs: number;
    readonly enabledTags?: readonly "package-tests"[];
  }>
): ProjectGateContext {
  return Object.freeze({
    invocationLogDirectory: "/tmp/project-gate-observation",
    preparedCandidate,
    repositoryRoot: "/workspace/vibe-check",
    runResult: Object.freeze({
      checkDurations: overrides.checkDurations ?? [
        { checkId: "format-check", durationMs: 20 },
        { checkId: "lint-product", durationMs: 70 },
        { checkId: "typecheck-scripts", durationMs: 60 },
        { checkId: "prepared-package-candidate", durationMs: null }
      ],
      declarativeFingerprint: "fixture-fingerprint",
      kind: "completed"
    }),
    selection: Object.freeze({
      disabledTags: [],
      enabledTags: overrides.enabledTags ?? [],
      profile: "required"
    }),
    timing: Object.freeze({
      elapsedToInitialResultMs: overrides.elapsedToInitialResultMs,
      initialResultAtMs: 1_000,
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
  installedPackageDirectory: "/tmp/consumer/node_modules/vibe-check",
  preparationAction: "reuse",
  preparationReason: "installation-current",
  resolvedEntryPath: "/tmp/consumer/node_modules/vibe-check/index.mjs",
  reused: true,
  sha256: "b".repeat(64),
  stagingDirectory: "/tmp/staging"
} satisfies PreparedPackageCandidate);
