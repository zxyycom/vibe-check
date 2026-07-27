import { describe, expect, test } from "bun:test";

import {
  createEmptyMetrics,
  type QualityMetrics,
  type WarningRecord
} from "../model/schema.ts";
import type { QualityScanProfile } from "./command-model.ts";
import { printGateStatus } from "./command-output.ts";

describe("gate console projection", () => {
  test("keeps disabled gates silent", () => {
    const metrics = createMetrics();

    const output = captureConsole(() =>
      printGateStatus({ metrics, scanProfile: "quick" })
    );

    expect(output).toEqual({ stderr: [], stdout: [] });
  });

  test("prints evaluated passed and failed state fields to stdout", () => {
    const blockingWarning = createWarning();
    const cases = [
      {
        gate: {
          blockingWarningCount: 0,
          blockingWarnings: [],
          evaluatedChannel: "all",
          evaluatedWarningCount: 0,
          policy: "all",
          status: "passed"
        } satisfies QualityMetrics["gate"],
        headline: "✅ Quality gate passed for the resolved quick profile."
      },
      {
        gate: {
          blockingWarningCount: 1,
          blockingWarnings: [blockingWarning],
          evaluatedChannel: "regressions",
          evaluatedWarningCount: 1,
          policy: "regressions",
          status: "failed"
        } satisfies QualityMetrics["gate"],
        headline: "❌ Quality gate failed."
      }
    ] as const;

    for (const { gate, headline } of cases) {
      const metrics = createMetrics();
      metrics.gate = gate;
      metrics.warnings[gate.evaluatedChannel] = [...gate.blockingWarnings];
      const scanProfile: QualityScanProfile =
        gate.policy === "all" ? "quick" : "full";

      const output = captureConsole(() =>
        printGateStatus({ metrics, scanProfile })
      );

      expect(output.stderr).toEqual([]);
      expect(output.stdout).toEqual([
        headline,
        `  Policy: ${gate.policy}`,
        `  Status: ${gate.status}`,
        `  Evaluated channel: ${gate.evaluatedChannel}`,
        `  Evaluated warnings: ${gate.evaluatedWarningCount}`,
        `  Blocking warnings: ${gate.blockingWarningCount}`
      ]);
    }
  });

  test("prints not-evaluated reasons and owner actions to stderr", () => {
    const incomplete = createMetrics();
    incomplete.gate = {
      policy: "all",
      reasonCode: "scan-incomplete",
      status: "not-evaluated"
    };
    incomplete.scanCompleteness = {
      capabilities: [
        {
          capabilityId: "file-metrics",
          diagnostic: {
            action: "Install or configure scc.",
            kind: "unavailable",
            message: "scc is unavailable."
          },
          status: "failed"
        },
        {
          capabilityId: "function-metrics",
          diagnostic: {
            action: "Install or configure Lizard.",
            kind: "unavailable",
            message: "Lizard is unavailable."
          },
          status: "failed"
        },
        { capabilityId: "duplicate-detection", status: "skipped" }
      ],
      overall: "failed"
    };

    const noInput = createMetrics();
    noInput.gate = {
      policy: "all",
      reasonCode: "no-eligible-input",
      status: "not-evaluated"
    };

    const comparisonUnavailable = createMetrics();
    comparisonUnavailable.gate = {
      policy: "regressions",
      reasonCode: "comparison-unavailable",
      status: "not-evaluated"
    };
    comparisonUnavailable.baseline.status = "no-baseline-commit";

    expect(
      captureConsole(() =>
        printGateStatus({ metrics: incomplete, scanProfile: "quick" })
      )
    ).toEqual({
      stdout: [],
      stderr: [
        "❌ Quality gate was not evaluated for the resolved quick profile.",
        "  Policy: all",
        "  Status: not-evaluated",
        "  Reason code: scan-incomplete",
        "  Action (file-metrics): Install or configure scc.",
        "  Action (function-metrics): Install or configure Lizard."
      ]
    });
    expect(
      captureConsole(() =>
        printGateStatus({ metrics: noInput, scanProfile: "quick" })
      )
    ).toEqual({
      stdout: [],
      stderr: [
        "❌ Quality gate was not evaluated for the resolved quick profile.",
        "  Policy: all",
        "  Status: not-evaluated",
        "  Reason code: no-eligible-input",
        "  Action: Adjust the resolved quick profile or configured include scope (src/**/*.ts) so at least one requested capability has eligible input."
      ]
    });
    expect(
      captureConsole(() =>
        printGateStatus({
          metrics: comparisonUnavailable,
          scanProfile: "full"
        })
      )
    ).toEqual({
      stdout: [],
      stderr: [
        "❌ Quality gate was not evaluated.",
        "  Policy: regressions",
        "  Status: not-evaluated",
        "  Reason code: comparison-unavailable",
        "  Action: Resolve baseline status no-baseline-commit so comparison evidence is available, then retry."
      ]
    });
  });
});

function createWarning(): WarningRecord {
  return {
    baselineValue: 3,
    codeArea: "product",
    comparisonBasis: "baseline",
    deltaValue: 2,
    isChanged: true,
    level: "warning",
    line: 12,
    message: "Function complexity increased.",
    metric: "cyclomaticComplexity",
    path: "src/example.ts",
    ruleId: "lizard-cyclomatic-complexity",
    sourceTool: "lizard",
    value: 5
  };
}

function createMetrics(): QualityMetrics {
  return createEmptyMetrics({
    commitSha: "0123456789abcdef",
    configVersion: "test",
    repository: "/tmp/project",
    scope: {
      excludeDirs: [],
      generatedFiles: [],
      include: ["src/**/*.ts"]
    },
    tools: []
  });
}

function captureConsole(run: () => void): {
  stderr: string[];
  stdout: string[];
} {
  const stderr: string[] = [];
  const stdout: string[] = [];
  const originalError = console.error;
  const originalLog = console.log;
  console.error = (...values: unknown[]) => {
    stderr.push(values.map(String).join(" "));
  };
  console.log = (...values: unknown[]) => {
    stdout.push(values.map(String).join(" "));
  };

  try {
    run();
  } finally {
    console.error = originalError;
    console.log = originalLog;
  }

  return { stderr, stdout };
}
