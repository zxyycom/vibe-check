import type { ProcessInvocation } from "../../../process-execution/command.ts";
import { PLAIN_TEXT_PROCESS_ENV } from "../../../process-execution/execution.ts";
import {
  commandCheck,
  type AfterCommandContext,
  type Check,
  type CheckDependencies
} from "@zxyycom/vibe-check";

import type { ProjectGatePreset } from "../runtime/catalog.ts";
import type { ProcessFailureProjection } from "./process/failure-projection.ts";
import type { ProjectGateEntry } from "../runtime/entries.ts";
import { settleProjectGateCommand } from "./command-result.ts";

const DEFAULT_GATE_COMMAND_TIMEOUT_MS = 120_000;
const GATE_COMMAND_OUTPUT_BYTE_LIMIT = 64 * 1024 * 1024;

/** One direct dependency that supplies validated environment variables to a Gate command. */
export interface GateCommandDataDependency<Data extends object> {
  readonly checkId: string;
  readonly environment: (data: Data) => Readonly<Record<string, string>>;
  readonly parseData: (data: unknown) => Data;
}

/** A Gate command is plain, dependency-backed, or failure-projecting, never both adapters. */
type CommandEntryAdapter<Data extends object> =
  | {
      readonly dataDependency?: never;
      readonly failureProjection?: never;
    }
  | {
      readonly dataDependency: GateCommandDataDependency<Data>;
      readonly failureProjection?: never;
    }
  | {
      readonly dataDependency?: never;
      readonly failureProjection: ProcessFailureProjection;
    };

/** Builds one Product commandCheck entry from one resolved Gate invocation. */
export function createProjectGateCommandEntry<Data extends object = object>(
  input: Readonly<{
    readonly invocation: ProcessInvocation;
    readonly checkId: string;
    readonly displayName: string;
    readonly mutex?: readonly string[];
    readonly presets: readonly ProjectGatePreset[];
    readonly required: boolean;
    readonly timeoutMs?: number;
  }> &
    CommandEntryAdapter<Data>
): ProjectGateEntry {
  const {
    checkId,
    dataDependency,
    displayName,
    failureProjection,
    invocation,
    mutex,
    presets,
    required,
    timeoutMs
  } = input;
  if (dataDependency !== undefined && failureProjection !== undefined) {
    throw new TypeError(
      "A Gate command Check cannot combine dependency and structured failure adapters"
    );
  }
  const invocationEnvironmentOverrides = definedEnvironmentOverrides(invocation.env);
  const environmentOverrides = Object.freeze({
    ...invocationEnvironmentOverrides,
    ...PLAIN_TEXT_PROCESS_ENV
  });
  const commonInput = {
    arguments: invocation.args,
    checkId,
    displayName,
    executable: invocation.command,
    output: { mode: "transcript" as const },
    outputByteLimit: GATE_COMMAND_OUTPUT_BYTE_LIMIT,
    timeoutMs: timeoutMs ?? DEFAULT_GATE_COMMAND_TIMEOUT_MS,
    workingDirectory: invocation.cwd
  };
  const settle = (context: AfterCommandContext) =>
    settleProjectGateCommand({
      command: invocation.command,
      context,
      ...(failureProjection === undefined ? {} : { failureProjection })
    });
  let check: Check;
  if (dataDependency !== undefined) {
    check = commandCheck({
      ...commonInput,
      dependsOn: [dataDependency.checkId],
      resolveEnvironment: (context) =>
        resolveDependencyEnvironment(
          context.dependencies,
          dataDependency,
          invocationEnvironmentOverrides,
          environmentOverrides
        ),
      afterCommand: { execute: settle }
    });
  } else {
    check = commandCheck({
      ...commonInput,
      environment: inheritedEnvironment(environmentOverrides),
      afterCommand: { execute: settle }
    });
  }
  return createProjectGateCommonEntry({
    check,
    ...(mutex === undefined ? {} : { mutex }),
    presets,
    required
  });
}

/** Owns Gate selection metadata and optional mutex freezing for an already constructed Check. */
export function createProjectGateCommonEntry(
  input: Readonly<{
    readonly check: Check;
    readonly mutex?: readonly string[];
    readonly presets: readonly ProjectGatePreset[];
    readonly required: boolean;
  }>
): ProjectGateEntry {
  const { check, mutex, presets, required } = input;
  return Object.freeze({
    check:
      mutex === undefined ? check : Object.freeze({ ...check, mutex: Object.freeze([...mutex]) }),
    presets: Object.freeze([...presets]),
    required
  });
}

/** Preserves the old Gate runner's inherited environment while retaining explicit invocation overrides. */
function inheritedEnvironment(overrides: Readonly<Record<string, string>>) {
  return Object.freeze({
    mode: "inherit" as const,
    ...(Object.keys(overrides).length === 0 ? {} : { overrides })
  });
}

/** Reads the direct provider only at execution time and rejects malformed, failed, or colliding input. */
function resolveDependencyEnvironment<Data extends object>(
  dependencies: CheckDependencies,
  dependency: GateCommandDataDependency<Data>,
  invocationOverrides: Readonly<Record<string, string>>,
  baseOverrides: Readonly<Record<string, string>>
) {
  const read = dependencies.get(dependency.checkId);
  if (!read.ok || read.status !== "passed") {
    throw new TypeError("Gate command dependency is unavailable");
  }
  const variables = dependency.environment(dependency.parseData(read.data));
  if (
    !isStringRecord(variables) ||
    Object.keys(variables).some((name) => Object.hasOwn(invocationOverrides, name))
  ) {
    throw new TypeError("Gate command dependency environment is invalid");
  }
  return inheritedEnvironment(
    Object.freeze({ ...baseOverrides, ...variables, ...PLAIN_TEXT_PROCESS_ENV })
  );
}

function definedEnvironmentOverrides(
  environment: NodeJS.ProcessEnv | undefined
): Readonly<Record<string, string>> {
  const values: Record<string, string> = {};
  for (const [name, value] of Object.entries(environment ?? {})) {
    if (value !== undefined) values[name] = value;
  }
  return Object.freeze(values);
}

function isStringRecord(value: unknown): value is Readonly<Record<string, string>> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}
