import type { FunctionScannerDependency } from "../../../scanner-dependencies/index.ts";
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
  analyzeFunctionMetrics,
  type FunctionMetricAnalysis
} from "./function-metrics-analysis.ts";
import {
  detachFunctionMetricsInput,
  measureFunctionMetrics,
  type FunctionMeasurementResult
} from "./function-metrics-measurement.ts";
import {
  buildFunctionReferenceFacts,
  buildFunctionRelations
} from "./function-metrics-reference.ts";
import {
  buildFunctionRecordCandidates,
  type FunctionRecordCandidate
} from "./function-metrics-records.ts";

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
  readonly binding: BuiltInCheckBinding;
  readonly referenceFacts: (snapshot: CoreSnapshot) => ReferenceFacts;
}

interface FunctionReferenceState {
  relationsByRecordKey: Map<string, readonly RelationId[]>;
  status: ReferenceStatus | null;
}

interface FunctionBindingContext {
  readonly changedFiles: readonly string[];
  readonly current: FunctionMetricsExactInputSet;
  readonly dependency: FunctionScannerDependency;
  readonly reference: FunctionMetricsReferenceInput | null;
  readonly referenceState: FunctionReferenceState;
  readonly semantics: FunctionMetricsSemantics;
}

export function resolveFunctionMetricsApplicability(
  approvedExactPaths: readonly string[]
): "applicable" | "not-applicable" {
  return approvedExactPaths.length === 0
    ? "not-applicable"
    : "applicable";
}

export function createFunctionMetricsBinding(input: Readonly<{
  changedFiles: readonly string[];
  current: FunctionMetricsExactInputSet;
  dependency: FunctionScannerDependency;
  reference: FunctionMetricsReferenceInput | null;
  semantics: FunctionMetricsSemantics;
}>): FunctionMetricsBindingRuntime {
  const context = createBindingContext(input);
  const binding: BuiltInCheckBinding = (execution) => executeFunctionMetrics(context, execution);
  return Object.freeze({
    binding,
    referenceFacts: (snapshot: CoreSnapshot) => buildFunctionReferenceFacts(
      snapshot,
      context.reference?.referenceName ?? null,
      context.referenceState.status,
      context.referenceState.relationsByRecordKey
    )
  });
}

function createBindingContext(input: Readonly<{
  changedFiles: readonly string[];
  current: FunctionMetricsExactInputSet;
  dependency: FunctionScannerDependency;
  reference: FunctionMetricsReferenceInput | null;
  semantics: FunctionMetricsSemantics;
}>): FunctionBindingContext {
  const reference = input.reference === null
    ? null
    : Object.freeze({
      ...detachFunctionMetricsInput(input.reference),
      referenceName: input.reference.referenceName
    });
  return {
    changedFiles: Object.freeze([...input.changedFiles]),
    current: detachFunctionMetricsInput(input.current),
    dependency: input.dependency,
    reference,
    referenceState: {
      status: reference === null ? null : "incomplete",
      relationsByRecordKey: new Map()
    },
    semantics: input.semantics
  };
}

async function executeFunctionMetrics(
  context: FunctionBindingContext,
  execution: BuiltInCheckExecutionContext
): Promise<BuiltInCheckExecutionResult> {
  const measurement = await measureFunctionMetrics(context.current, context.dependency);
  if (measurement.kind !== "complete") {
    return currentMeasurementFailure(measurement);
  }
  const currentAnalysis = analyzeFunctionMetrics(measurement.metrics);
  if (currentAnalysis === undefined) {
    return { kind: "unavailable", category: "invalid-result" };
  }
  const candidates = buildFunctionRecordCandidates(
    currentAnalysis,
    context.changedFiles,
    context.semantics
  );
  for (const candidate of candidates) {
    execution.results.report(candidate.record);
  }
  await compareFunctionReference(context, currentAnalysis, candidates);
  return { verdict: candidates.length > 0 ? "failed" : "passed" } as const;
}

function currentMeasurementFailure(
  measurement: Exclude<FunctionMeasurementResult, { kind: "complete" }>
): BuiltInCheckExecutionResult {
  if (measurement.kind === "unavailable") {
    return { kind: "unavailable", category: "dependency-unavailable" };
  }
  if (measurement.kind === "execution-failed") {
    throw new Error("function-metrics scanner execution failed");
  }
  return { kind: "unavailable", category: "invalid-result" };
}

async function compareFunctionReference(
  context: FunctionBindingContext,
  currentAnalysis: FunctionMetricAnalysis,
  candidates: readonly FunctionRecordCandidate[]
): Promise<void> {
  if (context.reference === null) {
    return;
  }
  const measurement = await measureFunctionMetrics(context.reference, context.dependency);
  if (measurement.kind !== "complete") {
    context.referenceState.status = measurement.kind === "unavailable"
      ? "unavailable"
      : "incomplete";
    return;
  }
  const referenceAnalysis = analyzeFunctionMetrics(measurement.metrics);
  if (referenceAnalysis === undefined) {
    context.referenceState.status = "incomplete";
    return;
  }
  context.referenceState.status = "complete";
  context.referenceState.relationsByRecordKey = buildFunctionRelations(
    candidates,
    currentAnalysis,
    referenceAnalysis,
    context.semantics
  );
}
