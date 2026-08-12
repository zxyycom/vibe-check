import type { FileScannerDependency } from "../../../../scanner-dependencies.ts";
import type { CodeAreaDefinition } from "../../model/schema.ts";
import type { CheckExecutionBinding, CheckExecutionPorts } from "../catalog.ts";
import type { CheckDefinition, FinalCoreSnapshot } from "../model.ts";
import type { ReferenceFacts } from "../policy-model.ts";
import { type ReferenceStatus, type RelationId } from "./builtin-support.ts";
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
  const context = createBindingContext(input);
  const binding: CheckExecutionBinding = async (ports) => {
    try {
      return await executeFileMetrics(context, ports);
    } finally {
      for (const workHandle of ports.workHandles) {
        ports.acknowledge(workHandle);
      }
    }
  };
  return Object.freeze({
    binding,
    referenceFacts: (snapshot: FinalCoreSnapshot) => buildFileReferenceFacts(
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
  ports: CheckExecutionPorts
) {
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
    return { verdict: "invalid" } as const;
  }
  for (const candidate of candidates) {
    ports.submitRecord(candidate.record);
  }
  await compareFileReference(context, candidates);
  return { verdict: candidates.length > 0 ? "failed" : "passed" } as const;
}

function currentMeasurementFailure(
  measurement: Exclude<FileMeasurementResult, { kind: "complete" }>
) {
  if (measurement.kind === "unavailable") {
    return { status: "unavailable", dependencyId: "scc" } as const;
  }
  if (measurement.kind === "execution-failed") {
    throw new Error("file-metrics scanner execution failed");
  }
  return { verdict: "invalid" } as const;
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
