import { basename, join } from "node:path";

import { errorMessage } from "../../../error-message.ts";
import { writeTextFile } from "../../../repository-files/files.ts";
import { runProcess, type ProcessResult } from "../../../process-execution/execution.ts";
import { isNonArrayRecord } from "../../../value-guards.ts";
import { defineCheck, type Check, type CheckExecutionContext, type CheckResult } from "vibe-check";

const UNAVAILABLE_REASON_CODE = Object.freeze({
  dependencyDataInvalid: "dependency-data-invalid",
  dependencyFailed: "dependency-failed",
  dependencyUnavailable: "dependency-unavailable",
  executionCancelled: "execution-cancelled",
  exitUnavailable: "exit-unavailable",
  processTimeout: "process-timeout",
  processUnavailable: "process-unavailable",
  transcriptUnavailable: "transcript-unavailable"
} as const);

type UnavailableReasonCode = (typeof UNAVAILABLE_REASON_CODE)[keyof typeof UNAVAILABLE_REASON_CODE];

export interface ProcessCheckDependencies {
  readonly runProcess: typeof runProcess;
  readonly writeTextFile: typeof writeTextFile;
}

export interface ProcessCheckDataDependency<Data extends object> {
  readonly checkId: string;
  readonly environment: (data: Data) => Readonly<Record<string, string>>;
  readonly parseData: (data: unknown) => Data;
}

/** One Check's actual external command boundary. */
export interface ProcessCheckDescriptor {
  readonly args: readonly string[];
  readonly checkId: string;
  readonly command: string;
  readonly cwd?: string;
  readonly displayName: string;
  readonly environment?: Readonly<Record<string, string>>;
  readonly timeoutMs?: number;
}

export interface ProcessTranscriptStep {
  readonly definition: Pick<ProcessCheckDescriptor, "args" | "command">;
  readonly label: string;
  readonly result: ProcessResult;
}

const defaultProcessCheckDependencies: ProcessCheckDependencies = Object.freeze({
  runProcess,
  writeTextFile
});

/** Creates an ordinary Check that owns an external process and its transcript. */
export function createProcessCheck(
  definition: ProcessCheckDescriptor,
  invocationLogDirectory: string,
  dependencies: ProcessCheckDependencies = defaultProcessCheckDependencies
): Check {
  return defineCheck<string, ProcessCheckDescriptor>({
    checkId: definition.checkId,
    displayName: definition.displayName,
    options: definition,
    preflight: (options) =>
      validProcessCheckDescriptor(options)
        ? { status: "success", preparedOptions: options }
        : { status: "failure", action: "block", reason: { code: "invalid-options" } },
    execution: async (context): Promise<CheckResult> =>
      executeProcessCheck(context, invocationLogDirectory, dependencies)
  });
}

/** Runs one process only after restoring typed data from one direct provider dependency. */
export function createProcessCheckWithDataDependency<Data extends object>(
  definition: ProcessCheckDescriptor,
  invocationLogDirectory: string,
  dependency: ProcessCheckDataDependency<Data>,
  dependencies: ProcessCheckDependencies = defaultProcessCheckDependencies
): Check {
  return defineCheck<string, ProcessCheckDescriptor>({
    checkId: definition.checkId,
    dependsOn: [dependency.checkId],
    displayName: definition.displayName,
    options: definition,
    preflight: (options) =>
      validProcessCheckDescriptor(options)
        ? { status: "success", preparedOptions: options }
        : { status: "failure", action: "block", reason: { code: "invalid-options" } },
    execution: async (context): Promise<CheckResult> => {
      const read = context.dependencies.get(dependency.checkId);
      if (!read.ok) return unavailable(UNAVAILABLE_REASON_CODE.dependencyUnavailable);
      if (read.status !== "passed") return unavailable(UNAVAILABLE_REASON_CODE.dependencyFailed);

      let options: ProcessCheckDescriptor;
      try {
        const derivedEnvironment = dependency.environment(dependency.parseData(read.data));
        if (
          !isNonArrayRecord(derivedEnvironment) ||
          !validEnvironment(derivedEnvironment) ||
          Object.keys(derivedEnvironment).some((name) =>
            Object.hasOwn(context.options.environment ?? {}, name)
          )
        ) {
          return unavailable(UNAVAILABLE_REASON_CODE.dependencyDataInvalid);
        }
        options = Object.freeze({
          ...context.options,
          environment: Object.freeze({
            ...(context.options.environment ?? {}),
            ...derivedEnvironment
          })
        });
      } catch {
        return unavailable(UNAVAILABLE_REASON_CODE.dependencyDataInvalid);
      }
      return executeProcessCheck(
        Object.freeze({ ...context, options }),
        invocationLogDirectory,
        dependencies
      );
    }
  });
}

function validProcessCheckDescriptor(value: unknown): boolean {
  if (!isNonArrayRecord(value)) return false;
  const keys = Object.keys(value);
  if (
    keys.some(
      (key) =>
        key !== "args" &&
        key !== "checkId" &&
        key !== "command" &&
        key !== "cwd" &&
        key !== "displayName" &&
        key !== "environment" &&
        key !== "timeoutMs"
    ) ||
    !keys.includes("args") ||
    !keys.includes("checkId") ||
    !keys.includes("command") ||
    !keys.includes("displayName")
  ) {
    return false;
  }
  const args = value.args;
  return (
    Array.isArray(args) &&
    args.every((argument) => typeof argument === "string") &&
    nonEmptyString(value.checkId) &&
    nonEmptyString(value.command) &&
    nonEmptyString(value.displayName) &&
    (value.cwd === undefined || typeof value.cwd === "string") &&
    validEnvironment(value.environment) &&
    (value.timeoutMs === undefined || positiveInteger(value.timeoutMs))
  );
}

function validEnvironment(value: unknown): boolean {
  if (value === undefined) return true;
  if (!isNonArrayRecord(value)) return false;
  return Object.values(value).every((item) => typeof item === "string");
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

async function executeProcessCheck(
  context: CheckExecutionContext<ProcessCheckDescriptor>,
  invocationLogDirectory: string,
  dependencies: ProcessCheckDependencies
): Promise<CheckResult> {
  if (context.signal.aborted) return unavailable(UNAVAILABLE_REASON_CODE.executionCancelled);

  const logPath = processTranscriptPath(invocationLogDirectory, context.options.checkId);
  try {
    writeProcessStartupTranscript({
      definition: context.options,
      invocationLogDirectory,
      writeTextFile: dependencies.writeTextFile
    });
  } catch {
    return unavailable(UNAVAILABLE_REASON_CODE.transcriptUnavailable);
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
      checkId: context.options.checkId,
      invocationLogDirectory,
      steps: [{ definition: context.options, label: "command", result }],
      writeTextFile: dependencies.writeTextFile
    });
  } catch {
    return unavailable(UNAVAILABLE_REASON_CODE.transcriptUnavailable);
  }

  if (context.signal.aborted) return unavailable(UNAVAILABLE_REASON_CODE.executionCancelled);
  if (result.timedOut === true) {
    const timeoutMs = context.options.timeoutMs;
    if (timeoutMs === undefined) return unavailable(UNAVAILABLE_REASON_CODE.processUnavailable);
    return Object.freeze({
      status: "unavailable",
      reason: { code: UNAVAILABLE_REASON_CODE.processTimeout },
      messages: Object.freeze([
        Object.freeze({
          level: "error",
          code: "command-timeout",
          message: `Command exceeded its ${formatTimeout(timeoutMs)} timeout; transcript: ${basename(logPath)}.`
        })
      ])
    });
  }
  if (result.error !== undefined) return unavailable(UNAVAILABLE_REASON_CODE.processUnavailable);
  const exitCode = result.status;
  if (exitCode === null) return unavailable(UNAVAILABLE_REASON_CODE.exitUnavailable);
  if (exitCode === 0) return Object.freeze({ status: "passed", data: Object.freeze({ exitCode }) });

  return failedProcessResult(context, {
    command: context.options.command,
    exitCode,
    logPath,
    signal: result.signal
  });
}

/** Writes one safe Check-owned transcript for every actual process step. */
export function writeProcessTranscript(
  input: Readonly<{
    readonly checkId: string;
    readonly invocationLogDirectory: string;
    readonly steps: readonly ProcessTranscriptStep[];
    readonly writeTextFile?: typeof writeTextFile;
  }>
): string {
  const logPath = processTranscriptPath(input.invocationLogDirectory, input.checkId);
  (input.writeTextFile ?? writeTextFile)({
    content: [`check: ${input.checkId}`, ...input.steps.map(transcriptStep)].join("\n\n"),
    filePath: logPath
  });
  return logPath;
}

function writeProcessStartupTranscript(
  input: Readonly<{
    readonly definition: ProcessCheckDescriptor;
    readonly invocationLogDirectory: string;
    readonly writeTextFile: typeof writeTextFile;
  }>
): void {
  const { definition } = input;
  const logPath = processTranscriptPath(input.invocationLogDirectory, definition.checkId);
  const command = [definition.command, ...definition.args].map(commandToken).join(" ");
  input.writeTextFile({
    content: [
      `check: ${definition.checkId}`,
      "",
      "step: command",
      `command: ${command}`,
      "status: running",
      `timeout: ${definition.timeoutMs === undefined ? "none" : formatTimeout(definition.timeoutMs)}`
    ].join("\n"),
    filePath: logPath
  });
}

function processTranscriptPath(invocationLogDirectory: string, checkId: string): string {
  return join(invocationLogDirectory, `${checkId}.log`);
}

/** Produces the standard failure Record and presentation-safe terminal message. */
export function failedProcessResult(
  context: Pick<CheckExecutionContext<object>, "records">,
  input: CommandFailureRecordInput
): CheckResult {
  context.records.report({ id: "command-failure" }, failureRecord(input));
  return Object.freeze({
    status: "failed",
    data: Object.freeze({ exitCode: input.exitCode }),
    messages: Object.freeze([
      Object.freeze({
        level: "error",
        code: "command-failed",
        message: `Command exited with code ${input.exitCode}; signal: ${input.signal ?? "none"}; transcript: ${basename(input.logPath)}.`
      })
    ])
  });
}

interface CommandFailureRecordInput {
  readonly command: string;
  readonly exitCode: number;
  readonly logPath: string;
  readonly signal: NodeJS.Signals | null;
}

function failureRecord(input: CommandFailureRecordInput): Readonly<{
  readonly command: string;
  readonly exitCode: number;
  readonly log: string;
  readonly signal: NodeJS.Signals | "none";
}> {
  return Object.freeze({
    command: input.command,
    exitCode: input.exitCode,
    log: basename(input.logPath),
    signal: input.signal ?? "none"
  });
}

function transcriptStep(step: ProcessTranscriptStep): string {
  const { definition, label, result } = step;
  const command = [definition.command, ...definition.args].map(commandToken).join(" ");
  return [
    `step: ${label}`,
    `command: ${command}`,
    `status: ${result.status === null ? "unavailable" : result.status}`,
    `signal: ${result.signal ?? "none"}`,
    `timed-out: ${result.timedOut === true ? "yes" : "no"}`,
    `error: ${result.error === undefined ? "none" : commandToken(errorMessage(result.error))}`,
    "",
    "--- stdout ---",
    result.stdout,
    "--- stderr ---",
    result.stderr
  ].join("\n");
}

function formatTimeout(timeoutMs: number): string {
  if (timeoutMs % 1_000 === 0) return `${timeoutMs / 1_000}s`;
  return `${timeoutMs}ms`;
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

function commandToken(value: string): string {
  return JSON.stringify(value);
}

function unavailable(code: UnavailableReasonCode): CheckResult {
  return Object.freeze({ status: "unavailable", reason: { code } });
}
