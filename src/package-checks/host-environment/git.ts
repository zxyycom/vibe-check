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

/** Renders the actionable failure evidence shared by Git operation boundaries. */
export function gitFailureDetail(result: ProcessResult): string {
  const stderr = result.stderr.trim();
  if (stderr.length > 0) return stderr;
  const processErrorMessage = result.error?.message;
  if (processErrorMessage !== undefined && processErrorMessage.length > 0) {
    return processErrorMessage;
  }
  return result.signal === null ? `exit status ${result.status}` : `signal ${result.signal}`;
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

export function splitNulDelimitedGitFileList(stdout: string): string[] {
  return stdout
    .split("\0")
    .filter((filePath) => filePath.length > 0)
    .map(toSlashPath);
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
