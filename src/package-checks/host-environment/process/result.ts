import type { ExecaResultLike, ProcessResult } from "./contract.ts";

export function toProcessResult(result: ExecaResultLike, label: string): ProcessResult {
  const cause = processCause(result);
  const error = processErrorFor(result, label, cause);
  return {
    ...(error === undefined ? {} : { error }),
    ...(cause === "cancellation" ? { isCanceled: true as const } : {}),
    ...(cause === "max-buffer" ? { isMaxBuffer: true as const } : {}),
    signal: result.signal ?? null,
    status: result.exitCode ?? null,
    stderr: outputString(result.stderr),
    ...(cause === "timeout" ? { timedOut: true as const } : {}),
    stdout: outputString(result.stdout)
  };
}

function outputString(output: unknown): string {
  return typeof output === "string" ? output : "";
}

type ProcessCause =
  | "cancellation"
  | "exit"
  | "max-buffer"
  | "signal"
  | "startup-failure"
  | "timeout";

function processCause(result: ExecaResultLike): ProcessCause {
  if (typeof result.exitCode === "number" && result.exitCode !== 0) return "exit";
  if (result.isCanceled === true) return "cancellation";
  if (result.timedOut === true) return "timeout";
  if (result.isMaxBuffer === true) return "max-buffer";
  if (result.signal !== undefined) return "signal";
  if (result.exitCode === 0) return "exit";
  return "startup-failure";
}

function processErrorFor(
  result: ExecaResultLike,
  label: string,
  cause: ProcessCause
): Error | undefined {
  if (!requiresProcessError(cause, result)) return undefined;

  const error: NodeJS.ErrnoException = new Error(processErrorMessage(result, label));
  const code = processErrorCode(result);
  if (code !== undefined) error.code = code;
  return error;
}

function requiresProcessError(cause: ProcessCause, result: ExecaResultLike): boolean {
  return cause !== "exit" && result.failed === true;
}

function processErrorMessage(result: ExecaResultLike, label: string): string {
  if (result.originalMessage !== undefined) return result.originalMessage;
  if (result.shortMessage !== undefined) return result.shortMessage;
  if (result.message !== undefined) return result.message;
  return `${label} failed`;
}

function processErrorCode(result: ExecaResultLike): string | undefined {
  if (result.code === undefined || result.code.length === 0) return undefined;
  return result.code;
}
