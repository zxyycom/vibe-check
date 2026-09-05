import type { ProcessInvocation } from "../../../process-execution/command.ts";
import type { Check } from "@zxyycom/vibe-check";

import type { ProjectGatePreset } from "../runtime/catalog.ts";
import {
  createProcessCheck,
  createProcessCheckWithFailureProjection,
  createProcessCheckWithDataDependency,
  type ProcessCheckDataDependency,
  type ProcessFailureProjection
} from "./process/process.ts";
import type { ProjectGateEntry } from "../runtime/entries.ts";

/** A process Check is plain, dependency-backed, or failure-projecting, never both adapters. */
type ProcessEntryAdapter<Data extends object> =
  | {
      readonly dataDependency?: never;
      readonly failureProjection?: never;
    }
  | {
      readonly dataDependency: ProcessCheckDataDependency<Data>;
      readonly failureProjection?: never;
    }
  | {
      readonly dataDependency?: never;
      readonly failureProjection: ProcessFailureProjection;
    };

/** Builds one ordinary process-backed Gate entry from its already-resolved invocation. */
export function createProjectGateProcessEntry<Data extends object = object>(
  input: Readonly<{
    readonly invocation: ProcessInvocation;
    readonly checkId: string;
    readonly displayName: string;
    readonly mutex?: readonly string[];
    readonly presets: readonly ProjectGatePreset[];
    readonly required: boolean;
    readonly timeoutMs?: number;
  }> &
    ProcessEntryAdapter<Data>
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
      "A process Check cannot combine dependency and structured failure adapters"
    );
  }
  const descriptor = {
    args: invocation.args,
    checkId,
    command: invocation.command,
    cwd: invocation.cwd,
    displayName,
    ...(invocation.env === undefined ? {} : { environment: definedEnvironment(invocation.env) }),
    ...(timeoutMs === undefined ? {} : { timeoutMs })
  };
  let check: Check;
  if (dataDependency !== undefined) {
    check = createProcessCheckWithDataDependency(descriptor, dataDependency);
  } else if (failureProjection !== undefined) {
    check = createProcessCheckWithFailureProjection(descriptor, failureProjection);
  } else {
    check = createProcessCheck(descriptor);
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

function definedEnvironment(environment: NodeJS.ProcessEnv): Readonly<Record<string, string>> {
  const values: Record<string, string> = {};
  for (const [name, value] of Object.entries(environment)) {
    if (value !== undefined) values[name] = value;
  }
  return Object.freeze(values);
}
