import type { DuplicationScannerDependency } from "../../../../scanner-dependencies.ts";
import type { CodeAreaDefinition } from "../../model/schema.ts";
import type { CheckExecutionBinding, CheckExecutionPorts } from "../catalog.ts";
import type { CheckDefinition, FinalCoreSnapshot } from "../model.ts";
import type { ReferenceFacts } from "../policy-model.ts";
import { type ReferenceStatus, type RelationId } from "./builtin-support.ts";
import {
  detachDuplicateDetectionInput,
  measureDuplicateDetection,
  type DuplicateMeasurementResult
} from "./duplicate-detection-measurement.ts";
import { buildDuplicateReferenceFacts } from "./duplicate-detection-reference.ts";
import {
  buildDuplicateRecordCandidates,
  buildDuplicateRelations,
  duplicateSubjects,
  type DuplicateRecordCandidate
} from "./duplicate-detection-records.ts";

const DUPLICATE_DETECTION_WORK_HANDLE = "work-handle/v1:duplicate-detection";

export const DUPLICATE_DETECTION_CHECK_DEFINITION = {
  checkId: "duplicate-detection",
  displayName: "Duplicate detection",
  recordTypes: [{
    recordTypeId: "duplicate-code",
    fields: [
      { fieldId: "codeArea", valueType: "string", required: true },
      { fieldId: "lineCount", valueType: "integer", required: true },
      { fieldId: "locationCount", valueType: "integer", required: true },
      { fieldId: "metric", valueType: "string", required: true },
      { fieldId: "suggestion", valueType: "string", required: true },
      { fieldId: "value", valueType: "integer", required: true }
    ],
    identityFields: ["metric", "lineCount", "locationCount"],
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
        operandId: "suggestion",
        valueType: "string",
        source: { kind: "field", fieldId: "suggestion" }
      }, {
        operandId: "value",
        valueType: "number",
        source: { kind: "field", fieldId: "value" }
      }],
      relations: ["changed", "regression"]
    }
  }]
} as const satisfies CheckDefinition;

export interface DuplicateDetectionSemantics {
  readonly changedDelta: number;
  readonly codeAreas: Readonly<Record<string, CodeAreaDefinition>>;
  readonly configVersion: string;
}

export interface DuplicateDetectionAreaInput {
  readonly approvedExactPaths: readonly string[];
  readonly codeArea: string;
  readonly inputFingerprint: Readonly<{
    readonly fileCount: number;
    readonly fileList: readonly string[];
    readonly fingerprint: string;
  }>;
  readonly minimumTokens: number;
}

export interface DuplicateDetectionExactInputSet {
  readonly areas: readonly DuplicateDetectionAreaInput[];
  readonly cacheRootDir: string;
  readonly commitSha: string;
  readonly rootDir: string;
}

export interface DuplicateDetectionReferenceInput extends DuplicateDetectionExactInputSet {
  readonly referenceName: string;
}

export interface DuplicateDetectionBindingRuntime {
  readonly binding: CheckExecutionBinding;
  readonly referenceFacts: (snapshot: FinalCoreSnapshot) => ReferenceFacts;
}

interface DuplicateReferenceState {
  relationsBySubject: Map<string, readonly RelationId[]>;
  status: ReferenceStatus | null;
}

interface DuplicateBindingContext {
  readonly changedFiles: readonly string[];
  readonly current: DuplicateDetectionExactInputSet;
  readonly dependency: DuplicationScannerDependency;
  readonly reference: DuplicateDetectionReferenceInput | null;
  readonly referenceState: DuplicateReferenceState;
  readonly semantics: DuplicateDetectionSemantics;
}

export function resolveDuplicateDetectionApplicability(
  areas: readonly DuplicateDetectionAreaInput[]
): Readonly<
  | { status: "not-applicable" }
  | { status: "applicable"; workHandles: readonly string[] }
> {
  return areas.every((area) => area.approvedExactPaths.length === 0)
    ? Object.freeze({ status: "not-applicable" })
    : Object.freeze({
      status: "applicable",
      workHandles: Object.freeze([DUPLICATE_DETECTION_WORK_HANDLE])
    });
}

export function createDuplicateDetectionBinding(input: Readonly<{
  changedFiles: readonly string[];
  current: DuplicateDetectionExactInputSet;
  dependency: DuplicationScannerDependency;
  reference: DuplicateDetectionReferenceInput | null;
  semantics: DuplicateDetectionSemantics;
}>): DuplicateDetectionBindingRuntime {
  const context = createBindingContext(input);
  const binding: CheckExecutionBinding = async (ports) => {
    try {
      return await executeDuplicateDetection(context, ports);
    } finally {
      for (const workHandle of ports.workHandles) {
        ports.acknowledge(workHandle);
      }
    }
  };
  return Object.freeze({
    binding,
    referenceFacts: (snapshot: FinalCoreSnapshot) => buildDuplicateReferenceFacts(
      snapshot,
      context.reference?.referenceName ?? null,
      context.referenceState.status,
      context.referenceState.relationsBySubject
    )
  });
}

function createBindingContext(input: Readonly<{
  changedFiles: readonly string[];
  current: DuplicateDetectionExactInputSet;
  dependency: DuplicationScannerDependency;
  reference: DuplicateDetectionReferenceInput | null;
  semantics: DuplicateDetectionSemantics;
}>): DuplicateBindingContext {
  const reference = input.reference === null
    ? null
    : Object.freeze({
      ...detachDuplicateDetectionInput(input.reference),
      referenceName: input.reference.referenceName
    });
  return {
    changedFiles: Object.freeze([...input.changedFiles]),
    current: detachDuplicateDetectionInput(input.current),
    dependency: input.dependency,
    reference,
    referenceState: {
      status: reference === null ? null : "incomplete",
      relationsBySubject: new Map()
    },
    semantics: input.semantics
  };
}

async function executeDuplicateDetection(
  context: DuplicateBindingContext,
  ports: CheckExecutionPorts
) {
  const measurement = await measureDuplicateDetection(
    context.current,
    context.dependency,
    context.semantics,
    "current",
    context.changedFiles
  );
  if (measurement.kind !== "complete") {
    return currentMeasurementFailure(measurement);
  }
  const candidates = buildDuplicateRecordCandidates(measurement.fragments, context.semantics);
  if (candidates === undefined) {
    return { verdict: "invalid" } as const;
  }
  for (const candidate of candidates) {
    ports.submitRecord(candidate.record);
  }
  await compareDuplicateReference(context, candidates);
  return { verdict: candidates.length > 0 ? "failed" : "passed" } as const;
}

function currentMeasurementFailure(
  measurement: Exclude<DuplicateMeasurementResult, { kind: "complete" }>
) {
  if (measurement.kind === "unavailable") {
    return { status: "unavailable", dependencyId: "jscpd" } as const;
  }
  if (measurement.kind === "execution-failed") {
    throw new Error("duplicate-detection scanner execution failed");
  }
  return { verdict: "invalid" } as const;
}

async function compareDuplicateReference(
  context: DuplicateBindingContext,
  candidates: readonly DuplicateRecordCandidate[]
): Promise<void> {
  if (context.reference === null) {
    return;
  }
  const measurement = await measureDuplicateDetection(
    context.reference,
    context.dependency,
    context.semantics,
    "baseline",
    Object.freeze([])
  );
  if (measurement.kind !== "complete") {
    context.referenceState.status = measurement.kind === "unavailable"
      ? "unavailable"
      : "incomplete";
    return;
  }
  const referenceSubjects = duplicateSubjects(measurement.fragments);
  if (referenceSubjects === undefined) {
    context.referenceState.status = "incomplete";
    return;
  }
  context.referenceState.status = "complete";
  context.referenceState.relationsBySubject = buildDuplicateRelations(
    candidates,
    referenceSubjects,
    context.semantics.changedDelta
  );
}
