import type { CheckExecutionContext, CheckResult } from "../../check/check.ts";
import { collectProjectFileSets, requireProjectFileSet } from "../project-files/collection.ts";
import { settleFindings } from "../code-quality-findings/policy.ts";
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

type FunctionMetricsUnavailableReasonCode =
  | "cancelled"
  | "external-dependency-unavailable"
  | "external-execution-failed"
  | "external-result-invalid"
  | "invalid-options"
  | "source-unavailable";

/** Default Check callback；一次扫描完整 area exact-input union。 */
export async function executeFunctionMetrics(
  context: CheckExecutionContext<ResolvedFunctionMetricsOptions>
): Promise<CheckResult> {
  if (!validResolvedFunctionMetricsOptions(context.options)) return unavailable("invalid-options");
  if (context.signal.aborted) return unavailable("cancelled");

  let exactInput: FunctionMetricsExactInputSet;
  try {
    exactInput = prepareExactInputSet(context.project.root, context.options.codeAreas);
  } catch {
    return unavailable("source-unavailable");
  }
  if (context.signal.aborted) return unavailable("cancelled");
  if (exactInput.approvedExactPaths.length === 0) {
    return Object.freeze({ status: "not-applicable", reason: { code: "no-eligible-input" } });
  }
  const measurement = await measureFunctionMetrics({
    dependency: context.options.scanner,
    input: exactInput,
    signal: context.signal
  });
  if (measurement.kind !== "complete") return directMeasurementFailure(measurement);
  const analysis = analyzeFunctionMetrics(measurement.metrics);
  if (analysis === undefined) return unavailable("external-result-invalid");
  const candidates = buildFunctionRecordCandidates(analysis, exactInput.areas);
  if (candidates === undefined) return unavailable("external-result-invalid");
  for (const candidate of candidates) {
    context.records.report({ id: candidate.id }, candidate.data);
  }
  return settleFindings(candidates.map((candidate) => candidate.data.blocking));
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
  const filesByArea = collectProjectFileSets(
    rootDir,
    Object.fromEntries(orderedPolicies.map(([areaId, policy]) => [areaId, policy.files]))
  );
  for (const [codeArea, policy] of orderedPolicies) {
    const approvedExactPaths = selectLizardTargetFiles(
      requireProjectFileSet(filesByArea, codeArea)
    );
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
  switch (measurement.kind) {
    case "cancelled":
      return unavailable("cancelled");
    case "execution-failed":
      return unavailable("external-execution-failed");
    case "invalid-result":
      return unavailable("external-result-invalid");
    case "unavailable":
      return unavailable("external-dependency-unavailable");
  }
  const exhaustiveMeasurement: never = measurement;
  return exhaustiveMeasurement;
}

function unavailable(code: FunctionMetricsUnavailableReasonCode): CheckResult {
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
