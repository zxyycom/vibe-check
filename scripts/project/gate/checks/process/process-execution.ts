import { errorMessage } from "../../../../error-message.ts";
import type { ProcessResult } from "../../../../process-execution/execution.ts";
import type { CheckExecutionContext, CheckResult } from "@zxyycom/vibe-check";

import {
  failedProcessResult,
  formatTimeout,
  processTranscriptPath,
  processTranscriptReference,
  writeProcessStartupTranscript,
  writeProcessTranscript
} from "./transcript.ts";
import type { ProcessCheckDependencies, ProcessCheckDescriptor } from "./process.ts";

export const PROCESS_CHECK_UNAVAILABLE_REASON_CODE = Object.freeze({
  dependencyDataInvalid: "dependency-data-invalid",
  dependencyFailed: "dependency-failed",
  dependencyUnavailable: "dependency-unavailable",
  executionCancelled: "execution-cancelled",
  exitUnavailable: "exit-unavailable",
  processTimeout: "process-timeout",
  processOutputInvalid: "process-output-invalid",
  processUnavailable: "process-unavailable",
  transcriptUnavailable: "transcript-unavailable"
} as const);

export type ProcessCheckUnavailableReasonCode =
  (typeof PROCESS_CHECK_UNAVAILABLE_REASON_CODE)[keyof typeof PROCESS_CHECK_UNAVAILABLE_REASON_CODE];

export function unavailableProcessCheckResult<Data extends object = object>(
  code: ProcessCheckUnavailableReasonCode
): CheckResult<Data> {
  return Object.freeze({ status: "unavailable", reason: { code } });
}

export function executeProcessCheck(
  context: CheckExecutionContext<ProcessCheckDescriptor>,
  dependencies: ProcessCheckDependencies
): Promise<CheckResult>;
export function executeProcessCheck<Data extends object>(
  context: CheckExecutionContext<ProcessCheckDescriptor>,
  dependencies: ProcessCheckDependencies,
  successData: (stdout: string) => Data
): Promise<CheckResult<Data>>;
export async function executeProcessCheck(
  context: CheckExecutionContext<ProcessCheckDescriptor>,
  dependencies: ProcessCheckDependencies,
  successData?: (stdout: string) => object
): Promise<CheckResult> {
  if (context.signal.aborted)
    return unavailableProcessCheckResult(PROCESS_CHECK_UNAVAILABLE_REASON_CODE.executionCancelled);
  const artifactDirectory = context.artifactDirectory;
  if (artifactDirectory === null)
    return unavailableProcessCheckResult(
      PROCESS_CHECK_UNAVAILABLE_REASON_CODE.transcriptUnavailable
    );

  const logPath = processTranscriptPath(artifactDirectory);
  try {
    writeProcessStartupTranscript({
      artifactDirectory,
      definition: context.options,
      writeTextFile: dependencies.writeTextFile
    });
  } catch {
    return unavailableProcessCheckResult(
      PROCESS_CHECK_UNAVAILABLE_REASON_CODE.transcriptUnavailable
    );
  }

  let result: ProcessResult;
  try {
    result = await dependencies.runProcess({
      args: context.options.args,
      command: context.options.command,
      cwd: context.options.cwd ?? context.project.root,
      env: { ...process.env, ...context.options.environment },
      label: context.options.checkId,
      cancelSignal: context.signal,
      timeout: context.options.timeoutMs
    });
  } catch (error: unknown) {
    result = unavailableProcessResult(error);
  }

  try {
    writeProcessTranscript({
      artifactDirectory,
      checkId: context.options.checkId,
      steps: [{ definition: context.options, label: "command", result }],
      writeTextFile: dependencies.writeTextFile
    });
  } catch {
    return unavailableProcessCheckResult(
      PROCESS_CHECK_UNAVAILABLE_REASON_CODE.transcriptUnavailable
    );
  }

  if (context.signal.aborted)
    return unavailableProcessCheckResult(PROCESS_CHECK_UNAVAILABLE_REASON_CODE.executionCancelled);
  if (result.timedOut === true) {
    const timeoutMs = context.options.timeoutMs;
    if (timeoutMs === undefined)
      return unavailableProcessCheckResult(
        PROCESS_CHECK_UNAVAILABLE_REASON_CODE.processUnavailable
      );
    return Object.freeze({
      status: "unavailable",
      reason: { code: PROCESS_CHECK_UNAVAILABLE_REASON_CODE.processTimeout },
      messages: Object.freeze([
        Object.freeze({
          level: "error",
          code: "command-timeout",
          message: `Command exceeded its ${formatTimeout(timeoutMs)} timeout; transcript: ${processTranscriptReference(logPath)}.`
        })
      ])
    });
  }
  if (result.error !== undefined)
    return unavailableProcessCheckResult(PROCESS_CHECK_UNAVAILABLE_REASON_CODE.processUnavailable);
  const exitCode = result.status;
  if (exitCode === null)
    return unavailableProcessCheckResult(PROCESS_CHECK_UNAVAILABLE_REASON_CODE.exitUnavailable);
  if (exitCode === 0) {
    if (successData === undefined)
      return Object.freeze({
        status: "passed",
        data: Object.freeze({ exitCode })
      });
    try {
      return Object.freeze({
        status: "passed",
        data: successData(result.stdout)
      });
    } catch {
      return unavailableProcessCheckResult(
        PROCESS_CHECK_UNAVAILABLE_REASON_CODE.processOutputInvalid
      );
    }
  }

  return failedProcessResult(context, {
    command: context.options.command,
    exitCode,
    logPath,
    signal: result.signal
  });
}

function unavailableProcessResult(error: unknown): ProcessResult {
  return {
    error: error instanceof Error ? error : new Error(errorMessage(error)),
    signal: null,
    status: null,
    stderr: "",
    stdout: ""
  };
}
