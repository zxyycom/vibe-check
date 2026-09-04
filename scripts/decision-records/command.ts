#!/usr/bin/env bun

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  runDecisionRecordsCli as runInstalledDecisionRecordsCli,
  scanDecisionRecords as scanInstalledDecisionRecords,
  validateDecisionRecords as validateInstalledDecisionRecords
} from "../../.codex/skills/decision-records/scripts/decision-records.mjs";
import type {
  DecisionScan as InstalledDecisionScan,
  DecisionScanOptions,
  DecisionValidationResult as InstalledDecisionValidationResult
} from "../../.codex/skills/decision-records/scripts/decision-records.mjs";

export type {
  DecisionAlignment,
  DecisionCandidateDocument,
  DecisionDocument,
  DecisionId,
  DecisionIndex,
  DecisionIndexEntry,
  DecisionIndexMetadata,
  DecisionIndexState,
  DecisionIndexStoredEntry,
  DecisionListAlignment,
  DecisionListStatus,
  DecisionMetadata,
  DecisionProjection,
  DecisionRecord,
  DecisionRecordSource,
  DecisionRelation,
  DecisionRelationOverride,
  DecisionRelationType,
  DecisionScan,
  DecisionScanOptions,
  DecisionSourceRevision,
  DecisionSourcePath,
  DecisionStatus,
  DecisionSuccessor,
  DecisionTag,
  DecisionTags,
  EstablishedDecisionStatus,
  DecisionValidationResult
} from "../../.codex/skills/decision-records/scripts/decision-records.mjs";

export type RepositoryDecisionScanOptions = Omit<DecisionScanOptions, "workspaceRoot">;

/** A Decision Records validation fact approved for native Gate publication. */
export type DecisionRecordsGateDiagnostic = Readonly<{
  readonly data: Readonly<Record<string, number | string>>;
  readonly id: string;
  readonly presentation: string;
}>;

export type DecisionRecordsGateValidation =
  | Readonly<{ readonly status: "passed" }>
  | Readonly<{
      readonly diagnostics: readonly DecisionRecordsGateDiagnostic[];
      readonly status: "failed";
    }>
  | Readonly<{ readonly status: "unavailable" }>;

type DecisionValidationRecord = InstalledDecisionValidationResult["scan"]["records"][number];

type SafeDecisionValidationInput = Readonly<{
  readonly additionalValidationErrorCount: number;
  readonly indexErrorCount: number;
  readonly indexPath: string;
  readonly records: readonly DecisionValidationRecord[];
  readonly sourceErrorCount: number;
}>;

export const decisionRecordsWorkspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../.."
);

export function scanDecisionRecords(
  options: RepositoryDecisionScanOptions = {}
): Promise<InstalledDecisionScan> {
  return scanInstalledDecisionRecords({
    ...options,
    workspaceRoot: decisionRecordsWorkspaceRoot
  });
}

export function validateDecisionRecords(
  options: RepositoryDecisionScanOptions = {}
): Promise<InstalledDecisionValidationResult> {
  return validateInstalledDecisionRecords({
    ...options,
    workspaceRoot: decisionRecordsWorkspaceRoot
  });
}

/**
 * Projects Decision Records validation into the narrow, owner-approved facts
 * that the native Gate may publish. Installed capability error strings can
 * include parser or filesystem details and are deliberately never forwarded.
 */
export async function validateDecisionRecordsForGate(
  options: RepositoryDecisionScanOptions = {}
): Promise<DecisionRecordsGateValidation> {
  const result = await validateDecisionRecords(options);
  if (result.errors.length === 0) return Object.freeze({ status: "passed" });

  const diagnostics = safeDecisionValidationDiagnostics(result);
  if (diagnostics === undefined) return Object.freeze({ status: "unavailable" });
  return Object.freeze({ diagnostics, status: "failed" });
}

function safeDecisionValidationDiagnostics(
  result: InstalledDecisionValidationResult
): readonly DecisionRecordsGateDiagnostic[] | undefined {
  const input = safeDecisionValidationInput(result);
  if (input === undefined) return undefined;

  const recordDiagnostics = safeDecisionRecordDiagnostics(input.records);
  if (recordDiagnostics === undefined) return undefined;
  if (input.sourceErrorCount > 0 && recordDiagnostics.length === 0) return undefined;

  const diagnostics = [
    ...recordDiagnostics,
    ...decisionIndexDiagnostics(input.indexPath, input.indexErrorCount),
    ...additionalDecisionValidationDiagnostics(
      input.indexPath,
      input.additionalValidationErrorCount
    )
  ];
  return diagnostics.length === 0 ? undefined : Object.freeze(diagnostics.sort(compareDiagnostic));
}

function safeDecisionValidationInput(
  result: InstalledDecisionValidationResult
): SafeDecisionValidationInput | undefined {
  const { scan } = result;
  const additionalValidationErrorCount = result.errors.length - scan.errors.length;
  if (
    scan.collectionErrors.length > 0 ||
    !isSafeRepositoryPath(scan.indexRelativePath) ||
    !Number.isSafeInteger(result.errors.length) ||
    !Number.isSafeInteger(additionalValidationErrorCount) ||
    additionalValidationErrorCount < 0
  ) {
    return undefined;
  }
  return Object.freeze({
    additionalValidationErrorCount,
    indexErrorCount: scan.indexErrors.length,
    indexPath: scan.indexRelativePath,
    records: scan.records,
    sourceErrorCount: scan.sourceErrors.length
  });
}

function safeDecisionRecordDiagnostics(
  records: readonly DecisionValidationRecord[]
): readonly DecisionRecordsGateDiagnostic[] | undefined {
  const diagnostics: DecisionRecordsGateDiagnostic[] = [];
  for (const record of records) {
    const diagnostic = safeDecisionRecordDiagnostic(record);
    if (diagnostic !== undefined) {
      diagnostics.push(diagnostic);
      continue;
    }
    if (record.source.kind === "invalid" || record.source.kind === "missing") return undefined;
  }
  return Object.freeze(diagnostics);
}

function decisionIndexDiagnostics(
  indexPath: string,
  errorCount: number
): readonly DecisionRecordsGateDiagnostic[] {
  return Object.freeze(
    Array.from({ length: errorCount }, (_, index) => {
      const occurrence = index + 1;
      return decisionDiagnostic({
        data: { kind: "decision-index-invalid", occurrence, path: indexPath },
        id: `index:invalid:${occurrence}`,
        presentation: `${indexPath}: Decision index validation failed.`
      });
    })
  );
}

function additionalDecisionValidationDiagnostics(
  indexPath: string,
  errorCount: number
): readonly DecisionRecordsGateDiagnostic[] {
  return Object.freeze(
    Array.from({ length: errorCount }, (_, index) => {
      const occurrence = index + 1;
      return decisionDiagnostic({
        data: { kind: "decision-validation-invalid", occurrence, path: indexPath },
        id: `validation:invalid:${occurrence}`,
        presentation: `${indexPath}: Decision Records validation could not complete.`
      });
    })
  );
}

function safeDecisionRecordDiagnostic(
  record: DecisionValidationRecord
): DecisionRecordsGateDiagnostic | undefined {
  if (!isSafeDecisionId(record.decisionId) || !isSafeRepositoryPath(record.sourcePath)) {
    return undefined;
  }
  if (record.source.kind === "invalid") {
    return decisionDiagnostic({
      data: {
        decisionId: record.decisionId,
        kind: "decision-source-invalid",
        path: record.sourcePath
      },
      id: `source:${encodeURIComponent(record.sourcePath)}:invalid`,
      presentation: `${record.sourcePath}: Decision Record source is invalid.`
    });
  }
  if (record.source.kind === "missing") {
    return decisionDiagnostic({
      data: {
        decisionId: record.decisionId,
        kind: "decision-source-missing",
        path: record.sourcePath
      },
      id: `source:${encodeURIComponent(record.sourcePath)}:missing`,
      presentation: `${record.sourcePath}: Decision Record source is missing.`
    });
  }
  if (record.relationshipErrors.length === 0) return undefined;
  return decisionDiagnostic({
    data: {
      decisionId: record.decisionId,
      kind: "decision-relationship-invalid",
      path: record.sourcePath
    },
    id: `relationship:${encodeURIComponent(record.decisionId)}:invalid`,
    presentation: `${record.sourcePath}: Decision Record relationship validation failed.`
  });
}

function decisionDiagnostic(input: DecisionRecordsGateDiagnostic): DecisionRecordsGateDiagnostic {
  return Object.freeze({
    data: Object.freeze({ ...input.data }),
    id: input.id,
    presentation: input.presentation
  });
}

function compareDiagnostic(
  left: DecisionRecordsGateDiagnostic,
  right: DecisionRecordsGateDiagnostic
): number {
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

function isSafeDecisionId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z][a-z0-9-]*\.md$/u.test(value);
}

function isSafeRepositoryPath(value: unknown): value is string {
  return (
    typeof value === "string" && hasSafeRepositoryPathText(value) && hasSafePathSegments(value)
  );
}

function hasSafeRepositoryPathText(path: string): boolean {
  return (
    path.length > 0 &&
    path === path.trim() &&
    !path.startsWith("/") &&
    !path.startsWith("../") &&
    !path.endsWith("/") &&
    !["\\", "\0", "//"].some((unsafeText) => path.includes(unsafeText))
  );
}

function hasSafePathSegments(path: string): boolean {
  return path.split("/").every(isSafePathSegment);
}

function isSafePathSegment(segment: string): boolean {
  return segment.length > 0 && segment !== "." && segment !== "..";
}

export function runDecisionRecordsCli(argv: readonly string[]): Promise<number> {
  return runInstalledDecisionRecordsCli(["--root", decisionRecordsWorkspaceRoot, ...argv]);
}

if (import.meta.main) {
  process.exitCode = await runDecisionRecordsCli(process.argv.slice(2));
}
