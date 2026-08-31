import { resolve } from "node:path";

import type { CheckExecutionContext, CheckResult } from "../../check/check.ts";
import { collectProjectFileSets, requireProjectFileSet } from "../project-files/collection.ts";
import { fingerprintProjectFiles } from "../project-files/file-fingerprint.ts";
import { settleFindings } from "../code-quality-findings/policy.ts";
import { appendCheckMessages } from "../../check/finding-presentation.ts";
import { duplicateFindingMessages } from "./finding-messages.ts";
import { getGitSha } from "./project-revision.ts";
import { measureDuplicateDetection, type DuplicateMeasurementResult } from "./measurement.ts";
import type {
  DuplicateDetectionAreaInput,
  DuplicateDetectionExactInputSet
} from "./measurement-model.ts";
import type { ResolvedDuplicateDetectionOptions } from "./options.ts";
import { validResolvedDuplicateDetectionOptions } from "./options-validation.ts";
import { buildDuplicateRecordCandidates } from "./records.ts";
import type { DuplicateDetectionFinalData } from "./final-data.ts";

export const DUPLICATE_DETECTION_CHECK_DEFINITION = {
  checkId: "duplicate-detection",
  displayName: "Duplicate detection"
} as const;

/** `duplicate-detection` whole-Check unavailable outcome 的稳定 reason code。 */
export type DuplicateDetectionUnavailableReasonCode =
  | "cache-write-failed"
  | "external-dependency-unavailable"
  | "external-execution-failed"
  | "external-result-invalid"
  | "invalid-options"
  | "source-unavailable";

/** Default Check callback；scanner configuration 由其完整 options 拥有。 */
export async function executeDuplicateDetection(
  context: CheckExecutionContext<ResolvedDuplicateDetectionOptions>
): Promise<CheckResult<DuplicateDetectionFinalData>> {
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
  return appendCheckMessages(
    settleFindings(
      candidates.map((candidate) => ({ actionable: true, blocking: candidate.data.blocking }))
    ),
    duplicateFindingMessages(candidates)
  );
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
): CheckResult<DuplicateDetectionFinalData> {
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

function unavailable(
  code: DuplicateDetectionUnavailableReasonCode
): CheckResult<DuplicateDetectionFinalData> {
  return Object.freeze({
    status: "unavailable",
    reason: { code },
    messages: Object.freeze([
      Object.freeze({ code, level: "error" as const, message: unavailableMessage(code) })
    ])
  });
}

function unavailableMessage(code: DuplicateDetectionUnavailableReasonCode): string {
  switch (code) {
    case "invalid-options":
      return "duplicateDetection options are invalid; recreate the Check with duplicateDetection(options) or restore its complete resolved options.";
    case "source-unavailable":
      return "Duplicate detection could not collect its configured project files; check the project root, file permissions, and selected file source.";
    case "external-dependency-unavailable":
      return "The configured jscpd command is unavailable or incompatible; restore the package dependency or configure a compatible executable.";
    case "external-execution-failed":
      return "jscpd did not complete successfully; run the configured command directly and inspect its environment.";
    case "external-result-invalid":
      return "jscpd output could not form a trusted complete result; check command and report compatibility.";
    case "cache-write-failed":
      return "Duplicate detection completed scanning but could not write its cache; check the configured cache directory permissions.";
  }
}
