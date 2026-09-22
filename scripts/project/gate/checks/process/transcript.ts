import { mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";

import { errorMessage } from "../../../../error-message.ts";
import { writeTextFile } from "../../../../repository-files/files.ts";
import type { ProcessResult } from "../../../../process-execution/execution.ts";
import type { CheckExecutionContext, CheckResult } from "@zxyycom/vibe-check";

import type { ProcessFailureRecord } from "./failure-projection.ts";

/** One command invocation shape recorded by a Gate-owned multi-step transcript. */
export interface ProcessTranscriptDefinition {
  readonly args: readonly string[];
  readonly command: string;
}

/** One completed child-process step included in a Check-owned transcript. */
export interface ProcessTranscriptStep {
  readonly definition: ProcessTranscriptDefinition;
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
    readonly failureRecords?: readonly ProcessFailureRecord[];
    readonly logPath: string;
    readonly signal: NodeJS.Signals | null;
  }>
): CheckResult {
  if (input.failureRecords === undefined) {
    context.records.report(
      { id: "command-failure" },
      Object.freeze({
        command: basename(input.command),
        exitCode: input.exitCode,
        log: processTranscriptReference(input.logPath),
        signal: input.signal ?? "none"
      })
    );
  } else {
    for (const record of input.failureRecords)
      context.records.report({ id: record.id }, record.data);
  }
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

function transcriptStep(step: ProcessTranscriptStep): string {
  const { definition, label, result } = step;
  const command = [definition.command, ...definition.args].map(commandToken).join(" ");
  return [
    `step: ${label}`,
    `command: ${command}`,
    `status: ${result.status ?? "unavailable"}`,
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
