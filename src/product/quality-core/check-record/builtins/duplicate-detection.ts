import type { DuplicationScannerDependency } from "../../../scanner-dependencies/index.ts";
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
    identityFields: ["lineCount", "locationCount", "metric"],
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

export interface DuplicateCacheOptions {
  readonly enabled: boolean;
  readonly onActivity?: (activity: "read" | "write" | "failed") => void;
}

export interface DuplicateMeasurementInput {
  readonly cache?: DuplicateCacheOptions;
  readonly changedFiles: readonly string[];
  readonly dependency: DuplicationScannerDependency;
  readonly input: DuplicateDetectionExactInputSet;
  readonly scanKind: "baseline" | "current";
  readonly semantics: DuplicateDetectionSemantics;
}

export interface DuplicateDetectionBindingRuntime {
  readonly binding: BuiltInCheckBinding;
  readonly referenceFacts: (snapshot: CoreSnapshot) => ReferenceFacts;
}

interface DuplicateReferenceState {
  relationsBySubject: Map<string, readonly RelationId[]>;
  status: ReferenceStatus | null;
}

interface DuplicateBindingContext {
  readonly cache: DuplicateCacheOptions;
  readonly changedFiles: readonly string[];
  readonly current: DuplicateDetectionExactInputSet;
  readonly dependency: DuplicationScannerDependency;
  readonly reference: DuplicateDetectionReferenceInput | null;
  readonly referenceState: DuplicateReferenceState;
  readonly semantics: DuplicateDetectionSemantics;
}

export function resolveDuplicateDetectionApplicability(
  areas: readonly DuplicateDetectionAreaInput[]
): "applicable" | "not-applicable" {
  return areas.every((area) => area.approvedExactPaths.length === 0)
    ? "not-applicable"
    : "applicable";
}

export function createDuplicateDetectionBinding(input: Readonly<{
  cache?: DuplicateCacheOptions;
  changedFiles: readonly string[];
  current: DuplicateDetectionExactInputSet;
  dependency: DuplicationScannerDependency;
  reference: DuplicateDetectionReferenceInput | null;
  semantics: DuplicateDetectionSemantics;
}>): DuplicateDetectionBindingRuntime {
  const context = createBindingContext(input);
  const binding: BuiltInCheckBinding = (execution) => executeDuplicateDetection(context, execution);
  return Object.freeze({
    binding,
    referenceFacts: (snapshot: CoreSnapshot) => buildDuplicateReferenceFacts(
      snapshot,
      context.reference?.referenceName ?? null,
      context.referenceState.status,
      context.referenceState.relationsBySubject
    )
  });
}

function createBindingContext(input: Readonly<{
  cache?: DuplicateCacheOptions;
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
    cache: input.cache ?? Object.freeze({ enabled: true }),
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
  execution: BuiltInCheckExecutionContext
): Promise<BuiltInCheckExecutionResult> {
  const measurement = await measureDuplicateDetection({
    cache: context.cache,
    changedFiles: context.changedFiles,
    dependency: context.dependency,
    input: context.current,
    scanKind: "current",
    semantics: context.semantics
  });
  if (measurement.kind !== "complete") {
    return currentMeasurementFailure(measurement);
  }
  const candidates = buildDuplicateRecordCandidates(measurement.fragments, context.semantics);
  if (candidates === undefined) {
    return { kind: "unavailable", category: "invalid-result" };
  }
  for (const candidate of candidates) {
    execution.results.report(candidate.record);
  }
  await compareDuplicateReference(context, candidates);
  return { verdict: candidates.length > 0 ? "failed" : "passed" } as const;
}

function currentMeasurementFailure(
  measurement: Exclude<DuplicateMeasurementResult, { kind: "complete" }>
): BuiltInCheckExecutionResult {
  if (measurement.kind === "unavailable") {
    return { kind: "unavailable", category: "dependency-unavailable" };
  }
  if (measurement.kind === "execution-failed") {
    throw new Error("duplicate-detection scanner execution failed");
  }
  return { kind: "unavailable", category: "invalid-result" };
}

async function compareDuplicateReference(
  context: DuplicateBindingContext,
  candidates: readonly DuplicateRecordCandidate[]
): Promise<void> {
  if (context.reference === null) {
    return;
  }
  const measurement = await measureDuplicateDetection({
    cache: context.cache,
    changedFiles: Object.freeze([]),
    dependency: context.dependency,
    input: context.reference,
    scanKind: "baseline",
    semantics: context.semantics
  });
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
