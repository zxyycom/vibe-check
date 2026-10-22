import { createProjectContextSource } from "../project-context.ts";
import { defineContextCallback } from "../../package-tools/context-callback/define-context-callback.ts";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CheckResult, DependencyReadResult } from "../../check/check.ts";
import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import type { CheckSettledFact, CheckStartedFact } from "./lifecycle.ts";
import { executeResolvedChecks, type ResolvedCheckExecutionInput } from "./resolved-checks.ts";
import {
  PROJECT,
  deferred,
  hasDiagnosticTags,
  normalized,
  outcomeFor,
  recordingLogger
} from "./resolved-checks.test-support.ts";

describe("Package Run direct Check execution", () => {
  it("runs each independent preparation inside its admitted Task lifecycle", async () => {
    const firstPreparation = deferred<{
      readonly status: "success";
      readonly preparedOptions: object;
    }>();
    const events: string[] = [];
    const execution = executeTaskLocalChecks({
      checks: [
        normalized(
          () => {
            events.push("first-execution");
            return { status: "passed", data: {} };
          },
          {
            checkId: "first",
            maxParallel: 2,
            prepare: async (_options) => {
              events.push("first-preparation");
              return firstPreparation.promise;
            }
          }
        ),
        normalized(
          () => {
            events.push("second-execution");
            return { status: "passed", data: {} };
          },
          {
            checkId: "second",
            maxParallel: 2,
            prepare: (options) => {
              events.push("second-preparation");
              return { status: "success", preparedOptions: options };
            }
          }
        )
      ],
      maxParallel: 2
    });
    await Promise.resolve();
    assert.deepEqual(events, ["first-preparation", "second-preparation"]);
    firstPreparation.resolve({ status: "success", preparedOptions: {} });
    const result = await execution;
    assert.equal(result.kind, "completed");
    assert.deepEqual(events, [
      "first-preparation",
      "second-preparation",
      "second-execution",
      "first-execution"
    ]);
  });

  it("blocks success dependents before their preparation and lets observers read the terminal result", async () => {
    let observed: DependencyReadResult | undefined;
    const started: CheckStartedFact[] = [];
    const settled: CheckSettledFact[] = [];
    const observations: DiagnosticObservation[] = [];
    const result = await executeTaskLocalChecks({
      checks: [
        normalized(
          () => {
            throw new Error("blocked callback must not execute");
          },
          {
            checkId: "blocked",
            prepare: () => ({
              status: "failure",
              action: "block",
              reason: { code: "invalid-options" },
              messages: [
                { level: "warning", code: "invalid-options", message: "Use valid options" }
              ]
            })
          }
        ),
        normalized(
          () => {
            throw new Error("blocked dependent callback must not execute");
          },
          {
            checkId: "dependent",
            dependsOn: ["blocked"],
            prepare: () => {
              throw new Error("blocked dependent preparation must not execute");
            }
          }
        ),
        normalized(
          defineContextCallback("check.execute", {
            contextNeeds: ["dependencies"],
            callback: (options, context) => {
              observed = context.dependencies.get("blocked");
              return { status: "passed", data: {} };
            }
          }),
          { checkId: "observer", observes: ["blocked"] }
        )
      ],
      diagnosticLogger: recordingLogger(observations),
      checkLifecycle: {
        started: (fact) => started.push(fact),
        settled: (fact) => settled.push(fact)
      },
      maxParallel: 1
    });
    assert.equal(result.kind, "completed");
    assert.deepEqual(observed, {
      ok: false,
      error: {
        code: "upstream-data-unavailable",
        checkId: "blocked",
        status: "unavailable"
      }
    });
    assert.deepEqual(outcomeFor(result, "observer"), { status: "passed", data: {} });
    assert.deepEqual(
      started.map((fact) => fact.checkId),
      ["observer"]
    );
    assert.deepEqual(result.checkDurations, [
      { checkId: "blocked", durationMs: null },
      { checkId: "dependent", durationMs: null },
      { checkId: "observer", durationMs: result.checkDurations[2]?.durationMs }
    ]);
    assert.deepEqual(outcomeFor(result, "blocked"), {
      status: "unavailable",
      reason: { code: "invalid-options" }
    });
    assert.deepEqual(outcomeFor(result, "dependent"), {
      status: "unavailable",
      reason: { code: "dependency-not-passed", checkIds: ["blocked"] }
    });
    assert.deepEqual(result.checkMessages, [
      {
        checkId: "blocked",
        level: "warning",
        code: "invalid-options",
        message: "Use valid options"
      }
    ]);
    assert.equal(settled.find((fact) => fact.checkId === "blocked")?.durationMs, null);
    assert.deepEqual(
      observations.find(
        (observation) =>
          hasDiagnosticTags(observation, "CHECK:blocked", "PREPARATION") &&
          observation.event === "preparation.resolved"
      )?.details,
      {
        messages: [{ level: "warning", code: "invalid-options", message: "Use valid options" }],
        outcome: { status: "unavailable", reason: { code: "invalid-options" } },
        reason: { code: "invalid-options" }
      }
    );
    assert.equal(
      observations.filter(
        (observation) =>
          hasDiagnosticTags(observation, "CHECK:blocked", "PREPARATION") &&
          observation.event === "preparation.resolved"
      ).length,
      1
    );
    assert.deepEqual(
      observations.find(
        (observation) =>
          hasDiagnosticTags(observation, "CHECK:blocked", "PREPARATION") &&
          observation.event === "check.finished"
      )?.details,
      {
        durationMs: null,
        messageCount: 1,
        phase: "preparation",
        reasonCode: "invalid-options",
        status: "unavailable"
      }
    );
  });

  it("settles every direct non-passed prerequisite before dependent author work", async () => {
    for (const terminalResult of nonPassedResults()) {
      let dependentPreparationCalls = 0;
      let dependentExecutionCalls = 0;
      const result = await executeTaskLocalChecks({
        checks: [
          normalized(() => terminalResult, { checkId: "source", displayName: "Source" }),
          normalized(
            () => {
              dependentExecutionCalls += 1;
              return { status: "passed", data: {} };
            },
            {
              checkId: "dependent",
              dependsOn: ["source"],
              prepare: () => {
                dependentPreparationCalls += 1;
                return { status: "success", preparedOptions: {} };
              }
            }
          )
        ],
        maxParallel: 1
      });

      assert.equal(result.kind, "completed");
      assert.equal(dependentPreparationCalls, 0);
      assert.equal(dependentExecutionCalls, 0);
      assert.deepEqual(outcomeFor(result, "dependent"), {
        status: "unavailable",
        reason: { code: "dependency-not-passed", checkIds: ["source"] }
      });
      assert.deepEqual(
        result.checkDurations.find(({ checkId }) => checkId === "dependent"),
        { checkId: "dependent", durationMs: null }
      );
    }
  });

  it("makes a scheduler-blocked outcome available to its terminal observer", async () => {
    let observed: DependencyReadResult | undefined;
    const result = await executeTaskLocalChecks({
      checks: [
        normalized(() => ({ status: "failed", data: {} }), { checkId: "source" }),
        normalized(() => ({ status: "passed", data: {} }), {
          checkId: "blocked",
          dependsOn: ["source"]
        }),
        normalized(
          defineContextCallback("check.execute", {
            contextNeeds: ["dependencies"],
            callback: (options, { dependencies }) => {
              observed = dependencies.get("blocked");
              return { status: "passed", data: {} };
            }
          }),
          { checkId: "observer", observes: ["blocked"] }
        )
      ],
      maxParallel: 1
    });

    assert.equal(result.kind, "completed");
    assert.deepEqual(observed, {
      ok: false,
      error: {
        code: "upstream-data-unavailable",
        checkId: "blocked",
        status: "unavailable"
      }
    });
    assert.deepEqual(outcomeFor(result, "blocked"), {
      status: "unavailable",
      reason: { code: "dependency-not-passed", checkIds: ["source"] }
    });
  });
});

/** Gives each task-local fixture a fresh project, selection barrier, and noncancelled Run. */
function executeTaskLocalChecks(
  input: Pick<
    ResolvedCheckExecutionInput,
    "checks" | "maxParallel" | "diagnosticLogger" | "checkLifecycle"
  >
) {
  return executeResolvedChecks({
    ...input,
    invocationLifecycle: { selectionSettled: () => undefined },
    project: createProjectContextSource(PROJECT),
    signal: undefined
  });
}

function nonPassedResults(): readonly CheckResult[] {
  return [
    { status: "failed", data: {} },
    { status: "not-applicable", reason: { code: "not-needed" } },
    { status: "unavailable", reason: { code: "source-unavailable" } }
  ];
}
