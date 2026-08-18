/** Canonical Git worktree checks for gitlink traversal. */

import { realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { errorMessage, processFailed, runGit } from "../../foundation/index.ts";

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
  const submoduleRepository = resolve(repository, gitlinkPath);
  let canonicalSubmoduleRepository: string;
  try {
    if (!statSync(submoduleRepository).isDirectory()) return { kind: "missing" };
    canonicalSubmoduleRepository = canonicalRepositoryPath(submoduleRepository);
  } catch (error: unknown) {
    return missingPath(error)
      ? { kind: "missing" }
      : inspectionFailure(`could not inspect submodule worktree ${gitlinkPath}`, error);
  }

  const topLevelResult = runGit({
    args: ["rev-parse", "--show-toplevel"],
    cwd: canonicalSubmoduleRepository
  });
  if (processFailed(topLevelResult)) {
    const topLevelFailureDetail =
      topLevelResult.error?.message ||
      topLevelResult.stderr.trim() ||
      `exit ${topLevelResult.status}`;
    return {
      kind: "inspection-failed",
      error: `git rev-parse --show-toplevel failed while inspecting submodule ${gitlinkPath}: ${topLevelFailureDetail}`
    };
  }

  const topLevel = topLevelResult.stdout.trim();
  if (!topLevel) {
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
