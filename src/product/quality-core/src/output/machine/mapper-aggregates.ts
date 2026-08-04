import type {
  AggregateMetrics,
  CodeAreaAggregate,
  LanguageAggregate
} from "../../model/schema.ts";
import type { MachineMetricsV1 } from "./schema.ts";

type MachineAggregateMetrics = MachineMetricsV1["aggregates"];
type MachineCodeAreaAggregate =
  MachineMetricsV1["aggregates"]["byCodeArea"][number];
type MachineLanguageAggregate =
  MachineMetricsV1["aggregates"]["byLanguage"][number];

export function mapAggregates(aggregates: AggregateMetrics): MachineAggregateMetrics {
  const overall: MachineAggregateMetrics["overall"] = {
    totalCodeLines: aggregates.overall.totalCodeLines,
    totalFiles: aggregates.overall.totalFiles,
    totalFunctions: aggregates.overall.totalFunctions,
    totalLines: aggregates.overall.totalLines
  };
  if (aggregates.overall.totalDuplicateFragments !== undefined) {
    overall.totalDuplicateFragments =
      aggregates.overall.totalDuplicateFragments;
  }
  if (aggregates.overall.totalFileDecisionTokens !== undefined) {
    overall.totalFileDecisionTokens =
      aggregates.overall.totalFileDecisionTokens;
  }
  if (aggregates.overall.totalFunctionCyclomaticComplexity !== undefined) {
    overall.totalFunctionCyclomaticComplexity =
      aggregates.overall.totalFunctionCyclomaticComplexity;
  }
  if (aggregates.overall.totalFunctionLines !== undefined) {
    overall.totalFunctionLines = aggregates.overall.totalFunctionLines;
  }
  if (aggregates.overall.totalFunctionParameters !== undefined) {
    overall.totalFunctionParameters =
      aggregates.overall.totalFunctionParameters;
  }

  return {
    byCodeArea: aggregates.byCodeArea.map(mapCodeAreaAggregate),
    byLanguage: aggregates.byLanguage.map(mapLanguageAggregate),
    overall
  };
}

function mapCodeAreaAggregate(
  aggregate: CodeAreaAggregate
): MachineCodeAreaAggregate {
  const projected: MachineCodeAreaAggregate = {
    codeArea: aggregate.codeArea,
    files: aggregate.files,
    functions: aggregate.functions,
    lines: aggregate.lines,
    warningPolicy:
      aggregate.warningPolicy as MachineCodeAreaAggregate["warningPolicy"]
  };
  if (aggregate.codeLines !== undefined) {
    projected.codeLines = aggregate.codeLines;
  }
  if (aggregate.cyclomaticComplexity !== undefined) {
    projected.cyclomaticComplexity = aggregate.cyclomaticComplexity;
  }
  if (aggregate.duplicateFragments !== undefined) {
    projected.duplicateFragments = aggregate.duplicateFragments;
  }
  if (aggregate.fileDecisionTokens !== undefined) {
    projected.fileDecisionTokens = aggregate.fileDecisionTokens;
  }
  if (aggregate.functionLines !== undefined) {
    projected.functionLines = aggregate.functionLines;
  }
  if (aggregate.parameterCount !== undefined) {
    projected.parameterCount = aggregate.parameterCount;
  }
  return projected;
}

function mapLanguageAggregate(
  aggregate: LanguageAggregate
): MachineLanguageAggregate {
  const projected: MachineLanguageAggregate = {
    blankLines: aggregate.blankLines,
    codeLines: aggregate.codeLines,
    commentLines: aggregate.commentLines,
    files: aggregate.files,
    language: aggregate.language,
    lines: aggregate.lines
  };
  if (aggregate.comments !== undefined) {
    projected.comments = aggregate.comments;
  }
  return projected;
}
