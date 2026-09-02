import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { defineConfig } from "../../project-definition/project-definition.ts";
import { run } from "../../project-run/run.ts";
import { functionMetrics } from "./constructor.ts";
import { executeFunctionMetrics } from "./execution.ts";
import { parseFunctionMetricsData } from "./final-data.ts";
import { createExecutable, createRoot, execute } from "./constructor.test-support.ts";

describe("functionMetrics constructor", () => {
  it("materializes frozen defaults and rejects malformed closed policy", async () => {
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
    assert.equal(check.options.scanner.executable, "lizard");
    assert.equal(check.options.codeAreas.project?.findingPolicy, "non-blocking");
    assert.deepEqual(check.options.codeAreas.project?.limits, {
      codeLines: {
        lowComplexityAllowance: { cyclomaticComplexityBelow: 6, maximum: 180 },
        maximum: 60
      },
      cyclomaticComplexity: { maximum: 12 },
      parameters: { maximum: 6 }
    });
    assert.equal(Object.isFrozen(check.options), true);
    assert.equal(Object.isFrozen(check.options.codeAreas.project?.files.include), true);
    assert.equal(check.options.codeAreas.project?.files.include.length, 55);
    assert.equal(check.options.codeAreas.project?.files.include.includes("**/*.[tT][sS]"), true);

    const invalidInputs: readonly unknown[] = [
      { unknown: true },
      { codeAreas: {} },
      { codeAreas: { source: { files: { excludeDirs: [] } } } },
      { codeAreas: { source: { files: { source: "auto" } } } },
      { codeAreas: { "": { files: {} } } },
      { codeAreas: { source: { files: {}, limits: { parameters: { maximum: 0 } } } } },
      { codeAreas: { source: { files: {}, limits: { parameters: { maximum: 1.5 } } } } },
      {
        codeAreas: {
          source: {
            files: {},
            limits: {
              codeLines: {
                maximum: 50,
                lowComplexityAllowance: { maximum: 49 }
              }
            }
          }
        }
      },
      { findingPolicy: "warning" },
      { scanner: { executable: "" } },
      { scanner: { args: ["--csv"] } },
      { scanner: { availabilityArgs: ["--version"] } }
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

describe("functionMetrics availability", () => {
  it("fails aggregate and does not scan when version provenance is unsupported", async () => {
    const root = createRoot("vibe-check-function-version-rejection-");
    const scanMarker = join(root, "scan-called");
    try {
      const executable = createExecutable(
        root,
        [
          "if (process.argv.includes('--version')) {",
          "  process.stdout.write('1.24.0\\n');",
          "} else {",
          "  require('node:fs').writeFileSync('scan-called', '');",
          "}"
        ].join("\n")
      );
      const result = await run(
        defineConfig({ checks: [functionMetrics({ scanner: { executable } })] }),
        {
          checkAggregation: {
            checks: "all",
            empty: "failed",
            mode: "all",
            notApplicable: "fail",
            unavailable: "fail"
          },
          projectRoot: root
        }
      );

      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      assert.equal(result.aggregate, "failed");
      assert.deepEqual(result.snapshot.checks[0]?.outcome, {
        status: "unavailable",
        reason: { code: "external-dependency-unavailable" }
      });
      assert.equal(existsSync(scanMarker), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("functionMetrics cancellation", () => {
  it("stops before scanner measurement when cancellation is observed after availability", async () => {
    const root = createRoot("vibe-check-function-cancelled-");
    const scanMarker = join(root, "scan-called");
    try {
      const executable = createExecutable(
        root,
        [
          "if (process.argv.includes('--version')) {",
          "  setTimeout(() => process.stdout.write('1.23.0\\n'), 50);",
          "} else {",
          "  require('node:fs').writeFileSync('scan-called', '');",
          "}"
        ].join("\n")
      );
      const check = functionMetrics({ scanner: { executable } });
      const controller = new AbortController();
      const cancellation = setTimeout(() => controller.abort(), 5);
      try {
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
        assert.equal(observed.records.length, 0);
        assert.equal(existsSync(scanMarker), false);
      } finally {
        clearTimeout(cancellation);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
