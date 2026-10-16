import type { AfterCommandContext, CompletedCommand, CheckResult } from "@zxyycom/vibe-check";

import {
  safeProcessFailureRecords,
  type ProcessFailureProjection
} from "./process/failure-projection.ts";
import { failedProcessResult, processTranscriptPath } from "./process/transcript.ts";

/** Settles one complete Product command with the Gate's safe failure presentation. */
export function settleProjectGateCommand(
  input: Readonly<{
    readonly command: string;
    readonly context: Pick<AfterCommandContext, "artifactDirectory" | "records">;
    readonly completedCommand: CompletedCommand;
    readonly failureProjection?: ProcessFailureProjection;
  }>
): CheckResult {
  const { command, context, completedCommand, failureProjection } = input;
  if (context.artifactDirectory === null) {
    return Object.freeze({
      status: "unavailable" as const,
      reason: Object.freeze({ code: "command-transcript-unavailable" })
    });
  }
  if (completedCommand.exitCode === 0) {
    return Object.freeze({
      status: "passed" as const,
      data: Object.freeze({ exitCode: 0 })
    });
  }
  const failureRecords =
    failureProjection === undefined
      ? undefined
      : safeProcessFailureRecords(failureProjection, completedCommand.stdout);
  return failedProcessResult(context, {
    command,
    exitCode: completedCommand.exitCode,
    logPath: processTranscriptPath(context.artifactDirectory),
    signal: null,
    ...(failureRecords === undefined ? {} : { failureRecords })
  });
}
