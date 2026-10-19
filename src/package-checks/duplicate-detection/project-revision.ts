import { processFailed, runProcessSync } from "../host-environment/process.ts";

/** Samples the current commit only for this Check's cache identity; failures use its unknown sentinel. */
export function getGitSha(cwd: string): string {
  const result = runProcessSync({ command: "git", args: ["rev-parse", "HEAD"], cwd });
  if (processFailed(result)) return "unknown";
  return result.stdout.trim() || "unknown";
}
