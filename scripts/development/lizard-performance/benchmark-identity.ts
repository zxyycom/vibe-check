import { runProcessSync } from "../../process-execution/execution.ts";
import { benchmarkRoot } from "./benchmark-context.ts";

export function repositoryGit(...args: string[]): string {
  return gitAt(benchmarkRoot, ...args);
}

export function gitAt(cwd: string, ...args: string[]): string {
  const result = runProcessSync({ args, command: "git", cwd });
  return result.status === 0 ? result.stdout.trim() : `unavailable: ${result.stderr.trim()}`;
}

export function machineMetadata(): Readonly<{
  readonly arch: string;
  readonly bun: string;
  readonly platform: string;
  readonly supervisorPython: string;
}> {
  return Object.freeze({
    arch: process.arch,
    bun: process.versions.bun ?? "unknown",
    platform: process.platform,
    supervisorPython: runProcessSync({
      args: ["--version"],
      command: "python3",
      cwd: benchmarkRoot
    }).stdout.trim()
  });
}
