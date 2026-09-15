import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Check, CheckExecution } from "../check/check.ts";
import { defineConfig } from "../project-definition/project-definition.ts";
import type { CheckAggregate, CheckAggregation } from "./controls/contract.ts";
import { check, definition } from "./check-facts-integration.test-support.ts";
import { executeValidatedRun } from "./invocation/run.ts";
import { run } from "./run.ts";

type AggregationStatus = "passed" | "failed" | "not-applicable" | "unavailable";

type DefaultAggregationCase = Readonly<{
  readonly expected: CheckAggregate;
  readonly statuses: readonly AggregationStatus[];
}>;

export async function assertDefaultAndCustomAggregation(): Promise<void> {
  await assertDefaultStrictAggregation();
  await assertCustomAggregationReceivesCanonicalFacts();
  await assertInvalidAggregationControl();
}

export async function assertAggregationFailureBoundaries(): Promise<void> {
  const source = definition([check()]);
  const callbackError = new Error("expected aggregation callback failure");
  await assert.rejects(
    run(source, {
      checkAggregation: () => {
        throw callbackError;
      }
    }),
    (error: unknown) => error === callbackError
  );
  await assert.rejects(
    run(source, { checkAggregation: nonErrorThrowingAggregation() }),
    /Check aggregation threw a non-Error value/
  );
  await assert.rejects(
    run(source, { checkAggregation: aggregationReturning(Promise.resolve("passed")) }),
    /Check aggregation must synchronously return a CheckAggregate/
  );
  await assert.rejects(
    run(source, {
      checkAggregation: aggregationReturning(Promise.reject(new Error("ignored promise failure")))
    }),
    /Check aggregation must synchronously return a CheckAggregate/
  );

  const ordinaryFailure = await run(
    definition([
      check({
        execute: () => {
          throw new Error("ordinary Check failure");
        }
      })
    ])
  );
  assert.equal(ordinaryFailure.kind, "completed");
  if (ordinaryFailure.kind === "completed") assert.equal(ordinaryFailure.aggregate, "failed");
  await assertAggregationFailureCleanup();
}

function nonErrorThrowingAggregation(): CheckAggregation {
  return () => {
    const throwable = new Error("a value with a removed Error prototype");
    Object.setPrototypeOf(throwable, null);
    throw throwable;
  };
}

function aggregationReturning(promise: Promise<CheckAggregate>): CheckAggregation {
  // Preserve the actual native Promise so the rejection-observation boundary is exercised.
  const invalidCallbackReturn: { readonly aggregate: CheckAggregate } = { aggregate: "passed" };
  Object.defineProperty(invalidCallbackReturn, "aggregate", { value: promise });
  return () => invalidCallbackReturn.aggregate;
}

async function assertAggregationFailureCleanup(): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-aggregation-cleanup-"));
  const originalError = new Error("expected aggregation error");
  const events: string[] = [];
  const writes: string[] = [];
  try {
    await assert.rejects(
      executeValidatedRun(
        defineConfig({
          checks: [check()],
          outputs: {
            diagnosticLogging: { directory: "diagnostic", enabled: true },
            machinePublication: { directory: "machine", enabled: true },
            progressRendering: { enabled: true }
          }
        }),
        {
          checkAggregation: () => {
            throw originalError;
          },
          projectRoot: root
        },
        [],
        {
          diagnosticLoggerFactory: () =>
            Object.freeze({
              close: () => {
                events.push("diagnostic.close");
                throw new Error("cleanup failure must not replace aggregation failure");
              },
              observe: () => undefined
            }),
          progressWriterFactory: () =>
            Object.freeze({
              color: false,
              isTTY: false,
              term: undefined,
              write: (content: string) => writes.push(content),
              close: () => {
                events.push("progress.close");
                throw new Error("progress cleanup failure must not replace aggregation failure");
              }
            })
        }
      ),
      (error: unknown) => error === originalError
    );
    assert.deepEqual(events, ["diagnostic.close", "diagnostic.close", "progress.close"]);
    assert.equal(
      writes.some((content) => content.includes("Execution summary:")),
      false
    );
    assert.equal(existsSync(join(root, "machine", "run.json")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function assertDefaultStrictAggregation(): Promise<void> {
  return Promise.all(
    defaultAggregationCases.map(async ({ expected, statuses }) => {
      const result = await run(definition(aggregateSource(statuses)));
      assert.equal(result.kind, "completed");
      if (result.kind === "completed") assert.equal(result.aggregate, expected);
    })
  ).then(() => undefined);
}

async function assertCustomAggregationReceivesCanonicalFacts(): Promise<void> {
  const source = definition([
    check({ checkId: "passed", execute: () => ({ status: "passed", data: { count: 1 } }) }),
    check({ checkId: "failed", execute: () => ({ status: "failed", data: { count: 0 } }) }),
    check({ checkId: "na", execute: () => ({ status: "not-applicable" }) })
  ]);
  const observed: string[][] = [];
  for (const expected of ["passed", "failed", "not-applicable", "unavailable"] as const) {
    const aggregation: CheckAggregation = (checks) => {
      observed.push(checks.map((coreCheck) => coreCheck.checkId));
      assert.equal(Object.isFrozen(checks), true);
      return expected;
    };
    const result = await run(source, { checkAggregation: aggregation });
    assert.equal(result.kind, "completed");
    if (result.kind === "completed") assert.equal(result.aggregate, expected);
  }
  assert.deepEqual(observed, [
    ["failed", "na", "passed"],
    ["failed", "na", "passed"],
    ["failed", "na", "passed"],
    ["failed", "na", "passed"]
  ]);
}

async function assertInvalidAggregationControl(): Promise<void> {
  const result = await run(definition([check()]), {
    checkAggregation: { callback: "not-a-function" }
  });
  assert.deepEqual(result, {
    definitionWarnings: [],
    diagnostic: {
      kind: "invalid-run-controls",
      path: "controls.checkAggregation",
      reason: "invalid-value"
    },
    kind: "configuration"
  });
}

function aggregateSource(statuses: readonly AggregationStatus[]): Check[] {
  return statuses.map((status, index) =>
    check({ checkId: `${status}-${index}`, execute: executionFor(status) })
  );
}

function executionFor(status: AggregationStatus): CheckExecution {
  if (status === "passed") return () => ({ status: "passed", data: {} });
  if (status === "failed") return () => ({ status: "failed", data: {} });
  if (status === "not-applicable") return () => ({ status: "not-applicable" });
  return () => ({ status: "unavailable", reason: { code: "declared-unavailable" } });
}

const defaultAggregationCases: readonly DefaultAggregationCase[] = [
  { statuses: ["passed"], expected: "passed" },
  { statuses: [], expected: "failed" },
  { statuses: ["failed"], expected: "failed" },
  { statuses: ["not-applicable"], expected: "failed" },
  { statuses: ["unavailable"], expected: "failed" },
  { statuses: ["passed", "failed"], expected: "failed" }
];
