import {
  coreWarning,
  createMeasuredFixture
} from "./machine-example-fixture-builders.ts";
import {
  FIXED_MACHINE_EXAMPLE_INPUT,
  type CanonicalMachineExample,
  type CoreMetricsFixture
} from "./machine-example-model.ts";

export function canonicalMachineExamples(): CanonicalMachineExample[] {
  return [
    {
      contractReason:
        "Every stable capability succeeded, so completeness reduces to `complete`; all warning channels and both streams are empty, and the closed disabled-gate shape is valid.",
      expectedExit: 0,
      expectedProcessOutcome: "success",
      fixedInput: {
        paths: [FIXED_MACHINE_EXAMPLE_INPUT.paths[0]],
        summary:
          "Measured TypeScript input with all three stable capabilities succeeded and no warnings."
      },
      gateRequest: "none (gate disabled)",
      metrics: createMeasuredFixture(),
      outcome: "complete-passed",
      title: "Complete scan without warnings"
    },
    {
      contractReason:
        "Completeness reduces to `complete`; `warnings.all` contains one warning while changed and regressions remain ordered empty subsequences, each stream exactly matches its owning channel, and the gate is disabled.",
      expectedExit: 0,
      expectedProcessOutcome: "success",
      fixedInput: {
        paths: [FIXED_MACHINE_EXAMPLE_INPUT.paths[0]],
        summary:
          "Measured TypeScript input with all three stable capabilities succeeded and one unchanged warning."
      },
      gateRequest: "none (gate disabled)",
      metrics: createCompleteWarningFixture(),
      outcome: "complete-warning",
      title: "Complete scan with a non-gating warning"
    },
    {
      contractReason:
        "All stable capabilities report `no-input`, so completeness reduces to the legitimate `empty` state; all warning channels and streams are empty, and the gate is disabled.",
      expectedExit: 0,
      expectedProcessOutcome: "success",
      fixedInput: {
        paths: [],
        summary:
          "An eligible project root with no supported input for any stable measurement capability."
      },
      gateRequest: "none (gate disabled)",
      metrics: createLegitimateEmptyFixture(),
      outcome: "legitimate-empty",
      title: "Legitimate empty scan"
    },
    {
      contractReason:
        "The same unaccepted warning appears in all, changed, and regressions in semantic order; the requested regressions gate evaluates one warning, reports that exact warning as blocking, and therefore has status `failed`.",
      expectedExit: 1,
      expectedProcessOutcome: "gate-failed",
      fixedInput: {
        paths: [FIXED_MACHINE_EXAMPLE_INPUT.paths[0]],
        summary:
          "Measured TypeScript input with all three stable capabilities succeeded and one changed regression warning."
      },
      gateRequest: "regressions",
      metrics: createGateFailedFixture(),
      outcome: "gate-failed",
      title: "Complete scan blocked by the requested gate"
    },
    {
      contractReason:
        "The fixed duplicate-detection diagnostic makes completeness reduce to `failed`; the requested all-warnings gate is explicitly not evaluated for `scan-incomplete`, while the warning channels and streams remain mutually consistent. This is a contract-valid domain failure, not an output-contract failure.",
      expectedExit: 2,
      expectedProcessOutcome: "failed",
      fixedInput: {
        paths: [FIXED_MACHINE_EXAMPLE_INPUT.paths[0]],
        summary:
          "Measured TypeScript input whose file and function capabilities succeeded but duplicate detection returned the fixed unavailable diagnostic."
      },
      gateRequest: "all (not evaluated: scan-incomplete)",
      metrics: createScanIncompleteFixture(),
      outcome: "scan-incomplete",
      title: "Incomplete scan with a fixed capability diagnostic"
    }
  ];
}

function createCompleteWarningFixture(): CoreMetricsFixture {
  const metrics = createMeasuredFixture();
  metrics.warnings.all = [coreWarning({
    message: "Function exceeds the configured complexity floor.",
    ruleId: "function.cyclomatic-complexity",
    value: 6
  })];
  return metrics;
}

function createLegitimateEmptyFixture(): CoreMetricsFixture {
  return {
    aggregates: {
      byCodeArea: [],
      byLanguage: [],
      overall: {
        totalCodeLines: 0,
        totalFiles: 0,
        totalFunctions: 0,
        totalLines: 0
      }
    },
    baseline: {
      commitDate: null,
      commitSha: null,
      metadata: null,
      status: "history-unavailable"
    },
    comparisonStatus: "baseline-unavailable",
    currentFingerprints: {},
    duplicateCode: [],
    fileMetrics: [],
    functionMetrics: [],
    gate: {
      policy: null,
      status: "disabled"
    },
    metadata: {
      commitDate: FIXED_MACHINE_EXAMPLE_INPUT.commitDate,
      commitSha: FIXED_MACHINE_EXAMPLE_INPUT.commitSha,
      commitTitle: "Canonical current revision",
      configVersion: FIXED_MACHINE_EXAMPLE_INPUT.configVersion,
      repository: FIXED_MACHINE_EXAMPLE_INPUT.repository,
      schemaVersion: "0.4.0",
      scope: {
        excludeDirs: ["dist", "node_modules"],
        generatedFiles: [FIXED_MACHINE_EXAMPLE_INPUT.paths[1]],
        include: ["src/**/*.ts"]
      },
      timestamp: FIXED_MACHINE_EXAMPLE_INPUT.timestamp,
      tools: FIXED_MACHINE_EXAMPLE_INPUT.tools.map((tool) => ({ ...tool }))
    },
    scanCompleteness: {
      capabilities: [{
        capabilityId: "file-metrics",
        status: "no-input"
      }, {
        capabilityId: "function-metrics",
        status: "no-input"
      }, {
        capabilityId: "duplicate-detection",
        status: "no-input"
      }],
      overall: "empty"
    },
    trends: [],
    warnings: {
      all: [],
      changed: [],
      regressions: []
    }
  };
}

function createGateFailedFixture(): CoreMetricsFixture {
  const metrics = createMeasuredFixture();
  const warning = coreWarning({
    baselineValue: 5,
    deltaValue: 3,
    isChanged: true,
    message: "Function complexity regressed beyond the configured delta.",
    ruleId: "function.cyclomatic-complexity.regression",
    value: 8
  });
  metrics.warnings = {
    all: [warning],
    changed: [warning],
    regressions: [warning]
  };
  metrics.gate = {
    blockingWarningCount: 1,
    blockingWarnings: [warning],
    evaluatedChannel: "regressions",
    evaluatedWarningCount: 1,
    policy: "regressions",
    status: "failed"
  };
  return metrics;
}

function createScanIncompleteFixture(): CoreMetricsFixture {
  const metrics = createMeasuredFixture();
  metrics.scanCompleteness = {
    capabilities: [{
      capabilityId: "file-metrics",
      status: "succeeded"
    }, {
      capabilityId: "function-metrics",
      status: "succeeded"
    }, {
      capabilityId: "duplicate-detection",
      diagnostic: {
        action: "Install jscpd 5.0.11 and rerun the scan.",
        kind: "unavailable",
        message: "Configured jscpd executable was not available."
      },
      status: "failed"
    }],
    overall: "failed"
  };
  metrics.gate = {
    policy: "all",
    reasonCode: "scan-incomplete",
    status: "not-evaluated"
  };
  return metrics;
}
