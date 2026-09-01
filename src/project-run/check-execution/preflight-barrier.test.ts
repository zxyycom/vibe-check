import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import type { CheckSettledFact, CheckStartedFact } from "./lifecycle.ts";
import { executeResolvedChecks } from "./resolved-checks.ts";
import {
  PROJECT,
  deferred,
  hasDiagnosticTags,
  normalized,
  outcomeFor,
  recordingLogger
} from "./resolved-checks.test-support.ts";

describe("Package Run direct Check execution", () => {
  it("finishes every sequential preflight before any author execution", assertSequentialPreflights);

  async function assertSequentialPreflights(): Promise<void> {
    const firstPreflight = deferred<{
      readonly status: "success";
      readonly preparedOptions: object;
    }>();
    const events: string[] = [];
    const execution = executeResolvedChecks({
      checks: [
        normalized(
          () => {
            events.push("first-execution");
            return { status: "passed", data: {} };
          },
          {
            checkId: "first",
            preflight: async (_options) => {
              events.push("first-preflight");
              return firstPreflight.promise;
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
            preflight: (options) => {
              events.push("second-preflight");
              return { status: "success", preparedOptions: options };
            }
          }
        )
      ],
      maxParallel: 2,
      project: PROJECT,
      signal: undefined
    });
    await Promise.resolve();
    assert.deepEqual(events, ["first-preflight"]);
    firstPreflight.resolve({ status: "success", preparedOptions: {} });
    const result = await execution;
    assert.equal(result.kind, "completed");
    assert.deepEqual(events, [
      "first-preflight",
      "second-preflight",
      "first-execution",
      "second-execution"
    ]);
  }

  it("settles blocked preflights before graph admission without a started fact or duration", async () => {
    const started: CheckStartedFact[] = [];
    const settled: CheckSettledFact[] = [];
    const observations: DiagnosticObservation[] = [];
    const result = await executeResolvedChecks({
      checks: [
        normalized(
          () => {
            throw new Error("blocked callback must not execute");
          },
          {
            checkId: "blocked",
            preflight: () => ({
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
          (context) => {
            assert.deepEqual(context.dependencies.get("blocked"), {
              ok: false,
              error: {
                code: "upstream-data-unavailable",
                checkId: "blocked",
                status: "unavailable"
              }
            });
            return { status: "passed", data: {} };
          },
          { checkId: "dependent", dependsOn: ["blocked"] }
        )
      ],
      diagnosticLogger: recordingLogger(observations),
      lifecycle: {
        preparationCompleted: () => undefined,
        started: (fact) => started.push(fact),
        settled: (fact) => settled.push(fact)
      },
      maxParallel: 1,
      project: PROJECT,
      signal: undefined
    });
    assert.equal(result.kind, "completed");
    assert.deepEqual(
      started.map((fact) => fact.checkId),
      ["dependent"]
    );
    assert.deepEqual(result.checkDurations, [
      { checkId: "blocked", durationMs: null },
      { checkId: "dependent", durationMs: result.checkDurations[1]?.durationMs }
    ]);
    assert.deepEqual(outcomeFor(result, "blocked"), {
      status: "unavailable",
      reason: { code: "invalid-options" }
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
          hasDiagnosticTags(observation, "CHECK:blocked", "PREFLIGHT") &&
          observation.event === "preflight.resolved"
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
          hasDiagnosticTags(observation, "CHECK:blocked", "PREFLIGHT") &&
          observation.event === "preflight.resolved"
      ).length,
      1
    );
    assert.deepEqual(
      observations.find(
        (observation) =>
          hasDiagnosticTags(observation, "CHECK:blocked", "PREFLIGHT") &&
          observation.event === "check.finished"
      )?.details,
      {
        durationMs: null,
        messages: [{ level: "warning", code: "invalid-options", message: "Use valid options" }],
        reason: { code: "invalid-options" }
      }
    );
  });
});
