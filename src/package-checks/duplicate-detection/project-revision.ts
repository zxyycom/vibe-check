import { gitHeadSha } from "../host-environment/git.ts";

export function getGitSha(cwd: string): string {
  return gitHeadSha(cwd) ?? "unknown";
}
