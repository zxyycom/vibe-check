import { defineConfig, type ProjectDefinition } from "vibe-check";

import { PROJECT_GATE_CATALOG } from "../../project-gate/catalog.ts";
import { createProcessCheck } from "./process-check.ts";

/** Creates the repository's complete process Check catalog without a Gate policy. */
export function createProjectGateDefinition(invocationLogDirectory: string): ProjectDefinition {
  return defineConfig({
    checks: PROJECT_GATE_CATALOG.map((descriptor) =>
      createProcessCheck(descriptor, invocationLogDirectory)
    ),
    effects: {
      cache: { enabled: false },
      output: { enabled: false },
      progress: { enabled: true }
    },
    scheduler: { maxParallel: 4 }
  });
}
