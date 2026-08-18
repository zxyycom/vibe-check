import { processFailed, runProcessSync } from "./process.ts";
import type { ProcessResult, RunProcessSyncOptions } from "./process.ts";
import { toSlashPath } from "./path.ts";

export type RunGitOptions = Omit<RunProcessSyncOptions, "command">;

export type GitCommitOptions = {
  readonly cwd: string;
  readonly sha: string;
};

type GitLogFieldOptions = GitCommitOptions & {
  readonly format: string;
};

export function runGit(options: RunGitOptions): ProcessResult {
  return runProcessSync({ command: "git", ...options });
}

export function gitHeadSha(cwd: string): string | null {
  const result = runGit({ args: ["rev-parse", "HEAD"], cwd });
  if (processFailed(result)) return null;
  return result.stdout.trim() || null;
}

export function gitCommitDate(options: GitCommitOptions): string | null {
  return gitLogField({ format: "%aI", ...options });
}

export function gitCommitTitle(options: GitCommitOptions): string | null {
  return gitLogField({ format: "%s", ...options });
}

export function splitGitFileList(stdout: string): string[] {
  return stdout.trim().split(/\r?\n/).filter(Boolean).map(toSlashPath);
}

export function parseGitStatusPaths(stdout: string): string[] {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const rawPath = line.slice(3).trim();
      const renameMarker = " -> ";
      return rawPath.includes(renameMarker)
        ? rawPath.slice(rawPath.indexOf(renameMarker) + renameMarker.length)
        : rawPath;
    })
    .filter(Boolean)
    .map(toSlashPath);
}

function gitLogField({ format, ...options }: GitLogFieldOptions): string | null {
  const result = runGit({
    args: ["log", `--format=${format}`, "--max-count=1", options.sha],
    cwd: options.cwd
  });
  if (processFailed(result)) return null;
  return result.stdout.trim() || null;
}
