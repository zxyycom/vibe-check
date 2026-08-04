import type {
  BaselineStatus,
  GateNotEvaluatedReasonCode,
  QualityMetrics,
  WarningRecord
} from "../../../model/schema.ts";
import { formatCommitDisplay, formatReportTimestamp, type ReportOptions } from "./formatting.ts";
import {
  appendCodeAreaTable,
  appendLanguageTable,
  fingerprintTable
} from "./tables.ts";

export function title(options: ReportOptions) {
  return [
    `# ${options.title}`,
    "",
    `**${options.nonBlockingNotice}**`
  ].join("\n");
}

type ComparisonSectionRenderer = (metrics: QualityMetrics) => string;

const comparisonSectionRenderers: Partial<Record<string, ComparisonSectionRenderer>> = {
  "input-unchanged": () => inputUnchangedComparisonSection(),
  "baseline-unavailable": (metrics) => baselineUnavailableComparisonSection(metrics.baseline.status),
  compared: (metrics) => (metrics.baseline.metadata ? comparedComparisonSection(metrics) : "")
};

const baselineUnavailableReasons: Partial<Record<string, string>> = {
  "baseline-skipped": "Baseline scan was skipped",
  "history-unavailable": "Git history 不足",
  "no-baseline-commit": "找不到可用的 baseline commit",
  "baseline-materialization-failed": "Baseline commit 导出失败",
  "baseline-scan-failed": "Baseline 扫描失败"
};

export function scanInfo(metrics: QualityMetrics, options: ReportOptions): string {
  const m = metrics.metadata;
  const tools = m.tools.map((tool) => `- **${tool.name}**: ${tool.version} (via ${tool.source})`).join("\n");
  const timestamp = formatReportTimestamp(m.timestamp, options?.timeZone);
  return [
    "## 扫描信息",
    "",
    `- **Schema version**: ${m.schemaVersion}`,
    `- **Timestamp**: ${timestamp}`,
    `- **Commit**: ${formatCommitDisplay(m.commitSha, m.commitTitle)}`,
    `- **Config version**: ${m.configVersion}`,
    `- **Scope**: ${m.scope.include.join(", ")}`,
    "",
    "### 工具",
    tools,
    "",
    `- **Baseline status**: \`${metrics.baseline.status}\``,
    `- **Comparison status**: \`${metrics.comparisonStatus}\``,
    "",
    ...scanCompletenessInfo(metrics)
  ].join("\n");
}

function scanCompletenessInfo(metrics: QualityMetrics): string[] {
  const lines = [
    "### Scan completeness",
    "",
    `- **Overall**: \`${metrics.scanCompleteness.overall}\``
  ];

  for (const result of metrics.scanCompleteness.capabilities) {
    if (result.status === "failed") {
      lines.push(
        `- **${result.capabilityId}**: \`failed\` (kind: \`${result.diagnostic.kind}\`)`,
        `  - **Reason**: ${result.diagnostic.message}`,
        `  - **Action**: ${result.diagnostic.action}`
      );
      continue;
    }

    const detail = result.status === "skipped"
      ? "profile skipped"
      : result.status === "no-input"
        ? "no eligible input"
        : "measurement succeeded";
    lines.push(`- **${result.capabilityId}**: \`${result.status}\` (${detail})`);
  }

  if (metrics.scanCompleteness.overall === "empty") {
    lines.push(
      "",
      "**⚠️ Quality was not evaluated because no capability had eligible measurement input.**"
    );
  } else if (metrics.scanCompleteness.overall === "failed") {
    lines.push(
      "",
      "**❌ Quality was not evaluated because a required current measurement did not complete.**"
    );
  }

  return lines;
}

export function comparisonInfo(metrics: QualityMetrics): string {
  return comparisonSectionRenderers[metrics.comparisonStatus]?.(metrics) ?? "";
}

export function qualityGateSummary(metrics: QualityMetrics): string {
  const gate = metrics.gate;
  if (gate.status === "disabled") {
    return "";
  }

  const lines = [
    "## Quality Gate",
    "",
    `- **Policy**: \`${gate.policy}\``,
    `- **Status**: \`${gate.status}\``
  ];

  if (gate.status === "not-evaluated") {
    lines.push(
      `- **Reason code**: \`${gate.reasonCode}\``,
      `- **Action**: ${notEvaluatedGateAction(metrics, gate.reasonCode)}`
    );
    if (gate.policy === "all") {
      lines.push(
        "",
        "- **Scope**: Only warnings produced by the resolved scan profile can be evaluated."
      );
    }
    return lines.join("\n");
  }

  lines.push(
    `- **Evaluated channel**: \`${gate.evaluatedChannel}\``,
    `- **Evaluated warnings**: ${gate.evaluatedWarningCount}`,
    `- **Blocking warnings**: ${gate.blockingWarningCount}`
  );

  if (gate.policy === "all") {
    lines.push(
      "",
      "- **Scope**: Only warnings produced by the resolved scan profile were evaluated."
    );
  }

  if (gate.status === "failed") {
    lines.push("", "### Blocking warnings", "");
    appendGateWarnings(lines, gate.blockingWarnings);
  }

  return lines.join("\n");
}

function inputUnchangedComparisonSection(): string {
  return [
    "## Comparison",
    "",
    "**代码输入未变化。** 本次变更未修改任何纳入扫描的代码文件。",
    "当前快照已生成，但不生成动态质量指标或重复代码 annotation。"
  ].join("\n");
}

function baselineUnavailableComparisonSection(status: BaselineStatus | string): string {
  const reason = baselineUnavailableReason(status);
  return [
    "## Comparison",
    "",
    `**⚠️ Baseline 不可用:** ${reason} (\`${status}\`)。`,
    "Baseline delta 不可用，报告仅展示当前快照。"
  ].join("\n");
}

function comparedComparisonSection(metrics: QualityMetrics): string {
  const baseline = metrics.baseline;
  const baselineMetadata = metrics.baseline.metadata;
  if (!baselineMetadata) {
    return "";
  }

  return [
    "## Comparison",
    "",
    `- **Baseline commit**: ${formatCommitDisplay(baseline.commitSha || "unknown", baselineMetadata.commitTitle)}`,
    `- **Baseline date**: ${baseline.commitDate || "unknown"}`,
    `- **Selection reason**: ${baselineMetadata.selectionReason}`,
    "",
    "### Code Area 指纹对比",
    "",
    fingerprintTable(metrics)
  ].join("\n");
}

export function repositorySize(metrics: QualityMetrics): string {
  const agg = metrics.aggregates;
  const lines: string[] = [];

  lines.push("## 仓库体量与语言占比");
  lines.push("");

  if (agg.overall.totalFiles > 0) {
    lines.push(`- **Total files**: ${agg.overall.totalFiles}`);
    lines.push(`- **Total lines**: ${agg.overall.totalLines.toLocaleString()}`);
    lines.push(`- **Total code lines**: ${agg.overall.totalCodeLines.toLocaleString()}`);
    lines.push(`- **Total functions**: ${agg.overall.totalFunctions}`);
  } else {
    lines.push("*(no file metrics available)*");
  }

  lines.push("");

  appendLanguageTable(lines, agg);
  appendCodeAreaTable(lines, agg);

  return lines.join("\n");
}

export function footer(metrics: QualityMetrics, options: ReportOptions): string {
  const timestamp = formatReportTimestamp(metrics.metadata.timestamp, options?.timeZone);
  return [
    "---",
    "",
    `*Report generated at ${timestamp} by ${options.footerGeneratedBy}*`,
    "",
    `*Config version: ${metrics.metadata.configVersion} | Schema version: ${metrics.metadata.schemaVersion}*`,
    "",
    `*${options.footerNotice}*`
  ].join("\n");
}

function notEvaluatedGateAction(
  metrics: QualityMetrics,
  reasonCode: GateNotEvaluatedReasonCode
): string {
  if (reasonCode === "scan-incomplete") {
    const actions = metrics.scanCompleteness.capabilities.flatMap((result) =>
      result.status === "failed" ? [result.diagnostic.action] : []
    );
    return actions.length > 0
      ? actions.join("; ")
      : "Resolve the failed scan capabilities and rerun the gate.";
  }

  if (reasonCode === "no-eligible-input") {
    const includeScope = metrics.metadata.scope.include.length > 0
      ? metrics.metadata.scope.include.join(", ")
      : "(no include patterns configured)";
    return "Review the resolved profile and scan scope " +
      `(\`${includeScope}\`) so at least one capability has eligible input.`;
  }

  return "Make baseline evidence available " +
    `(current baseline status: \`${metrics.baseline.status}\`) and rerun the gate.`;
}

function appendGateWarnings(lines: string[], warnings: readonly WarningRecord[]): void {
  for (const warning of warnings) {
    lines.push(`- **[${warning.sourceTool}] ${warning.metric}**: ${warning.message}`);
    if (warning.acceptedReason) {
      lines.push(`  → Accepted reason: ${warning.acceptedReason}`);
    }
    if (warning.suggestion) {
      lines.push(`  → ${warning.suggestion}`);
    }
  }
}

function baselineUnavailableReason(status: BaselineStatus | string): string {
  return baselineUnavailableReasons[status] ?? "未知原因";
}
