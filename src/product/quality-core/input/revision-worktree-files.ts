/** Enumerates files from initialized, non-cyclic submodule working trees. */

import { processFailed, runGit, splitNulDelimitedGitFileList } from "../../foundation/index.ts";
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
  for (const gitlink of gitlinksAtRevision({ repository, revision: "HEAD" }) ?? []) {
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
  if (processFailed(result)) return [];

  const files = prefixAndFilter({
    files: splitNulDelimitedGitFileList(result.stdout),
    prefix,
    scanInputPaths
  });
  const revision = nonEmptyGitOutput(
    runGit({ args: ["rev-parse", "HEAD"], cwd: repository }).stdout
  );
  if (!revision) return uniqueSortedPaths(files);

  for (const gitlink of gitlinksAtRevision({ repository, revision }) ?? []) {
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
  return uniqueSortedPaths(files);
}
