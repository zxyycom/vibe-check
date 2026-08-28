import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import projectDefinition from "./definition.ts";
import { run as packageRun, type RunControls, type RunResult } from "vibe-check";

/** The repository's bound Project Run. Callers cannot replace its definition. */
export type RepositoryRunControls = Readonly<Partial<Pick<RunControls, "outputs" | "signal">>>;

export async function run(controls: RepositoryRunControls = {}): Promise<RunResult> {
  return packageRun(projectDefinition, {
    ...controls,
    projectRoot: resolve(dirname(fileURLToPath(import.meta.url)), "../../..")
  });
}
