import type { FileScannerDependency } from "../../../scanner-dependencies/index.ts";
import type { CodeAreaDefinition } from "../../model/schema.ts";
import type { CheckDefinition, CoreSnapshot } from "../model.ts";
import type { ReferenceFacts } from "../policy-model.ts";
import {
  type BuiltInCheckBinding,
  type BuiltInCheckExecutionContext,
  type BuiltInCheckExecutionResult,
  type ReferenceStatus,
  type RelationId
} from "./builtin-support.ts";
import {
  detachFileMetricsInput,
  measureFileMetrics,
  type FileMeasurementResult
} from "./file-metrics-measurement.ts";
import { buildFileReferenceFacts } from "./file-metrics-reference.ts";
import {
  buildFileRecordCandidates,
  buildFileRelations,
  codeLinesByPath,
  type FileRecordCandidate
} from "./file-metrics-records.ts";

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
  readonly binding: BuiltInCheckBinding;
  readonly referenceFacts: (snapshot: CoreSnapshot) => ReferenceFacts;
}

interface FileReferenceState {
  relationsBySubject: Map<string, readonly RelationId[]>;
  status: ReferenceStatus | null;
}

interface FileBindingContext {
  readonly changedFiles: readonly string[];
  readonly current: FileMetricsExactInputSet;
  readonly dependency: FileScannerDependency;
  readonly reference: FileMetricsReferenceInput | null;
  readonly referenceState: FileReferenceState;
  readonly semantics: FileMetricsSemantics;
}

export function resolveFileMetricsApplicability(
  approvedExactPaths: readonly string[]
): "applicable" | "not-applicable" {
  return approvedExactPaths.length === 0
    ? "not-applicable"
    : "applicable";
}

export function createFileMetricsBinding(input: Readonly<{
  changedFiles: readonly string[];
  current: FileMetricsExactInputSet;
  dependency: FileScannerDependency;
  reference: FileMetricsReferenceInput | null;
  semantics: FileMetricsSemantics;
}>): FileMetricsBindingRuntime {
  const context = createBindingContext(input);
  const binding: BuiltInCheckBinding = (execution) => executeFileMetrics(context, execution);
  return Object.freeze({
    binding,
    referenceFacts: (snapshot: CoreSnapshot) => buildFileReferenceFacts(
      snapshot,
      context.reference?.referenceName ?? null,
      context.referenceState.status,
      context.referenceState.relationsBySubject
    )
  });
}

function createBindingContext(input: Readonly<{
  changedFiles: readonly string[];
  current: FileMetricsExactInputSet;
  dependency: FileScannerDependency;
  reference: FileMetricsReferenceInput | null;
  semantics: FileMetricsSemantics;
}>): FileBindingContext {
  const reference = input.reference === null
    ? null
    : Object.freeze({
      ...detachFileMetricsInput(input.reference),
      referenceName: input.reference.referenceName
    });
  return {
    changedFiles: Object.freeze([...input.changedFiles]),
    current: detachFileMetricsInput(input.current),
    dependency: input.dependency,
    reference,
    referenceState: {
      status: reference === null ? null : "incomplete",
      relationsBySubject: new Map()
    },
    semantics: input.semantics
  };
}

async function executeFileMetrics(
  context: FileBindingContext,
  execution: BuiltInCheckExecutionContext
): Promise<BuiltInCheckExecutionResult> {
  const measurement = await measureFileMetrics(context.current, context.dependency);
  if (measurement.kind !== "complete") {
    return currentMeasurementFailure(measurement);
  }
  const candidates = buildFileRecordCandidates(
    measurement.metrics,
    context.changedFiles,
    context.semantics
  );
  if (candidates === undefined) {
    return { kind: "unavailable", category: "invalid-result" };
  }
  for (const candidate of candidates) {
    execution.results.report(candidate.record);
  }
  await compareFileReference(context, candidates);
  return { verdict: candidates.length > 0 ? "failed" : "passed" } as const;
}

function currentMeasurementFailure(
  measurement: Exclude<FileMeasurementResult, { kind: "complete" }>
): BuiltInCheckExecutionResult {
  if (measurement.kind === "unavailable") {
    return { kind: "unavailable", category: "dependency-unavailable" };
  }
  if (measurement.kind === "execution-failed") {
    throw new Error("file-metrics scanner execution failed");
  }
  return { kind: "unavailable", category: "invalid-result" };
}

async function compareFileReference(
  context: FileBindingContext,
  candidates: readonly FileRecordCandidate[]
): Promise<void> {
  if (context.reference === null) {
    return;
  }
  const measurement = await measureFileMetrics(context.reference, context.dependency);
  if (measurement.kind !== "complete") {
    context.referenceState.status = measurement.kind === "unavailable"
      ? "unavailable"
      : "incomplete";
    return;
  }
  const referenceValues = codeLinesByPath(measurement.metrics);
  if (referenceValues === undefined) {
    context.referenceState.status = "incomplete";
    return;
  }
  context.referenceState.status = "complete";
  context.referenceState.relationsBySubject = buildFileRelations(
    candidates,
    referenceValues,
    context.semantics
  );
}
