#!/usr/bin/env bun

import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  runDecisionRecordsCli as runInstalledDecisionRecordsCli,
  scanDecisionRecords as scanInstalledDecisionRecords,
  validateDecisionRecords as validateInstalledDecisionRecords
} from "../.codex/skills/decision-records/scripts/decision-records.mjs";
import type {
  DecisionScan as InstalledDecisionScan,
  DecisionScanOptions,
  DecisionValidationResult as InstalledDecisionValidationResult
} from "../.codex/skills/decision-records/scripts/decision-records.mjs";

export type {
  DecisionDocument,
  DecisionIndex,
  DecisionIndexEntry,
  DecisionListStatus,
  DecisionProjection,
  DecisionRecord,
  DecisionRelation,
  DecisionRelationType,
  DecisionScan,
  DecisionScanOptions,
  DecisionStatus,
  DecisionValidationResult
} from "../.codex/skills/decision-records/scripts/decision-records.mjs";

export type RepositoryDecisionScanOptions = Omit<DecisionScanOptions, "workspaceRoot">;

export const decisionRecordsWorkspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  ".."
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

export function runDecisionRecordsCli(
  argv: readonly string[] = process.argv.slice(2)
): Promise<number> {
  return runInstalledDecisionRecordsCli([
    "--root",
    decisionRecordsWorkspaceRoot,
    ...argv
  ]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runDecisionRecordsCli();
}
