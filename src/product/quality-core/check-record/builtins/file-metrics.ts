import type { FileScannerDependency } from "../../../scanner-dependencies/index.ts";
import type { FileMetricsOptions } from "../../../definition/built-ins.ts";
import type { CheckExecutionContext, CheckResult } from "../../../definition/custom-check.ts";
import { collectScanFiles } from "../../input/files.ts";
import type { CodeAreaDefinition } from "../../model/schema.ts";
import { measureFileMetrics, type FileMeasurementResult } from "./file-metrics-measurement.ts";
import type { CheckDefinition } from "../model.ts";
import {
  buildFileRecordCandidates,
  buildFileRelations,
  codeLinesByPath,
  type FileRecordCandidate
} from "./file-metrics-records.ts";

export const FILE_METRICS_CHECK_DEFINITION = {
  checkId: "file-metrics",
  displayName: "File metrics",
  recordTypes: [
    {
      recordTypeId: "file-code-lines",
      fields: [
        { fieldId: "codeArea", valueType: "string", required: true },
        { fieldId: "limit", valueType: "integer", required: true },
        { fieldId: "metric", valueType: "string", required: true },
        { fieldId: "value", valueType: "integer", required: true }
      ],
      identityFields: ["metric"],
      policy: {
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
            operandId: "value",
            valueType: "number",
            source: { kind: "field", fieldId: "value" }
          }
        ],
        relations: ["changed", "regression"]
      }
    }
  ]
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

/** Default Check callback; all scanner selection now arrives through options. */
export async function executeFileMetrics(
  context: CheckExecutionContext<FileMetricsOptions>
): Promise<CheckResult> {
  const current: FileMetricsExactInputSet = Object.freeze({
    approvedExactPaths: Object.freeze(
      collectScanFiles(context.project.root, context.project.files)
    ),
    rootDir: context.project.root
  });
  if (current.approvedExactPaths.length === 0) {
    return Object.freeze({ status: "not-applicable", reason: { code: "no-eligible-input" } });
  }
  const dependency: FileScannerDependency = context.options.scanner;
  const semantics: FileMetricsSemantics = {
    codeAreas: context.project.files.codeAreas,
    generatedFiles: context.project.files.generatedFiles,
    codeLines: context.options.codeLines
  };
  const measurement = await measureFileMetrics(current, dependency);
  if (measurement.kind !== "complete") return directMeasurementFailure(measurement);
  const candidates = buildFileRecordCandidates(
    measurement.metrics,
    context.project.changedFiles,
    semantics
  );
  if (candidates === undefined) return unavailable("external-result-invalid");
  for (const candidate of candidates) context.records.report(candidate.record);
  await reportFileReference(context, candidates, dependency, semantics);
  return Object.freeze({
    status: "completed",
    verdict: candidates.length > 0 ? "failed" : "passed"
  });
}

function directMeasurementFailure(
  measurement: Exclude<FileMeasurementResult, { kind: "complete" }>
): CheckResult {
  if (measurement.kind === "unavailable") return unavailable("external-dependency-unavailable");
  if (measurement.kind === "execution-failed") return unavailable("external-execution-failed");
  return unavailable("external-result-invalid");
}

async function reportFileReference(
  context: CheckExecutionContext<FileMetricsOptions>,
  candidates: readonly FileRecordCandidate[],
  dependency: FileScannerDependency,
  semantics: FileMetricsSemantics
): Promise<void> {
  if (context.project.comparison === null) return;
  const reference: FileMetricsExactInputSet = Object.freeze({
    approvedExactPaths: Object.freeze(
      collectScanFiles(context.project.comparison.root, context.project.files)
    ),
    rootDir: context.project.comparison.root
  });
  const measurement = await measureFileMetrics(reference, dependency);
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
  const referenceValues = codeLinesByPath(measurement.metrics);
  if (referenceValues === undefined) {
    context.records.reportReference(
      Object.freeze({
        referenceName: context.project.comparison.referenceName,
        relations: Object.freeze([]),
        status: "incomplete"
      })
    );
    return;
  }
  const relationsBySubject = buildFileRelations(candidates, referenceValues, semantics);
  const relations = candidates.flatMap((candidate) =>
    (relationsBySubject.get(candidate.record.semanticSubject) ?? []).map((relationId) =>
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
