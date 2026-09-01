import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import type { CheckExecutionLifecycle, CheckSettledFact, CheckStartedFact } from "./lifecycle.ts";
import { executeResolvedChecks } from "./resolved-checks.ts";
import {
  PROJECT,
  deferred,
  execute,
  hasDiagnosticTags,
  normalized,
  recordingLogger,
  scriptedClock
} from "./resolved-checks.test-support.ts";

describe("Package Run direct Check execution", () => {
  it("hands final Check-facts outcomes and one finite duration to the private lifecycle", async () => {
    const started: unknown[] = [];
    const settled: unknown[] = [];
    const lifecycle: CheckExecutionLifecycle = Object.freeze({
      preparationCompleted: () => undefined,
      started: (fact: CheckStartedFact): void => {
        started.push(fact);
      },
      settled: (fact: CheckSettledFact): void => {
        settled.push(fact);
      }
    });
    const result = await execute(() => ({ status: "failed", data: { failures: 1 } }), {
      clock: scriptedClock([12, 27]),
      lifecycle
    });

    assert.equal(result.kind, "completed");
    assert.deepEqual(started, [{ checkId: "direct-check", displayName: "direct-check" }]);
    assert.deepEqual(settled, [
      {
        checkId: "direct-check",
        displayName: "direct-check",
        outcome: { status: "failed", data: { failures: 1 } },
        durationMs: 15,
        messages: [],
        visibility: "always"
      }
    ]);
    assert.deepEqual(result.checkDurations, [{ checkId: "direct-check", durationMs: 15 }]);

    const nonFinite = await execute(() => ({ status: "passed", data: {} }), {
      clock: scriptedClock([Number.NaN, Number.POSITIVE_INFINITY])
    });
    assert.equal(nonFinite.checkDurations[0]?.durationMs, 0);
  });

  it("keeps completed lifecycle feedback in settlement order but durations in canonical order", async () => {
    const slowStarted = deferred<void>();
    const fastSettled = deferred<void>();
    const releaseSlow = deferred<void>();
    const events: string[] = [];
    const running = executeResolvedChecks({
      checks: [
        normalized(
          async () => {
            slowStarted.resolve(undefined);
            await releaseSlow.promise;
            return {
              status: "passed",
              data: {},
              messages: [{ level: "info", code: "slow-finished", message: "Slow finished" }]
            };
          },
          { checkId: "a-slow", displayName: "Slow", maxParallel: 2 }
        ),
        normalized(
          () => ({
            status: "passed",
            data: {},
            messages: [{ level: "warning", code: "fast-finished", message: "Fast finished" }]
          }),
          { checkId: "z-fast", displayName: "Fast", maxParallel: 2 }
        )
      ],
      clock: scriptedClock([10, 20, 30, 40]),
      lifecycle: Object.freeze({
        preparationCompleted: () => undefined,
        started: (fact: CheckStartedFact): void => {
          events.push(`started:${fact.checkId}`);
        },
        settled: (fact: CheckSettledFact): void => {
          events.push(`settled:${fact.checkId}`);
          if (fact.checkId === "z-fast") fastSettled.resolve(undefined);
        }
      }),
      maxParallel: 2,
      project: PROJECT,
      signal: undefined
    });

    await slowStarted.promise;
    await fastSettled.promise;
    releaseSlow.resolve(undefined);
    const result = await running;
    assert.equal(result.kind, "completed");
    assert.deepEqual(events, [
      "started:a-slow",
      "started:z-fast",
      "settled:z-fast",
      "settled:a-slow"
    ]);
    assert.deepEqual(result.checkDurations, [
      { checkId: "a-slow", durationMs: 30 },
      { checkId: "z-fast", durationMs: 10 }
    ]);
    assert.deepEqual(result.checkMessages, [
      { checkId: "a-slow", level: "info", code: "slow-finished", message: "Slow finished" },
      {
        checkId: "z-fast",
        level: "warning",
        code: "fast-finished",
        message: "Fast finished"
      }
    ]);
  });

  it("settles cancellation-before-start Checks without starting them", async () => {
    const controller = new AbortController();
    const observations: DiagnosticObservation[] = [];
    const cancelled = await executeResolvedChecks({
      checks: [
        normalized(
          () => {
            controller.abort();
            return { status: "passed", data: {} };
          },
          { checkId: "started", displayName: "Started" }
        ),
        normalized(() => ({ status: "passed", data: {} }), {
          checkId: "pending",
          displayName: "Pending"
        })
      ],
      diagnosticLogger: recordingLogger(observations),
      maxParallel: 1,
      project: PROJECT,
      signal: controller.signal
    });
    assert.equal(cancelled.kind, "cancelled");
    assert.deepEqual(
      cancelled.snapshot.checks.map((check) => check.outcome.status),
      ["unavailable", "unavailable"]
    );
    assert.deepEqual(
      observations
        .filter(
          (observation) =>
            hasDiagnosticTags(observation, "CHECK:pending", "EXECUTION") &&
            observation.event === "check.finished"
        )
        .map((observation) => ({ tags: observation.tags, details: observation.details })),
      [
        {
          tags: ["CHECK:pending", "EXECUTION", "FINISHED", "UNAVAILABLE"],
          details: {
            durationMs: null,
            reason: { code: "execution-cancelled" }
          }
        }
      ]
    );
  });
});
