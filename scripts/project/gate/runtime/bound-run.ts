import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { run as packageRun, type RunControls, type RunResult } from "@zxyycom/vibe-check";
import type { PreparedPackageCandidate } from "../../../package/candidate/prepare.ts";

import { selectionFromFlags } from "./controls.ts";
import {
  afterGate,
  createProjectGateDefinition,
  createProjectGateEntries,
  projectGateAggregation,
  projectGateOutputOverrides
} from "../definition.ts";
import { createExternalConsumerMaterialLease } from "../checks/external-consumer-material.ts";

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
export async function run(controls: ProjectGateRunControls): Promise<RunResult> {
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
    return await packageRun(createProjectGateDefinition(entries), {
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

/** Projects central post-processing configuration with this candidate-bound Run. */
export { afterGate };
