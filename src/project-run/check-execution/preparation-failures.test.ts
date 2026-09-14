import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import { executeResolvedChecks } from "./resolved-checks.ts";
import {
  PROJECT,
  checkDiagnosticTag,
  diagnosticDetailsRecord,
  hasDiagnosticTags,
  normalized,
  outcomeFor,
  recordingLogger
} from "./resolved-checks.test-support.ts";

describe("Package Run direct Check execution", () => {
  it("fails closed for thrown, malformed, and noncanonical preparation results", async () => {
    const fixture = await executePreparationFailureFixture();
    assertPreparationFailureOutcomes(fixture);
    assertPreparationFailureDiagnostics(fixture);
  });

  async function executePreparationFailureFixture() {
    const cyclicPreparedOptions: { self?: unknown } = {};
    cyclicPreparedOptions.self = cyclicPreparedOptions;
    const preparationError = { code: "contained-preparation-failure" };
    const noncanonicalOutput = {
      status: "success" as const,
      preparedOptions: cyclicPreparedOptions
    };
    const malformedMessageOutput = {
      status: "failure" as const,
      action: "continue" as const,
      reason: { code: "fallback" },
      fallback: {},
      messages: [{ level: "warning" as const, code: "preparation", message: "Invalid level" }]
    };
    Object.defineProperty(malformedMessageOutput.messages[0], "level", { value: "notice" });
    const executions: string[] = [];
    const observations: DiagnosticObservation[] = [];
    const result = await executeResolvedChecks({
      checks: [
        normalized(
          () => {
            executions.push("throwing");
            return { status: "passed", data: {} };
          },
          {
            checkId: "throwing",
            prepare: () => {
              // oxlint-disable-next-line typescript/only-throw-error -- This adversarial fixture must preserve a plain thrown object as unknown diagnostic evidence.
              throw preparationError;
            }
          }
        ),
        normalized(
          () => {
            executions.push("block-with-fallback");
            return { status: "passed", data: {} };
          },
          {
            checkId: "block-with-fallback",
            prepare: () => {
              const blocked = {
                status: "failure" as const,
                action: "block" as const,
                reason: { code: "invalid-options" }
              };
              Object.defineProperty(blocked, "fallback", { enumerable: true, value: undefined });
              return blocked;
            }
          }
        ),
        normalized(
          () => {
            executions.push("noncanonical-options");
            return { status: "passed", data: {} };
          },
          {
            checkId: "noncanonical-options",
            prepare: () => noncanonicalOutput
          }
        ),
        normalized(
          () => {
            executions.push("malformed-message");
            return { status: "passed", data: {} };
          },
          {
            checkId: "malformed-message",
            prepare: () => malformedMessageOutput
          }
        )
      ],
      diagnosticLogger: recordingLogger(observations),
      maxParallel: 2,
      project: PROJECT,
      signal: undefined
    });
    return {
      executions,
      malformedMessageOutput,
      noncanonicalOutput,
      observations,
      preparationError,
      result
    };
  }

  type PreparationFailureFixture = Awaited<ReturnType<typeof executePreparationFailureFixture>>;

  function assertPreparationFailureOutcomes(fixture: PreparationFailureFixture): void {
    const { executions, result } = fixture;
    assert.equal(result.kind, "completed");
    assert.deepEqual(executions, []);
    assert.deepEqual(outcomeFor(result, "throwing"), {
      status: "unavailable",
      reason: { code: "preparation-threw" }
    });
    for (const checkId of ["block-with-fallback", "malformed-message", "noncanonical-options"]) {
      assert.deepEqual(outcomeFor(result, checkId), {
        status: "unavailable",
        reason: { code: "invalid-preparation-result" }
      });
    }
  }

  function assertPreparationFailureDiagnostics(fixture: PreparationFailureFixture): void {
    const { malformedMessageOutput, noncanonicalOutput, observations, preparationError } = fixture;
    const preparationObservations = observations.filter(
      (observation) => observation.event === "preparation.resolved"
    );
    assert.equal(preparationObservations.length, 4);
    assert.equal(new Set(preparationObservations.map(checkDiagnosticTag)).size, 4);
    assert.equal(
      observations.some(
        (observation) =>
          observation.event === "preparation.started" ||
          observation.event === "preparation.finished"
      ),
      false
    );
    const throwingDetails = observations.find((observation) =>
      hasDiagnosticTags(observation, "CHECK:throwing", "PREPARATION")
    )?.details;
    const noncanonicalDetails = observations.find((observation) =>
      hasDiagnosticTags(observation, "CHECK:noncanonical-options", "PREPARATION")
    )?.details;
    const malformedMessageDetails = observations.find((observation) =>
      hasDiagnosticTags(observation, "CHECK:malformed-message", "PREPARATION")
    )?.details;
    assert.equal(diagnosticDetailsRecord(throwingDetails).error, preparationError);
    assert.equal(diagnosticDetailsRecord(noncanonicalDetails).raw, noncanonicalOutput);
    assert.equal(diagnosticDetailsRecord(malformedMessageDetails).raw, malformedMessageOutput);
    assert.equal(
      observations.filter(
        (observation) =>
          observation.event === "preparation.resolved" &&
          hasDiagnosticTags(observation, "MALFORMED")
      ).length,
      3
    );
  }
});
