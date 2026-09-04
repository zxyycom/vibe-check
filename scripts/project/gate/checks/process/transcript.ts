import { mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";

import { errorMessage } from "../../../../error-message.ts";
import { writeTextFile } from "../../../../repository-files/files.ts";
import type { ProcessResult } from "../../../../process-execution/execution.ts";
import type { CheckExecutionContext, CheckResult } from "@zxyycom/vibe-check";

import type { ProcessCheckDescriptor } from "./process.ts";

/** One completed child-process step included in a Check-owned transcript. */
export interface ProcessTranscriptStep {
  readonly definition: Pick<ProcessCheckDescriptor, "args" | "command">;
  readonly label: string;
  readonly result: ProcessResult;
}

/** Writes one safe Check-owned transcript for every actual process step. */
export function writeProcessTranscript(
  input: Readonly<{
    readonly checkId: string;
    readonly artifactDirectory: string;
    readonly steps: readonly ProcessTranscriptStep[];
    readonly writeTextFile?: typeof writeTextFile;
  }>
): string {
  const logPath = processTranscriptPath(input.artifactDirectory);
  mkdirSync(dirname(logPath), { recursive: true });
  (input.writeTextFile ?? writeTextFile)({
    content: [`check: ${input.checkId}`, ...input.steps.map(transcriptStep)].join("\n\n"),
    filePath: logPath
  });
  return logPath;
}

/** Records the process command before it starts so an interrupted Gate retains context. */
export function writeProcessStartupTranscript(
  input: Readonly<{
    readonly definition: ProcessCheckDescriptor;
    readonly artifactDirectory: string;
    readonly writeTextFile: typeof writeTextFile;
  }>
): void {
  const { definition } = input;
  const logPath = processTranscriptPath(input.artifactDirectory);
  mkdirSync(dirname(logPath), { recursive: true });
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

export function processTranscriptPath(artifactDirectory: string): string {
  return join(artifactDirectory, "process.log");
}

/** Returns the invocation-relative reference shown by Check messages and Records. */
export function processTranscriptReference(logPath: string): string {
  return `checks/${basename(dirname(logPath))}/${basename(logPath)}`;
}

/** Produces the standard failure Record and presentation-safe terminal message. */
export function failedProcessResult(
  context: Pick<CheckExecutionContext<object>, "records">,
  input: Readonly<{
    readonly command: string;
    readonly exitCode: number;
    readonly logPath: string;
    readonly signal: NodeJS.Signals | null;
  }>
): CheckResult {
  context.records.report(
    { id: "command-failure" },
    Object.freeze({
      command: input.command,
      exitCode: input.exitCode,
      log: processTranscriptReference(input.logPath),
      signal: input.signal ?? "none"
    })
  );
  return Object.freeze({
    status: "failed",
    data: Object.freeze({ exitCode: input.exitCode }),
    messages: Object.freeze([
      Object.freeze({
        level: "error",
        code: "command-failed",
        message: `Command exited with code ${input.exitCode}; signal: ${input.signal ?? "none"}; transcript: ${processTranscriptReference(input.logPath)}.`
      })
    ])
  });
}

export function formatTimeout(timeoutMs: number): string {
  return timeoutMs % 1_000 === 0 ? `${timeoutMs / 1_000}s` : `${timeoutMs}ms`;
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

function commandToken(value: string): string {
  return JSON.stringify(value);
}
