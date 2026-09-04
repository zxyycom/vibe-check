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
import { safeProcessFailureRecords, type ProcessFailureProjection } from "./failure-projection.ts";

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

export interface ProcessExecutionOutput<Data extends object = object> {
  readonly failureProjection?: ProcessFailureProjection;
  readonly successData?: (stdout: string) => Data;
}

export function executeProcessCheck<Data extends object>(
  context: CheckExecutionContext<ProcessCheckDescriptor>,
  dependencies: ProcessCheckDependencies,
  output: Readonly<{
    readonly failureProjection?: ProcessFailureProjection;
    readonly successData: (stdout: string) => Data;
  }>
): Promise<CheckResult<Data>>;
export function executeProcessCheck(
  context: CheckExecutionContext<ProcessCheckDescriptor>,
  dependencies: ProcessCheckDependencies,
  output?: ProcessExecutionOutput
): Promise<CheckResult>;
export async function executeProcessCheck(
  context: CheckExecutionContext<ProcessCheckDescriptor>,
  dependencies: ProcessCheckDependencies,
  output: ProcessExecutionOutput = {}
): Promise<CheckResult> {
  if (context.signal.aborted)
    return unavailableProcessCheckResult(PROCESS_CHECK_UNAVAILABLE_REASON_CODE.executionCancelled);
  const transcript = startProcessTranscript(context, dependencies);
  if (transcript === undefined)
    return unavailableProcessCheckResult(
      PROCESS_CHECK_UNAVAILABLE_REASON_CODE.transcriptUnavailable
    );

  const result = await runConfiguredProcess(context, dependencies);
  if (!writeSettledProcessTranscript(context, dependencies, transcript.artifactDirectory, result))
    return unavailableProcessCheckResult(
      PROCESS_CHECK_UNAVAILABLE_REASON_CODE.transcriptUnavailable
    );

  return settledProcessCheckResult(context, output, result, transcript.logPath);
}

interface ProcessTranscript {
  readonly artifactDirectory: string;
  readonly logPath: string;
}

/** Claims and writes the Check-owned transcript before starting its external command. */
function startProcessTranscript(
  context: CheckExecutionContext<ProcessCheckDescriptor>,
  dependencies: ProcessCheckDependencies
): ProcessTranscript | undefined {
  const artifactDirectory = context.artifactDirectory;
  if (artifactDirectory === null) return undefined;

  try {
    writeProcessStartupTranscript({
      artifactDirectory,
      definition: context.options,
      writeTextFile: dependencies.writeTextFile
    });
    return Object.freeze({ artifactDirectory, logPath: processTranscriptPath(artifactDirectory) });
  } catch {
    return undefined;
  }
}

/** Executes the configured command once and materializes spawn failures for settled evidence. */
async function runConfiguredProcess(
  context: CheckExecutionContext<ProcessCheckDescriptor>,
  dependencies: ProcessCheckDependencies
): Promise<ProcessResult> {
  try {
    return await dependencies.runProcess({
      args: context.options.args,
      command: context.options.command,
      cwd: context.options.cwd ?? context.project.root,
      env: { ...process.env, ...context.options.environment },
      label: context.options.checkId,
      cancelSignal: context.signal,
      timeout: context.options.timeoutMs
    });
  } catch (error: unknown) {
    return unavailableProcessResult(error);
  }
}

/** Replaces running transcript evidence with the command's final process state. */
function writeSettledProcessTranscript(
  context: CheckExecutionContext<ProcessCheckDescriptor>,
  dependencies: ProcessCheckDependencies,
  artifactDirectory: string,
  result: ProcessResult
): boolean {
  try {
    writeProcessTranscript({
      artifactDirectory,
      checkId: context.options.checkId,
      steps: [{ definition: context.options, label: "command", result }],
      writeTextFile: dependencies.writeTextFile
    });
    return true;
  } catch {
    return false;
  }
}

/** Maps a fully transcribed process result into the ordinary Check outcome. */
function settledProcessCheckResult(
  context: CheckExecutionContext<ProcessCheckDescriptor>,
  output: ProcessExecutionOutput,
  result: ProcessResult,
  logPath: string
): CheckResult {
  if (context.signal.aborted)
    return unavailableProcessCheckResult(PROCESS_CHECK_UNAVAILABLE_REASON_CODE.executionCancelled);
  if (result.timedOut === true) return timedOutProcessCheckResult(context.options, logPath);
  if (result.error !== undefined)
    return unavailableProcessCheckResult(PROCESS_CHECK_UNAVAILABLE_REASON_CODE.processUnavailable);
  if (result.status === null)
    return unavailableProcessCheckResult(PROCESS_CHECK_UNAVAILABLE_REASON_CODE.exitUnavailable);
  if (result.status === 0) return successfulProcessCheckResult(output, result.stdout);

  const failureRecords =
    output.failureProjection === undefined
      ? undefined
      : safeProcessFailureRecords(output.failureProjection, result.stdout);
  return failedProcessResult(context, {
    command: context.options.command,
    exitCode: result.status,
    logPath,
    signal: result.signal,
    ...(failureRecords === undefined ? {} : { failureRecords })
  });
}

function timedOutProcessCheckResult(
  definition: ProcessCheckDescriptor,
  logPath: string
): CheckResult {
  const timeoutMs = definition.timeoutMs;
  if (timeoutMs === undefined)
    return unavailableProcessCheckResult(PROCESS_CHECK_UNAVAILABLE_REASON_CODE.processUnavailable);
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

function successfulProcessCheckResult(output: ProcessExecutionOutput, stdout: string): CheckResult {
  if (output.successData === undefined)
    return Object.freeze({ status: "passed", data: Object.freeze({ exitCode: 0 }) });
  try {
    return Object.freeze({ status: "passed", data: output.successData(stdout) });
  } catch {
    return unavailableProcessCheckResult(
      PROCESS_CHECK_UNAVAILABLE_REASON_CODE.processOutputInvalid
    );
  }
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
