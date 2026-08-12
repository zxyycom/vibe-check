import { gitHeadSha } from "../../../foundation/src/index.ts";

export function getGitSha(cwd: string): string {
  return gitHeadSha(cwd) ?? "unknown";
}
