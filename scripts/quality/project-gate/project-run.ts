import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { run as packageRun, type RunControls, type RunResult } from "vibe-check";

import { createProjectGateDefinition } from "./project-definition.ts";

/** The installed public entry selected by this private consumer. */
export const resolvedEntryPath = fileURLToPath(import.meta.resolve("vibe-check"));

export type ProjectGateRunControls = Readonly<
  Pick<RunControls, "flags" | "signal"> & { readonly invocationLogDirectory: string }
>;

/** Binds one fresh project Definition to one adapter-owned invocation log root. */
export async function runProjectGate(controls: ProjectGateRunControls): Promise<RunResult> {
  return packageRun(createProjectGateDefinition(controls.invocationLogDirectory), {
    flags: controls.flags,
    projectRoot: repositoryRoot(),
    signal: controls.signal
  });
}

function repositoryRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
}
