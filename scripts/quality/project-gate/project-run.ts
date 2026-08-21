import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  run as packageRun,
  type CheckAggregation,
  type RunControls,
  type RunResult
} from "vibe-check";

import { projectGateEligibleCheckIds } from "../../project-gate/eligibility.ts";
import { selectionFromFlags, type ProjectGateSelection } from "../../project-gate/controls.ts";
import { createProjectGateDefinition } from "./project-definition.ts";

/** The installed public entry selected by this private consumer. */
export const resolvedEntryPath = fileURLToPath(import.meta.resolve("vibe-check"));

export type ProjectGateRunControls = Readonly<
  Pick<RunControls, "flags" | "signal"> & { readonly invocationLogDirectory: string }
>;

/** Binds one fresh project Definition to one adapter-owned invocation log root. */
export async function runProjectGate(controls: ProjectGateRunControls): Promise<RunResult> {
  const selection = selectionFromFlags(controls.flags ?? []);
  if (selection === undefined)
    throw new TypeError("Project Gate controls failed closed validation");

  return packageRun(createProjectGateDefinition(controls.invocationLogDirectory), {
    checkAggregation: projectGateAggregation(selection),
    flags: controls.flags,
    projectRoot: repositoryRoot(),
    signal: controls.signal
  });
}

/** Binds the exact eligible Check IDs to the required/full aggregation semantics. */
export function projectGateAggregation(selection: ProjectGateSelection): CheckAggregation {
  return Object.freeze({
    checks: projectGateEligibleCheckIds(selection),
    empty: "failed",
    mode: "all",
    notApplicable: "fail",
    unavailable: "propagate"
  });
}

function repositoryRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
}
