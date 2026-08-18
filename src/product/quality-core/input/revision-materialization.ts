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

export function materializeRevisionGitlinks({
  archiveDir,
  archiveIndex,
  repository,
  revision,
  targetDir,
  visitedRepositories
}: RevisionMaterializationContext): string | null {
  const traversalVisitedRepositories =
    visitedRepositories ?? new Set([canonicalRepositoryPath(repository)]);
  const gitlinks = gitlinksAtRevision({ repository, revision });
  if (gitlinks === null) {
    return `git ls-tree failed while reading submodules at ${revision}`;
  }

  for (const gitlink of gitlinks) {
    const materialized = materializeGitlink({
      archiveDir,
      archiveIndex,
      gitlink,
      repository,
      targetDir,
      visitedRepositories: traversalVisitedRepositories
    });
    if (!materialized.ok) return materialized.error;

    const nestedError = materializeRevisionGitlinks({
      archiveDir,
      archiveIndex,
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

function materializeGitlink({
  archiveDir,
  archiveIndex,
  gitlink,
  repository,
  targetDir,
  visitedRepositories
}: Readonly<{
  readonly archiveDir: string;
  readonly archiveIndex: { value: number };
  readonly gitlink: Gitlink;
  readonly repository: string;
  readonly targetDir: string;
  readonly visitedRepositories: ReadonlySet<string>;
}>): Readonly<
  | { readonly ok: true; readonly repository: string; readonly targetDir: string }
  | { readonly error: string; readonly ok: false }
> {
  const submoduleTarget = resolve(targetDir, gitlink.path);
  if (!isStrictDescendant({ childPath: submoduleTarget, parentDirectory: targetDir })) {
    return { ok: false, error: `submodule path escapes baseline workspace: ${gitlink.path}` };
  }
  const inspection = inspectGitlinkWorktree({ gitlinkPath: gitlink.path, repository });
  if (inspection.kind === "missing") {
    return { ok: false, error: `initialized submodule worktree is missing: ${gitlink.path}` };
  }
  if (inspection.kind === "not-independent") {
    return {
      ok: false,
      error:
        `submodule path is not an independent Git worktree: ${gitlink.path}; ` +
        "restore the initialized submodule worktree before materializing the baseline"
    };
  }
  if (inspection.kind === "inspection-failed") {
    return { ok: false, error: inspection.error };
  }
  const submoduleRepository = inspection.repository;
  if (visitedRepositories.has(submoduleRepository)) {
    return { ok: false, error: `submodule repository re-enters an ancestor: ${gitlink.path}` };
  }

  const archivePath = join(archiveDir, `submodule-${archiveIndex.value}.tar`);
  archiveIndex.value += 1;
  const archiveError = archiveRevision({
    archivePath,
    label: gitlink.path,
    repository: submoduleRepository,
    revision: gitlink.sha
  });
  if (archiveError) return { ok: false, error: archiveError };

  mkdirSync(submoduleTarget, { recursive: true });
  const extractError = extractArchive({
    archiveDirectory: archiveDir,
    archivePath,
    label: gitlink.path,
    targetDirectory: submoduleTarget
  });
  if (extractError) return { ok: false, error: extractError };

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
