import { resolve } from "node:path";

import { processFailureFromResult, runProcessSync } from "../../process-execution/execution.ts";
import { isFullGitCommit } from "./identity.ts";

export interface CleanReleaseSource {
  readonly commit: string;
}

/** Reads one exact clean repository revision without exposing Git output as release evidence. */
export function readCleanReleaseSource(repositoryRoot: string): CleanReleaseSource {
  const repository = resolve(repositoryRoot);
  const topLevel = runGit(repository, ["rev-parse", "--show-toplevel"]);
  if (resolve(topLevel.trim()) !== repository) {
    throw new Error("formal release source must be the exact Git worktree root");
  }
  const commit = runGit(repository, ["rev-parse", "--verify", "HEAD^{commit}"]).trim();
  if (!isFullGitCommit(commit)) {
    throw new Error("formal release source HEAD is not a complete Git commit identity");
  }
  const status = runGit(repository, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (status.length !== 0) {
    throw new Error("formal release source worktree and index must be clean");
  }
  return Object.freeze({ commit });
}

function runGit(repositoryRoot: string, args: readonly string[]): string {
  const result = runProcessSync({ command: "git", args, cwd: repositoryRoot });
  const failure = processFailureFromResult(result);
  if (failure !== null) {
    throw new Error(
      `formal release could not read Git source state for git ${args[0]}: ${failure.message}`,
      { cause: failure }
    );
  }
  return result.stdout;
}
