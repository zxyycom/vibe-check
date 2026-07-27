#!/usr/bin/env bun

import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  listTestEvidenceTopics as listInstalledTestEvidenceTopics,
  queryTestEvidence as queryInstalledTestEvidence,
  runTestEvidenceCatalogCli as runInstalledTestEvidenceCatalogCli,
  showTestEvidenceCase as showInstalledTestEvidenceCase,
  syncTestEvidenceIndex as syncInstalledTestEvidenceIndex,
  validateTestEvidence as validateInstalledTestEvidence
} from "../.codex/skills/test-evidence-review/scripts/test-evidence-catalog.mjs";
import type {
  ListTestEvidenceTopicsOptions,
  QueryTestEvidenceOptions,
  ShowTestEvidenceCaseOptions,
  SyncTestEvidenceIndexOptions,
  TestEvidenceCaseShowResult,
  TestEvidenceIndexSyncResult,
  TestEvidenceQueryResult,
  TestEvidenceReport,
  TestEvidenceTopicsResult,
  ValidateTestEvidenceOptions
} from "../.codex/skills/test-evidence-review/scripts/test-evidence-catalog.mjs";

export type {
  ListTestEvidenceTopicsOptions,
  QueryTestEvidenceOptions,
  ShowTestEvidenceCaseOptions,
  SyncTestEvidenceIndexOptions,
  TestEvidenceCaseShowResult,
  TestEvidenceCaseState,
  TestEvidenceIndexSyncResult,
  TestEvidenceQueryResult,
  TestEvidenceReport,
  TestEvidenceStateIndex,
  TestEvidenceTopicCatalog,
  TestEvidenceTopicsResult,
  ValidateTestEvidenceOptions
} from "../.codex/skills/test-evidence-review/scripts/test-evidence-catalog.mjs";

export type RepositoryTestEvidenceQueryOptions = Omit<
  QueryTestEvidenceOptions,
  "workspaceRoot"
>;
export type RepositoryTestEvidenceShowOptions = Omit<
  ShowTestEvidenceCaseOptions,
  "workspaceRoot"
>;
export type RepositoryTestEvidenceSyncOptions = Omit<
  SyncTestEvidenceIndexOptions,
  "workspaceRoot"
>;

export const testEvidenceWorkspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  ".."
);

export function listTestEvidenceTopics(): Promise<TestEvidenceTopicsResult> {
  const options: ListTestEvidenceTopicsOptions = {
    workspaceRoot: testEvidenceWorkspaceRoot
  };
  return listInstalledTestEvidenceTopics(options);
}

export function queryTestEvidence(
  options: RepositoryTestEvidenceQueryOptions = {}
): Promise<TestEvidenceQueryResult> {
  return queryInstalledTestEvidence({
    ...options,
    workspaceRoot: testEvidenceWorkspaceRoot
  });
}

export function showTestEvidenceCase(
  options: RepositoryTestEvidenceShowOptions
): Promise<TestEvidenceCaseShowResult> {
  return showInstalledTestEvidenceCase({
    ...options,
    workspaceRoot: testEvidenceWorkspaceRoot
  });
}

export function syncTestEvidenceIndex(
  options: RepositoryTestEvidenceSyncOptions
): Promise<TestEvidenceIndexSyncResult> {
  return syncInstalledTestEvidenceIndex({
    ...options,
    workspaceRoot: testEvidenceWorkspaceRoot
  });
}

export function validateTestEvidence(): Promise<TestEvidenceReport> {
  const options: ValidateTestEvidenceOptions = {
    workspaceRoot: testEvidenceWorkspaceRoot
  };
  return validateInstalledTestEvidence(options);
}

export function runTestEvidenceCatalogCli(
  argv: readonly string[] = process.argv.slice(2)
): Promise<number> {
  return runInstalledTestEvidenceCatalogCli([
    "--root",
    testEvidenceWorkspaceRoot,
    ...argv
  ]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runTestEvidenceCatalogCli();
}
