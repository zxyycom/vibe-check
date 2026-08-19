/** Materialize submodule revisions into an extracted baseline workspace. */

import { mkdirSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

import { processFailed, runGit, runProcessSync } from "../../foundation/index.ts";
import {
  canonicalRepositoryPath,
  inspectGitlinkWorktree,
  visitRepository
} from "./gitlink-worktree.ts";
import { gitlinksAtRevision, type Gitlink } from "./gitlink-revision.ts";

type RevisionMaterializationContext = Readonly<{
  readonly archiveDir: string;
  readonly archiveIndex: { value: number };
  readonly repository: string;
  readonly revision: string;
  readonly targetDir: string;
  readonly visitedRepositories?: ReadonlySet<string>;
}>;

type MaterializeGitlinkContext = Readonly<{
  readonly archiveDir: string;
  readonly archiveIndex: { value: number };
  readonly gitlink: Gitlink;
  readonly repository: string;
  readonly targetDir: string;
  readonly visitedRepositories: ReadonlySet<string>;
}>;

type MaterializeGitlinkResult = Readonly<
  | { readonly ok: true; readonly repository: string; readonly targetDir: string }
  | { readonly error: string; readonly ok: false }
>;

export function materializeRevisionGitlinks(
  context: RevisionMaterializationContext
): string | null {
  const traversalVisitedRepositories =
    context.visitedRepositories ?? new Set([canonicalRepositoryPath(context.repository)]);
  const gitlinks = gitlinksAtRevision({
    repository: context.repository,
    revision: context.revision
  });
  if (gitlinks === null) {
    return `git ls-tree failed while reading submodules at ${context.revision}`;
  }

  for (const gitlink of gitlinks) {
    const materialized = materializeGitlink({
      archiveDir: context.archiveDir,
      archiveIndex: context.archiveIndex,
      gitlink,
      repository: context.repository,
      targetDir: context.targetDir,
      visitedRepositories: traversalVisitedRepositories
    });
    if (!materialized.ok) return materialized.error;

    const nestedError = materializeRevisionGitlinks({
      archiveDir: context.archiveDir,
      archiveIndex: context.archiveIndex,
      repository: materialized.repository,
      revision: gitlink.sha,
      targetDir: materialized.targetDir,
      visitedRepositories: visitRepository({
        repository: materialized.repository,
        visitedRepositories: traversalVisitedRepositories
      })
    });
    if (nestedError) return nestedError;
  }

  return null;
}

function materializeGitlink(context: MaterializeGitlinkContext): MaterializeGitlinkResult {
  const target = materializationTarget(context);
  if (!target.ok) return target;

  const archivePath = join(context.archiveDir, `submodule-${context.archiveIndex.value}.tar`);
  context.archiveIndex.value += 1;
  const archiveError = archiveRevision({
    archivePath,
    label: context.gitlink.path,
    repository: target.repository,
    revision: context.gitlink.sha
  });
  if (archiveError) return { ok: false, error: archiveError };

  mkdirSync(target.targetDir, { recursive: true });
  const extractError = extractArchive({
    archiveDirectory: context.archiveDir,
    archivePath,
    label: context.gitlink.path,
    targetDirectory: target.targetDir
  });
  return extractError ? { ok: false, error: extractError } : target;
}

function materializationTarget(context: MaterializeGitlinkContext): MaterializeGitlinkResult {
  const submoduleTarget = resolve(context.targetDir, context.gitlink.path);
  if (!isStrictDescendant({ childPath: submoduleTarget, parentDirectory: context.targetDir })) {
    return {
      ok: false,
      error: `submodule path escapes baseline workspace: ${context.gitlink.path}`
    };
  }
  const inspection = inspectGitlinkWorktree({
    gitlinkPath: context.gitlink.path,
    repository: context.repository
  });
  if (inspection.kind === "missing") {
    return {
      ok: false,
      error: `initialized submodule worktree is missing: ${context.gitlink.path}`
    };
  }
  if (inspection.kind === "not-independent") {
    return {
      ok: false,
      error:
        `submodule path is not an independent Git worktree: ${context.gitlink.path}; ` +
        "restore the initialized submodule worktree before materializing the baseline"
    };
  }
  if (inspection.kind === "inspection-failed") {
    return { ok: false, error: inspection.error };
  }
  const submoduleRepository = inspection.repository;
  if (context.visitedRepositories.has(submoduleRepository)) {
    return {
      ok: false,
      error: `submodule repository re-enters an ancestor: ${context.gitlink.path}`
    };
  }

  return { ok: true, repository: submoduleRepository, targetDir: submoduleTarget };
}

function archiveRevision({
  archivePath,
  label,
  repository,
  revision
}: Readonly<{
  readonly archivePath: string;
  readonly label: string;
  readonly repository: string;
  readonly revision: string;
}>): string | null {
  const result = runGit({
    args: ["archive", "--format=tar", "--output", archivePath, revision],
    cwd: repository
  });
  if (!processFailed(result)) return null;
  const archiveFailureDetail = result.error?.message || result.stderr || `exit ${result.status}`;
  return `git archive failed for submodule ${label} at ${revision}: ${archiveFailureDetail}`;
}

function extractArchive({
  archiveDirectory,
  archivePath,
  label,
  targetDirectory
}: Readonly<{
  readonly archiveDirectory: string;
  readonly archivePath: string;
  readonly label: string;
  readonly targetDirectory: string;
}>): string | null {
  const result = runProcessSync({
    args: ["-xf", archivePath, "-C", targetDirectory],
    command: "tar",
    cwd: archiveDirectory
  });
  if (!processFailed(result)) return null;
  const extractionFailureDetail = result.error?.message || result.stderr || `exit ${result.status}`;
  return `tar extract failed for submodule ${label}: ${extractionFailureDetail}`;
}

function isStrictDescendant({
  childPath,
  parentDirectory
}: Readonly<{
  readonly childPath: string;
  readonly parentDirectory: string;
}>): boolean {
  const rel = relative(resolve(parentDirectory), resolve(childPath));
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}
