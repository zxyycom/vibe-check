import type { ExecaResultLike, ProcessResult } from "./contract.ts";

export function toProcessResult(result: ExecaResultLike, label: string): ProcessResult {
  return {
    error: processErrorFor(result, label),
    signal: result.signal ?? null,
    status: result.exitCode ?? null,
    stderr: outputString(result.stderr),
    stdout: outputString(result.stdout),
    ...(result.timedOut === true ? { timedOut: true } : {})
  };
}

function outputString(output: unknown): string {
  return typeof output === "string" ? output : "";
}

function processErrorFor(result: ExecaResultLike, label: string): Error | undefined {
  if (!isExecutionError(result)) {
    return undefined;
  }

  const message =
    result.originalMessage ?? result.shortMessage ?? result.message ?? `${label} failed`;
  const error: NodeJS.ErrnoException = new Error(message);
  if (result.code) {
    error.code = result.code;
  }
  return error;
}

function isExecutionError(result: ExecaResultLike): boolean {
  if (!result.failed) {
    return false;
  }
  if (typeof result.exitCode === "number") {
    return false;
  }
  return Boolean(result.code || result.timedOut || result.isMaxBuffer || result.signal);
}
