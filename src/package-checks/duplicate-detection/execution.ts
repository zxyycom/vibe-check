import { resolve } from "node:path";

import type { CheckExecutionContext, CheckResult } from "../../check/check.ts";
import { collectProjectFileSets, requireProjectFileSet } from "../project-files/collection.ts";
import { fingerprintProjectFiles } from "../project-files/file-fingerprint.ts";
import { settleFindings } from "../code-quality-findings/policy.ts";
import { getGitSha } from "./project-revision.ts";
import { measureDuplicateDetection, type DuplicateMeasurementResult } from "./measurement.ts";
import type {
  DuplicateDetectionAreaInput,
  DuplicateDetectionExactInputSet
} from "./measurement-model.ts";
import type { ResolvedDuplicateDetectionOptions } from "./options.ts";
import { validResolvedDuplicateDetectionOptions } from "./options-validation.ts";
import { buildDuplicateRecordCandidates } from "./records.ts";

export const DUPLICATE_DETECTION_CHECK_DEFINITION = {
  checkId: "duplicate-detection",
  displayName: "Duplicate detection"
} as const;

type DuplicateDetectionUnavailableReasonCode =
  | "cache-write-failed"
  | "external-dependency-unavailable"
  | "external-execution-failed"
  | "external-result-invalid"
  | "invalid-options"
  | "source-unavailable";

/** Default Check callback；scanner configuration 由其完整 options 拥有。 */
export async function executeDuplicateDetection(
  context: CheckExecutionContext<ResolvedDuplicateDetectionOptions>
): Promise<CheckResult> {
  if (!validResolvedDuplicateDetectionOptions(context.options))
    return unavailable("invalid-options");

  let exactInput: DuplicateDetectionExactInputSet;
  try {
    exactInput = prepareExactInputSet(context.project.root, context.options);
  } catch {
    return unavailable("source-unavailable");
  }
  if (exactInput.approvedExactPaths.length < 2) {
    return Object.freeze({ status: "not-applicable", reason: { code: "no-eligible-input" } });
  }
  const measurement = await measureDuplicateDetection({
    cache: context.options.cache,
    dependency: context.options.scanner,
    exactInput
  });
  if (measurement.kind !== "complete") return directMeasurementFailure(measurement);
  const candidates = buildDuplicateRecordCandidates(
    measurement.fragments,
    context.options.codeAreas
  );
  if (candidates === undefined) return unavailable("external-result-invalid");
  for (const candidate of candidates) {
    context.records.report({ id: candidate.id }, candidate.data);
  }
  return settleFindings(candidates.map((candidate) => candidate.data.blocking));
}

function prepareExactInputSet(
  rootDir: string,
  options: ResolvedDuplicateDetectionOptions
): DuplicateDetectionExactInputSet {
  const areas = collectAreaInputs(rootDir, options.codeAreas);
  const approvedExactPaths = uniqueSorted(areas.flatMap((area) => area.approvedExactPaths));
  const inputFingerprint = fingerprintProjectFiles(rootDir, approvedExactPaths);
  return Object.freeze({
    approvedExactPaths: Object.freeze(approvedExactPaths),
    areas,
    cacheRootDir: resolve(rootDir, options.cache.directory),
    commitSha: getGitSha(rootDir),
    inputFingerprint: Object.freeze({
      ...inputFingerprint,
      fileList: Object.freeze([...inputFingerprint.fileList])
    }),
    rootDir
  });
}

function collectAreaInputs(
  rootDir: string,
  codeAreas: ResolvedDuplicateDetectionOptions["codeAreas"]
): readonly DuplicateDetectionAreaInput[] {
  const areas: DuplicateDetectionAreaInput[] = [];
  const orderedPolicies = Object.entries(codeAreas).sort(([left], [right]) =>
    compareText(left, right)
  );
  const filesByArea = collectProjectFileSets(
    rootDir,
    Object.fromEntries(orderedPolicies.map(([areaId, policy]) => [areaId, policy.files]))
  );
  for (const [codeArea, policy] of orderedPolicies) {
    const approvedExactPaths = requireProjectFileSet(filesByArea, codeArea);
    if (approvedExactPaths.length === 0) continue;
    areas.push(
      Object.freeze({
        approvedExactPaths: Object.freeze(approvedExactPaths),
        codeArea,
        minimumLines: policy.minimumLines,
        minimumTokens: policy.minimumTokens
      })
    );
  }
  return Object.freeze(areas);
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareText);
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function directMeasurementFailure(
  measurement: Exclude<DuplicateMeasurementResult, { kind: "complete" }>
): CheckResult {
  switch (measurement.kind) {
    case "cache-write-failed":
      return unavailable("cache-write-failed");
    case "execution-failed":
      return unavailable("external-execution-failed");
    case "invalid-result":
      return unavailable("external-result-invalid");
    case "unavailable":
      return unavailable("external-dependency-unavailable");
  }
  const exhaustiveMeasurement: never = measurement;
  return exhaustiveMeasurement;
}

function unavailable(code: DuplicateDetectionUnavailableReasonCode): CheckResult {
  return Object.freeze({ status: "unavailable", reason: { code } });
}
