import { basename, join } from "node:path";

import {
  errorMessage,
  runProcess,
  writeTextFile,
  type ProcessResult
} from "../../tools/foundation/src/index.ts";
import { defineCheck, type Check, type CheckExecutionContext, type CheckResult } from "vibe-check";

import type { ProjectGateCheckDescriptor } from "../../project-gate/catalog.ts";
import { selectionFromFlags } from "../../project-gate/controls.ts";
import { projectGateEligibility } from "../../project-gate/eligibility.ts";

const UNAVAILABLE_REASON_CODE = Object.freeze({
  executionCancelled: "execution-cancelled",
  exitUnavailable: "exit-unavailable",
  invalidGateControls: "invalid-gate-controls",
  processUnavailable: "process-unavailable",
  transcriptUnavailable: "transcript-unavailable"
} as const);

type UnavailableReasonCode = (typeof UNAVAILABLE_REASON_CODE)[keyof typeof UNAVAILABLE_REASON_CODE];

export interface ProcessCheckDependencies {
  readonly runProcess: typeof runProcess;
  readonly writeTextFile: typeof writeTextFile;
}

const defaultProcessCheckDependencies: ProcessCheckDependencies = Object.freeze({
  runProcess,
  writeTextFile
});

export function createProcessCheck(
  descriptor: ProjectGateCheckDescriptor,
  invocationLogDirectory: string,
  dependencies: ProcessCheckDependencies = defaultProcessCheckDependencies
): Check {
  return defineCheck({
    checkId: descriptor.checkId,
    displayName: descriptor.displayName,
    dependsOn: descriptor.dependencies,
    options: descriptor,
    execution: async (context): Promise<CheckResult> =>
      executeDescriptor(context, invocationLogDirectory, dependencies)
  });
}

async function executeDescriptor(
  context: CheckExecutionContext<ProjectGateCheckDescriptor>,
  invocationLogDirectory: string,
  dependencies: ProcessCheckDependencies
): Promise<CheckResult> {
  const selection = selectionFromFlags(context.project.flags);
  if (selection === undefined) return unavailable(UNAVAILABLE_REASON_CODE.invalidGateControls);

  const eligibility = projectGateEligibility(context.options, selection);
  if (!eligibility.eligible) {
    return Object.freeze({ status: "not-applicable", reason: { code: eligibility.reasonCode } });
  }
  if (context.signal.aborted) return unavailable(UNAVAILABLE_REASON_CODE.executionCancelled);

  let result: ProcessResult;
  try {
    result = await dependencies.runProcess({
      args: context.options.args,
      command: context.options.command,
      cwd: context.project.root,
      env: { ...process.env, ...context.options.environment },
      label: context.options.checkId,
      cancelSignal: context.signal
    });
  } catch (error: unknown) {
    result = unavailableProcessResult(error);
  }

  const logPath = join(invocationLogDirectory, `${context.options.checkId}.log`);
  try {
    dependencies.writeTextFile({ content: transcript(context.options, result), filePath: logPath });
  } catch {
    return unavailable(UNAVAILABLE_REASON_CODE.transcriptUnavailable);
  }

  if (context.signal.aborted) return unavailable(UNAVAILABLE_REASON_CODE.executionCancelled);
  if (result.error !== undefined) return unavailable(UNAVAILABLE_REASON_CODE.processUnavailable);
  if (result.status === null) return unavailable(UNAVAILABLE_REASON_CODE.exitUnavailable);
  if (result.status === 0) {
    return Object.freeze({ status: "passed", data: Object.freeze({ exitCode: result.status }) });
  }

  context.records.report(
    { id: "command-failure" },
    failureRecord(context.options, result, logPath)
  );
  return Object.freeze({ status: "failed", data: Object.freeze({ exitCode: result.status }) });
}

function failureRecord(
  descriptor: ProjectGateCheckDescriptor,
  result: ProcessResult,
  logPath: string
): object {
  return Object.freeze({
    command: descriptor.command,
    exitCode: result.status,
    log: basename(logPath),
    signal: result.signal ?? "none"
  });
}

function transcript(descriptor: ProjectGateCheckDescriptor, result: ProcessResult): string {
  const command = [descriptor.command, ...descriptor.args].map(commandToken).join(" ");
  return [
    `check: ${descriptor.checkId}`,
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
