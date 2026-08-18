import { profiles } from "../checks/index.ts";
import type { CheckStatus, Profile } from "../checks/index.ts";
import { formatCompletionLine, formatDurationMs } from "../results.ts";
import type { CompletionResult } from "../results.ts";
import { relativeLogPath } from "./paths.ts";

interface SummaryInput {
  readonly profile: Profile;
  readonly totalChecks: number;
  readonly completedResults: readonly CompletionResult[];
  readonly totalDurationMs: number;
  readonly logPaths: readonly string[];
}

export function printHeader(profile: Profile, totalChecks: number): void {
  console.log("");
  console.log("Vibe Check Workspace Verification");
  console.log(`Profile: ${profile}`);
  console.log(`Total checks: ${totalChecks}`);
  console.log("");
  console.log("Checks:");
}

export function printCompletionResult({
  result,
  writeLine = console.log
}: {
  readonly result: Pick<CompletionResult, "check" | "durationMs" | "status" | "visibleOutput">;
  readonly writeLine?: (line: string) => void;
}): void {
  writeLine(formatCompletionLine(result));
  if (result.visibleOutput.length > 0) {
    writeLine(result.visibleOutput);
  }
}

export function printSummary({
  profile,
  totalChecks,
  completedResults,
  totalDurationMs,
  logPaths
}: SummaryInput): void {
  const failed = completedResults.filter((result) => result.status === "failed").length;
  const warnings = completedResults.filter((result) => result.status === "warning").length;
  const passed = completedResults.filter((result) => result.status === "passed").length;
  const status = summaryStatus({ failed, warnings });

  console.log("");
  console.log("Summary:");
  console.log(`  status: ${status}`);
  console.log(`  profile: ${profile}`);
  console.log(`  total checks: ${totalChecks}`);
  console.log(`  passed: ${passed}`);
  console.log(`  warning: ${warnings}`);
  console.log(`  failed: ${failed}`);
  console.log(`  duration: ${formatDurationMs(totalDurationMs)}`);
  console.log(`  log: ${relativeLogPath(logPaths[0] ?? "")}`);
  console.log("");
}

export function printUsage(writeLine: (line: string) => void): void {
  writeLine(
    "Usage: bun scripts/vibe-check-workspace/verify.ts [--profile required|full] [--concurrency <n>]"
  );
  writeLine("");
  writeLine("Profiles:");
  for (const [name, profile] of Object.entries(profiles)) {
    writeLine(`  - ${name}: ${profile.description}`);
  }
}

function summaryStatus({
  failed,
  warnings
}: {
  readonly failed: number;
  readonly warnings: number;
}): CheckStatus {
  if (failed > 0) {
    return "failed";
  }
  if (warnings > 0) {
    return "warning";
  }
  return "passed";
}
