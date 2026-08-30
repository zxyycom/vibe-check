import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import { executeResolvedChecks } from "./resolved-checks.ts";
import {
  PROJECT,
  hasDiagnosticTags,
  normalized,
  outcomeFor,
  recordingLogger
} from "./resolved-checks.test-support.ts";

describe("Package Run direct Check execution", () => {
  it("canonicalizes continue fallbacks and retains preflight messages through execution settlement", async () => {
    let frozenFallback = false;
    const observations: DiagnosticObservation[] = [];
    const result = await executeResolvedChecks({
      checks: [
        normalized(
          (context) => {
            frozenFallback = Object.isFrozen(context.options);
            assert.deepEqual(context.options, { value: 2 });
            return {
              status: "passed",
              data: {},
              messages: [{ level: "info", code: "execution", message: "Execution message" }]
            };
          },
          {
            checkId: "continued",
            preflight: () => ({
              status: "failure",
              action: "continue",
              reason: { code: "fallback" },
              fallback: { value: 2 },
              messages: [{ level: "warning", code: "preflight", message: "Preflight message" }]
            })
          }
        ),
        normalized(
          () => {
            throw new Error("contained");
          },
          {
            checkId: "throws",
            preflight: () => ({
              status: "success",
              preparedOptions: {},
              messages: [{ level: "warning", code: "preflight", message: "Retained on throw" }]
            })
          }
        )
      ],
      diagnosticLogger: recordingLogger(observations),
      maxParallel: 2,
      project: PROJECT,
      signal: undefined
    });
    assert.equal(result.kind, "completed");
    assert.equal(frozenFallback, true);
    assert.deepEqual(result.checkMessages, [
      { checkId: "continued", level: "warning", code: "preflight", message: "Preflight message" },
      { checkId: "continued", level: "info", code: "execution", message: "Execution message" },
      { checkId: "throws", level: "warning", code: "preflight", message: "Retained on throw" }
    ]);
    assert.deepEqual(outcomeFor(result, "throws"), {
      status: "unavailable",
      reason: { code: "execution-threw" }
    });
    assert.deepEqual(
      observations.find(
        (observation) =>
          hasDiagnosticTags(observation, "CHECK:continued", "PREFLIGHT") &&
          observation.event === "preflight.resolved"
      )?.details,
      {
        messages: [{ level: "warning", code: "preflight", message: "Preflight message" }],
        options: { availability: "available", bytes: 11, keys: 1, shape: "object" },
        reason: { code: "fallback" }
      }
    );
    assert.equal(
      observations.some((observation) => observation.event === "preflight.resolved"),
      true
    );
    assert.equal(
      observations.some((observation) => observation.event === "callback.threw"),
      true
    );
  });
});
