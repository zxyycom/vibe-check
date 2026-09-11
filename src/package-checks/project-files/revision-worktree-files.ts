/** Enumerates files from initialized, non-cyclic submodule working trees. */

import { processFailed } from "../host-environment/process.ts";
import { gitFailureDetail, runGit, splitNulDelimitedGitFileList } from "../host-environment/git.ts";
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
    if (submoduleRepository === null) continue;
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
    throw new Error(
      `could not enumerate git-worktree files in ${repository}: ${gitFailureDetail(result)}`
    );
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
    if (submoduleRepository === null) continue;
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
  if (headDoesNotExist(result)) return null;
  throw new Error(
    `could not inspect git-worktree revision in ${repository}: ${gitFailureDetail(result)}`
  );
}

function headDoesNotExist(result: ReturnType<typeof runGit>): boolean {
  return (
    result.error === undefined &&
    result.signal === null &&
    result.status === 1 &&
    result.stderr.trim() === ""
  );
}
