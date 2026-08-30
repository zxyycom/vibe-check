import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CheckResult, DependencyReadResult } from "../../check/check.ts";
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
  it("admits all settled dependency outcomes and limits reads to direct dependencies", async () => {
    await assertSettledDependencyReads();
    await assertDirectDependencyReads();
  });

  async function assertSettledDependencyReads(): Promise<void> {
    for (const upstreamCase of upstreamReadCases()) {
      await assertSingleSettledDependencyRead(upstreamCase);
    }
  }

  function upstreamReadCases(): readonly Readonly<{
    readonly expectedRead: DependencyReadResult;
    readonly terminalResult: CheckResult;
  }>[] {
    return [
      {
        terminalResult: { status: "passed", data: { source: "passed" } },
        expectedRead: {
          ok: true,
          checkId: "source",
          status: "passed",
          data: { source: "passed" }
        }
      },
      {
        terminalResult: { status: "failed", data: { source: "failed" } },
        expectedRead: {
          ok: true,
          checkId: "source",
          status: "failed",
          data: { source: "failed" }
        }
      },
      {
        terminalResult: { status: "not-applicable" },
        expectedRead: {
          ok: false,
          error: {
            code: "upstream-data-unavailable",
            checkId: "source",
            status: "not-applicable"
          }
        }
      },
      {
        terminalResult: { status: "unavailable", reason: { code: "source-unavailable" } },
        expectedRead: {
          ok: false,
          error: {
            code: "upstream-data-unavailable",
            checkId: "source",
            status: "unavailable"
          }
        }
      }
    ];
  }

  async function assertSingleSettledDependencyRead(
    upstreamCase: Readonly<{
      readonly expectedRead: DependencyReadResult;
      readonly terminalResult: CheckResult;
    }>
  ): Promise<void> {
    let dependentCalls = 0;
    let observedRead: DependencyReadResult | undefined;
    const execution = await executeResolvedChecks({
      checks: [
        normalized(() => upstreamCase.terminalResult, { checkId: "source", displayName: "Source" }),
        normalized(
          (context) => {
            dependentCalls += 1;
            assert.equal(Object.isFrozen(context), true);
            const { dependencies } = context;
            assert.equal(Object.isFrozen(dependencies), true);
            observedRead = dependencies.get("source");
            assert.equal(Object.isFrozen(observedRead), true);
            if (!observedRead.ok) assert.equal(Object.isFrozen(observedRead.error), true);
            return { status: "passed", data: { dependent: true } };
          },
          { checkId: "dependent", dependsOn: ["source"], displayName: "Dependent" }
        )
      ],
      maxParallel: 1,
      project: PROJECT,
      signal: undefined
    });
    assert.equal(execution.kind, "completed");
    assert.equal(dependentCalls, 1);
    assert.deepEqual(observedRead, upstreamCase.expectedRead);
    assertReadableDependencyData(observedRead, outcomeFor(execution, "source"));
    assert.deepEqual(outcomeFor(execution, "dependent"), {
      status: "passed",
      data: { dependent: true }
    });
  }

  function assertReadableDependencyData(
    observedRead: DependencyReadResult | undefined,
    sourceOutcome: ReturnType<typeof outcomeFor>
  ): void {
    if (
      observedRead?.ok &&
      (sourceOutcome.status === "passed" || sourceOutcome.status === "failed")
    ) {
      assert.equal(observedRead.data, sourceOutcome.data);
    }
  }

  async function assertDirectDependencyReads(): Promise<void> {
    let directRead: DependencyReadResult | undefined;
    let transitiveRead: DependencyReadResult | undefined;
    let malformedRead: unknown;
    const observations: DiagnosticObservation[] = [];
    const directOnly = await executeResolvedChecks({
      checks: [
        normalized(() => ({ status: "passed", data: { source: true } }), {
          checkId: "source",
          displayName: "Source"
        }),
        normalized(() => ({ status: "passed", data: { middle: true } }), {
          checkId: "middle",
          dependsOn: ["source"],
          displayName: "Middle"
        }),
        normalized(
          (context) => {
            const { dependencies } = context;
            directRead = dependencies.get("middle");
            transitiveRead = dependencies.get("source");
            malformedRead = Reflect.apply(
              (checkId: string) => dependencies.get(checkId),
              undefined,
              [42]
            );
            return { status: "passed", data: { dependent: true } };
          },
          {
            checkId: "dependent",
            dependsOn: ["middle"],
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
    assert.deepEqual(directRead, {
      ok: true,
      checkId: "middle",
      status: "passed",
      data: { middle: true }
    });
    const middleOutcome = outcomeFor(directOnly, "middle");
    if (directRead?.ok && middleOutcome.status === "passed") {
      assert.equal(directRead.data, middleOutcome.data);
    }
    assert.deepEqual(transitiveRead, {
      ok: false,
      error: { code: "dependency-not-declared", checkId: "source" }
    });
    assert.deepEqual(malformedRead, {
      ok: false,
      error: { code: "dependency-not-declared", checkId: "" }
    });
    assert.deepEqual(
      observations
        .filter(
          (observation) =>
            hasDiagnosticTags(observation, "CHECK:dependent", "EXECUTION") &&
            observation.event === "dependency.read"
        )
        .map((observation) => observation.details),
      [
        {
          hasData: true,
          ok: true,
          producer: "middle",
          status: "passed"
        },
        {
          error: { code: "dependency-not-declared", checkId: "source" },
          ok: false,
          requestedCheckId: "source"
        },
        {
          error: { code: "dependency-not-declared", checkId: "" },
          ok: false,
          requestedCheckId: 42
        }
      ]
    );
  }
});
