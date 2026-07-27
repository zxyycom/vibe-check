import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import {
  createEmptyMetrics,
  type QualityMetrics,
  type WarningRecord
} from "../../model/schema.ts";
import { changedFilesSection, warningsSection } from "./findings.ts";
import { generateMarkdownReport } from "./markdown-report.ts";
import { fileDecisionTokenRankings, fileRankings, functionSizeRankings } from "./rankings.ts";
import { repositorySize } from "./summary.ts";
import { qualityGateSummary } from "./summary/sections.ts";

describe("quality report", () => {
  it("keeps changed-file watchlist useful without baseline annotations", () => {
    const metrics = qualityMetrics();
    metrics.comparisonStatus = "baseline-unavailable";
    metrics.fileMetrics = [
      qualityFile("src/risky.ts", { isChanged: true, lines: 480, decisionTokens: 45 }),
      qualityFile("src/quiet.ts", { isChanged: true, lines: 80, decisionTokens: 2 })
    ];
    metrics.warnings = {
      all: [warning("src/risky.ts", "scc-file-code-lines", 480)],
      changed: [],
      regressions: []
    };

    const section = changedFilesSection(metrics, 10);

    assert.match(section, /Changed files: 2 total, 1 shown by risk ranking/);
    assert.match(section, /src\/risky\.ts/);
    assert.doesNotMatch(section, /src\/quiet\.ts/);
  });

  it("applies configured watchlist visibility and limit independently from ranking top N", () => {
    const metrics = qualityMetrics();
    metrics.fileMetrics = [
      qualityFile("src/high.ts", { isChanged: true, lines: 300, decisionTokens: 30 }),
      qualityFile("src/medium.ts", { isChanged: true, lines: 200, decisionTokens: 20 }),
      qualityFile("src/low.ts", { isChanged: true, lines: 100, decisionTokens: 10 })
    ];
    metrics.warnings = {
      all: metrics.fileMetrics.map((file) =>
        warning(file.path, "scc-file-code-lines", file.lines)
      ),
      changed: [],
      regressions: []
    };

    const hidden = generateMarkdownReport(metrics, 5, { showWatchlist: false });
    const limited = generateMarkdownReport(metrics, 5, {
      showWatchlist: true,
      watchlistMax: 1
    });

    assert.doesNotMatch(hidden, /## Changed Files Watchlist/);
    assert.match(limited, /Changed files: 3 total, 1 shown by risk ranking/);
  });

  it("sorts rankings by metric without mutating scanner output order", () => {
    const metrics = qualityMetrics();
    metrics.fileMetrics = [
      qualityFile("src/a-small.ts", { isChanged: false, lines: 10, decisionTokens: 1 }),
      qualityFile("src/b-large.ts", { isChanged: false, lines: 500, decisionTokens: 3 }),
      qualityFile("src/c-medium.ts", { isChanged: false, lines: 200, decisionTokens: 2 })
    ];
    metrics.functionMetrics = [
      qualityFunction("small", "src/a-small.ts", { lines: 5, complexity: 1 }),
      qualityFunction("large", "src/b-large.ts", { lines: 80, complexity: 3 }),
      qualityFunction("medium", "src/c-medium.ts", { lines: 40, complexity: 2 })
    ];
    const originalFileOrder = metrics.fileMetrics.map((file) => file.path);
    const originalFunctionOrder = metrics.functionMetrics.map((func) => func.name);

    const files = fileRankings(metrics, 2);
    const functions = functionSizeRankings(metrics, 2);

    assert.ok(files.indexOf("src/b-large.ts") < files.indexOf("src/c-medium.ts"));
    assert.doesNotMatch(files, /src\/a-small\.ts/);
    assert.ok(functions.indexOf("large") < functions.indexOf("medium"));
    assert.doesNotMatch(functions, /small/);
    assert.deepEqual(metrics.fileMetrics.map((file) => file.path), originalFileOrder);
    assert.deepEqual(metrics.functionMetrics.map((func) => func.name), originalFunctionOrder);
  });

  it("labels scc file Complexity as decision-token count and shows total-token share", () => {
    const metrics = qualityMetrics();
    metrics.fileMetrics = [
      qualityFile("src/dense.ts", { isChanged: false, lines: 80, codeLines: 50, decisionTokens: 10 }),
      qualityFile("src/sparse.ts", { isChanged: false, lines: 500, codeLines: 400, decisionTokens: 20 })
    ];

    const byLines = fileRankings(metrics, 1);
    const byDecisionTokens = fileDecisionTokenRankings(metrics, 2);

    assert.match(byLines, /Decision Tokens/);
    assert.doesNotMatch(byLines, /\bComplexity\b/);
    assert.match(byDecisionTokens, /scc decision tokens/);
    assert.match(byDecisionTokens, /file-decision-tokens \/ total-file-decision-tokens/);
    assert.match(byDecisionTokens, /src\/sparse\.ts/);
    assert.match(byDecisionTokens, /\|\s*66\.7%\s*\|/);
    assert.match(byDecisionTokens, /\|\s*33\.3%\s*\|/);
  });

  it("shows code-area decision-token hotspots by total-token share", () => {
    const metrics = qualityMetrics();
    metrics.aggregates = {
      ...metrics.aggregates,
      overall: {
        ...metrics.aggregates.overall,
        totalFileDecisionTokens: 40
      },
      byCodeArea: [
        codeAreaAggregate("typescript-production-scripts", { decisionTokens: 30, lines: 300 }),
        codeAreaAggregate("rust-production", { decisionTokens: 10, lines: 100 })
      ]
    };

    const section = repositorySize(metrics);

    assert.match(section, /Decision Tokens/);
    assert.match(section, /file-decision-tokens \/ total-file-decision-tokens/);
    assert.match(section, /typescript-production-scripts/);
    assert.match(section, /\|\s*30\s*\|\s*75\.0%\s*\|/);
    assert.match(section, /\|\s*10\s*\|\s*25\.0%\s*\|/);
  });

  it("shows accepted reasons next to warning records", () => {
    const metrics = qualityMetrics();
    const acceptedWarning = warning("crates/shared/protocol/src/envelope.rs", "jscpd-duplicate-code", 86);
    acceptedWarning.acceptedReason =
      "OperationArguments::operation and OperationResult::operation live at separate protocol request and result boundaries.";
    metrics.warnings = {
      all: [acceptedWarning],
      changed: [],
      regressions: []
    };

    const section = warningsSection(metrics);

    assert.match(section, /\*\*\[scc\] code-lines\*\*: test warning/);
    assert.match(section, /Accepted reason: OperationArguments::operation/);
  });

  it("shows completeness states and explains an empty quality evaluation", () => {
    const metrics = qualityMetrics();
    metrics.scanCompleteness = {
      capabilities: [
        { capabilityId: "file-metrics", status: "no-input" },
        { capabilityId: "function-metrics", status: "no-input" },
        { capabilityId: "duplicate-detection", status: "skipped" }
      ],
      overall: "empty"
    };

    const report = generateMarkdownReport(metrics);

    assert.match(report, /Scan completeness/);
    assert.match(report, /Overall.*`empty`/);
    assert.match(report, /file-metrics.*`no-input`/);
    assert.match(report, /duplicate-detection.*`skipped`/);
    assert.match(report, /Quality was not evaluated.*no capability had eligible measurement input/);
  });

  it("shows actionable diagnostics for failed capabilities", () => {
    const metrics = qualityMetrics();
    metrics.scanCompleteness = {
      capabilities: [
        {
          capabilityId: "file-metrics",
          diagnostic: {
            kind: "unavailable",
            message: "scc was not found",
            action: "Install scc or configure tools.scc"
          },
          status: "failed"
        },
        { capabilityId: "function-metrics", status: "succeeded" },
        { capabilityId: "duplicate-detection", status: "skipped" }
      ],
      overall: "failed"
    };

    const report = generateMarkdownReport(metrics);

    assert.match(report, /Overall.*`failed`/);
    assert.match(report, /file-metrics.*`failed`/);
    assert.match(report, /Reason.*scc was not found/);
    assert.match(report, /Action.*Install scc or configure tools\.scc/);
  });

  it("keeps disabled gates silent in human reports", () => {
    const metrics = qualityMetrics();

    assert.equal(qualityGateSummary(metrics), "");
    assert.doesNotMatch(generateMarkdownReport(metrics), /Quality Gate/);
  });

  it("projects a passed all gate for the resolved profile before detailed output", () => {
    const metrics = qualityMetrics();
    const acceptedWarning = warning("src/accepted.ts", "scc-file-code-lines", 240);
    acceptedWarning.acceptedReason = "Reviewed generated compatibility shim.";
    metrics.warnings.all = [acceptedWarning];
    metrics.scanCompleteness = {
      capabilities: [
        { capabilityId: "file-metrics", status: "succeeded" },
        { capabilityId: "function-metrics", status: "succeeded" },
        { capabilityId: "duplicate-detection", status: "skipped" }
      ],
      overall: "complete"
    };
    metrics.gate = {
      blockingWarningCount: 0,
      blockingWarnings: [],
      evaluatedChannel: "all",
      evaluatedWarningCount: 1,
      policy: "all",
      status: "passed"
    };

    const section = qualityGateSummary(metrics);
    const report = generateMarkdownReport(metrics);

    assert.match(section, /Policy.*`all`/);
    assert.match(section, /Status.*`passed`/);
    assert.match(section, /Evaluated channel.*`all`/);
    assert.match(section, /Evaluated warnings.*1/);
    assert.match(section, /Blocking warnings.*0/);
    assert.match(section, /resolved scan profile/);
    assert.doesNotMatch(section, /Reason code/);
    assert.doesNotMatch(section, /### Blocking warnings/);
    assert.ok(report.indexOf("## Comparison") < report.indexOf("## Quality Gate"));
    assert.ok(report.indexOf("## Quality Gate") < report.indexOf("## Top 10 文件"));
    assert.match(report, /duplicate-detection.*`skipped`/);
    assert.match(report, /Accepted reason: Reviewed generated compatibility shim/);
  });

  it("projects failed gate blocking warnings in GateResult order", () => {
    const metrics = qualityMetrics();
    const acceptedWarning = warning("src/accepted.ts", "scc-file-code-lines", 100);
    acceptedWarning.acceptedReason = "Accepted for compatibility.";
    const firstBlocking = warning("src/first.ts", "scc-file-code-lines", 300);
    firstBlocking.message = "first blocking warning";
    const secondBlocking = warning("src/second.ts", "scc-file-code-lines", 400);
    secondBlocking.message = "second blocking warning";
    metrics.warnings.all = [acceptedWarning, firstBlocking, secondBlocking];
    metrics.gate = {
      blockingWarningCount: 2,
      blockingWarnings: [secondBlocking, firstBlocking],
      evaluatedChannel: "all",
      evaluatedWarningCount: 3,
      policy: "all",
      status: "failed"
    };

    const section = qualityGateSummary(metrics);
    const report = generateMarkdownReport(metrics);

    assert.match(section, /Policy.*`all`/);
    assert.match(section, /Status.*`failed`/);
    assert.match(section, /Evaluated channel.*`all`/);
    assert.match(section, /Evaluated warnings.*3/);
    assert.match(section, /Blocking warnings.*2/);
    assert.doesNotMatch(section, /Reason code/);
    assert.ok(section.indexOf("second blocking warning") < section.indexOf("first blocking warning"));
    assert.doesNotMatch(section, /Accepted for compatibility/);
    assert.match(report, /Accepted reason: Accepted for compatibility/);
  });

  it("uses failed capability actions for scan-incomplete gates", () => {
    const metrics = qualityMetrics();
    metrics.scanCompleteness = {
      capabilities: [
        {
          capabilityId: "file-metrics",
          diagnostic: {
            kind: "unavailable",
            message: "scc was not found",
            action: "Install scc or configure tools.scc"
          },
          status: "failed"
        },
        { capabilityId: "function-metrics", status: "succeeded" },
        { capabilityId: "duplicate-detection", status: "skipped" }
      ],
      overall: "failed"
    };
    metrics.gate = {
      policy: "all",
      reasonCode: "scan-incomplete",
      status: "not-evaluated"
    };

    const section = qualityGateSummary(metrics);

    assert.match(section, /Policy.*`all`/);
    assert.match(section, /Status.*`not-evaluated`/);
    assert.match(section, /Reason code.*`scan-incomplete`/);
    assert.match(section, /Action.*Install scc or configure tools\.scc/);
    assert.match(section, /resolved scan profile/);
    assert.doesNotMatch(section, /Evaluated channel|Evaluated warnings|Blocking warnings/);
  });

  it("uses resolved profile and scan scope for no-eligible-input actions", () => {
    const metrics = qualityMetrics();
    metrics.metadata.scope.include = ["src/**/*.ts"];
    metrics.gate = {
      policy: "all",
      reasonCode: "no-eligible-input",
      status: "not-evaluated"
    };

    const section = qualityGateSummary(metrics);

    assert.match(section, /Reason code.*`no-eligible-input`/);
    assert.match(section, /Action.*resolved profile.*scan scope.*src\/\*\*\/\*\.ts/);
    assert.doesNotMatch(section, /Evaluated channel|Evaluated warnings|Blocking warnings/);
  });

  it("uses baseline owner status for comparison-unavailable actions", () => {
    const metrics = qualityMetrics();
    metrics.baseline.status = "history-unavailable";
    metrics.gate = {
      policy: "regressions",
      reasonCode: "comparison-unavailable",
      status: "not-evaluated"
    };

    const section = qualityGateSummary(metrics);

    assert.match(section, /Policy.*`regressions`/);
    assert.match(section, /Status.*`not-evaluated`/);
    assert.match(section, /Reason code.*`comparison-unavailable`/);
    assert.match(section, /Action.*baseline.*`history-unavailable`/);
    assert.doesNotMatch(section, /Evaluated channel|Evaluated warnings|Blocking warnings/);
  });
});

function qualityMetrics(): QualityMetrics {
  return createEmptyMetrics({
    repository: "/repo",
    commitSha: "test",
    configVersion: "quality-observability-v1",
    tools: [],
    scope: {
      include: [],
      excludeDirs: [],
      generatedFiles: []
    }
  });
}

function qualityFile(
  path: string,
  options: { codeLines?: number; decisionTokens: number; isChanged: boolean; lines: number }
): QualityMetrics["fileMetrics"][number] {
  return {
    path,
    language: "TypeScript",
    codeArea: "typescript-production-scripts",
    lines: options.lines,
    codeLines: options.codeLines ?? options.lines,
    decisionTokens: { value: options.decisionTokens, source: "scc" },
    isChanged: options.isChanged
  };
}

function qualityFunction(
  name: string,
  file: string,
  options: { complexity: number; lines: number }
): QualityMetrics["functionMetrics"][number] {
  return {
    name,
    file,
    codeArea: "typescript-production-scripts",
    startLine: 1,
    endLine: options.lines,
    lines: options.lines,
    parameterCount: 1,
    cyclomaticComplexity: { value: options.complexity, source: "lizard" },
    isChanged: false
  };
}

function codeAreaAggregate(
  codeArea: string,
  options: { decisionTokens: number; lines: number }
): QualityMetrics["aggregates"]["byCodeArea"][number] {
  return {
    codeArea,
    files: 1,
    lines: options.lines,
    codeLines: options.lines,
    fileDecisionTokens: options.decisionTokens,
    functions: 1,
    warningPolicy: "moderate"
  };
}

function warning(path: string, ruleId: string, value: number): WarningRecord {
  return {
    level: "warning",
    ruleId,
    sourceTool: "scc",
    path,
    line: null,
    codeArea: "typescript-production-scripts",
    metric: "code-lines",
    value,
    comparisonBasis: "changed-scope",
    baselineValue: null,
    deltaValue: null,
    isChanged: true,
    message: "test warning"
  };
}
