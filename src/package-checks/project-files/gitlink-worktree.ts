/** Canonical Git worktree checks for gitlink traversal. */

import { realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { errorMessage } from "../host-environment/error-message.ts";
import { processFailed } from "../host-environment/process.ts";
import { runGit } from "../host-environment/git.ts";

export type GitlinkWorktreeInspection =
  | { readonly kind: "initialized"; readonly repository: string }
  | { readonly kind: "inspection-failed"; readonly error: string }
  | { readonly kind: "missing" }
  | { readonly kind: "not-independent" };

export function canonicalRepositoryPath(repository: string): string {
  return realpathSync(resolve(repository));
}

export function inspectGitlinkWorktree({
  gitlinkPath,
  repository
}: Readonly<{
  readonly gitlinkPath: string;
  readonly repository: string;
}>): GitlinkWorktreeInspection {
  const localWorktree = inspectLocalGitlinkWorktree({ gitlinkPath, repository });
  if (localWorktree.kind !== "found") return localWorktree;
  return inspectGitRepositoryRoot({
    gitlinkPath,
    canonicalSubmoduleRepository: localWorktree.repository
  });
}

type LocalGitlinkWorktree = Readonly<{ readonly kind: "found"; readonly repository: string }>;

function inspectLocalGitlinkWorktree({
  gitlinkPath,
  repository
}: Readonly<{
  readonly gitlinkPath: string;
  readonly repository: string;
}>): GitlinkWorktreeInspection | LocalGitlinkWorktree {
  const submoduleRepository = resolve(repository, gitlinkPath);
  try {
    if (!statSync(submoduleRepository).isDirectory()) return { kind: "missing" };
    return { kind: "found", repository: canonicalRepositoryPath(submoduleRepository) };
  } catch (error: unknown) {
    return missingPath(error)
      ? { kind: "missing" }
      : inspectionFailure(`could not inspect submodule worktree ${gitlinkPath}`, error);
  }
}

function inspectGitRepositoryRoot({
  gitlinkPath,
  canonicalSubmoduleRepository
}: Readonly<{
  readonly gitlinkPath: string;
  readonly canonicalSubmoduleRepository: string;
}>): GitlinkWorktreeInspection {
  const topLevelResult = runGit({
    args: ["rev-parse", "--show-toplevel"],
    cwd: canonicalSubmoduleRepository
  });
  if (processFailed(topLevelResult)) {
    const processErrorMessage = topLevelResult.error?.message;
    const stderr = topLevelResult.stderr.trim();
    let topLevelFailureDetail = `exit ${topLevelResult.status}`;
    if (processErrorMessage !== undefined && processErrorMessage.length > 0) {
      topLevelFailureDetail = processErrorMessage;
    } else if (stderr.length > 0) {
      topLevelFailureDetail = stderr;
    }
    return {
      kind: "inspection-failed",
      error: `git rev-parse --show-toplevel failed while inspecting submodule ${gitlinkPath}: ${topLevelFailureDetail}`
    };
  }

  const topLevel = topLevelResult.stdout.trim();
  if (topLevel.length === 0) {
    return {
      kind: "inspection-failed",
      error: `git rev-parse --show-toplevel returned no repository path for submodule ${gitlinkPath}`
    };
  }

  try {
    return canonicalRepositoryPath(resolve(canonicalSubmoduleRepository, topLevel)) ===
      canonicalSubmoduleRepository
      ? { kind: "initialized", repository: canonicalSubmoduleRepository }
      : { kind: "not-independent" };
  } catch (error: unknown) {
    return inspectionFailure(`could not resolve Git top-level for submodule ${gitlinkPath}`, error);
  }
}

export function resolveDescendableGitlinkRepository({
  gitlinkPath,
  repository,
  visitedRepositories
}: Readonly<{
  readonly gitlinkPath: string;
  readonly repository: string;
  readonly visitedRepositories: ReadonlySet<string>;
}>): string | null {
  const inspection = inspectGitlinkWorktree({ gitlinkPath, repository });
  if (inspection.kind === "inspection-failed") {
    throw new Error(inspection.error);
  }
  return inspection.kind === "initialized" && !visitedRepositories.has(inspection.repository)
    ? inspection.repository
    : null;
}

export function visitRepository({
  repository,
  visitedRepositories
}: Readonly<{
  readonly repository: string;
  readonly visitedRepositories: ReadonlySet<string>;
}>): ReadonlySet<string> {
  return new Set([...visitedRepositories, repository]);
}

function missingPath(error: unknown): boolean {
  const code = error instanceof Error && "code" in error ? error.code : undefined;
  return code === "ENOENT" || code === "ENOTDIR";
}

function inspectionFailure(message: string, error: unknown): GitlinkWorktreeInspection {
  return { kind: "inspection-failed", error: `${message}: ${errorMessage(error)}` };
}
