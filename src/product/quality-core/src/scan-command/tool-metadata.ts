import { gitCommitTitle as readGitCommitTitle, gitHeadSha } from "../../../foundation/src/index.ts";
import type { ToolAvailability, ToolInfo } from "../model/schema.ts";

export function collectToolMetadata(toolResults: ToolAvailability[]): ToolInfo[] {
  return toolResults
    .filter((tool): tool is ToolAvailability & { version: string } => tool.available && typeof tool.version === "string")
    .map((tool) => ({
      name: tool.name,
      version: tool.version,
      source: tool.source
    }));
}

export function getGitSha(cwd: string): string {
  return gitHeadSha(cwd) ?? "unknown";
}

export function getGitCommitTitle(sha: string, cwd: string): string | null {
  return readGitCommitTitle(sha, cwd);
}
