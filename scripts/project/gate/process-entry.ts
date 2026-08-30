import type { ProcessInvocation } from "../../process-execution/command.ts";
import type { PreparedPackageCandidate } from "../../package/candidate/prepare.ts";
import type { Check } from "vibe-check";

import type { ProjectGateProfile, ProjectGateTag } from "./catalog.ts";
import {
  createProcessCheck,
  createProcessCheckWithDataDependency,
  type ProcessCheckDataDependency
} from "./check-execution/process.ts";
import type { ProjectGateEntry } from "./entries.ts";
import type { ExternalConsumerMaterialLease } from "./external-consumer-material-check.ts";

/** Runtime material bound to one Project Gate invocation. */
export interface ProjectGateRuntime {
  readonly externalConsumerLease: ExternalConsumerMaterialLease;
  readonly invocationLogDirectory: string;
  readonly preparedCandidate: PreparedPackageCandidate;
}

/** Builds one ordinary process-backed Gate entry from its already-resolved invocation. */
export function createProjectGateProcessEntry<Data extends object = object>(
  input: Readonly<{
    readonly dataDependency?: ProcessCheckDataDependency<Data>;
    readonly invocation: ProcessInvocation;
    readonly checkId: string;
    readonly displayName: string;
    readonly mutex?: readonly string[];
    readonly profiles: readonly ProjectGateProfile[];
    readonly tags: readonly ProjectGateTag[];
    readonly runtime: ProjectGateRuntime;
    readonly timeoutMs?: number;
  }>
): ProjectGateEntry {
  const {
    checkId,
    dataDependency,
    displayName,
    invocation,
    mutex,
    profiles,
    runtime,
    tags,
    timeoutMs
  } = input;
  const descriptor = {
    args: invocation.args,
    checkId,
    command: invocation.command,
    cwd: invocation.cwd,
    displayName,
    ...(invocation.env === undefined ? {} : { environment: definedEnvironment(invocation.env) }),
    ...(timeoutMs === undefined ? {} : { timeoutMs })
  };
  const check =
    dataDependency === undefined
      ? createProcessCheck(descriptor, runtime.invocationLogDirectory)
      : createProcessCheckWithDataDependency(
          descriptor,
          runtime.invocationLogDirectory,
          dataDependency
        );
  return Object.freeze({
    check:
      mutex === undefined ? check : Object.freeze({ ...check, mutex: Object.freeze([...mutex]) }),
    profiles,
    tags
  });
}

/** Adds shared required/full selection metadata to a non-process Gate Check. */
export function createProjectGateCommonEntry(
  check: Check,
  profiles: readonly ProjectGateProfile[],
  tags: readonly ProjectGateTag[],
  mutex?: readonly string[]
): ProjectGateEntry {
  return Object.freeze({
    check:
      mutex === undefined ? check : Object.freeze({ ...check, mutex: Object.freeze([...mutex]) }),
    profiles,
    tags
  });
}

function definedEnvironment(environment: NodeJS.ProcessEnv): Readonly<Record<string, string>> {
  const values: Record<string, string> = {};
  for (const [name, value] of Object.entries(environment)) {
    if (value !== undefined) values[name] = value;
  }
  return Object.freeze(values);
}
