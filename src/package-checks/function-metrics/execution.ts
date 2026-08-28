import type { CheckExecutionContext, CheckResult } from "../../check/check.ts";
import { collectProjectFiles } from "../project-files/collection.ts";
import { analyzeFunctionMetrics } from "./analysis.ts";
import { measureFunctionMetrics, type FunctionMeasurementResult } from "./measurement.ts";
import type {
  FunctionMetricsAreaInput,
  FunctionMetricsExactInputSet
} from "./measurement-model.ts";
import type {
  ResolvedFunctionMetricsCodeAreaOptions,
  ResolvedFunctionMetricsOptions
} from "./options.ts";
import { validResolvedFunctionMetricsOptions } from "./options-validation.ts";
import { buildFunctionRecordCandidates } from "./records.ts";
import { selectLizardTargetFiles } from "./target-files.ts";

export const FUNCTION_METRICS_CHECK_DEFINITION = {
  checkId: "function-metrics",
  displayName: "Function metrics"
} as const;

/** Default Check callback；一次扫描完整 area exact-input union。 */
export async function executeFunctionMetrics(
  context: CheckExecutionContext<ResolvedFunctionMetricsOptions>
): Promise<CheckResult> {
  if (!validResolvedFunctionMetricsOptions(context.options)) return unavailable("invalid-options");

  const exactInput = prepareExactInputSet(context.project.root, context.options.codeAreas);
  if (exactInput.approvedExactPaths.length === 0) {
    return Object.freeze({ status: "not-applicable", reason: { code: "no-eligible-input" } });
  }
  const measurement = await measureFunctionMetrics(exactInput, context.options.scanner);
  if (measurement.kind !== "complete") return directMeasurementFailure(measurement);
  const analysis = analyzeFunctionMetrics(measurement.metrics);
  if (analysis === undefined) return unavailable("external-result-invalid");
  const candidates = buildFunctionRecordCandidates(analysis, exactInput.areas);
  if (candidates === undefined) return unavailable("external-result-invalid");
  for (const candidate of candidates) {
    context.records.report({ id: candidate.id }, candidate.data);
  }
  const blockingFindingCount = candidates.filter((candidate) => candidate.data.blocking).length;
  return Object.freeze({
    status: blockingFindingCount > 0 ? "failed" : "passed",
    data: Object.freeze({
      blockingFindingCount,
      findingCount: candidates.length
    })
  });
}

function prepareExactInputSet(
  rootDir: string,
  codeAreas: ResolvedFunctionMetricsOptions["codeAreas"]
): FunctionMetricsExactInputSet {
  const areas = collectAreaInputs(rootDir, codeAreas);
  return Object.freeze({
    approvedExactPaths: Object.freeze(
      uniqueSorted(areas.flatMap((area) => area.approvedExactPaths))
    ),
    areas,
    rootDir
  });
}

function collectAreaInputs(
  rootDir: string,
  codeAreas: Readonly<Record<string, ResolvedFunctionMetricsCodeAreaOptions>>
): readonly FunctionMetricsAreaInput[] {
  const areas: FunctionMetricsAreaInput[] = [];
  const orderedPolicies = Object.entries(codeAreas).sort(([left], [right]) =>
    compareText(left, right)
  );
  for (const [codeArea, policy] of orderedPolicies) {
    const approvedExactPaths = selectLizardTargetFiles(collectProjectFiles(rootDir, policy.files));
    if (approvedExactPaths.length === 0) continue;
    areas.push(
      Object.freeze({
        approvedExactPaths: Object.freeze(approvedExactPaths),
        codeArea,
        findingPolicy: policy.findingPolicy,
        limits: policy.limits
      })
    );
  }
  return Object.freeze(areas);
}

function directMeasurementFailure(
  measurement: Exclude<FunctionMeasurementResult, { kind: "complete" }>
): CheckResult {
  if (measurement.kind === "unavailable") return unavailable("external-dependency-unavailable");
  if (measurement.kind === "execution-failed") return unavailable("external-execution-failed");
  return unavailable("external-result-invalid");
}

function unavailable(code: string): CheckResult {
  return Object.freeze({ status: "unavailable", reason: { code } });
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareText);
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
