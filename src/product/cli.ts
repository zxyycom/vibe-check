#!/usr/bin/env bun

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  initializeProjectConfig,
  type ConfigInitResult
} from "./config-init.ts";
import { CliUsageError, errorMessage } from "./foundation/src/errors.ts";
import { ProjectConfigError } from "./config-file.ts";
import { qualityScanErrorExitCode } from "./quality-core/src/index.ts";
import { ScannerOperationalInputError } from "./scanner-dependencies.ts";
import { runScan } from "./scan.ts";
import type { ScanOutcome } from "./scan.ts";

interface CliRuntime {
  readonly cwd: () => string;
  readonly error: (message: string) => void;
  readonly init: (
    projectRoot: string
  ) => ConfigInitResult | Promise<ConfigInitResult>;
  readonly output: (message: string) => void;
  readonly scan: (projectRoot: string, argv: readonly string[]) => Promise<ScanOutcome>;
}

const SCAN_OUTCOME_EXIT_CODE: Readonly<Record<ScanOutcome, 0 | 1 | 2>> = {
  success: 0,
  "gate-failed": 1,
  failed: 2
};

const defaultRuntime: CliRuntime = {
  cwd: () => process.cwd(),
  error: (message) => console.error(message),
  init: initializeProjectConfig,
  output: (message) => console.log(message),
  scan: runScan
};

export async function runProductCli(
  argv: readonly string[] = process.argv.slice(2),
  runtimeOverrides: Partial<CliRuntime> = {}
): Promise<0 | 1 | 2 | 3> {
  const runtime: CliRuntime = { ...defaultRuntime, ...runtimeOverrides };
  const [command, ...commandArgs] = argv;

  if (command === "--help") {
    printRootHelp(runtime.output);
    return 0;
  }
  if (command === "scan") {
    return runScanOperation(commandArgs, runtime);
  }
  if (command === "init") {
    return runInitOperation(commandArgs, runtime);
  }

  const reason = command === undefined
    ? "missing command: expected scan or init"
    : `unknown command: ${command}; expected scan or init`;
  runtime.error(`Fatal error in Vibe Check CLI: ${reason}`);
  return 2;
}

async function runScanOperation(
  commandArgs: readonly string[],
  runtime: CliRuntime
): Promise<0 | 1 | 2 | 3> {
  try {
    const startupCwd = runtime.cwd();
    const rootArgument = commandArgs[0]?.startsWith("-") === false ? commandArgs[0] : undefined;
    const projectRoot = resolve(startupCwd, rootArgument ?? ".");
    const scanArgs = rootArgument === undefined ? commandArgs : commandArgs.slice(1);
    const outcome = await runtime.scan(projectRoot, scanArgs);

    return SCAN_OUTCOME_EXIT_CODE[outcome];
  } catch (err: unknown) {
    runtime.error(`Fatal error in quality scan: ${errorMessage(err)}`);
    if (err instanceof CliUsageError || err instanceof ProjectConfigError) return 3;
    if (err instanceof ScannerOperationalInputError) return 2;
    return qualityScanErrorExitCode(err);
  }
}

async function runInitOperation(
  commandArgs: readonly string[],
  runtime: CliRuntime
): Promise<0 | 3> {
  try {
    const parsed = parseInitArguments(commandArgs);
    if (parsed.help) {
      printInitHelp(runtime.output);
      return 0;
    }

    const projectRoot = resolve(runtime.cwd(), parsed.projectRoot ?? ".");
    const result = await runtime.init(projectRoot);
    runtime.output(`Config: ${result.configPath}`);
    runtime.output(`Schema: ${result.schemaPath}`);
    runtime.output(`State: ${result.state}`);
    return 0;
  } catch (err: unknown) {
    runtime.error(`Configuration initialization failed: ${errorMessage(err)}`);
    return 3;
  }
}

function parseInitArguments(commandArgs: readonly string[]): {
  readonly help: boolean;
  readonly projectRoot?: string;
} {
  let help = false;
  let projectRoot: string | undefined;
  for (const argument of commandArgs) {
    if (argument === "--help") {
      if (help) throw new CliUsageError("--help may only be provided once");
      help = true;
      continue;
    }
    if (argument.startsWith("-")) {
      throw new CliUsageError(`unknown init option: ${argument}`);
    }
    if (projectRoot !== undefined) {
      throw new CliUsageError("init accepts zero or one project root");
    }
    projectRoot = argument;
  }
  return projectRoot === undefined ? { help } : { help, projectRoot };
}

function printRootHelp(output: (message: string) => void): void {
  output(`Vibe Check Quality Observability

Usage: bun run product:cli -- <command> [project-root] [options]

Commands:
  scan [project-root]  Observe project quality with the selected configuration
  init [project-root]  Safely materialize a complete neutral project policy

Workflow:
  Ungated scans can observe with the neutral default when no project config exists.
  Explicit --config or the fixed .vibe-check/config.json selects a complete policy.
  Every quality gate requires a complete file-backed policy.
  Initialization preserves existing targets and prepares fixed-path discovery.

Run a command with --help for operation-specific details.`);
}

function printInitHelp(output: (message: string) => void): void {
  output(`Vibe Check project configuration initialization

Usage: bun run product:cli -- init [project-root]

Ensures the complete neutral default file set is present:
  <project-root>/.vibe-check/config.json
  <project-root>/.vibe-check/config.schema.json

The existing normal .vibe-check directory is reused. Missing target files are
created exclusively; existing normal target files and other entries are preserved.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await runProductCli());
}
