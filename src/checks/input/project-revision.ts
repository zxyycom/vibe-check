import { gitHeadSha } from "../../foundation/git.ts";

export function getGitSha(cwd: string): string {
  return gitHeadSha(cwd) ?? "unknown";
}
