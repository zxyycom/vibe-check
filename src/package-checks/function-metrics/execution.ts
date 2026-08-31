import type { CheckExecutionContext, CheckMessage, CheckResult } from "../../check/check.ts";
import { collectProjectFileSets, requireProjectFileSet } from "../project-files/collection.ts";
import { partitionProjectFilesByEligibility } from "../project-files/input-eligibility.ts";
import { settleFindings } from "../code-quality-findings/policy.ts";
import { appendFindingMessages } from "../finding-presentation/bounded-messages.ts";
import { functionFindingMessages } from "./finding-messages.ts";
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
import {
  buildFunctionInputRejectedCandidates,
  buildFunctionRecordCandidates,
  type FunctionInputRejectedCandidate,
  type FunctionRecordCandidate
} from "./records.ts";
import { isLizardTarget } from "./target-files.ts";
import type { FunctionMetricsFinalData } from "./final-data.ts";

/** `function-metrics` whole-Check unavailable outcome 的稳定 reason code。 */
export type FunctionMetricsUnavailableReasonCode =
  | "cancelled"
  | "external-dependency-unavailable"
  | "external-execution-failed"
  | "external-result-invalid"
  | "invalid-options"
  | "source-unavailable";

/** Default Check callback；一次扫描完整 area exact-input union。 */
export async function executeFunctionMetrics(
  context: CheckExecutionContext<ResolvedFunctionMetricsOptions>
): Promise<CheckResult<FunctionMetricsFinalData>> {
  if (!validResolvedFunctionMetricsOptions(context.options)) return unavailable("invalid-options");
  if (context.signal.aborted) return unavailable("cancelled");

  let prepared: PreparedFunctionInputs;
  try {
    prepared = prepareFunctionInputs(context.project.root, context.options.codeAreas);
  } catch {
    return unavailable("source-unavailable");
  }
  if (context.signal.aborted) return unavailable("cancelled");
  return executePreparedFunctionMetrics(context, prepared);
}

async function executePreparedFunctionMetrics(
  context: CheckExecutionContext<ResolvedFunctionMetricsOptions>,
  prepared: PreparedFunctionInputs
): Promise<CheckResult<FunctionMetricsFinalData>> {
  if (prepared.selectedPathCount === 0) {
    return Object.freeze({ status: "not-applicable", reason: { code: "no-eligible-input" } });
  }
  reportInputRejections(context, prepared.rejectedCandidates);
  if (prepared.exactInput.approvedExactPaths.length === 0) {
    return settleFunctionFindings([], prepared.rejectedCandidates);
  }
  const measurement = await measureFunctionMetrics({
    dependency: context.options.scanner,
    input: prepared.exactInput,
    signal: context.signal
  });
  if (measurement.kind !== "complete") {
    return appendInputRejectedMessage(
      directMeasurementFailure(measurement),
      prepared.rejectedCandidates.length
    );
  }
  const analysis = analyzeFunctionMetrics(measurement.metrics);
  if (analysis === undefined) {
    return appendInputRejectedMessage(
      unavailable("external-result-invalid"),
      prepared.rejectedCandidates.length
    );
  }
  const candidates = buildFunctionRecordCandidates(analysis, prepared.exactInput.areas);
  if (candidates === undefined) {
    return appendInputRejectedMessage(
      unavailable("external-result-invalid"),
      prepared.rejectedCandidates.length
    );
  }
  for (const candidate of candidates) {
    context.records.report({ id: candidate.id }, candidate.data);
  }
  return settleFunctionFindings(candidates, prepared.rejectedCandidates);
}

interface PreparedFunctionInputs {
  readonly exactInput: FunctionMetricsExactInputSet;
  readonly rejectedCandidates: readonly FunctionInputRejectedCandidate[];
  readonly selectedPathCount: number;
}

function prepareFunctionInputs(
  rootDir: string,
  codeAreas: ResolvedFunctionMetricsOptions["codeAreas"]
): PreparedFunctionInputs {
  const collected = collectAreaInputs(rootDir, codeAreas);
  return Object.freeze({
    exactInput: Object.freeze({
      approvedExactPaths: Object.freeze(
        uniqueSorted(collected.areas.flatMap((area) => area.approvedExactPaths))
      ),
      areas: collected.areas,
      rootDir
    }),
    rejectedCandidates: buildFunctionInputRejectedCandidates(
      new Map(
        [...collected.rejectedCodeAreasByPath].map(([path, matchingAreas]) => [
          path,
          Object.freeze(matchingAreas)
        ])
      )
    ),
    selectedPathCount: collected.selectedPaths.size
  });
}

interface CollectedFunctionAreaInputs {
  readonly areas: readonly FunctionMetricsAreaInput[];
  readonly rejectedCodeAreasByPath: ReadonlyMap<string, readonly string[]>;
  readonly selectedPaths: ReadonlySet<string>;
}

function collectAreaInputs(
  rootDir: string,
  codeAreas: Readonly<Record<string, ResolvedFunctionMetricsCodeAreaOptions>>
): CollectedFunctionAreaInputs {
  const areas: FunctionMetricsAreaInput[] = [];
  const rejectedCodeAreasByPath = new Map<string, string[]>();
  const selectedPaths = new Set<string>();
  const orderedPolicies = Object.entries(codeAreas).sort(([left], [right]) =>
    compareText(left, right)
  );
  const filesByArea = collectProjectFileSets(
    rootDir,
    Object.fromEntries(orderedPolicies.map(([areaId, policy]) => [areaId, policy.files]))
  );
  for (const [codeArea, policy] of orderedPolicies) {
    const selectedForArea = requireProjectFileSet(filesByArea, codeArea);
    for (const path of selectedForArea) selectedPaths.add(path);
    const partition = partitionProjectFilesByEligibility(selectedForArea, isLizardTarget);
    for (const path of partition.rejectedPaths) {
      const matchingAreas = rejectedCodeAreasByPath.get(path) ?? [];
      matchingAreas.push(codeArea);
      rejectedCodeAreasByPath.set(path, matchingAreas);
    }
    if (partition.acceptedPaths.length === 0) continue;
    areas.push(
      Object.freeze({
        approvedExactPaths: partition.acceptedPaths,
        codeArea,
        findingPolicy: policy.findingPolicy,
        limits: policy.limits
      })
    );
  }
  return Object.freeze({
    areas: Object.freeze(areas),
    rejectedCodeAreasByPath,
    selectedPaths
  });
}

function reportInputRejections(
  context: CheckExecutionContext<ResolvedFunctionMetricsOptions>,
  candidates: readonly FunctionInputRejectedCandidate[]
): void {
  for (const candidate of candidates) {
    context.records.report({ id: candidate.id }, candidate.data);
  }
}

function settleFunctionFindings(
  metricCandidates: readonly FunctionRecordCandidate[],
  rejectedCandidates: readonly FunctionInputRejectedCandidate[]
): CheckResult<FunctionMetricsFinalData> {
  const settlement = settleFindings([
    ...metricCandidates.map((candidate) => ({
      actionable: true,
      blocking: candidate.data.blocking
    })),
    ...rejectedCandidates.map(() => ({ actionable: false, blocking: false }))
  ]);
  return appendFindingMessages(
    appendInputRejectedMessage(settlement, rejectedCandidates.length),
    functionFindingMessages([...metricCandidates, ...rejectedCandidates])
  );
}

function appendInputRejectedMessage(
  result: CheckResult<FunctionMetricsFinalData>,
  rejectedInputCount: number
): CheckResult<FunctionMetricsFinalData> {
  if (rejectedInputCount === 0) return result;
  const message: CheckMessage = Object.freeze({
    code: "input-rejected",
    level: "warning",
    message: `${rejectedInputCount} selected functionMetrics input file(s) were rejected because their file type is unsupported; inspect this Check's Records and narrow files.include/exclude.`
  });
  return Object.freeze({
    ...result,
    messages: Object.freeze([...(result.messages ?? []), message])
  });
}

function directMeasurementFailure(
  measurement: Exclude<FunctionMeasurementResult, { kind: "complete" }>
): CheckResult<FunctionMetricsFinalData> {
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

function unavailable(
  code: FunctionMetricsUnavailableReasonCode
): CheckResult<FunctionMetricsFinalData> {
  return Object.freeze({
    status: "unavailable",
    reason: { code },
    messages: Object.freeze([
      Object.freeze({ code, level: "error" as const, message: unavailableMessage(code) })
    ])
  });
}

function unavailableMessage(code: FunctionMetricsUnavailableReasonCode): string {
  switch (code) {
    case "invalid-options":
      return "functionMetrics options are invalid; recreate the Check with functionMetrics(options) or restore its complete resolved options.";
    case "cancelled":
      return "Function metrics was cancelled before it could form a complete result; inspect the caller's cancellation reason and retry if appropriate.";
    case "source-unavailable":
      return "Function metrics could not collect its configured project files; check the project root, file permissions, and selected file source.";
    case "external-dependency-unavailable":
      return "The configured Lizard command is unavailable or incompatible; install Lizard 1.23.0 or configure a compatible executable.";
    case "external-execution-failed":
      return "Lizard did not complete successfully; run the configured command directly and inspect its environment.";
    case "external-result-invalid":
      return "Lizard output could not form a trusted complete result; check the executable version and CSV compatibility.";
  }
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareText);
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
