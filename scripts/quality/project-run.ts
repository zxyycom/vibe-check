import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import projectDefinition from "./project-definition.ts";
import { run as packageRun, type RunResult } from "../../src/product/run/index.ts";
import type { RunControls } from "../../src/product/definition/project.ts";

/** The repository's bound Project Run. Callers cannot replace its definition. */
export type RepositoryRunControls = Readonly<Partial<Pick<RunControls,
  "changedFiles" | "comparison" | "effects" | "operationalDependencies" | "signal"
>>>;

export async function run(controls: RepositoryRunControls = {}): Promise<RunResult> {
  return packageRun(projectDefinition, {
    ...controls,
    projectRoot: resolve(dirname(fileURLToPath(import.meta.url)), "../..")
  });
}
