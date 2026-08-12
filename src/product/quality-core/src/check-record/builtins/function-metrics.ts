import type { FunctionScannerDependency } from "../../../../scanner-dependencies.ts";
import { classifyFile } from "../../model/code-areas.ts";
import type { CodeAreaDefinition, FunctionMetric } from "../../model/schema.ts";
import { scanWithLizard } from "../../measurement/scanners/lizard.ts";
import { checkLizard } from "../../measurement/scanners/tool-availability/lizard.ts";
import { acceptScopedMeasurements } from "../../measurement/scoped-measurement.ts";
import type { CheckExecutionBinding } from "../catalog.ts";
import { canonicalJsonBytes } from "../identity.ts";
import type {
  CheckDefinition,
  FinalCoreSnapshot,
  QualityRecordCandidate,
  RecordLevel
} from "../model.ts";
import type { ReferenceFacts } from "../policy-model.ts";

const FUNCTION_METRICS_WORK_HANDLE = "work-handle/v1:function-metrics";

const FUNCTION_RECORD_FIELDS = [
  { fieldId: "codeArea", valueType: "string", required: true },
  { fieldId: "limit", valueType: "integer", required: true },
  { fieldId: "metric", valueType: "string", required: true },
  { fieldId: "suggestion", valueType: "string", required: true },
  { fieldId: "value", valueType: "integer", required: true }
] as const;

const FUNCTION_RECORD_POLICY = {
  operands: [{
    operandId: "codeArea",
    valueType: "string",
    source: { kind: "field", fieldId: "codeArea" }
  }, {
    operandId: "message",
    valueType: "string",
    source: { kind: "message" }
  }, {
    operandId: "metric",
    valueType: "string",
    source: { kind: "field", fieldId: "metric" }
  }, {
    operandId: "path",
    valueType: "string",
    source: { kind: "location-path" }
  }, {
    operandId: "suggestion",
    valueType: "string",
    source: { kind: "field", fieldId: "suggestion" }
  }, {
    operandId: "value",
    valueType: "number",
    source: { kind: "field", fieldId: "value" }
  }],
  relations: ["changed", "regression"]
} as const;

export const FUNCTION_METRICS_CHECK_DEFINITION = {
  checkId: "function-metrics",
  displayName: "Function metrics",
  recordTypes: [{
    recordTypeId: "function-code-lines",
    fields: FUNCTION_RECORD_FIELDS,
    identityFields: ["metric"],
    policy: FUNCTION_RECORD_POLICY
  }, {
    recordTypeId: "function-cyclomatic-complexity",
    fields: FUNCTION_RECORD_FIELDS,
    identityFields: ["metric"],
    policy: FUNCTION_RECORD_POLICY
  }, {
    recordTypeId: "function-parameter-count",
    fields: FUNCTION_RECORD_FIELDS,
    identityFields: ["metric"],
    policy: FUNCTION_RECORD_POLICY
  }]
} as const satisfies CheckDefinition;

interface FunctionThreshold {
  readonly absoluteFloor: number;
  readonly changedDelta: number;
}

export interface FunctionMetricsSemantics {
  readonly codeAreas: Readonly<Record<string, CodeAreaDefinition>>;
  readonly generatedFiles: readonly string[];
  readonly functions: Readonly<{
    codeLines: FunctionThreshold & Readonly<{
      lowComplexityAllowance: Readonly<{
        codeLineFloor: number;
        maxCyclomaticComplexityExclusive: number;
      }>;
    }>;
    cyclomaticComplexity: FunctionThreshold;
    parameterCount: FunctionThreshold;
  }>;
}

export interface FunctionMetricsExactInputSet {
  readonly approvedExactPaths: readonly string[];
  readonly rootDir: string;
}

export interface FunctionMetricsReferenceInput extends FunctionMetricsExactInputSet {
  readonly referenceName: string;
}

export interface FunctionMetricsBindingRuntime {
  readonly binding: CheckExecutionBinding;
  readonly referenceFacts: (snapshot: FinalCoreSnapshot) => ReferenceFacts;
}

type MeasurementResult = Readonly<
  | { kind: "complete"; metrics: readonly FunctionMetric[] }
  | { kind: "execution-failed" }
  | { kind: "invalid-result" }
  | { kind: "unavailable" }
>;

type ReferenceStatus = "complete" | "incomplete" | "unavailable";
type RelationId = "changed" | "regression";
type FunctionRecordTypeId = typeof FUNCTION_METRICS_CHECK_DEFINITION.recordTypes[number]["recordTypeId"];

interface FunctionValues {
  readonly codeLines: number;
  readonly cyclomaticComplexity: number | null;
  readonly parameterCount: number;
}

interface FunctionRecordCandidate {
  readonly comparisonKey: string;
  readonly hasStableName: boolean;
  readonly isChanged: boolean;
  readonly record: QualityRecordCandidate;
  readonly value: number;
}

interface FunctionMetricInstance {
  readonly comparisonKey: string;
  readonly metric: FunctionMetric;
  readonly semanticSubject: string;
}

interface FunctionMetricAnalysis {
  readonly groups: ReadonlyMap<string, readonly FunctionValues[]>;
  readonly instances: readonly FunctionMetricInstance[];
}

export function resolveFunctionMetricsApplicability(
  approvedExactPaths: readonly string[]
): Readonly<
  | { status: "not-applicable" }
  | { status: "applicable"; workHandles: readonly string[] }
> {
  return approvedExactPaths.length === 0
    ? Object.freeze({ status: "not-applicable" })
    : Object.freeze({
      status: "applicable",
      workHandles: Object.freeze([FUNCTION_METRICS_WORK_HANDLE])
    });
}

export function createFunctionMetricsBinding(input: Readonly<{
  changedFiles: readonly string[];
  current: FunctionMetricsExactInputSet;
  dependency: FunctionScannerDependency;
  reference: FunctionMetricsReferenceInput | null;
  semantics: FunctionMetricsSemantics;
}>): FunctionMetricsBindingRuntime {
  const current = detachedInputSet(input.current);
  const changedFiles = Object.freeze([...input.changedFiles]);
  const reference = input.reference === null
    ? null
    : Object.freeze({
      ...detachedInputSet(input.reference),
      referenceName: input.reference.referenceName
    });
  let referenceStatus: ReferenceStatus | null = reference === null ? null : "incomplete";
  let relationsByRecordKey = new Map<string, readonly RelationId[]>();

  const binding: CheckExecutionBinding = async (ports) => {
    try {
      const currentMeasurement = await measureExactInputs(current, input.dependency);
      if (currentMeasurement.kind === "unavailable") {
        return { status: "unavailable", dependencyId: "lizard" };
      }
      if (currentMeasurement.kind === "execution-failed") {
        throw new Error("function-metrics scanner execution failed");
      }
      if (currentMeasurement.kind === "invalid-result") {
        return { verdict: "invalid" };
      }

      const currentAnalysis = analyzeFunctionMetrics(currentMeasurement.metrics);
      if (currentAnalysis === undefined) {
        return { verdict: "invalid" };
      }
      const candidates = buildRecordCandidates(currentAnalysis, changedFiles, input.semantics);
      for (const candidate of candidates) {
        ports.submitRecord(candidate.record);
      }

      if (reference !== null) {
        const referenceMeasurement = await measureExactInputs(reference, input.dependency);
        if (referenceMeasurement.kind === "unavailable") {
          referenceStatus = "unavailable";
        } else if (referenceMeasurement.kind !== "complete") {
          referenceStatus = "incomplete";
        } else {
          const referenceAnalysis = analyzeFunctionMetrics(referenceMeasurement.metrics);
          if (referenceAnalysis === undefined) {
            referenceStatus = "incomplete";
          } else {
            referenceStatus = "complete";
            relationsByRecordKey = buildRelations(
              candidates,
              currentAnalysis,
              referenceAnalysis,
              input.semantics
            );
          }
        }
      }

      return { verdict: candidates.length > 0 ? "failed" : "passed" };
    } finally {
      for (const workHandle of ports.workHandles) {
        ports.acknowledge(workHandle);
      }
    }
  };

  return Object.freeze({
    binding,
    referenceFacts: (snapshot: FinalCoreSnapshot) => buildReferenceFacts(
      snapshot,
      reference?.referenceName ?? null,
      referenceStatus,
      relationsByRecordKey
    )
  });
}

function detachedInputSet(input: FunctionMetricsExactInputSet): FunctionMetricsExactInputSet {
  return Object.freeze({
    rootDir: input.rootDir,
    approvedExactPaths: Object.freeze([...input.approvedExactPaths])
  });
}

async function measureExactInputs(
  input: FunctionMetricsExactInputSet,
  dependency: FunctionScannerDependency
): Promise<MeasurementResult> {
  if (input.approvedExactPaths.length === 0) {
    return Object.freeze({ kind: "complete", metrics: Object.freeze([]) });
  }
  const availability = await checkLizard(input.rootDir, dependency);
  if (!availability.available) {
    return Object.freeze({ kind: "unavailable" });
  }

  let result: ReturnType<typeof scanWithLizard>;
  try {
    result = scanWithLizard({
      cwd: input.rootDir,
      dependency,
      files: input.approvedExactPaths
    });
  } catch {
    return Object.freeze({ kind: "execution-failed" });
  }
  if (!result.ok) {
    return Object.freeze({
      kind: result.reason === "execution" ? "execution-failed" : "invalid-result"
    });
  }
  const accepted = acceptScopedMeasurements(result.measurements, input.approvedExactPaths);
  return accepted.ok
    ? Object.freeze({ kind: "complete", metrics: Object.freeze([...accepted.payloads]) })
    : Object.freeze({ kind: "invalid-result" });
}

function analyzeFunctionMetrics(
  metrics: readonly FunctionMetric[]
): FunctionMetricAnalysis | undefined {
  const metricsByComparisonKey = new Map<string, FunctionMetric[]>();
  for (const metric of metrics) {
    if (!isValidFunctionMetric(metric)) {
      return undefined;
    }
    const key = functionComparisonKey(metric);
    const group = metricsByComparisonKey.get(key) ?? [];
    group.push(metric);
    metricsByComparisonKey.set(key, group);
  }

  const groups = new Map<string, readonly FunctionValues[]>();
  const instances: FunctionMetricInstance[] = [];
  for (const [comparisonKey, group] of metricsByComparisonKey) {
    const sortedGroup = [...group].sort(compareFunctionInstances);
    groups.set(comparisonKey, Object.freeze(sortedGroup.map((metric) => Object.freeze({
      codeLines: metric.lines,
      cyclomaticComplexity: metric.cyclomaticComplexity.value,
      parameterCount: metric.parameterCount
    }))));

    for (const [index, metric] of sortedGroup.entries()) {
      instances.push(Object.freeze({
        comparisonKey,
        metric,
        semanticSubject: isStableFunctionName(metric.name) && sortedGroup.length === 1
          ? functionSubject(metric)
          : ambiguousFunctionSubject(metric, index + 1)
      }));
    }
  }
  instances.sort((left, right) => compareText(left.semanticSubject, right.semanticSubject));
  return Object.freeze({ groups, instances: Object.freeze(instances) });
}

function buildRecordCandidates(
  analysis: FunctionMetricAnalysis,
  changedFiles: readonly string[],
  semantics: FunctionMetricsSemantics
): readonly FunctionRecordCandidate[] {
  const candidates: FunctionRecordCandidate[] = [];
  for (const instance of analysis.instances) {
    const { metric } = instance;
    const codeArea = classifyFile(
      metric.file,
      semantics.codeAreas as Record<string, CodeAreaDefinition>,
      semantics.generatedFiles
    );
    const area = semantics.codeAreas[codeArea];
    if (area === undefined || area.warningPolicy === "exclude-warnings") {
      continue;
    }
    const level: RecordLevel = area.warningPolicy === "watchlist-only" ? "info" : "warning";
    const subject = instance.semanticSubject;
    const complexity = metric.cyclomaticComplexity.value;
    if (complexity !== null) {
      appendCandidate(candidates, {
        codeArea,
        comparisonKey: instance.comparisonKey,
        hasStableName: isStableFunctionName(metric.name),
        isChanged: isInChangedScope(metric.file, changedFiles),
        level,
        limit: semantics.functions.cyclomaticComplexity.absoluteFloor,
        message: `Function "${metric.name}" in ${metric.file}:${metric.startLine} has cyclomatic complexity ${complexity} (threshold: ${semantics.functions.cyclomaticComplexity.absoluteFloor} CC)`,
        metric: "cyclomatic-complexity",
        path: metric.file,
        recordTypeId: "function-cyclomatic-complexity",
        startLine: metric.startLine,
        subject,
        suggestion: "Consider breaking this function into smaller, more focused functions",
        value: complexity
      });
    }

    const codeLineFloor = functionCodeLineFloor(metric, semantics);
    appendCandidate(candidates, {
      codeArea,
      comparisonKey: instance.comparisonKey,
      hasStableName: isStableFunctionName(metric.name),
      isChanged: isInChangedScope(metric.file, changedFiles),
      level,
      limit: codeLineFloor,
      message: `Function "${metric.name}" in ${metric.file}:${metric.startLine} has ${metric.lines} code lines at cyclomatic complexity ${complexity ?? "n/a"} (Lizard NLOC; threshold: ${functionCodeLineThresholdLabel(metric, semantics)})`,
      metric: "function-code-density",
      path: metric.file,
      recordTypeId: "function-code-lines",
      startLine: metric.startLine,
      subject,
      suggestion: "Consider reducing branching or splitting the function when line count and complexity make it hard to review",
      value: metric.lines
    });
    appendCandidate(candidates, {
      codeArea,
      comparisonKey: instance.comparisonKey,
      hasStableName: isStableFunctionName(metric.name),
      isChanged: isInChangedScope(metric.file, changedFiles),
      level,
      limit: semantics.functions.parameterCount.absoluteFloor,
      message: `Function "${metric.name}" in ${metric.file}:${metric.startLine} has ${metric.parameterCount} parameters (threshold: ${semantics.functions.parameterCount.absoluteFloor} parameters)`,
      metric: "parameter-count",
      path: metric.file,
      recordTypeId: "function-parameter-count",
      startLine: metric.startLine,
      subject,
      suggestion: "Consider using a parameter object or splitting the function",
      value: metric.parameterCount
    });
  }
  candidates.sort((left, right) => compareText(recordKey(left.record), recordKey(right.record)));
  return Object.freeze(candidates);
}

function appendCandidate(
  candidates: FunctionRecordCandidate[],
  input: Readonly<{
    codeArea: string;
    comparisonKey: string;
    hasStableName: boolean;
    isChanged: boolean;
    level: RecordLevel;
    limit: number;
    message: string;
    metric: string;
    path: string;
    recordTypeId: FunctionRecordTypeId;
    startLine: number;
    subject: string;
    suggestion: string;
    value: number;
  }>
): void {
  if (input.value <= input.limit) {
    return;
  }
  candidates.push(Object.freeze({
    comparisonKey: input.comparisonKey,
    hasStableName: input.hasStableName,
    isChanged: input.isChanged,
    value: input.value,
    record: Object.freeze({
      recordTypeId: input.recordTypeId,
      level: input.level,
      semanticSubject: input.subject,
      message: input.message,
      fields: Object.freeze({
        codeArea: input.codeArea,
        limit: input.limit,
        metric: input.metric,
        suggestion: input.suggestion,
        value: input.value
      }),
      location: Object.freeze({ path: input.path, line: input.startLine, column: 1 })
    })
  }));
}

function isValidFunctionMetric(metric: FunctionMetric): boolean {
  const complexity = metric.cyclomaticComplexity.value;
  return typeof metric.file === "string" && metric.file.length > 0
    && typeof metric.name === "string" && metric.name.length > 0
    && Number.isSafeInteger(metric.startLine) && metric.startLine >= 1
    && Number.isSafeInteger(metric.endLine) && metric.endLine >= metric.startLine
    && Number.isSafeInteger(metric.lines) && metric.lines >= 0
    && Number.isSafeInteger(metric.parameterCount) && metric.parameterCount >= 0
    && (complexity === null || (Number.isSafeInteger(complexity) && complexity >= 0));
}

function functionSubject(metric: Pick<FunctionMetric, "file" | "name">): string {
  const identity = new TextDecoder().decode(canonicalJsonBytes({
    file: metric.file,
    name: metric.name
  }));
  return `function:${identity}`;
}

function ambiguousFunctionSubject(
  metric: Pick<FunctionMetric, "file" | "name">,
  occurrence: number
): string {
  const identity = new TextDecoder().decode(canonicalJsonBytes({
    file: metric.file,
    name: metric.name,
    occurrence
  }));
  return `function-instance:${identity}`;
}

function functionComparisonKey(metric: Pick<FunctionMetric, "file" | "name">): string {
  return `${metric.file}\u0000${metric.name}`;
}

function compareFunctionInstances(left: FunctionMetric, right: FunctionMetric): number {
  return left.lines - right.lines
    || (left.cyclomaticComplexity.value ?? -1) - (right.cyclomaticComplexity.value ?? -1)
    || left.parameterCount - right.parameterCount;
}

function functionCodeLineFloor(
  metric: FunctionMetric,
  semantics: FunctionMetricsSemantics
): number {
  const allowance = semantics.functions.codeLines.lowComplexityAllowance;
  const complexity = metric.cyclomaticComplexity.value;
  return complexity !== null && complexity < allowance.maxCyclomaticComplexityExclusive
    ? allowance.codeLineFloor
    : semantics.functions.codeLines.absoluteFloor;
}

function functionCodeLineThresholdLabel(
  metric: FunctionMetric,
  semantics: FunctionMetricsSemantics
): string {
  const allowance = semantics.functions.codeLines.lowComplexityAllowance;
  const floor = functionCodeLineFloor(metric, semantics);
  const complexity = metric.cyclomaticComplexity.value;
  return complexity !== null && complexity < allowance.maxCyclomaticComplexityExclusive
    ? `${floor} code lines for CC < ${allowance.maxCyclomaticComplexityExclusive}`
    : `${floor} code lines`;
}

function buildRelations(
  candidates: readonly FunctionRecordCandidate[],
  currentAnalysis: FunctionMetricAnalysis,
  referenceAnalysis: FunctionMetricAnalysis,
  semantics: FunctionMetricsSemantics
): Map<string, readonly RelationId[]> {
  const relations = new Map<string, readonly RelationId[]>();
  for (const candidate of candidates) {
    if (!candidate.isChanged) {
      relations.set(recordKey(candidate.record), Object.freeze([]));
      continue;
    }
    const currentGroup = currentAnalysis.groups.get(candidate.comparisonKey) ?? [];
    const referenceGroup = referenceAnalysis.groups.get(candidate.comparisonKey) ?? [];
    if (!candidate.hasStableName || currentGroup.length !== 1 || referenceGroup.length > 1) {
      relations.set(recordKey(candidate.record), Object.freeze(["changed"]));
      continue;
    }
    const reference = referenceGroup[0];
    const baselineValue = reference === undefined
      ? 0
      : valueForRecordType(reference, candidate.record.recordTypeId);
    if (baselineValue === null) {
      relations.set(recordKey(candidate.record), Object.freeze(["changed"]));
      continue;
    }
    const delta = candidate.value - baselineValue;
    if (delta > changedDeltaForRecordType(candidate.record.recordTypeId, semantics)) {
      relations.set(recordKey(candidate.record), Object.freeze(["regression"]));
    } else {
      relations.set(recordKey(candidate.record), Object.freeze(["changed"]));
    }
  }
  return relations;
}

function isInChangedScope(filePath: string, changedFiles: readonly string[]): boolean {
  return changedFiles.some((changedFile) => (
    filePath.includes(changedFile) || changedFile.includes(filePath)
  ));
}

function isStableFunctionName(name: string): boolean {
  return name.trim() !== "" && name !== "(anonymous)" && name !== "unknown";
}

function valueForRecordType(
  values: FunctionValues,
  recordTypeId: string
): number | null {
  switch (recordTypeId) {
    case "function-code-lines":
      return values.codeLines;
    case "function-cyclomatic-complexity":
      return values.cyclomaticComplexity;
    case "function-parameter-count":
      return values.parameterCount;
    default:
      return null;
  }
}

function changedDeltaForRecordType(
  recordTypeId: string,
  semantics: FunctionMetricsSemantics
): number {
  switch (recordTypeId) {
    case "function-code-lines":
      return semantics.functions.codeLines.changedDelta;
    case "function-cyclomatic-complexity":
      return semantics.functions.cyclomaticComplexity.changedDelta;
    case "function-parameter-count":
      return semantics.functions.parameterCount.changedDelta;
    default:
      return Number.POSITIVE_INFINITY;
  }
}

function recordKey(record: Pick<QualityRecordCandidate, "recordTypeId" | "semanticSubject">): string {
  return `${record.semanticSubject}\u0000${record.recordTypeId}`;
}

function buildReferenceFacts(
  snapshot: FinalCoreSnapshot,
  referenceName: string | null,
  referenceStatus: ReferenceStatus | null,
  relationsByRecordKey: ReadonlyMap<string, readonly RelationId[]>
): ReferenceFacts {
  if (referenceName === null || referenceStatus === null) {
    return Object.freeze({ evidence: Object.freeze([]), relations: Object.freeze([]) });
  }
  const relations = snapshot.records
    .filter((record) => record.checkId === "function-metrics")
    .flatMap((record) => (
      (relationsByRecordKey.get(recordKey(record)) ?? []).map((relationId) => Object.freeze({
        recordId: record.recordId,
        referenceName,
        relationId
      }))
    ))
    .sort((left, right) => compareText(
      `${left.recordId}\u0000${left.relationId}`,
      `${right.recordId}\u0000${right.relationId}`
    ));
  return Object.freeze({
    evidence: Object.freeze([Object.freeze({
      checkId: "function-metrics",
      referenceName,
      status: referenceStatus
    })]),
    relations: Object.freeze(relations)
  });
}

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}
