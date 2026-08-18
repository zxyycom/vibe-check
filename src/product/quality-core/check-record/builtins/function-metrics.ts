import type { FunctionScannerDependency } from "../../../scanner-dependencies/index.ts";
import type { FunctionMetricsOptions } from "../../../definition/built-ins.ts";
import type { CheckExecutionContext, CheckResult } from "../../../definition/custom-check.ts";
import { collectScanFiles } from "../../input/files.ts";
import { selectLizardTargetFiles } from "../../measurement/metrics.ts";
import type { CodeAreaDefinition } from "../../model/schema.ts";
import type { CheckDefinition } from "../model.ts";
import {
  analyzeFunctionMetrics,
  type FunctionMetricAnalysis
} from "./function-metrics-analysis.ts";
import {
  measureFunctionMetrics,
  type FunctionMeasurementResult
} from "./function-metrics-measurement.ts";
import { buildFunctionRelations } from "./function-metrics-reference.ts";
import {
  buildFunctionRecordCandidates,
  recordKey,
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
  operands: [
    {
      operandId: "codeArea",
      valueType: "string",
      source: { kind: "field", fieldId: "codeArea" }
    },
    {
      operandId: "message",
      valueType: "string",
      source: { kind: "message" }
    },
    {
      operandId: "metric",
      valueType: "string",
      source: { kind: "field", fieldId: "metric" }
    },
    {
      operandId: "path",
      valueType: "string",
      source: { kind: "location-path" }
    },
    {
      operandId: "suggestion",
      valueType: "string",
      source: { kind: "field", fieldId: "suggestion" }
    },
    {
      operandId: "value",
      valueType: "number",
      source: { kind: "field", fieldId: "value" }
    }
  ],
  relations: ["changed", "regression"]
} as const;

export const FUNCTION_METRICS_CHECK_DEFINITION = {
  checkId: "function-metrics",
  displayName: "Function metrics",
  recordTypes: [
    {
      recordTypeId: "function-code-lines",
      fields: FUNCTION_RECORD_FIELDS,
      identityFields: ["metric"],
      policy: FUNCTION_RECORD_POLICY
    },
    {
      recordTypeId: "function-cyclomatic-complexity",
      fields: FUNCTION_RECORD_FIELDS,
      identityFields: ["metric"],
      policy: FUNCTION_RECORD_POLICY
    },
    {
      recordTypeId: "function-parameter-count",
      fields: FUNCTION_RECORD_FIELDS,
      identityFields: ["metric"],
      policy: FUNCTION_RECORD_POLICY
    }
  ]
} as const satisfies CheckDefinition;

interface FunctionThreshold {
  readonly absoluteFloor: number;
  readonly changedDelta: number;
}

export interface FunctionMetricsSemantics {
  readonly codeAreas: Readonly<Record<string, CodeAreaDefinition>>;
  readonly generatedFiles: readonly string[];
  readonly functions: Readonly<{
    codeLines: FunctionThreshold &
      Readonly<{
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

/** Default Check callback; options carry the complete scanner binding. */
export async function executeFunctionMetrics(
  context: CheckExecutionContext<FunctionMetricsOptions>
): Promise<CheckResult> {
  const scanFiles = collectScanFiles(context.project.root, context.project.files);
  const current: FunctionMetricsExactInputSet = Object.freeze({
    approvedExactPaths: Object.freeze(selectLizardTargetFiles(scanFiles, context.project.files)),
    rootDir: context.project.root
  });
  if (current.approvedExactPaths.length === 0) {
    return Object.freeze({ status: "not-applicable", reason: { code: "no-eligible-input" } });
  }
  const dependency: FunctionScannerDependency = context.options.scanner;
  const semantics: FunctionMetricsSemantics = {
    codeAreas: context.project.files.codeAreas,
    functions: {
      codeLines: context.options.codeLines,
      cyclomaticComplexity: context.options.cyclomaticComplexity,
      parameterCount: context.options.parameterCount
    },
    generatedFiles: context.project.files.generatedFiles
  };
  const measurement = await measureFunctionMetrics(current, dependency);
  if (measurement.kind !== "complete") return directMeasurementFailure(measurement);
  const currentAnalysis = analyzeFunctionMetrics(measurement.metrics);
  if (currentAnalysis === undefined) return unavailable("external-result-invalid");
  const candidates = buildFunctionRecordCandidates(
    currentAnalysis,
    context.project.changedFiles,
    semantics
  );
  for (const candidate of candidates) context.records.report(candidate.record);
  await reportFunctionReference(context, currentAnalysis, candidates, dependency, semantics);
  return Object.freeze({
    status: "completed",
    verdict: candidates.length > 0 ? "failed" : "passed"
  });
}

function directMeasurementFailure(
  measurement: Exclude<FunctionMeasurementResult, { kind: "complete" }>
): CheckResult {
  if (measurement.kind === "unavailable") return unavailable("external-dependency-unavailable");
  if (measurement.kind === "execution-failed") return unavailable("external-execution-failed");
  return unavailable("external-result-invalid");
}

async function reportFunctionReference(
  context: CheckExecutionContext<FunctionMetricsOptions>,
  currentAnalysis: FunctionMetricAnalysis,
  candidates: readonly FunctionRecordCandidate[],
  dependency: FunctionScannerDependency,
  semantics: FunctionMetricsSemantics
): Promise<void> {
  if (context.project.comparison === null) return;
  const referenceFiles = collectScanFiles(context.project.comparison.root, context.project.files);
  const reference: FunctionMetricsExactInputSet = Object.freeze({
    approvedExactPaths: Object.freeze(
      selectLizardTargetFiles(referenceFiles, context.project.files)
    ),
    rootDir: context.project.comparison.root
  });
  const measurement = await measureFunctionMetrics(reference, dependency);
  if (measurement.kind !== "complete") {
    context.records.reportReference(
      Object.freeze({
        referenceName: context.project.comparison.referenceName,
        relations: Object.freeze([]),
        status: measurement.kind === "unavailable" ? "unavailable" : "incomplete"
      })
    );
    return;
  }
  const referenceAnalysis = analyzeFunctionMetrics(measurement.metrics);
  if (referenceAnalysis === undefined) {
    context.records.reportReference(
      Object.freeze({
        referenceName: context.project.comparison.referenceName,
        relations: Object.freeze([]),
        status: "incomplete"
      })
    );
    return;
  }
  const relationsByRecordKey = buildFunctionRelations(
    candidates,
    currentAnalysis,
    referenceAnalysis,
    semantics
  );
  const relations = candidates.flatMap((candidate) =>
    (relationsByRecordKey.get(recordKey(candidate.record)) ?? []).map((relationId) =>
      Object.freeze({
        record: candidate.record,
        relationId
      })
    )
  );
  context.records.reportReference(
    Object.freeze({
      referenceName: context.project.comparison.referenceName,
      relations: Object.freeze(relations),
      status: "complete"
    })
  );
}

function unavailable(code: string): CheckResult {
  return Object.freeze({ status: "unavailable", reason: { code } });
}
