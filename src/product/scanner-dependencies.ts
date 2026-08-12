import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { isStringArray } from "./foundation/src/type-guards.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DUPLICATION_MAX_CONCURRENCY = 4;
const FUNCTION_ARGS = Object.freeze(["-m", "lizard"] as const);
const FUNCTION_AVAILABILITY_ARGS = Object.freeze([
  ...FUNCTION_ARGS,
  "--version"
] as const);

type ScannerArgsInputName =
  | "VIBE_CHECK_JSCPD_ARGS"
  | "VIBE_CHECK_SCC_ARGS";

type RequiredScannerCommandInputName =
  | "VIBE_CHECK_LIZARD_CMD"
  | "VIBE_CHECK_SCC_CMD";

export interface FileScannerDependency {
  readonly args: readonly string[];
  readonly availabilityArgs: readonly string[];
  readonly executable: string;
}

export interface FunctionScannerDependency {
  readonly args: readonly string[];
  readonly availabilityArgs: readonly string[];
  readonly executable: string;
}

export interface DuplicationScannerDependency {
  readonly args: readonly string[];
  readonly availabilityArgs: readonly string[];
  readonly executable: string;
  readonly maxConcurrency: number;
}

export interface ScannerDependencySnapshot {
  readonly duplication: DuplicationScannerDependency;
  readonly file: FileScannerDependency;
  readonly function: FunctionScannerDependency;
}

export class ScannerOperationalInputError extends Error {
  readonly code = "invalid-scanner-operational-input";
  readonly inputName: ScannerArgsInputName | RequiredScannerCommandInputName;

  constructor(
    inputName: ScannerArgsInputName | RequiredScannerCommandInputName,
    reason: "invalid-args" | "missing-command" = "invalid-args"
  ) {
    super(
      reason === "missing-command"
        ? `${inputName} is missing; the package host must provide an explicit scanner binding`
        : `${inputName} must be a JSON array of strings; provide a valid array or unset the variable`
    );
    this.name = "ScannerOperationalInputError";
    this.inputName = inputName;
  }
}

export function resolveScannerDependencySnapshot(
  env: Readonly<Record<string, string | undefined>>,
  platform: NodeJS.Platform
): ScannerDependencySnapshot {
  const {
    VIBE_CHECK_JSCPD_ARGS: jscpdArgsInput,
    VIBE_CHECK_JSCPD_CMD: jscpdCommandInput,
    VIBE_CHECK_LIZARD_CMD: lizardCommandInput,
    VIBE_CHECK_PINNED_LIZARD_CMD: pinnedLizardCommandInput,
    VIBE_CHECK_PINNED_SCC_CMD: pinnedSccCommandInput,
    VIBE_CHECK_SCC_ARGS: sccArgsInput,
    VIBE_CHECK_SCC_CMD: sccCommandInput
  } = env;
  const fileArgs = parseAdditionalArgs("VIBE_CHECK_SCC_ARGS", sccArgsInput);
  const duplicationArgs = parseAdditionalArgs(
    "VIBE_CHECK_JSCPD_ARGS",
    jscpdArgsInput
  );
  const jscpdBinary = platform === "win32" ? "jscpd.cmd" : "jscpd";
  const lizardCommand = requireScannerCommand(
    "VIBE_CHECK_LIZARD_CMD",
    lizardCommandInput,
    pinnedLizardCommandInput
  );
  const sccCommand = requireScannerCommand(
    "VIBE_CHECK_SCC_CMD",
    sccCommandInput,
    pinnedSccCommandInput
  );

  return Object.freeze({
    duplication: Object.freeze({
      args: duplicationArgs,
      availabilityArgs: Object.freeze([...duplicationArgs, "--version"]),
      executable: jscpdCommandInput ||
        resolve(REPO_ROOT, "node_modules", ".bin", jscpdBinary),
      maxConcurrency: DUPLICATION_MAX_CONCURRENCY
    }),
    file: Object.freeze({
      args: fileArgs,
      availabilityArgs: Object.freeze([...fileArgs, "--version"]),
      executable: sccCommand
    }),
    function: Object.freeze({
      args: FUNCTION_ARGS,
      availabilityArgs: FUNCTION_AVAILABILITY_ARGS,
      executable: lizardCommand
    })
  });
}

function requireScannerCommand(
  inputName: RequiredScannerCommandInputName,
  override: string | undefined,
  pinnedBinding: string | undefined
): string {
  if (override) return override;
  if (pinnedBinding) return pinnedBinding;
  throw new ScannerOperationalInputError(inputName, "missing-command");
}

function parseAdditionalArgs(
  inputName: ScannerArgsInputName,
  raw: string | undefined
): readonly string[] {
  if (!raw) return Object.freeze([]);

  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    throw new ScannerOperationalInputError(inputName);
  }
  if (!isStringArray(value)) {
    throw new ScannerOperationalInputError(inputName);
  }
  return Object.freeze([...value]);
}
