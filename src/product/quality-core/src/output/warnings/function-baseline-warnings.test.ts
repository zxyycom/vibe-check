import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { TEST_QUALITY_CONFIG } from "../../../test/config.ts";
import type { FunctionMetric } from "../../model/schema.ts";
import { generateWarningChannels } from "./generator.ts";

describe("function baseline warning comparison", () => {
  it("matches function baselines by unique file and name without line-number identity", () => {
    const warnings = generateWarningChannels({
      baseline: {
        duplicates: [],
        files: [],
        functions: [
          functionAt("moved.ts", "movedFunction", 5, 65, 6),
          functionAt("nullable-complexity.ts", "nullableComplexity", 1, 65, null),
          functionAt("old-location.ts", "crossFileMove", 10, 60, 6)
        ]
      },
      comparisonStatus: "compared",
      config: TEST_QUALITY_CONFIG,
      duplicates: [],
      files: [],
      functions: [
        changedFunctionAt("moved.ts", "movedFunction", 40, 70, 6),
        changedFunctionAt("nullable-complexity.ts", "nullableComplexity", 1, 70, 12),
        changedFunctionAt("new.ts", "newFunction", 20, 70, 6),
        changedFunctionAt("new-location.ts", "crossFileMove", 30, 70, 6)
      ],
      scope: {
        changed: true,
        changedFiles: ["moved.ts", "nullable-complexity.ts", "new.ts", "new-location.ts"]
      }
    });

    const moved = warningFor(warnings.all, "moved.ts", "function-code-density");
    assert.deepEqual(
      pickComparison(moved),
      { baselineValue: 65, comparisonBasis: "delta", deltaValue: 5, line: 40 }
    );
    assert.match(moved.message, /moved\.ts:40/);

    const nullableComplexity = warningFor(
      warnings.all,
      "nullable-complexity.ts",
      "cyclomatic-complexity"
    );
    assert.deepEqual(
      pickComparison(nullableComplexity),
      { baselineValue: null, comparisonBasis: "changed-scope", deltaValue: null, line: 1 }
    );
    assert.deepEqual(
      pickComparison(warningFor(warnings.all, "nullable-complexity.ts", "function-code-density")),
      { baselineValue: 65, comparisonBasis: "delta", deltaValue: 5, line: 1 }
    );

    for (const path of ["new.ts", "new-location.ts"]) {
      assert.deepEqual(
        pickComparison(warningFor(warnings.all, path, "function-code-density")),
        {
          baselineValue: 0,
          comparisonBasis: "delta",
          deltaValue: 70,
          line: path === "new.ts" ? 20 : 30
        }
      );
    }

    assert.deepEqual(
      warnings.changed.map((warning) => warning.path),
      ["new.ts", "new-location.ts", "nullable-complexity.ts"]
    );
    assert.deepEqual(
      warnings.regressions.map((warning) => warning.path),
      ["new.ts", "new-location.ts"]
    );
  });

  it("keeps repeated and anonymous function identities incomparable", () => {
    const currentFunctions = [
      changedFunctionAt("current-repeat.ts", "repeatCurrent", 10, 80, 6),
      changedFunctionAt("current-repeat.ts", "repeatCurrent", 100, 70, 6),
      changedFunctionAt("baseline-repeat.ts", "repeatBaseline", 20, 90, 6),
      changedFunctionAt("both-repeat.ts", "repeatBoth", 10, 80, 6),
      changedFunctionAt("both-repeat.ts", "repeatBoth", 100, 70, 6),
      changedFunctionAt("anonymous.ts", "(anonymous)", 30, 70, 6),
      changedFunctionAt("unknown.ts", "unknown", 30, 70, 6),
      changedFunctionAt("whitespace-name.ts", "   ", 30, 70, 6)
    ];
    const baselineFunctions = [
      functionAt("current-repeat.ts", "repeatCurrent", 10, 60, 6),
      functionAt("baseline-repeat.ts", "repeatBaseline", 20, 60, 6),
      functionAt("baseline-repeat.ts", "repeatBaseline", 40, 65, 6),
      functionAt("both-repeat.ts", "repeatBoth", 10, 60, 6),
      functionAt("both-repeat.ts", "repeatBoth", 40, 65, 6),
      functionAt("anonymous.ts", "(anonymous)", 1, 60, 6),
      functionAt("unknown.ts", "unknown", 1, 60, 6),
      functionAt("whitespace-name.ts", "   ", 1, 60, 6)
    ];

    const warnings = generateWarningChannels({
      baseline: { duplicates: [], files: [], functions: baselineFunctions },
      comparisonStatus: "compared",
      config: TEST_QUALITY_CONFIG,
      duplicates: [],
      files: [],
      functions: currentFunctions,
      scope: { changed: true, changedFiles: currentFunctions.map((func) => func.file) }
    });

    assert.equal(warnings.all.length, currentFunctions.length);
    for (const warning of warnings.all) {
      assert.equal(warning.baselineValue, null);
      assert.equal(warning.comparisonBasis, "changed-scope");
      assert.equal(warning.deltaValue, null);
    }
    assert.equal(warnings.changed.length, currentFunctions.length);
    assert.deepEqual(warnings.regressions, []);
  });
});

function functionAt(
  path: string,
  name: string,
  startLine: number,
  lines: number,
  complexity: number | null
): FunctionMetric {
  return {
    codeArea: "typescript-production-scripts",
    cyclomaticComplexity: { source: "lizard", value: complexity },
    endLine: startLine + Math.max(lines - 1, 0),
    file: path,
    isChanged: false,
    lines,
    name,
    parameterCount: 1,
    startLine
  };
}

function changedFunctionAt(
  path: string,
  name: string,
  startLine: number,
  lines: number,
  complexity: number | null
): FunctionMetric {
  return { ...functionAt(path, name, startLine, lines, complexity), isChanged: true };
}

function warningFor(
  warnings: ReturnType<typeof generateWarningChannels>["all"],
  path: string,
  metric: string
) {
  const warning = warnings.find((candidate) => candidate.path === path && candidate.metric === metric);
  assert.ok(warning, `expected ${metric} warning for ${path}`);
  return warning;
}

function pickComparison(warning: ReturnType<typeof warningFor>) {
  return {
    baselineValue: warning.baselineValue,
    comparisonBasis: warning.comparisonBasis,
    deltaValue: warning.deltaValue,
    line: warning.line
  };
}
