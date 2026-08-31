import assert from "node:assert/strict";

import type { CheckOutcome, DependencyObservation } from "../../check/check.ts";
import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import { executeResolvedChecks } from "./resolved-checks.ts";
import {
  PROJECT,
  hasDiagnosticTags,
  normalized,
  outcomeFor,
  recordingLogger
} from "./resolved-checks.test-support.ts";

export async function assertDirectDependencyLists(): Promise<void> {
  let observedList: readonly DependencyObservation[] | undefined;
  let repeatedList: readonly DependencyObservation[] | undefined;
  const observations: DiagnosticObservation[] = [];
  const directOnly = await executeResolvedChecks({
    checks: [
      normalized(() => ({ status: "passed", data: { source: "passed" } }), {
        checkId: "source-passed",
        displayName: "Passed source"
      }),
      normalized(() => ({ status: "failed", data: { source: "failed" } }), {
        checkId: "source-failed",
        displayName: "Failed source"
      }),
      normalized(() => ({ status: "not-applicable", reason: { code: "not-needed" } }), {
        checkId: "source-not-applicable",
        displayName: "Not applicable source"
      }),
      normalized(() => ({ status: "unavailable", reason: { code: "source-unavailable" } }), {
        checkId: "source-unavailable",
        displayName: "Unavailable source"
      }),
      normalized(() => ({ status: "passed", data: { ambient: true } }), {
        checkId: "ambient-source",
        displayName: "Ambient source"
      }),
      normalized(
        ({ dependencies }) => {
          observedList = dependencies.list();
          repeatedList = dependencies.list();
          return { status: "passed", data: { dependent: true } };
        },
        {
          checkId: "dependent",
          dependsOn: [
            "source-unavailable",
            "source-passed",
            "source-not-applicable",
            "source-failed"
          ],
          displayName: "Dependent"
        }
      )
    ],
    diagnosticLogger: recordingLogger(observations),
    maxParallel: 1,
    project: PROJECT,
    signal: undefined
  });

  assert.equal(directOnly.kind, "completed");
  assert.deepEqual(observedList, [
    {
      checkId: "source-unavailable",
      outcome: { status: "unavailable", reason: { code: "source-unavailable" } }
    },
    { checkId: "source-passed", outcome: { status: "passed", data: { source: "passed" } } },
    {
      checkId: "source-not-applicable",
      outcome: { status: "not-applicable", reason: { code: "not-needed" } }
    },
    { checkId: "source-failed", outcome: { status: "failed", data: { source: "failed" } } }
  ]);
  assert.deepEqual(repeatedList, observedList);
  assertFrozenDependencyObservations(observedList);
  assert.equal(
    observedList?.find(({ checkId }) => checkId === "source-passed")?.outcome,
    outcomeFor(directOnly, "source-passed")
  );
  assert.equal(
    observedList?.find(({ checkId }) => checkId === "source-failed")?.outcome,
    outcomeFor(directOnly, "source-failed")
  );
  assert.deepEqual(
    observations
      .filter(
        (observation) =>
          hasDiagnosticTags(observation, "CHECK:dependent", "EXECUTION", "DEPENDENCY-LIST") &&
          observation.event === "dependency.list"
      )
      .map((observation) => observation.details),
    [
      {
        count: 4,
        dependencyIds: [
          "source-unavailable",
          "source-passed",
          "source-not-applicable",
          "source-failed"
        ]
      },
      {
        count: 4,
        dependencyIds: [
          "source-unavailable",
          "source-passed",
          "source-not-applicable",
          "source-failed"
        ]
      }
    ]
  );
}

export async function assertEmptyDependencyList(): Promise<void> {
  let observedList: readonly DependencyObservation[] | undefined;
  const execution = await executeResolvedChecks({
    checks: [
      normalized(({ dependencies }) => {
        observedList = dependencies.list();
        return { status: "passed", data: {} };
      })
    ],
    maxParallel: 1,
    project: PROJECT,
    signal: undefined
  });
  assert.equal(execution.kind, "completed");
  assert.deepEqual(observedList, []);
  assert.equal(Object.isFrozen(observedList), true);
}

function assertFrozenDependencyObservations(
  observations: readonly DependencyObservation[] | undefined
): void {
  assert.notEqual(observations, undefined);
  if (observations === undefined) return;
  assert.equal(Object.isFrozen(observations), true);
  for (const observation of observations) {
    assert.equal(Object.isFrozen(observation), true);
    assert.equal(Object.isFrozen(observation.outcome), true);
    assertFrozenOutcomeValue(observation.outcome);
  }
}

function assertFrozenOutcomeValue(outcome: CheckOutcome): void {
  if (outcome.status === "passed" || outcome.status === "failed") {
    assert.equal(Object.isFrozen(outcome.data), true);
    return;
  }
  if (outcome.reason !== undefined) assert.equal(Object.isFrozen(outcome.reason), true);
}
