import {
  DEFAULT_PROCESS_MAX_BUFFER_BYTES,
  processFailure,
  processFailureFromResult,
  runProcess,
  type ProcessFailure
} from "../../tools/foundation/src/process.ts";
import type { CheckStatus, CheckTask } from "../checks/index.ts";
import { type CheckResult, visibleOutputForCheck } from "../results.ts";
import { environmentForCheck } from "./environment.ts";
import { root } from "./paths.ts";

interface CheckExecutionData {
  readonly endedAtMs: number;
  readonly error?: unknown;
  readonly exitCode: number;
  readonly ok: boolean;
  readonly startedAtMs: number;
  readonly status: CheckStatus;
  readonly stderr: string;
  readonly stdout: string;
}

export async function executeCheck(check: CheckTask): Promise<CheckResult> {
  const startedAtMs = Date.now();
  const result = await runProcess({
    args: [...check.args],
    command: check.command,
    cwd: root,
    env: environmentForCheck(check),
    maxBuffer: DEFAULT_PROCESS_MAX_BUFFER_BYTES
  });
  const failure = processFailureFromResult(result);
  return buildCheckResult(check, {
    ok: failure === null,
    exitCode: failure === null ? 0 : normalizeExitCode(failure),
    stdout: result.stdout,
    stderr: result.stderr,
    error: failure ?? undefined,
    status: statusForExecution({
      check,
      ok: failure === null,
      stderr: result.stderr,
      stdout: result.stdout
    }),
    startedAtMs,
    endedAtMs: Date.now()
  });
}

function buildCheckResult(check: CheckTask, data: CheckExecutionData): CheckResult {
  const combinedOutput = combinedProcessOutput(data);
  return {
    check,
    ok: data.ok,
    exitCode: data.exitCode,
    error: data.error === undefined ? null : processFailure(data.error),
    status: data.status,
    stdout: data.stdout,
    stderr: data.stderr,
    combinedOutput,
    visibleOutput: visibleOutputForCheck({
      check,
      output: combinedOutput,
      status: data.status
    }),
    durationMs: data.endedAtMs - data.startedAtMs,
    startedAtMs: data.startedAtMs,
    endedAtMs: data.endedAtMs
  };
}

function statusForExecution({
  check,
  ok,
  stderr,
  stdout
}: {
  readonly check: CheckTask;
  readonly ok: boolean;
  readonly stderr: string;
  readonly stdout: string;
}): CheckStatus {
  if (!ok) {
    return "failed";
  }
  const output = combinedProcessOutput({ stdout, stderr });
  return check.warningOutput.some((pattern) => pattern.test(output)) ? "warning" : "passed";
}

function combinedProcessOutput({
  stdout,
  stderr
}: Pick<CheckExecutionData, "stderr" | "stdout">): string {
  return [stdout, stderr].filter(Boolean).join("\n");
}

function normalizeExitCode(error: ProcessFailure): number {
  return typeof error?.code === "number" ? error.code : 1;
}
