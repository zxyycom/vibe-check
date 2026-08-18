/** Submodule-aware Git tree traversal used by revision and working-tree scans. */

import {
  parseGitStatusPaths,
  processFailed,
  runGit,
  splitGitFileList
} from "../../foundation/index.ts";
import {
  canonicalRepositoryPath,
  resolveDescendableGitlinkRepository,
  visitRepository
} from "./gitlink-worktree.ts";
import { gitlinksAtRevision, type Gitlink } from "./gitlink-revision.ts";
import {
  joinSlash,
  nonEmptyGitOutput,
  prefixAndFilter,
  uniqueSortedPaths
} from "./revision-paths.ts";

type RevisionChangeContext = Readonly<{
  readonly fromRevision: string;
  readonly prefix: string;
  readonly repository: string;
  readonly scanInputPaths: readonly string[];
  readonly toRevision: string;
  readonly visitedRepositories?: ReadonlySet<string>;
}>;

type TraversalRevisionChangeContext = RevisionChangeContext &
  Readonly<{
    readonly visitedRepositories: ReadonlySet<string>;
  }>;

type WorkingTreeChangeContext = Readonly<{
  readonly prefix: string;
  readonly repository: string;
  readonly revision: string;
  readonly scanInputPaths: readonly string[];
  readonly visitedRepositories?: ReadonlySet<string>;
}>;

export function collectRevisionChanges(context: RevisionChangeContext): string[] {
  const traversalContext: TraversalRevisionChangeContext = {
    ...context,
    visitedRepositories:
      context.visitedRepositories ?? new Set([canonicalRepositoryPath(context.repository)])
  };
  const changed = directRevisionChanges(traversalContext);
  const before = gitlinkMap(
    gitlinksAtRevision({
      repository: traversalContext.repository,
      revision: traversalContext.fromRevision
    }) ?? []
  );
  const after = gitlinkMap(
    gitlinksAtRevision({
      repository: traversalContext.repository,
      revision: traversalContext.toRevision
    }) ?? []
  );

  for (const path of new Set([...before.keys(), ...after.keys()])) {
    changed.push(
      ...changedGitlinkFiles({
        ...traversalContext,
        beforeSha: before.get(path),
        afterSha: after.get(path),
        path
      })
    );
  }

  return uniqueSortedPaths(changed);
}

export function collectWorkingTreeChanges({
  prefix,
  repository,
  revision,
  scanInputPaths,
  visitedRepositories
}: WorkingTreeChangeContext): string[] {
  const traversalVisitedRepositories =
    visitedRepositories ?? new Set([canonicalRepositoryPath(repository)]);
  const statusResult = runGit({
    args: ["status", "--porcelain", "--untracked-files=all"],
    cwd: repository
  });
  const changed = processFailed(statusResult)
    ? []
    : prefixAndFilter({
        files: parseGitStatusPaths(statusResult.stdout),
        prefix,
        scanInputPaths
      });

  for (const gitlink of gitlinksAtRevision({ repository, revision }) ?? []) {
    const submoduleRepository = resolveDescendableGitlinkRepository({
      gitlinkPath: gitlink.path,
      repository,
      visitedRepositories: traversalVisitedRepositories
    });
    if (!submoduleRepository) continue;
    const nextVisitedRepositories = visitRepository({
      repository: submoduleRepository,
      visitedRepositories: traversalVisitedRepositories
    });

    const submodulePrefix = joinSlash({ path: gitlink.path, prefix });
    const actualRevision =
      nonEmptyGitOutput(
        runGit({
          args: ["rev-parse", "HEAD"],
          cwd: submoduleRepository
        }).stdout
      ) ?? gitlink.sha;
    if (actualRevision !== gitlink.sha) {
      changed.push(
        ...collectRevisionChanges({
          fromRevision: gitlink.sha,
          prefix: submodulePrefix,
          repository: submoduleRepository,
          scanInputPaths,
          toRevision: actualRevision,
          visitedRepositories: nextVisitedRepositories
        })
      );
    }
    changed.push(
      ...collectWorkingTreeChanges({
        prefix: submodulePrefix,
        repository: submoduleRepository,
        revision: actualRevision,
        scanInputPaths,
        visitedRepositories: nextVisitedRepositories
      })
    );
  }

  return uniqueSortedPaths(changed);
}

function directRevisionChanges(context: TraversalRevisionChangeContext): string[] {
  const result = runGit({
    args: ["diff", "--name-only", `${context.fromRevision}..${context.toRevision}`],
    cwd: context.repository
  });
  return processFailed(result)
    ? collectRevisionFiles({
        prefix: context.prefix,
        repository: context.repository,
        revision: context.toRevision,
        scanInputPaths: context.scanInputPaths,
        visitedRepositories: context.visitedRepositories
      })
    : prefixAndFilter({
        files: splitGitFileList(result.stdout),
        prefix: context.prefix,
        scanInputPaths: context.scanInputPaths
      });
}

function changedGitlinkFiles({
  afterSha,
  beforeSha,
  path,
  visitedRepositories,
  ...context
}: TraversalRevisionChangeContext & {
  afterSha: string | undefined;
  beforeSha: string | undefined;
  path: string;
}): string[] {
  if (beforeSha === afterSha) return [];

  const repository = resolveDescendableGitlinkRepository({
    gitlinkPath: path,
    repository: context.repository,
    visitedRepositories
  });
  if (!repository) return [];
  const nextVisitedRepositories = visitRepository({
    repository,
    visitedRepositories
  });

  const prefix = joinSlash({ path, prefix: context.prefix });
  if (beforeSha && afterSha) {
    return collectRevisionChanges({
      ...context,
      fromRevision: beforeSha,
      prefix,
      repository,
      toRevision: afterSha,
      visitedRepositories: nextVisitedRepositories
    });
  }

  const revision = afterSha ?? beforeSha;
  return revision
    ? collectRevisionFiles({
        prefix,
        repository,
        revision,
        scanInputPaths: context.scanInputPaths,
        visitedRepositories: nextVisitedRepositories
      })
    : [];
}

function collectRevisionFiles({
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
  const treeResult = runGit({
    args: ["ls-tree", "-r", "--name-only", revision],
    cwd: repository
  });
  if (processFailed(treeResult)) return [];

  const files = prefixAndFilter({
    files: splitGitFileList(treeResult.stdout),
    prefix,
    scanInputPaths
  });
  for (const gitlink of gitlinksAtRevision({ repository, revision }) ?? []) {
    const submoduleRepository = resolveDescendableGitlinkRepository({
      gitlinkPath: gitlink.path,
      repository,
      visitedRepositories
    });
    if (!submoduleRepository) continue;
    files.push(
      ...collectRevisionFiles({
        prefix: joinSlash({ path: gitlink.path, prefix }),
        repository: submoduleRepository,
        revision: gitlink.sha,
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

function gitlinkMap(gitlinks: readonly Gitlink[]): Map<string, string> {
  return new Map(gitlinks.map((gitlink) => [gitlink.path, gitlink.sha]));
}
