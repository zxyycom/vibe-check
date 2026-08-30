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
  it("fails closed for thrown, malformed, and noncanonical preflight results", async () => {
    const fixture = await executePreflightFailureFixture();
    assertPreflightFailureOutcomes(fixture);
    assertPreflightFailureDiagnostics(fixture);
  });

  async function executePreflightFailureFixture() {
    const cyclicPreparedOptions: { self?: unknown } = {};
    cyclicPreparedOptions.self = cyclicPreparedOptions;
    const preflightError = { code: "contained-preflight-failure" };
    const noncanonicalOutput = {
      status: "success" as const,
      preparedOptions: cyclicPreparedOptions
    };
    const malformedMessageOutput = {
      status: "failure" as const,
      action: "continue" as const,
      reason: { code: "fallback" },
      fallback: {},
      messages: [{ level: "warning" as const, code: "preflight", message: "Invalid level" }]
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
            preflight: () => {
              throw preflightError;
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
            preflight: () => {
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
            preflight: () => noncanonicalOutput
          }
        ),
        normalized(
          () => {
            executions.push("malformed-message");
            return { status: "passed", data: {} };
          },
          {
            checkId: "malformed-message",
            preflight: () => malformedMessageOutput
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
      preflightError,
      result
    };
  }

  type PreflightFailureFixture = Awaited<ReturnType<typeof executePreflightFailureFixture>>;

  function assertPreflightFailureOutcomes(fixture: PreflightFailureFixture): void {
    const { executions, result } = fixture;
    assert.equal(result.kind, "completed");
    assert.deepEqual(executions, []);
    assert.deepEqual(outcomeFor(result, "throwing"), {
      status: "unavailable",
      reason: { code: "preflight-threw" }
    });
    for (const checkId of ["block-with-fallback", "malformed-message", "noncanonical-options"]) {
      assert.deepEqual(outcomeFor(result, checkId), {
        status: "unavailable",
        reason: { code: "invalid-preflight-result" }
      });
    }
  }

  function assertPreflightFailureDiagnostics(fixture: PreflightFailureFixture): void {
    const { malformedMessageOutput, noncanonicalOutput, observations, preflightError } = fixture;
    const preflightObservations = observations.filter(
      (observation) => observation.event === "preflight.resolved"
    );
    assert.equal(preflightObservations.length, 4);
    assert.equal(new Set(preflightObservations.map(checkDiagnosticTag)).size, 4);
    assert.equal(
      observations.some(
        (observation) =>
          observation.event === "preflight.started" || observation.event === "preflight.finished"
      ),
      false
    );
    const throwingDetails = observations.find((observation) =>
      hasDiagnosticTags(observation, "CHECK:throwing", "PREFLIGHT")
    )?.details;
    const noncanonicalDetails = observations.find((observation) =>
      hasDiagnosticTags(observation, "CHECK:noncanonical-options", "PREFLIGHT")
    )?.details;
    const malformedMessageDetails = observations.find((observation) =>
      hasDiagnosticTags(observation, "CHECK:malformed-message", "PREFLIGHT")
    )?.details;
    assert.equal(diagnosticDetailsRecord(throwingDetails).error, preflightError);
    assert.equal(diagnosticDetailsRecord(noncanonicalDetails).raw, noncanonicalOutput);
    assert.equal(diagnosticDetailsRecord(malformedMessageDetails).raw, malformedMessageOutput);
    assert.equal(
      observations.filter(
        (observation) =>
          observation.event === "preflight.resolved" && hasDiagnosticTags(observation, "MALFORMED")
      ).length,
      3
    );
  }
});
