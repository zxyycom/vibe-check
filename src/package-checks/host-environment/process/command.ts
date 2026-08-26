import type { ProcessResult } from "./contract.ts";

export { processFailure, processFailureFromResult, processFailed } from "./failure.ts";
export { PLAIN_TEXT_PROCESS_ENV, plainTextProcessEnv } from "./env.ts";
export { runProcess, runProcessSync } from "./runner.ts";
export { DEFAULT_PROCESS_MAX_BUFFER_BYTES } from "./contract.ts";
export type {
  ProcessFailure,
  ProcessResult,
  RunProcessOptions,
  RunProcessSyncOptions
} from "./contract.ts";

export function writeProcessOutput(result: Pick<ProcessResult, "stderr" | "stdout">): void {
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}
