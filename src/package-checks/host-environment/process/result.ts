import type { ExecaResultLike, ProcessResult } from "./contract.ts";

export function toProcessResult(result: ExecaResultLike, label: string): ProcessResult {
  const error = processErrorFor(result, label);
  return {
    ...(error === undefined ? {} : { error }),
    signal: result.signal ?? null,
    status: result.exitCode ?? null,
    stderr: outputString(result.stderr),
    stdout: outputString(result.stdout)
  };
}

function outputString(output: unknown): string {
  return typeof output === "string" ? output : "";
}

function processErrorFor(result: ExecaResultLike, label = "process"): Error | undefined {
  if (!isExecutionError(result)) {
    return undefined;
  }

  const message =
    result.originalMessage ?? result.shortMessage ?? result.message ?? `${label} failed`;
  const error: NodeJS.ErrnoException = new Error(message);
  if (result.code !== undefined && result.code.length > 0) {
    error.code = result.code;
  }
  return error;
}

function isExecutionError(result: ExecaResultLike): boolean {
  if (result.failed !== true) {
    return false;
  }
  if (typeof result.exitCode === "number") {
    return false;
  }
  return (
    (result.code !== undefined && result.code.length > 0) ||
    result.timedOut === true ||
    result.isMaxBuffer === true ||
    result.signal !== undefined
  );
}
