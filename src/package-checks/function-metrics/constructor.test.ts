import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { defineConfig } from "../../project-definition/project-definition.ts";
import { run } from "../../project-run/run.ts";
import { functionMetrics } from "./constructor.ts";
import { executeFunctionMetrics } from "./execution.ts";
import { parseFunctionMetricsData } from "./final-data.ts";
import { createRoot, execute } from "./constructor.test-support.ts";

describe("functionMetrics constructor", () => {
  it("materializes frozen analyzer-owned defaults and rejects malformed closed policy", async () => {
    const check = functionMetrics();
    assert.equal(check.parseData, parseFunctionMetricsData);
    assert.deepEqual(check.parseData({ blockingFindingCount: 1, findingCount: 1 }), {
      blockingFindingCount: 1,
      findingCount: 1
    });
    assert.throws(
      () => check.parseData({ blockingFindingCount: 1, findingCount: 0 }),
      /functionMetrics final data/
    );
    assert.deepEqual(check.options.findingWaivers, []);
    assert.equal(check.options.codeAreas.project?.findingPolicy, "non-blocking");
    assert.deepEqual(check.options.codeAreas.project?.limits, {
      codeLines: {
        lowComplexityAllowance: { cyclomaticComplexityBelow: 6, maximum: 180 },
        maximum: 60
      },
      cyclomaticComplexity: { maximum: 12 },
      nestingDepth: { maximum: 7 },
      parameters: { maximum: 6 }
    });
    assert.equal(Object.isFrozen(check.options), true);
    assert.equal(Object.isFrozen(check.options.codeAreas.project?.files.include), true);
    assert.equal(check.options.codeAreas.project?.files.include.length, 55);
    assert.equal(check.options.codeAreas.project?.files.include.includes("**/*.[tT][sS]"), true);

    const invalidInputs: readonly unknown[] = [
      { unknown: true },
      { scanner: { executable: "lizard" } },
      { codeAreas: {} },
      { codeAreas: { source: { files: { excludeDirs: [] } } } },
      { codeAreas: { source: { files: { source: "auto" } } } },
      { codeAreas: { "": { files: {} } } },
      { codeAreas: { source: { files: {}, limits: { parameters: { maximum: 0 } } } } },
      { codeAreas: { source: { files: {}, limits: { parameters: { maximum: 1.5 } } } } },
      { codeAreas: { source: { files: {}, limits: { nestingDepth: { maximum: 0 } } } } },
      { codeAreas: { source: { files: {}, limits: { nestingDepth: { maximum: 1.5 } } } } },
      {
        codeAreas: {
          source: {
            files: {},
            limits: { codeLines: { maximum: 50, lowComplexityAllowance: { maximum: 49 } } }
          }
        }
      },
      { findingPolicy: "warning" }
    ];
    for (const input of invalidInputs) {
      assert.throws(
        () => Reflect.apply(functionMetrics, undefined, [input]),
        /functionMetrics options must use the documented closed policy/
      );
    }

    const invalidPreflight = await check.preflight!(
      { ...check.options, codeAreas: {} },
      new AbortController().signal
    );
    assert.equal(invalidPreflight.status, "failure");

    const specialAreaId = "__proto__";
    const specialAreaCheck = functionMetrics({
      codeAreas: Object.fromEntries([[specialAreaId, { files: {} }]])
    });
    assert.equal(Object.hasOwn(specialAreaCheck.options.codeAreas, specialAreaId), true);
  });
});

describe("functionMetrics analyzer execution", () => {
  it("runs from the Product-owned analyzer without an external scanner", async () => {
    const root = createRoot("vibe-check-function-analyzer-");
    try {
      writeFileSync(
        join(root, "src", "a.ts"),
        "export function branch(a: number, b: number) { if (a > 0) return b; return a; }\n",
        "utf8"
      );
      const result = await run(defineConfig({ checks: [functionMetrics()] }), {
        checkAggregation: {
          checks: "all",
          empty: "failed",
          mode: "all",
          notApplicable: "fail",
          unavailable: "fail"
        },
        projectRoot: root
      });

      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      assert.equal(result.aggregate, "passed");
      assert.deepEqual(result.snapshot.checks[0]?.outcome, {
        status: "passed",
        data: { blockingFindingCount: 0, findingCount: 0 }
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("terminates an in-flight Worker before results or waiver audit", async () => {
    const root = createRoot("vibe-check-function-cancelled-");
    const workerDescriptor = Object.getOwnPropertyDescriptor(globalThis, "Worker");
    if (workerDescriptor === undefined)
      throw new Error("Bun Worker must be available for this test.");
    let workerStarted = 0;
    let workerTerminated = 0;
    let cancellation: ReturnType<typeof setTimeout> | undefined;
    try {
      const nestedConditionals = `${"value ? ".repeat(6000)}0${" : 0".repeat(6000)}`;
      writeFileSync(
        join(root, "src", "a.ts"),
        `export function adversarial(value: boolean) { return ${nestedConditionals}; }\n`,
        "utf8"
      );
      const check = functionMetrics({
        findingWaivers: [
          {
            identity: {
              functionName: "missing",
              metric: "parameter-count",
              path: "src/a.ts",
              startLine: 1
            },
            reason: "Cancellation must not audit an incomplete metric set."
          }
        ]
      });
      const controller = new AbortController();
      const OriginalWorker = globalThis.Worker;
      Object.defineProperty(globalThis, "Worker", {
        configurable: true,
        value: class extends OriginalWorker {
          public constructor(...arguments_: ConstructorParameters<typeof Worker>) {
            workerStarted += 1;
            super(...arguments_);
            cancellation = setTimeout(() => controller.abort(), 30);
          }

          public override terminate(): void {
            workerTerminated += 1;
            super.terminate();
          }
        }
      });
      const observed = await execute(
        executeFunctionMetrics,
        check.options,
        root,
        controller.signal
      );
      assert.deepEqual(observed.result, {
        status: "unavailable",
        reason: { code: "cancelled" },
        messages: [
          {
            code: "cancelled",
            level: "error",
            message:
              "Function metrics was cancelled before it could form a complete result; inspect the caller's cancellation reason and retry if appropriate."
          }
        ]
      });
      assert.equal(workerStarted, 1);
      assert.equal(workerTerminated, 1);
      assert.deepEqual(observed.records, []);
    } finally {
      if (cancellation !== undefined) clearTimeout(cancellation);
      Object.defineProperty(globalThis, "Worker", workerDescriptor);
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails an over-limit exact input before records or waiver audit", async () => {
    const root = createRoot("vibe-check-function-resource-limit-");
    try {
      writeFileSync(join(root, "src", "over-limit.ts"), Buffer.alloc(8 * 1024 * 1024 + 1, 0x20));
      const check = functionMetrics({
        codeAreas: {
          source: {
            files: { exclude: [], include: ["src/over-limit.ts"], source: "filesystem" }
          }
        },
        findingWaivers: [
          {
            identity: {
              functionName: "missing",
              metric: "parameter-count",
              path: "src/over-limit.ts",
              startLine: 1
            },
            reason: "A resource failure must not audit an incomplete metric set."
          }
        ]
      });

      const observed = await execute(executeFunctionMetrics, check.options, root);
      assert.deepEqual(observed.result, {
        status: "unavailable",
        reason: { code: "resource-limit-exceeded" },
        messages: [
          {
            code: "resource-limit-exceeded",
            level: "error",
            message:
              "Function metrics input exceeds the per-file or aggregate analysis resource limit; narrow the selected files or reduce their size."
          }
        ]
      });
      assert.deepEqual(observed.records, []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
