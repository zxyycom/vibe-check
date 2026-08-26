import { basename, join } from "node:path";

import { errorMessage } from "../../../foundation/errors.ts";
import { writeTextFile } from "../../../foundation/fs.ts";
import { runProcess, type ProcessResult } from "../../../foundation/process.ts";
import { isNonArrayRecord } from "../../../foundation/type-guards.ts";
import { defineCheck, type Check, type CheckExecutionContext, type CheckResult } from "vibe-check";

const UNAVAILABLE_REASON_CODE = Object.freeze({
  executionCancelled: "execution-cancelled",
  exitUnavailable: "exit-unavailable",
  processUnavailable: "process-unavailable",
  transcriptUnavailable: "transcript-unavailable"
} as const);

type UnavailableReasonCode = (typeof UNAVAILABLE_REASON_CODE)[keyof typeof UNAVAILABLE_REASON_CODE];

export interface ProcessCheckDependencies {
  readonly runProcess: typeof runProcess;
  readonly writeTextFile: typeof writeTextFile;
}

/** One Check's actual external command boundary. */
export interface ProcessCheckDefinition {
  readonly args: readonly string[];
  readonly checkId: string;
  readonly command: string;
  readonly cwd?: string;
  readonly displayName: string;
  readonly environment?: Readonly<Record<string, string>>;
}

export interface ProcessTranscriptStep {
  readonly definition: Pick<ProcessCheckDefinition, "args" | "command">;
  readonly label: string;
  readonly result: ProcessResult;
}

const defaultProcessCheckDependencies: ProcessCheckDependencies = Object.freeze({
  runProcess,
  writeTextFile
});

/** Creates an ordinary Check that owns an external process and its transcript. */
export function createProcessCheck(
  definition: ProcessCheckDefinition,
  invocationLogDirectory: string,
  dependencies: ProcessCheckDependencies = defaultProcessCheckDependencies
): Check {
  return defineCheck<string, ProcessCheckDefinition>({
    checkId: definition.checkId,
    displayName: definition.displayName,
    options: definition,
    preflight: (options) =>
      validProcessCheckDefinition(options)
        ? { status: "success", preparedOptions: options }
        : { status: "failure", action: "block", reason: { code: "invalid-options" } },
    execution: async (context): Promise<CheckResult> =>
      executeProcessCheck(context, invocationLogDirectory, dependencies)
  });
}

function validProcessCheckDefinition(value: object): boolean {
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
        key !== "environment"
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
    validEnvironment(value.environment)
  );
}

function validEnvironment(value: unknown): boolean {
  if (value === undefined) return true;
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((item) => typeof item === "string");
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

async function executeProcessCheck(
  context: CheckExecutionContext<ProcessCheckDefinition>,
  invocationLogDirectory: string,
  dependencies: ProcessCheckDependencies
): Promise<CheckResult> {
  if (context.signal.aborted) return unavailable(UNAVAILABLE_REASON_CODE.executionCancelled);

  let result: ProcessResult;
  try {
    result = await dependencies.runProcess({
      args: context.options.args,
      command: context.options.command,
      cwd: context.options.cwd ?? context.project.root,
      env: { ...process.env, ...context.options.environment },
      label: context.options.checkId,
      cancelSignal: context.signal
    });
  } catch (error: unknown) {
    result = unavailableProcessResult(error);
  }

  let logPath: string;
  try {
    logPath = writeProcessTranscript({
      checkId: context.options.checkId,
      invocationLogDirectory,
      steps: [{ definition: context.options, label: "command", result }],
      writeTextFile: dependencies.writeTextFile
    });
  } catch {
    return unavailable(UNAVAILABLE_REASON_CODE.transcriptUnavailable);
  }

  if (context.signal.aborted) return unavailable(UNAVAILABLE_REASON_CODE.executionCancelled);
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
  const logPath = join(input.invocationLogDirectory, `${input.checkId}.log`);
  (input.writeTextFile ?? writeTextFile)({
    content: [`check: ${input.checkId}`, ...input.steps.map(transcriptStep)].join("\n\n"),
    filePath: logPath
  });
  return logPath;
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
    `error: ${result.error === undefined ? "none" : commandToken(errorMessage(result.error))}`,
    "",
    "--- stdout ---",
    result.stdout,
    "--- stderr ---",
    result.stderr
  ].join("\n");
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
