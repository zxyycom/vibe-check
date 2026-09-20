import {
  snapshotClosedArray,
  snapshotClosedPolicyRecord,
  snapshotClosedRecord,
  snapshotExactClosedRecord
} from "../../data-boundary/closed-values.ts";
import { isNonEmptyString, isPositiveSafeInteger } from "../../data-boundary/value-shapes.ts";
import type {
  AfterCommand,
  CommandEnvironmentResolver,
  ResolvedCommandCheckOptions
} from "./contract.ts";

const COMMAND_INPUT_OPTIONAL_KEYS = [
  "admissionPriority",
  "afterCommand",
  "arguments",
  "checks",
  "dependsOn",
  "enabledByFlags",
  "environment",
  "maxParallel",
  "mutex",
  "observes",
  "omitQuietPassedRow",
  "output",
  "resourceClaims",
  "resolveEnvironment",
  "workingDirectory"
] as const;
const COMMAND_INPUT_REQUIRED_KEYS = [
  "checkId",
  "displayName",
  "executable",
  "outputByteLimit",
  "timeoutMs"
] as const;
const RESOLVED_OPTION_KEYS = [
  "arguments",
  "environment",
  "executable",
  "output",
  "outputByteLimit",
  "timeoutMs",
  "workingDirectory"
] as const;

/** Snapshots one closed constructor input and materializes every command-owned omission. */
export function resolveCommandCheckInput(input: unknown):
  | Readonly<{
      readonly afterCommand: AfterCommand | undefined;
      readonly options: ResolvedCommandCheckOptions;
      readonly resolveEnvironment: CommandEnvironmentResolver | undefined;
    }>
  | undefined {
  const snapshot = snapshotClosedPolicyRecord(input, {
    optional: COMMAND_INPUT_OPTIONAL_KEYS,
    required: COMMAND_INPUT_REQUIRED_KEYS
  });
  if (snapshot === undefined) return undefined;
  const afterCommand = resolveAfterCommand(snapshot.afterCommand);
  const environmentResolver = resolveEnvironmentResolver(snapshot.resolveEnvironment);
  if (
    (snapshot.afterCommand !== undefined && afterCommand === undefined) ||
    (snapshot.resolveEnvironment !== undefined && environmentResolver === undefined) ||
    (snapshot.environment !== undefined && snapshot.resolveEnvironment !== undefined)
  ) {
    return undefined;
  }
  const options = resolveCommandOptions(snapshot);
  return options === undefined
    ? undefined
    : Object.freeze({
        afterCommand,
        options,
        resolveEnvironment: environmentResolver
      });
}

/** Resolves one callback-produced environment to the same complete closed shape as static input. */
export function resolveCommandCheckEnvironment(
  value: unknown
): ResolvedCommandCheckOptions["environment"] | undefined {
  if (value === undefined) return undefined;
  return resolveEnvironment(value);
}

/** Revalidates the complete resolved shape before execution. */
export function isValidResolvedCommandCheckOptions(
  value: unknown
): value is ResolvedCommandCheckOptions {
  const options = snapshotExactClosedRecord(value, RESOLVED_OPTION_KEYS);
  return (
    options !== undefined &&
    validCommandText(options.executable) &&
    validArguments(options.arguments) &&
    validWorkingDirectory(options.workingDirectory) &&
    validEnvironment(options.environment) &&
    validOutput(options.output) &&
    isPositiveSafeInteger(options.timeoutMs) &&
    isPositiveSafeInteger(options.outputByteLimit)
  );
}

function resolveCommandOptions(
  input: Readonly<Record<string, unknown>>
): ResolvedCommandCheckOptions | undefined {
  if (!isNonEmptyString(input.checkId) || !isNonEmptyString(input.displayName)) return undefined;
  const options = resolveCommandExecutionOptions(input);
  if (options === undefined) return undefined;
  return isValidResolvedCommandCheckOptions(options) ? options : undefined;
}

function resolveAfterCommand(value: unknown): AfterCommand | undefined {
  if (value === undefined) return undefined;
  const afterCommand = snapshotClosedPolicyRecord(value, {
    optional: ["parseData"],
    required: ["execute"]
  });
  if (afterCommand === undefined || !isAfterCommandExecution(afterCommand.execute))
    return undefined;
  if (afterCommand.parseData !== undefined && !isCheckDataParser(afterCommand.parseData)) {
    return undefined;
  }
  return Object.freeze({
    execute: afterCommand.execute,
    ...(afterCommand.parseData === undefined ? {} : { parseData: afterCommand.parseData })
  });
}

function resolveEnvironmentResolver(value: unknown): CommandEnvironmentResolver | undefined {
  return isCommandEnvironmentResolver(value) ? value : undefined;
}

function isAfterCommandExecution(value: unknown): value is AfterCommand["execute"] {
  return typeof value === "function";
}

function isCheckDataParser(value: unknown): value is NonNullable<AfterCommand["parseData"]> {
  return typeof value === "function";
}

function isCommandEnvironmentResolver(value: unknown): value is CommandEnvironmentResolver {
  return typeof value === "function";
}

/** Resolves command-owned execution fields after the ordinary Check identity is known valid. */
function resolveCommandExecutionOptions(
  input: Readonly<Record<string, unknown>>
): ResolvedCommandCheckOptions | undefined {
  const argumentsSnapshot = resolveArguments(input.arguments);
  const environment = resolveEnvironment(input.environment);
  const output = resolveOutput(input.output);
  const workingDirectory = resolveWorkingDirectory(input.workingDirectory);
  if (
    !validCommandText(input.executable) ||
    argumentsSnapshot === undefined ||
    environment === undefined ||
    output === undefined ||
    workingDirectory === undefined ||
    !isPositiveSafeInteger(input.timeoutMs) ||
    !isPositiveSafeInteger(input.outputByteLimit)
  ) {
    return undefined;
  }
  return Object.freeze({
    arguments: argumentsSnapshot,
    environment,
    executable: input.executable,
    output,
    outputByteLimit: input.outputByteLimit,
    timeoutMs: input.timeoutMs,
    workingDirectory
  });
}

function resolveArguments(value: unknown): readonly string[] | undefined {
  if (value === undefined) return Object.freeze([]);
  const argumentsSnapshot = snapshotClosedArray(value);
  if (argumentsSnapshot === undefined) return undefined;
  const argumentsCopy: string[] = [];
  for (const argument of argumentsSnapshot) {
    if (!validArgument(argument)) return undefined;
    argumentsCopy.push(argument);
  }
  return Object.freeze(argumentsCopy);
}

function validArguments(value: unknown): boolean {
  const argumentsSnapshot = snapshotClosedArray(value);
  return argumentsSnapshot?.every(validArgument) === true;
}

function validArgument(value: unknown): value is string {
  return typeof value === "string" && !value.includes("\0");
}

function resolveWorkingDirectory(value: unknown): string | null | undefined {
  if (value === undefined) return null;
  return validCommandText(value) ? value : undefined;
}

function validWorkingDirectory(value: unknown): value is string | null {
  return value === null || validCommandText(value);
}

function validCommandText(value: unknown): value is string {
  return isNonEmptyString(value) && !value.includes("\0");
}

function resolveEnvironment(
  value: unknown
): ResolvedCommandCheckOptions["environment"] | undefined {
  if (value === undefined) return Object.freeze({ mode: "exact", variables: Object.freeze({}) });
  const environment = snapshotClosedRecord(value);
  if (environment === undefined || typeof environment.mode !== "string") return undefined;
  if (environment.mode === "exact") return resolveExactEnvironment(environment);
  if (environment.mode === "inherit") return resolveInheritedEnvironment(environment);
  return undefined;
}

function resolveExactEnvironment(
  environment: Readonly<Record<string, unknown>>
): ResolvedCommandCheckOptions["environment"] | undefined {
  const exact = snapshotClosedPolicyRecord(environment, {
    optional: ["variables"],
    required: ["mode"]
  });
  if (exact === undefined) return undefined;
  const variables = Object.hasOwn(exact, "variables")
    ? resolveExactVariables(exact.variables)
    : Object.freeze({});
  if (variables === undefined) return undefined;
  return Object.freeze({ mode: "exact", variables });
}

function resolveInheritedEnvironment(
  environment: Readonly<Record<string, unknown>>
): ResolvedCommandCheckOptions["environment"] | undefined {
  const inherited = snapshotClosedPolicyRecord(environment, {
    optional: ["overrides"],
    required: ["mode"]
  });
  if (inherited === undefined) return undefined;
  const overrides = Object.hasOwn(inherited, "overrides")
    ? resolveOverrides(inherited.overrides)
    : Object.freeze({});
  if (overrides === undefined) return undefined;
  return Object.freeze({ mode: "inherit", overrides });
}

function validEnvironment(value: unknown): boolean {
  const environment = snapshotClosedRecord(value);
  if (environment === undefined || typeof environment.mode !== "string") return false;
  if (environment.mode === "exact") {
    const exact = snapshotExactClosedRecord(environment, ["mode", "variables"]);
    return exact !== undefined && validVariableMap(exact.variables, false);
  }
  if (environment.mode === "inherit") {
    const inherited = snapshotExactClosedRecord(environment, ["mode", "overrides"]);
    return inherited !== undefined && validVariableMap(inherited.overrides, true);
  }
  return false;
}

function resolveExactVariables(value: unknown): Readonly<Record<string, string>> | undefined {
  const variables = snapshotClosedRecord(value);
  if (variables === undefined) return undefined;
  const copied: Record<string, string> = {};
  for (const [name, variable] of Object.entries(variables)) {
    if (name.includes("\0") || typeof variable !== "string" || variable.includes("\0"))
      return undefined;
    Object.defineProperty(copied, name, {
      configurable: false,
      enumerable: true,
      value: variable,
      writable: false
    });
  }
  return Object.freeze(copied);
}

function resolveOverrides(value: unknown): Readonly<Record<string, string | null>> | undefined {
  const overrides = snapshotClosedRecord(value);
  if (overrides === undefined) return undefined;
  const copied: Record<string, string | null> = {};
  for (const [name, override] of Object.entries(overrides)) {
    if (
      name.includes("\0") ||
      (override !== null && (typeof override !== "string" || override.includes("\0")))
    ) {
      return undefined;
    }
    Object.defineProperty(copied, name, {
      configurable: false,
      enumerable: true,
      value: override,
      writable: false
    });
  }
  return Object.freeze(copied);
}

function validVariableMap(value: unknown, acceptsNull: boolean): boolean {
  const variables = snapshotClosedRecord(value);
  return variables !== undefined && validVariableEntries(variables, acceptsNull);
}

function validVariableEntries(
  variables: Readonly<Record<string, unknown>>,
  acceptsNull: boolean
): boolean {
  return Object.entries(variables).every(
    ([name, variable]) =>
      !name.includes("\0") &&
      (typeof variable === "string" ? !variable.includes("\0") : acceptsNull && variable === null)
  );
}

function resolveOutput(value: unknown): ResolvedCommandCheckOptions["output"] | undefined {
  if (value === undefined) return Object.freeze({ mode: "discard" });
  const output = snapshotExactClosedRecord(value, ["mode"]);
  if (output === undefined) return undefined;
  if (output.mode !== "discard" && output.mode !== "transcript") return undefined;
  return Object.freeze({ mode: output.mode });
}

function validOutput(value: unknown): boolean {
  const output = snapshotExactClosedRecord(value, ["mode"]);
  return output !== undefined && (output.mode === "discard" || output.mode === "transcript");
}
