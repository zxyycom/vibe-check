import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  processFailure,
  processFailureFromResult,
  runProcessSync,
  writeProcessOutput,
  type ProcessResult
} from "./execution.ts";

const developmentRepositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export type ProcessInvocation = {
  readonly args: readonly string[];
  readonly command: string;
  readonly cwd: string;
  readonly env?: NodeJS.ProcessEnv;
};
export type ProcessOutputReporter = (result: ProcessResult) => void;

export function bunPackageInvocation(
  packageName: string,
  args: readonly string[]
): ProcessInvocation {
  return {
    args: ["x", "--no-install", packageName, ...args],
    command: process.execPath,
    cwd: developmentRepositoryRoot
  };
}

export function runProcessInvocationSync(
  invocation: ProcessInvocation,
  options: Readonly<{ report?: ProcessOutputReporter }> = {}
): void {
  const result = runProcessSync(invocation);
  options.report?.(result);
  const failure = processFailureFromResult(result);
  if (failure) throw failure;
}

export function runCommand(
  command: string,
  args: readonly string[],
  options: Readonly<{ cwd?: string; env?: NodeJS.ProcessEnv; report?: ProcessOutputReporter }> = {}
): void {
  runProcessInvocationSync(
    {
      args,
      command,
      cwd: options.cwd ?? developmentRepositoryRoot,
      ...(options.env === undefined ? {} : { env: options.env })
    },
    options
  );
}

export const reportProcessOutput: ProcessOutputReporter = writeProcessOutput;

export function runMain(action: () => void): void {
  try {
    action();
  } catch (error) {
    reportMainFailure(error);
  }
}

export async function runAsyncMain(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    reportMainFailure(error);
  }
}

function reportMainFailure(error: unknown): void {
  const failure = processFailure(error);
  console.error(failure.message);
  process.exitCode = typeof failure.code === "number" ? failure.code : 1;
}
