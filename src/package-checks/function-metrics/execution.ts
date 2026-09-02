import type { CheckExecutionContext, CheckMessage, CheckResult } from "../../check/check.ts";
import {
  reconcileFindingWaivers,
  type FindingWaiverReconciliation
} from "../../finding-waivers/reconciliation.ts";
import { collectProjectFileSets, requireProjectFileSet } from "../project-files/collection.ts";
import { partitionProjectFilesByEligibility } from "../project-files/input-eligibility.ts";
import { settleFindings } from "../code-quality-findings/policy.ts";
import {
  reportFindingWaiverAudits,
  reportReconciledCodeQualityFindingRecords
} from "../code-quality-findings/finding-waiver-evidence.ts";
import { appendCheckMessages } from "../../check/finding-presentation.ts";
import { functionFindingMessages, functionWaiverMessages } from "./finding-messages.ts";
import { analyzeFunctionMetrics } from "./analysis.ts";
import { measureFunctionMetrics, type FunctionMeasurementResult } from "./measurement.ts";
import type {
  FunctionMetricsAreaInput,
  FunctionMetricsExactInputSet
} from "./measurement-model.ts";
import type {
  FunctionMetricsFindingWaiver,
  ResolvedFunctionMetricsCodeAreaOptions,
  ResolvedFunctionMetricsOptions
} from "./options.ts";
import { validResolvedFunctionMetricsOptions } from "./options-validation.ts";
import {
  buildFunctionInputRejectedCandidates,
  buildFunctionRecordCandidates,
  functionMetricsFindingIdentity,
  functionMetricsWaiverAuditRecord,
  type FunctionInputRejectedCandidate,
  type FunctionRecordCandidate
} from "./records.ts";
import { isFunctionMetricsTarget } from "./target-files.ts";
import type { FunctionMetricsFinalData } from "./final-data.ts";

/** `function-metrics` whole-Check unavailable outcome 的稳定 reason code。 */
export type FunctionMetricsUnavailableReasonCode =
  | "analysis-failed"
  | "cancelled"
  | "invalid-options"
  | "resource-limit-exceeded"
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
    return noEligibleFunctionInputResult(context);
  }
  reportInputRejections(context, prepared.rejectedCandidates);
  if (prepared.exactInput.approvedExactPaths.length === 0) {
    const reconciliation = reconcileFunctionMetricWaivers([], context.options.findingWaivers);
    reportFindingWaiverAudits(context, reconciliation, functionMetricsWaiverAuditRecord);
    return settleFunctionFindings(reconciliation, prepared.rejectedCandidates);
  }
  const measurement = await measureFunctionMetrics({
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
      unavailable("analysis-failed"),
      prepared.rejectedCandidates.length
    );
  }
  const candidates = buildFunctionRecordCandidates(analysis, prepared.exactInput.areas);
  if (candidates === undefined) {
    return appendInputRejectedMessage(
      unavailable("analysis-failed"),
      prepared.rejectedCandidates.length
    );
  }
  const reconciliation = reconcileFunctionMetricWaivers(candidates, context.options.findingWaivers);
  reportReconciledCodeQualityFindingRecords(context, reconciliation);
  reportFindingWaiverAudits(context, reconciliation, functionMetricsWaiverAuditRecord);
  return settleFunctionFindings(reconciliation, prepared.rejectedCandidates);
}

function noEligibleFunctionInputResult(
  context: CheckExecutionContext<ResolvedFunctionMetricsOptions>
): CheckResult<FunctionMetricsFinalData> {
  const reconciliation = reconcileFunctionMetricWaivers([], context.options.findingWaivers);
  reportFindingWaiverAudits(context, reconciliation, functionMetricsWaiverAuditRecord);
  return appendCheckMessages(
    Object.freeze({ status: "not-applicable", reason: { code: "no-eligible-input" } }),
    functionWaiverMessages(reconciliation)
  );
}

function reconcileFunctionMetricWaivers(
  candidates: readonly FunctionRecordCandidate[],
  waivers: readonly FunctionMetricsFindingWaiver[]
): FindingWaiverReconciliation<FunctionRecordCandidate> {
  return reconcileFindingWaivers({
    findings: candidates,
    identify: functionMetricsFindingIdentity,
    waivers
  });
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
    const partition = partitionProjectFilesByEligibility(selectedForArea, isFunctionMetricsTarget);
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
  reconciliation: FindingWaiverReconciliation<FunctionRecordCandidate>,
  rejectedCandidates: readonly FunctionInputRejectedCandidate[]
): CheckResult<FunctionMetricsFinalData> {
  const settlement = settleFindings([
    ...reconciliation.findings.map((finding) => ({
      actionable: finding.disposition !== "waived",
      blocking: finding.finding.data.blocking
    })),
    ...rejectedCandidates.map(() => ({ actionable: false, blocking: false }))
  ]);
  const actionableMetricCandidates = reconciliation.findings
    .filter(({ disposition }) => disposition !== "waived")
    .map(({ finding }) => finding);
  return appendCheckMessages(
    appendCheckMessages(
      appendInputRejectedMessage(settlement, rejectedCandidates.length),
      functionFindingMessages([...actionableMetricCandidates, ...rejectedCandidates])
    ),
    functionWaiverMessages(reconciliation)
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
    case "analysis-failed":
      return unavailable("analysis-failed");
    case "resource-limit-exceeded":
      return unavailable("resource-limit-exceeded");
    case "source-unavailable":
      return unavailable("source-unavailable");
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
    case "analysis-failed":
      return "Function metrics analysis did not produce a complete trusted result; inspect the selected source and retry after correcting it.";
    case "resource-limit-exceeded":
      return "Function metrics input exceeds the per-file or aggregate analysis resource limit; narrow the selected files or reduce their size.";
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
