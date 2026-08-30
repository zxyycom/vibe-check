/** Enumerates files from initialized, non-cyclic submodule working trees. */

import { processFailed } from "../host-environment/process/command.ts";
import { runGit, splitNulDelimitedGitFileList } from "../host-environment/git.ts";
import {
  canonicalRepositoryPath,
  resolveDescendableGitlinkRepository,
  visitRepository
} from "./gitlink-worktree.ts";
import { gitlinksAtRevision } from "./gitlink-revision.ts";
import {
  joinSlash,
  nonEmptyGitOutput,
  prefixAndFilter,
  uniqueSortedPaths
} from "./revision-paths.ts";

export function collectSubmoduleWorktreeFiles({
  repository,
  scanInputPaths
}: Readonly<{
  readonly repository: string;
  readonly scanInputPaths: readonly string[];
}>): string[] {
  const files: string[] = [];
  const visitedRepositories = new Set([canonicalRepositoryPath(repository)]);
  const revision = worktreeRevision(repository);
  if (revision === null) return files;

  for (const gitlink of gitlinksAtRevision({ repository, revision })) {
    const submoduleRepository = resolveDescendableGitlinkRepository({
      gitlinkPath: gitlink.path,
      repository,
      visitedRepositories
    });
    if (!submoduleRepository) continue;
    files.push(
      ...collectWorktreeFiles({
        prefix: gitlink.path,
        repository: submoduleRepository,
        scanInputPaths,
        visitedRepositories: visitRepository({
          repository: submoduleRepository,
          visitedRepositories
        })
      })
    );
  }
  return uniqueSortedPaths(files);
}

function collectWorktreeFiles({
  prefix,
  repository,
  scanInputPaths,
  visitedRepositories
}: Readonly<{
  readonly prefix: string;
  readonly repository: string;
  readonly scanInputPaths: readonly string[];
  readonly visitedRepositories: ReadonlySet<string>;
}>): string[] {
  const result = runGit({
    args: ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--"],
    cwd: repository
  });
  if (processFailed(result)) {
    const detail =
      result.stderr.trim() ||
      result.error?.message ||
      (result.signal === null ? `exit status ${result.status}` : `signal ${result.signal}`);
    throw new Error(`could not enumerate git-worktree files in ${repository}: ${detail}`);
  }

  const files = prefixAndFilter({
    files: splitNulDelimitedGitFileList(result.stdout),
    prefix,
    scanInputPaths
  });
  const revision = worktreeRevision(repository);
  if (revision === null) return uniqueSortedPaths(files);
  files.push(
    ...collectNestedWorktreeFiles({
      prefix,
      repository,
      revision,
      scanInputPaths,
      visitedRepositories
    })
  );
  return uniqueSortedPaths(files);
}

function collectNestedWorktreeFiles({
  prefix,
  repository,
  revision,
  scanInputPaths,
  visitedRepositories
}: Readonly<{
  readonly prefix: string;
  readonly repository: string;
  readonly revision: string;
  readonly scanInputPaths: readonly string[];
  readonly visitedRepositories: ReadonlySet<string>;
}>): string[] {
  const files: string[] = [];
  for (const gitlink of gitlinksAtRevision({ repository, revision })) {
    const submoduleRepository = resolveDescendableGitlinkRepository({
      gitlinkPath: gitlink.path,
      repository,
      visitedRepositories
    });
    if (!submoduleRepository) continue;
    files.push(
      ...collectWorktreeFiles({
        prefix: joinSlash({ path: gitlink.path, prefix }),
        repository: submoduleRepository,
        scanInputPaths,
        visitedRepositories: visitRepository({
          repository: submoduleRepository,
          visitedRepositories
        })
      })
    );
  }
  return files;
}

function worktreeRevision(repository: string): string | null {
  const result = runGit({ args: ["rev-parse", "--verify", "--quiet", "HEAD"], cwd: repository });
  if (!processFailed(result)) {
    const revision = nonEmptyGitOutput(result.stdout);
    if (revision !== null) return revision;
    throw new Error(`git-worktree revision inspection returned no revision in ${repository}`);
  }
  const headDoesNotExist =
    result.error === undefined &&
    result.signal === null &&
    result.status === 1 &&
    result.stderr.trim() === "";
  if (headDoesNotExist) return null;
  const detail =
    result.stderr.trim() ||
    result.error?.message ||
    (result.signal === null ? `exit status ${result.status}` : `signal ${result.signal}`);
  throw new Error(`could not inspect git-worktree revision in ${repository}: ${detail}`);
}
