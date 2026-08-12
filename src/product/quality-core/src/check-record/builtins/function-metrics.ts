import type { FunctionScannerDependency } from "../../../../scanner-dependencies.ts";
import type { CodeAreaDefinition } from "../../model/schema.ts";
import type { CheckExecutionBinding, CheckExecutionPorts } from "../catalog.ts";
import type { CheckDefinition, FinalCoreSnapshot } from "../model.ts";
import type { ReferenceFacts } from "../policy-model.ts";
import { type ReferenceStatus, type RelationId } from "./builtin-support.ts";
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
  const context = createBindingContext(input);
  const binding: CheckExecutionBinding = async (ports) => {
    try {
      return await executeFunctionMetrics(context, ports);
    } finally {
      for (const workHandle of ports.workHandles) {
        ports.acknowledge(workHandle);
      }
    }
  };
  return Object.freeze({
    binding,
    referenceFacts: (snapshot: FinalCoreSnapshot) => buildFunctionReferenceFacts(
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
  ports: CheckExecutionPorts
) {
  const measurement = await measureFunctionMetrics(context.current, context.dependency);
  if (measurement.kind !== "complete") {
    return currentMeasurementFailure(measurement);
  }
  const currentAnalysis = analyzeFunctionMetrics(measurement.metrics);
  if (currentAnalysis === undefined) {
    return { verdict: "invalid" } as const;
  }
  const candidates = buildFunctionRecordCandidates(
    currentAnalysis,
    context.changedFiles,
    context.semantics
  );
  for (const candidate of candidates) {
    ports.submitRecord(candidate.record);
  }
  await compareFunctionReference(context, currentAnalysis, candidates);
  return { verdict: candidates.length > 0 ? "failed" : "passed" } as const;
}

function currentMeasurementFailure(
  measurement: Exclude<FunctionMeasurementResult, { kind: "complete" }>
) {
  if (measurement.kind === "unavailable") {
    return { status: "unavailable", dependencyId: "lizard" } as const;
  }
  if (measurement.kind === "execution-failed") {
    throw new Error("function-metrics scanner execution failed");
  }
  return { verdict: "invalid" } as const;
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
