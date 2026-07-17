#!/usr/bin/env bun

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { errorMessage } from "./foundation/src/errors.ts";
import { qualityScanErrorExitCode } from "./quality-core/src/index.ts";
import { runScan } from "./scan.ts";
import type { ScanStatus } from "./scan.ts";

interface CliRuntime {
  readonly cwd: () => string;
  readonly error: (message: string) => void;
  readonly scan: (projectRoot: string, argv: readonly string[]) => Promise<ScanStatus>;
}

const defaultRuntime: CliRuntime = {
  cwd: () => process.cwd(),
  error: (message) => console.error(message),
  scan: runScan
};

export async function runProductCli(
  argv: readonly string[] = process.argv.slice(2),
  runtime: CliRuntime = defaultRuntime
): Promise<0 | 2 | 3> {
  try {
    const [command, ...commandArgs] = argv;
    if (command !== "scan") {
      throw new Error(command === undefined ? "missing command: expected scan" : `unknown command: ${command}`);
    }

    const startupCwd = runtime.cwd();
    const rootArgument = commandArgs[0]?.startsWith("-") === false ? commandArgs[0] : undefined;
    const projectRoot = resolve(startupCwd, rootArgument ?? ".");
    const scanArgs = rootArgument === undefined ? commandArgs : commandArgs.slice(1);
    const status = await runtime.scan(projectRoot, scanArgs);

    return status === "failed" ? 2 : 0;
  } catch (err: unknown) {
    runtime.error(`Fatal error in quality scan: ${errorMessage(err)}`);
    return qualityScanErrorExitCode(err);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await runProductCli());
}
