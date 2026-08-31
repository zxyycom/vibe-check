import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  run as packageRun,
  type CheckAggregation,
  type RunControls,
  type RunResult
} from "@zxyycom/vibe-check";
import type { PreparedPackageCandidate } from "../../../package/candidate/prepare.ts";

import { selectionFromFlags, type ProjectGateSelection } from "./controls.ts";
import { createProjectGateDefinition, createProjectGateEntries } from "../definition.ts";
import { createExternalConsumerMaterialLease } from "../checks/external-consumer-material.ts";
import type { ProjectGateEntry } from "./entries.ts";
import { projectGateEligibleCheckIds } from "./eligibility.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

/** The installed public entry selected by this private consumer. */
export const resolvedEntryPath = fileURLToPath(import.meta.resolve("@zxyycom/vibe-check"));

export type ProjectGateRunControls = Readonly<
  Pick<RunControls, "flags" | "signal"> & {
    readonly invocationLogDirectory: string;
    readonly preparedCandidate: PreparedPackageCandidate;
  }
>;

/** Binds one fresh project Definition to one adapter-owned invocation log root. */
export async function runProjectGate(controls: ProjectGateRunControls): Promise<RunResult> {
  const selection = selectionFromFlags(controls.flags ?? []);
  if (selection === undefined)
    throw new TypeError("Project Gate controls failed closed validation");

  const externalConsumerLease = createExternalConsumerMaterialLease();
  const entries = createProjectGateEntries({
    externalConsumerLease,
    invocationLogDirectory: controls.invocationLogDirectory,
    preparedCandidate: controls.preparedCandidate
  });
  try {
    return await packageRun(createProjectGateDefinition(entries, selection), {
      checkAggregation: projectGateAggregation(entries, selection),
      flags: controls.flags,
      outputs: projectGateOutputOverrides(controls.invocationLogDirectory),
      projectRoot: repositoryRoot,
      signal: controls.signal
    });
  } finally {
    externalConsumerLease.cleanup();
  }
}

/** Publishes standard machine facts beside the Gate diagnostic log for this invocation. */
export function projectGateOutputOverrides(invocationLogDirectory: string) {
  const directory = relative(repositoryRoot, invocationLogDirectory);
  return Object.freeze({
    diagnosticLogging: { directory, enabled: true },
    machinePublication: { directory, enabled: true }
  });
}

/** Binds the exact eligible Check IDs to the required/full aggregation semantics. */
export function projectGateAggregation(
  entries: readonly ProjectGateEntry[],
  selection: ProjectGateSelection
): CheckAggregation {
  return Object.freeze({
    checks: projectGateEligibleCheckIds(entries, selection),
    empty: "failed",
    mode: "all",
    notApplicable: "fail",
    unavailable: "propagate"
  });
}
