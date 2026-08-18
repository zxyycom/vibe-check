import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  processFailure,
  processFailureFromResult,
  runProcessSync,
  writeProcessOutput
} from "../tools/foundation/src/process.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function runBun(args: readonly string[]): void {
  runCommand(process.execPath, args);
}

export function runBunPackage(packageName: string, args: readonly string[]): void {
  runBun(["x", "--no-install", packageName, ...args]);
}

export function runCommand(
  command: string,
  args: readonly string[],
  options: Readonly<{ cwd?: string; env?: NodeJS.ProcessEnv }> = {}
): void {
  const result = runProcessSync({
    args,
    command,
    cwd: options.cwd ?? repositoryRoot,
    env: options.env
  });
  writeProcessOutput(result);
  const failure = processFailureFromResult(result);
  if (failure) throw failure;
}

export function runMain(action: () => void): void {
  try {
    action();
  } catch (error) {
    const failure = processFailure(error);
    console.error(failure.message);
    process.exitCode = typeof failure.code === "number" ? failure.code : 1;
  }
}
