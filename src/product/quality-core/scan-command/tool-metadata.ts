import { gitHeadSha } from "../../foundation/index.ts";

export function getGitSha(cwd: string): string {
  return gitHeadSha(cwd) ?? "unknown";
}
