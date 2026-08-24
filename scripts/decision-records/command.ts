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

export function runDecisionRecordsCli(argv: readonly string[]): Promise<number> {
  return runInstalledDecisionRecordsCli(["--root", decisionRecordsWorkspaceRoot, ...argv]);
}

if (import.meta.main) {
  process.exitCode = await runDecisionRecordsCli(process.argv.slice(2));
}
