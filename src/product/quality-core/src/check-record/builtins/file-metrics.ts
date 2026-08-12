import type { FileScannerDependency } from "../../../../scanner-dependencies.ts";
import { classifyFile } from "../../model/code-areas.ts";
import type { CodeAreaDefinition, FileMetric } from "../../model/schema.ts";
import { scanWithScc } from "../../measurement/scanners/scc.ts";
import { checkScc } from "../../measurement/scanners/tool-availability/scc.ts";
import { acceptScopedMeasurements } from "../../measurement/scoped-measurement.ts";
import type { CheckExecutionBinding } from "../catalog.ts";
import type {
  CheckDefinition,
  FinalCoreSnapshot,
  QualityRecordCandidate,
  RecordLevel
} from "../model.ts";
import type { ReferenceFacts } from "../policy-model.ts";

const FILE_METRICS_WORK_HANDLE = "work-handle/v1:file-metrics";

export const FILE_METRICS_CHECK_DEFINITION = {
  checkId: "file-metrics",
  displayName: "File metrics",
  recordTypes: [{
    recordTypeId: "file-code-lines",
    fields: [
      { fieldId: "codeArea", valueType: "string", required: true },
      { fieldId: "limit", valueType: "integer", required: true },
      { fieldId: "metric", valueType: "string", required: true },
      { fieldId: "value", valueType: "integer", required: true }
    ],
    identityFields: ["metric"],
    policy: {
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
        operandId: "value",
        valueType: "number",
        source: { kind: "field", fieldId: "value" }
      }],
      relations: ["changed", "regression"]
    }
  }]
} as const satisfies CheckDefinition;

export interface FileMetricsSemantics {
  readonly codeAreas: Readonly<Record<string, CodeAreaDefinition>>;
  readonly generatedFiles: readonly string[];
  readonly codeLines: Readonly<{
    absoluteFloor: number;
    changedDelta: number;
    lowDecisionTokenAllowance: Readonly<{
      codeLineFloor: number;
      maxDecisionTokens: number;
    }>;
  }>;
}

export interface FileMetricsExactInputSet {
  readonly approvedExactPaths: readonly string[];
  readonly rootDir: string;
}

export interface FileMetricsReferenceInput extends FileMetricsExactInputSet {
  readonly referenceName: string;
}

export interface FileMetricsBindingRuntime {
  readonly binding: CheckExecutionBinding;
  readonly referenceFacts: (snapshot: FinalCoreSnapshot) => ReferenceFacts;
}

type MeasurementResult = Readonly<
  | { kind: "complete"; metrics: readonly FileMetric[] }
  | { kind: "execution-failed" }
  | { kind: "invalid-result" }
  | { kind: "unavailable" }
>;

type ReferenceStatus = "complete" | "incomplete" | "unavailable";

export function resolveFileMetricsApplicability(
  approvedExactPaths: readonly string[]
): Readonly<
  | { status: "not-applicable" }
  | { status: "applicable"; workHandles: readonly string[] }
> {
  return approvedExactPaths.length === 0
    ? Object.freeze({ status: "not-applicable" })
    : Object.freeze({
      status: "applicable",
      workHandles: Object.freeze([FILE_METRICS_WORK_HANDLE])
    });
}

export function createFileMetricsBinding(input: Readonly<{
  changedFiles: readonly string[];
  current: FileMetricsExactInputSet;
  dependency: FileScannerDependency;
  reference: FileMetricsReferenceInput | null;
  semantics: FileMetricsSemantics;
}>): FileMetricsBindingRuntime {
  const current = detachedInputSet(input.current);
  const changedFiles = Object.freeze([...input.changedFiles]);
  const reference = input.reference === null
    ? null
    : Object.freeze({
      ...detachedInputSet(input.reference),
      referenceName: input.reference.referenceName
    });
  let referenceStatus: ReferenceStatus | null = reference === null ? null : "incomplete";
  let relationsBySubject = new Map<string, readonly ("changed" | "regression")[]>();

  const binding: CheckExecutionBinding = async (ports) => {
    try {
      const currentMeasurement = await measureExactInputs(
        current,
        input.dependency
      );
      if (currentMeasurement.kind === "unavailable") {
        return { status: "unavailable", dependencyId: "scc" };
      }
      if (currentMeasurement.kind === "execution-failed") {
        throw new Error("file-metrics scanner execution failed");
      }
      if (currentMeasurement.kind === "invalid-result") {
        return { verdict: "invalid" };
      }

      const candidates = buildRecordCandidates(
        currentMeasurement.metrics,
        changedFiles,
        input.semantics
      );
      if (candidates === undefined) {
        return { verdict: "invalid" };
      }
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
          const referenceValues = codeLinesByPath(referenceMeasurement.metrics);
          if (referenceValues === undefined) {
            referenceStatus = "incomplete";
          } else {
            referenceStatus = "complete";
            relationsBySubject = buildRelations(candidates, referenceValues, input.semantics);
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
      relationsBySubject
    )
  });
}

function detachedInputSet(input: FileMetricsExactInputSet): FileMetricsExactInputSet {
  return Object.freeze({
    rootDir: input.rootDir,
    approvedExactPaths: Object.freeze([...input.approvedExactPaths])
  });
}

async function measureExactInputs(
  input: FileMetricsExactInputSet,
  dependency: FileScannerDependency
): Promise<MeasurementResult> {
  if (input.approvedExactPaths.length === 0) {
    return Object.freeze({ kind: "complete", metrics: Object.freeze([]) });
  }
  const availability = await checkScc(input.rootDir, dependency);
  if (!availability.available) {
    return Object.freeze({ kind: "unavailable" });
  }

  let result: ReturnType<typeof scanWithScc>;
  try {
    result = scanWithScc({
      cwd: input.rootDir,
      dependency,
      includePaths: input.approvedExactPaths,
      excludeDirs: []
    });
  } catch {
    return Object.freeze({ kind: "execution-failed" });
  }
  if (!result.ok) {
    return Object.freeze({ kind: result.reason === "execution"
      ? "execution-failed"
      : "invalid-result" });
  }
  const accepted = acceptScopedMeasurements(
    result.measurements,
    input.approvedExactPaths
  );
  return accepted.ok
    ? Object.freeze({ kind: "complete", metrics: Object.freeze([...accepted.payloads]) })
    : Object.freeze({ kind: "invalid-result" });
}

interface FileRecordCandidate {
  readonly codeLines: number;
  readonly isChanged: boolean;
  readonly record: QualityRecordCandidate;
}

function buildRecordCandidates(
  metrics: readonly FileMetric[],
  changedFiles: readonly string[],
  semantics: FileMetricsSemantics
): readonly FileRecordCandidate[] | undefined {
  const seenPaths = new Set<string>();
  const candidates: FileRecordCandidate[] = [];
  for (const metric of metrics) {
    if (typeof metric.path !== "string" || metric.path.length === 0
      || !Number.isSafeInteger(metric.codeLines) || (metric.codeLines ?? -1) < 0
      || seenPaths.has(metric.path)) {
      return undefined;
    }
    seenPaths.add(metric.path);
    const codeArea = classifyFile(
      metric.path,
      semantics.codeAreas as Record<string, CodeAreaDefinition>,
      semantics.generatedFiles
    );
    const area = semantics.codeAreas[codeArea];
    if (area === undefined || area.warningPolicy === "exclude-warnings") {
      continue;
    }
    const limit = fileCodeLineFloor(metric, semantics);
    const codeLines = metric.codeLines!;
    if (codeLines <= limit) {
      continue;
    }
    const level: RecordLevel = area.warningPolicy === "watchlist-only" ? "info" : "warning";
    candidates.push(Object.freeze({
      codeLines,
      isChanged: isInChangedScope(metric.path, changedFiles),
      record: Object.freeze({
        recordTypeId: "file-code-lines",
        level,
        semanticSubject: metric.path,
        message: `File ${metric.path} has ${codeLines} code lines (threshold: ${limit})`,
        fields: Object.freeze({
          codeArea,
          limit,
          metric: "code-lines",
          value: codeLines
        }),
        location: Object.freeze({ path: metric.path, line: 1, column: 1 })
      })
    }));
  }
  candidates.sort((left, right) => compareText(
    left.record.semanticSubject,
    right.record.semanticSubject
  ));
  return Object.freeze(candidates);
}

function fileCodeLineFloor(metric: FileMetric, semantics: FileMetricsSemantics): number {
  const allowance = semantics.codeLines.lowDecisionTokenAllowance;
  const decisionTokens = metric.decisionTokens.value;
  return decisionTokens !== null && decisionTokens <= allowance.maxDecisionTokens
    ? allowance.codeLineFloor
    : semantics.codeLines.absoluteFloor;
}

function codeLinesByPath(metrics: readonly FileMetric[]): ReadonlyMap<string, number> | undefined {
  const values = new Map<string, number>();
  for (const metric of metrics) {
    if (typeof metric.path !== "string" || metric.path.length === 0
      || !Number.isSafeInteger(metric.codeLines) || (metric.codeLines ?? -1) < 0
      || values.has(metric.path)) {
      return undefined;
    }
    values.set(metric.path, metric.codeLines!);
  }
  return values;
}

function buildRelations(
  candidates: readonly FileRecordCandidate[],
  referenceValues: ReadonlyMap<string, number>,
  semantics: FileMetricsSemantics
): Map<string, readonly ("changed" | "regression")[]> {
  const relations = new Map<string, readonly ("changed" | "regression")[]>();
  for (const candidate of candidates) {
    if (!candidate.isChanged) {
      relations.set(candidate.record.semanticSubject, Object.freeze([]));
      continue;
    }
    const baselineValue = referenceValues.get(candidate.record.semanticSubject) ?? 0;
    const delta = candidate.codeLines - baselineValue;
    const variants: ("changed" | "regression")[] = [];
    if (delta > semantics.codeLines.changedDelta) {
      variants.push("regression");
    } else {
      variants.push("changed");
    }
    relations.set(candidate.record.semanticSubject, Object.freeze(variants));
  }
  return relations;
}

function isInChangedScope(filePath: string, changedFiles: readonly string[]): boolean {
  return changedFiles.some((changedFile) => (
    filePath.includes(changedFile) || changedFile.includes(filePath)
  ));
}

function buildReferenceFacts(
  snapshot: FinalCoreSnapshot,
  referenceName: string | null,
  referenceStatus: ReferenceStatus | null,
  relationsBySubject: ReadonlyMap<string, readonly ("changed" | "regression")[]>
): ReferenceFacts {
  if (referenceName === null || referenceStatus === null) {
    return Object.freeze({ evidence: Object.freeze([]), relations: Object.freeze([]) });
  }
  const relations = snapshot.records
    .filter((record) => (
      record.checkId === "file-metrics" && record.recordTypeId === "file-code-lines"
    ))
    .flatMap((record) => (
      (relationsBySubject.get(record.semanticSubject) ?? []).map((relationId) => Object.freeze({
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
      checkId: "file-metrics",
      referenceName,
      status: referenceStatus
    })]),
    relations: Object.freeze(relations)
  });
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
