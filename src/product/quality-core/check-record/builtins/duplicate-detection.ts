import { resolve } from "node:path";

import type { DuplicateDetectionOptions } from "../../../definition/built-ins.ts";
import type {
  CheckExecutionContext,
  CheckReferenceCandidate,
  CheckResult
} from "../../../definition/custom-check.ts";
import type { DuplicationScannerDependency } from "../../../scanner-dependencies/index.ts";
import { buildFingerprints, collectScanFiles } from "../../input/files.ts";
import { classifyFiles } from "../../model/code-areas.ts";
import { getGitSha } from "../../scan-command/tool-metadata.ts";
import { selectJscpdTargetFileMap } from "../../measurement/current-revision/jscpd.ts";
import type { CodeAreaDefinition } from "../../model/schema.ts";
import type { CheckDefinition } from "../model.ts";
import {
  measureDuplicateDetection,
  type DuplicateMeasurementResult
} from "./duplicate-detection-measurement.ts";
import {
  buildDuplicateRecordCandidates,
  buildDuplicateRelations,
  duplicateSubjects,
  type DuplicateRecordCandidate
} from "./duplicate-detection-records.ts";

export const DUPLICATE_DETECTION_CHECK_DEFINITION = {
  checkId: "duplicate-detection",
  displayName: "Duplicate detection",
  recordTypes: [
    {
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
      }
    }
  ]
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

/** Default Check callback; it owns scanner configuration through its options. */
export async function executeDuplicateDetection(
  context: CheckExecutionContext<DuplicateDetectionOptions>
): Promise<CheckResult> {
  const current = prepareDirectInput(context.project.root, context);
  if (current.areas.every((area) => area.approvedExactPaths.length === 0)) {
    return Object.freeze({ status: "not-applicable", reason: { code: "no-eligible-input" } });
  }
  const dependency: DuplicationScannerDependency = context.options.scanner;
  const semantics: DuplicateDetectionSemantics = {
    changedDelta: context.options.fragments.changedDelta,
    codeAreas: context.project.files.codeAreas,
    configVersion: "1"
  };
  const measurement = await measureDuplicateDetection({
    cache: {
      enabled: context.project.cache.enabled,
      onActivity: context.project.cache.reportActivity
    },
    changedFiles: context.project.changedFiles,
    dependency,
    input: current,
    scanKind: "current",
    semantics
  });
  if (measurement.kind !== "complete") return directMeasurementFailure(measurement);
  const candidates = buildDuplicateRecordCandidates(measurement.fragments, semantics);
  if (candidates === undefined) return unavailable("external-result-invalid");
  for (const candidate of candidates) context.records.report(candidate.record);
  await reportDuplicateReference(context, candidates, dependency, semantics);
  return Object.freeze({
    status: "completed",
    verdict: candidates.length > 0 ? "failed" : "passed"
  });
}

function prepareDirectInput(
  root: string,
  context: CheckExecutionContext<DuplicateDetectionOptions>
): DuplicateDetectionExactInputSet {
  const scanFiles = collectScanFiles(root, context.project.files);
  const fileMap = classifyFiles(
    scanFiles,
    context.project.files.codeAreas,
    context.project.files.generatedFiles
  );
  const targets = selectJscpdTargetFileMap(fileMap, context.project.files);
  const fingerprints = buildFingerprints(fileMap, root);
  return Object.freeze({
    areas: Object.freeze(
      Array.from(targets, ([codeArea, approvedExactPaths]) =>
        Object.freeze({
          approvedExactPaths: Object.freeze([...approvedExactPaths]),
          codeArea,
          inputFingerprint: Object.freeze(
            fingerprints[codeArea] ?? {
              fileCount: 0,
              fileList: Object.freeze([]),
              fingerprint: "empty"
            }
          ),
          minimumTokens:
            context.options.minimumTokensByCodeArea[codeArea] ??
            context.options.defaultMinimumTokens
        })
      )
    ),
    cacheRootDir: resolve(root, context.project.cache.directory),
    commitSha: getGitSha(root),
    rootDir: root
  });
}

function directMeasurementFailure(
  measurement: Exclude<DuplicateMeasurementResult, { kind: "complete" }>
): CheckResult {
  if (measurement.kind === "unavailable") return unavailable("external-dependency-unavailable");
  if (measurement.kind === "execution-failed") return unavailable("external-execution-failed");
  return unavailable("external-result-invalid");
}

function reportDuplicateReferenceOutcome(
  context: CheckExecutionContext<DuplicateDetectionOptions>,
  status: CheckReferenceCandidate["status"],
  relations: CheckReferenceCandidate["relations"] = Object.freeze([])
): void {
  if (context.project.comparison === null) return;
  context.records.reportReference(
    Object.freeze({
      referenceName: context.project.comparison.referenceName,
      relations,
      status
    })
  );
}

async function reportDuplicateReference(
  context: CheckExecutionContext<DuplicateDetectionOptions>,
  candidates: readonly DuplicateRecordCandidate[],
  dependency: DuplicationScannerDependency,
  semantics: DuplicateDetectionSemantics
): Promise<void> {
  if (context.project.comparison === null) return;
  const reference = prepareDirectInput(context.project.comparison.root, context);
  const measurement = await measureDuplicateDetection({
    cache: {
      enabled: context.project.cache.enabled,
      onActivity: context.project.cache.reportActivity
    },
    changedFiles: Object.freeze([]),
    dependency,
    input: reference,
    scanKind: "baseline",
    semantics
  });
  if (measurement.kind !== "complete") {
    reportDuplicateReferenceOutcome(
      context,
      measurement.kind === "unavailable" ? "unavailable" : "incomplete"
    );
    return;
  }
  const subjects = duplicateSubjects(measurement.fragments);
  if (subjects === undefined) {
    reportDuplicateReferenceOutcome(context, "incomplete");
    return;
  }
  const relationsBySubject = buildDuplicateRelations(candidates, subjects, semantics.changedDelta);
  const relations = candidates.flatMap((candidate) =>
    (relationsBySubject.get(candidate.record.semanticSubject) ?? []).map((relationId) =>
      Object.freeze({
        record: candidate.record,
        relationId
      })
    )
  );
  reportDuplicateReferenceOutcome(context, "complete", Object.freeze(relations));
}

function unavailable(code: string): CheckResult {
  return Object.freeze({ status: "unavailable", reason: { code } });
}
