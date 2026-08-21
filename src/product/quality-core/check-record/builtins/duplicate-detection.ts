import { resolve } from "node:path";

import type { DuplicateDetectionOptions } from "../../../definition/built-ins.ts";
import type { CheckExecutionContext, CheckResult } from "../../../definition/custom-check.ts";
import type { DuplicationScannerDependency } from "../../../scanner-dependencies/index.ts";
import { buildFingerprints, collectScanFiles } from "../../input/files.ts";
import { classifyFiles } from "../../model/code-areas.ts";
import { getGitSha } from "../../scan-command/tool-metadata.ts";
import { selectJscpdTargetFileMap } from "../../measurement/current-revision/jscpd.ts";
import type { CodeAreaDefinition } from "../../model/schema.ts";
import {
  measureDuplicateDetection,
  type DuplicateMeasurementResult
} from "./duplicate-detection-measurement.ts";
import { buildDuplicateRecordCandidates } from "./duplicate-detection-records.ts";

export const DUPLICATE_DETECTION_CHECK_DEFINITION = {
  checkId: "duplicate-detection",
  displayName: "Duplicate detection"
} as const;

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
  for (const candidate of candidates) {
    context.records.report({ id: candidate.id }, candidate.data);
  }
  return Object.freeze({
    status: candidates.length > 0 ? "failed" : "passed",
    data: Object.freeze({ findingCount: candidates.length })
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

function unavailable(code: string): CheckResult {
  return Object.freeze({ status: "unavailable", reason: { code } });
}
