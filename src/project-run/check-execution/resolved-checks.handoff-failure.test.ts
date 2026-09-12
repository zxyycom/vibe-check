import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CheckResult } from "../../check/check.ts";
import { defineCheck } from "../../check/check.ts";
import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import { executeResolvedChecks } from "./resolved-checks.ts";
import {
  PROJECT,
  definedHandoff,
  normalized,
  recordingLogger
} from "./resolved-checks.test-support.ts";

describe("Package Run direct Check handoff execution", () => {
  it("rejects malformed declared handoff results before a direct dependent can read them", async () => {
    await assertMalformedHandoffResults();
    await assertUnflaggedHandoffResults();
  });
});

async function assertMalformedHandoffResults(): Promise<void> {
  const malformedResults: readonly Readonly<{
    readonly expectedStatus: "passed" | "failed" | "not-applicable" | "unavailable";
    readonly mutate: (terminal: CheckResult<object, Map<string, Uint8Array>>) => void;
  }>[] = [
    {
      expectedStatus: "unavailable",
      mutate: (terminal) => Reflect.deleteProperty(terminal, "handoff")
    },
    { expectedStatus: "unavailable", mutate: (terminal) => Reflect.set(terminal, "handoff", null) },
    { expectedStatus: "unavailable", mutate: (terminal) => Reflect.set(terminal, "handoff", 42) },
    {
      expectedStatus: "unavailable",
      mutate: (terminal) => Reflect.set(terminal, "status", "failed")
    },
    {
      expectedStatus: "unavailable",
      mutate: (terminal) => {
        Reflect.set(terminal, "status", "not-applicable");
        Reflect.deleteProperty(terminal, "data");
      }
    },
    {
      expectedStatus: "unavailable",
      mutate: (terminal) => {
        Reflect.set(terminal, "status", "unavailable");
        Reflect.deleteProperty(terminal, "data");
        Reflect.set(terminal, "reason", { code: "unavailable" });
      }
    }
  ];
  for (const malformedResult of malformedResults) {
    const provider = defineCheck({
      checkId: "malformed-handoff",
      displayName: "Malformed handoff",
      handoff: true,
      execution: () => malformedHandoffResult(malformedResult.mutate)
    });
    let read: unknown;
    const result = await executeResolvedChecks({
      checks: [
        normalized(provider.execution, {
          checkId: provider.checkId,
          displayName: provider.displayName,
          handoff: definedHandoff(provider)
        }),
        normalized(
          ({ dependencies }) => {
            read = dependencies.get(provider);
            return { status: "passed", data: { dependent: true } };
          },
          {
            checkId: "malformed-handoff-consumer",
            dependsOn: ["malformed-handoff"],
            displayName: "Malformed handoff consumer"
          }
        )
      ],
      maxParallel: 2,
      project: PROJECT,
      signal: undefined
    });
    assert.equal(result.kind, "completed");
    assert.equal(result.snapshot.checks[0]?.outcome.status, malformedResult.expectedStatus);
    assert.equal(read, undefined);
  }
}

async function assertUnflaggedHandoffResults(): Promise<void> {
  const statuses = ["passed", "failed", "not-applicable", "unavailable"] as const;
  for (const status of statuses) {
    const provider = defineCheck({
      checkId: "unflagged-handoff",
      displayName: "Unflagged handoff",
      execution: () => unflaggedHandoffResult(status)
    });
    let read: unknown;
    const observations: DiagnosticObservation[] = [];
    const result = await executeResolvedChecks({
      checks: [
        normalized(provider.execution!, {
          checkId: provider.checkId,
          displayName: provider.displayName
        }),
        normalized(
          ({ dependencies }) => {
            read = dependencies.get("unflagged-handoff");
            return { status: "passed", data: { dependent: true } };
          },
          {
            checkId: "unflagged-handoff-consumer",
            dependsOn: ["unflagged-handoff"],
            displayName: "Unflagged handoff consumer"
          }
        )
      ],
      diagnosticLogger: recordingLogger(observations),
      maxParallel: 2,
      project: PROJECT,
      signal: undefined
    });
    assert.equal(result.kind, "completed");
    assert.equal(result.snapshot.checks[0]?.outcome.status, "unavailable");
    assert.equal(read, undefined);
    assert.doesNotMatch(
      JSON.stringify(
        observations.find((observation) => observation.event === "callback.malformed")
      ),
      /unflagged-handoff-secret/
    );
  }
}

function malformedHandoffResult(
  mutate: (terminal: CheckResult<object, Map<string, Uint8Array>>) => void
): CheckResult<object, Map<string, Uint8Array>> {
  const terminal: CheckResult<object, Map<string, Uint8Array>> = {
    status: "passed",
    data: {},
    handoff: new Map()
  };
  mutate(terminal);
  return terminal;
}

function unflaggedHandoffResult(
  status: "passed" | "failed" | "not-applicable" | "unavailable"
): CheckResult {
  let terminal: CheckResult;
  switch (status) {
    case "passed":
    case "failed":
      terminal = { status, data: {} };
      break;
    case "not-applicable":
      terminal = { status };
      break;
    case "unavailable":
      terminal = { status, reason: { code: "unavailable" } };
      break;
  }
  Reflect.set(terminal, "handoff", Object.freeze({ secret: "unflagged-handoff-secret" }));
  return terminal;
}
