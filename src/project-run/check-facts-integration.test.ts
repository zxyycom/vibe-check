import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { CheckAggregate, CheckAggregation, RunControls } from "./controls/contract.ts";
import { defineConfig } from "../project-definition/project-definition.ts";
import type { Check, CheckExecution } from "../check/check.ts";
import { validateMachinePublicationSetV4 } from "../machine-output/v4/validation.ts";
import { run } from "./run.ts";

const PASSED = Object.freeze({ status: "passed" as const, data: Object.freeze({ result: true }) });

type AggregationStatus = "passed" | "failed" | "not-applicable" | "unavailable";

function check(
  overrides: Readonly<{
    readonly checkId?: string;
    readonly execution?: CheckExecution;
  }> = {}
): Check {
  return {
    checkId: overrides.checkId ?? "custom",
    displayName: overrides.checkId ?? "Custom",
    execution: overrides.execution ?? (() => PASSED)
  };
}

function definition(checks: readonly Check[]) {
  return defineConfig({
    checks,
    outputs: {
      machinePublication: { enabled: false },
      progressRendering: { enabled: false }
    }
  });
}

function executionFor(status: AggregationStatus): CheckExecution {
  switch (status) {
    case "passed":
      return () => ({ status: "passed", data: {} });
    case "failed":
      return () => ({ status: "failed", data: {} });
    case "not-applicable":
      return () => ({ status: "not-applicable" });
    case "unavailable":
      return () => ({ status: "unavailable", reason: { code: "declared-unavailable" } });
  }
}

function aggregateSource(statuses: readonly AggregationStatus[]): Check[] {
  return statuses.map((status, index) =>
    check({ checkId: `${status}-${index}`, execution: executionFor(status) })
  );
}

function aggregation(
  checks: CheckAggregation["checks"],
  mode: CheckAggregation["mode"],
  unavailable: CheckAggregation["unavailable"],
  notApplicable: CheckAggregation["notApplicable"],
  empty: CheckAggregation["empty"]
): CheckAggregation {
  return Object.freeze({ checks, mode, unavailable, notApplicable, empty });
}

describe("Package Run Check facts integration", () => {
  it("contains invalid callback outcomes and Record misuse in the owning Check", async () => {
    const invalidCheck = check();
    Object.defineProperty(invalidCheck, "execution", {
      configurable: true,
      enumerable: true,
      value: () => Object.freeze({ status: "unexpected" }),
      writable: true
    });
    const invalidOutcome = await run(definition([invalidCheck]));
    assert.equal(invalidOutcome.kind, "completed");
    if (invalidOutcome.kind !== "completed") return;
    assert.deepEqual(invalidOutcome.snapshot.checks[0]?.outcome, {
      status: "unavailable",
      reason: { code: "invalid-execution-result" }
    });

    const forgedProductReason = check();
    Object.defineProperty(forgedProductReason, "execution", {
      configurable: true,
      enumerable: true,
      value: () => ({
        status: "unavailable",
        reason: { code: "forged", checkIds: ["custom"] }
      }),
      writable: true
    });
    const forgedResult = await run(definition([forgedProductReason]));
    assert.equal(forgedResult.kind, "completed");
    if (forgedResult.kind !== "completed") return;
    assert.deepEqual(forgedResult.snapshot.checks[0]?.outcome, {
      status: "unavailable",
      reason: { code: "invalid-execution-result" }
    });

    const acceptedAuthorCode = await run(
      definition([
        check({
          execution: () => ({
            status: "unavailable",
            reason: { code: "invalid-execution-result" },
            messages: [
              {
                level: "error",
                code: "author-diagnostic",
                message: "The author deliberately used this reason code"
              }
            ]
          })
        })
      ])
    );
    assert.equal(acceptedAuthorCode.kind, "completed");
    if (acceptedAuthorCode.kind !== "completed") return;
    assert.deepEqual(acceptedAuthorCode.checkMessages, [
      {
        checkId: "custom",
        level: "error",
        code: "author-diagnostic",
        message: "The author deliberately used this reason code"
      }
    ]);

    let retainedReporter:
      | Readonly<{ report(identity: { id: string }, data: object): void }>
      | undefined;
    const invalidRecord = await run(
      definition([
        check({
          execution: (context) => {
            retainedReporter = context.records;
            context.records.report({ id: "retained" }, { value: true });
            context.records.report({ id: "retained" }, { value: false });
            return {
              status: "passed",
              data: { result: true },
              messages: [
                { level: "warning", code: "retained", message: "This must not be accepted" }
              ]
            };
          }
        })
      ])
    );
    assert.equal(invalidRecord.kind, "completed");
    if (invalidRecord.kind !== "completed") return;
    assert.deepEqual(invalidRecord.snapshot.checks[0]?.outcome, {
      status: "unavailable",
      reason: { code: "record-conflict" }
    });
    assert.deepEqual(invalidRecord.snapshot.records, [
      { checkId: "custom", id: "retained", data: { value: true } }
    ]);
    assert.deepEqual(invalidRecord.checkMessages, []);
    assert.throws(() => retainedReporter?.report({ id: "late" }, {}), /reporter is closed/);

    const controller = new AbortController();
    const executionCancellation = await run(
      defineConfig({
        checks: [
          {
            checkId: "accepted",
            displayName: "Accepted",
            execution: () => ({
              status: "passed",
              data: {},
              messages: [{ level: "info", code: "settled", message: "Accepted before stop" }]
            })
          },
          {
            checkId: "stop",
            displayName: "Stop",
            dependsOn: ["accepted"],
            execution: () => {
              controller.abort();
              return PASSED;
            }
          },
          {
            checkId: "waiting",
            displayName: "Waiting",
            execution: () => PASSED
          }
        ],
        outputs: {
          machinePublication: { enabled: false },
          progressRendering: { enabled: false }
        },
        scheduler: { maxParallel: 1 }
      }),
      { signal: controller.signal }
    );
    assert.equal(executionCancellation.kind, "cancelled");
    if (executionCancellation.kind !== "cancelled" || executionCancellation.phase !== "execution")
      return;
    assert.deepEqual(executionCancellation.checkMessages, [
      {
        checkId: "accepted",
        level: "info",
        code: "settled",
        message: "Accepted before stop"
      }
    ]);
  });

  it("publishes raw facts and derives an aggregate only from explicit selected statuses", async () => {
    const source = definition([
      check({ checkId: "passed", execution: () => ({ status: "passed", data: { count: 1 } }) }),
      check({ checkId: "failed", execution: () => ({ status: "failed", data: { count: 0 } }) }),
      check({ checkId: "na", execution: () => ({ status: "not-applicable" }) })
    ]);
    const raw = await run(source);
    assert.equal(raw.kind, "completed");
    if (raw.kind !== "completed") return;
    assert.equal(raw.aggregate, null);
    assert.deepEqual(
      raw.snapshot.checks.map((coreCheck) => coreCheck.outcome.status),
      ["failed", "not-applicable", "passed"]
    );

    const aggregate = await run(source, {
      checkAggregation: {
        checks: ["passed", "na"],
        mode: "all",
        unavailable: "propagate",
        notApplicable: "pass",
        empty: "failed"
      }
    });
    assert.equal(aggregate.kind, "completed");
    if (aggregate.kind !== "completed") return;
    assert.equal(aggregate.aggregate, "passed");

    const aggregationTable: readonly Readonly<{
      readonly aggregation: CheckAggregation;
      readonly expected: CheckAggregate;
      readonly statuses: readonly AggregationStatus[];
    }>[] = [
      {
        statuses: ["passed"],
        aggregation: aggregation("all", "all", "propagate", "exclude", "failed"),
        expected: "passed"
      },
      {
        statuses: ["failed"],
        aggregation: aggregation("all", "any", "propagate", "exclude", "passed"),
        expected: "failed"
      },
      {
        statuses: ["passed", "failed"],
        aggregation: aggregation("all", "all", "propagate", "exclude", "failed"),
        expected: "failed"
      },
      {
        statuses: ["passed", "failed"],
        aggregation: aggregation("all", "any", "propagate", "exclude", "failed"),
        expected: "passed"
      },
      {
        statuses: ["passed", "failed"],
        aggregation: aggregation(["passed-0"], "all", "propagate", "exclude", "failed"),
        expected: "passed"
      },
      {
        statuses: [],
        aggregation: aggregation("all", "all", "propagate", "exclude", "passed"),
        expected: "passed"
      },
      {
        statuses: ["passed"],
        aggregation: aggregation([], "any", "propagate", "exclude", "failed"),
        expected: "failed"
      },
      {
        statuses: ["passed"],
        aggregation: aggregation([], "all", "propagate", "exclude", "not-applicable"),
        expected: "not-applicable"
      },
      {
        statuses: ["passed", "unavailable"],
        aggregation: aggregation("all", "all", "propagate", "exclude", "failed"),
        expected: "unavailable"
      },
      {
        statuses: ["passed", "unavailable"],
        aggregation: aggregation("all", "all", "fail", "exclude", "failed"),
        expected: "failed"
      },
      {
        statuses: ["passed", "unavailable"],
        aggregation: aggregation("all", "any", "fail", "exclude", "failed"),
        expected: "passed"
      },
      {
        statuses: ["passed", "unavailable"],
        aggregation: aggregation("all", "all", "exclude", "exclude", "failed"),
        expected: "passed"
      },
      {
        statuses: ["failed", "unavailable"],
        aggregation: aggregation("all", "any", "exclude", "exclude", "passed"),
        expected: "failed"
      },
      {
        statuses: ["not-applicable"],
        aggregation: aggregation("all", "all", "propagate", "exclude", "failed"),
        expected: "failed"
      },
      {
        statuses: ["failed", "not-applicable"],
        aggregation: aggregation("all", "all", "propagate", "pass", "failed"),
        expected: "failed"
      },
      {
        statuses: ["failed", "not-applicable"],
        aggregation: aggregation("all", "any", "propagate", "pass", "failed"),
        expected: "passed"
      },
      {
        statuses: ["passed", "not-applicable"],
        aggregation: aggregation("all", "all", "propagate", "fail", "failed"),
        expected: "failed"
      },
      {
        statuses: ["passed", "not-applicable"],
        aggregation: aggregation("all", "any", "propagate", "fail", "failed"),
        expected: "passed"
      },
      {
        statuses: ["passed", "not-applicable"],
        aggregation: aggregation("all", "all", "propagate", "exclude", "failed"),
        expected: "passed"
      }
    ];
    for (const testCase of aggregationTable) {
      const result = await run(definition(aggregateSource(testCase.statuses)), {
        checkAggregation: testCase.aggregation
      });
      assert.equal(result.kind, "completed");
      if (result.kind === "completed") assert.equal(result.aggregate, testCase.expected);
    }

    let calls = 0;
    const invalidSelection = await run(
      definition([
        check({
          execution: () => {
            calls += 1;
            return PASSED;
          }
        })
      ]),
      {
        checkAggregation: {
          checks: ["missing"],
          mode: "any",
          unavailable: "fail",
          notApplicable: "exclude",
          empty: "not-applicable"
        }
      }
    );
    assert.deepEqual(invalidSelection, {
      kind: "configuration",
      definitionWarnings: [],
      diagnostic: {
        kind: "invalid-run-controls",
        path: "controls.checkAggregation.checks",
        reason: "invalid-value"
      }
    });
    assert.equal(calls, 0);

    const duplicateSelection = await run(
      definition([
        check({
          execution: () => {
            calls += 1;
            return PASSED;
          }
        })
      ]),
      {
        checkAggregation: {
          checks: ["custom", "custom"],
          mode: "all",
          unavailable: "propagate",
          notApplicable: "exclude",
          empty: "not-applicable"
        }
      }
    );
    assert.deepEqual(duplicateSelection, invalidSelection);
    assert.equal(calls, 0);

    const sparse: unknown[] = [];
    sparse.length = 2;
    sparse[1] = "custom";
    const named = ["custom"];
    Object.defineProperty(named, "named", { enumerable: true, value: true });
    for (const malformedChecks of [sparse, named]) {
      const malformedControls: RunControls = {
        checkAggregation: {
          checks: ["custom"],
          mode: "all",
          unavailable: "propagate",
          notApplicable: "exclude",
          empty: "not-applicable"
        }
      };
      Object.defineProperty(malformedControls.checkAggregation, "checks", {
        configurable: true,
        enumerable: true,
        value: malformedChecks,
        writable: true
      });
      const malformedSelection = await run(
        definition([
          check({
            execution: () => {
              calls += 1;
              return PASSED;
            }
          })
        ]),
        malformedControls
      );
      assert.deepEqual(malformedSelection, invalidSelection);
      assert.equal(calls, 0);
    }

    const root = mkdtempSync(join(tmpdir(), "vibe-check-terminal-message-integration-"));
    try {
      let dependentCalls = 0;
      const integration = await run(
        defineConfig({
          checks: [
            {
              checkId: "attention-support",
              displayName: "Attention support",
              visibility: "attention",
              execution: (context) => {
                context.records.report({ id: "support-record" }, { retained: true });
                return { status: "passed", data: { supporting: true } };
              }
            },
            {
              checkId: "message-source",
              displayName: "Message source",
              execution: () => ({
                status: "passed",
                data: { source: true },
                messages: [
                  { level: "warning", code: "source-message", message: "Source needs review" }
                ]
              })
            },
            {
              checkId: "dependent",
              displayName: "Dependent",
              dependsOn: ["message-source"],
              execution: () => {
                dependentCalls += 1;
                return { status: "passed", data: { dependent: true } };
              }
            }
          ],
          outputs: {
            machinePublication: { directory: "machine", enabled: true },
            progressRendering: { enabled: false }
          }
        }),
        {
          checkAggregation: {
            checks: "all",
            mode: "all",
            unavailable: "propagate",
            notApplicable: "exclude",
            empty: "failed"
          },
          projectRoot: root
        }
      );
      assert.equal(integration.kind, "completed");
      if (integration.kind !== "completed") return;
      assert.equal(dependentCalls, 1);
      assert.equal(integration.aggregate, "passed");
      assert.deepEqual(
        integration.snapshot.checks.map(({ checkId, outcome }) => ({ checkId, outcome })),
        [
          {
            checkId: "attention-support",
            outcome: { status: "passed", data: { supporting: true } }
          },
          { checkId: "dependent", outcome: { status: "passed", data: { dependent: true } } },
          {
            checkId: "message-source",
            outcome: { status: "passed", data: { source: true } }
          }
        ]
      );
      assert.deepEqual(integration.snapshot.records, [
        { checkId: "attention-support", id: "support-record", data: { retained: true } }
      ]);
      assert.deepEqual(
        integration.checkDurations.map(({ checkId, durationMs }) => [checkId, typeof durationMs]),
        [
          ["attention-support", "number"],
          ["dependent", "number"],
          ["message-source", "number"]
        ]
      );
      assert.deepEqual(integration.checkMessages, [
        {
          checkId: "message-source",
          level: "warning",
          code: "source-message",
          message: "Source needs review"
        }
      ]);

      const runJson = readFileSync(join(root, "machine", "run.json"), "utf8");
      const recordsNdjson = readFileSync(join(root, "machine", "records.ndjson"), "utf8");
      const machine = validateMachinePublicationSetV4({
        recordsNdjson: Buffer.from(recordsNdjson),
        runJson: Buffer.from(runJson)
      });
      assert.equal(machine.ok, true, machine.ok ? "" : machine.diagnostic.message);
      if (!machine.ok) return;
      assert.equal(machine.value.run.schemaVersion, "vibe-check.run.v4");
      assert.equal(machine.value.records[0]?.schemaVersion, "vibe-check.record.v4");
      assert.deepEqual(
        machine.value.run.checks.map(({ checkId, outcome }) => [checkId, outcome.status]),
        [
          ["attention-support", "passed"],
          ["dependent", "passed"],
          ["message-source", "passed"]
        ]
      );
      assert.doesNotMatch(runJson, /"(?:messages|visibility)"/);
      assert.doesNotMatch(recordsNdjson, /"(?:messages|visibility)"/);
      assert.doesNotMatch(JSON.stringify(machine.value), /"(?:messages|visibility)"/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
