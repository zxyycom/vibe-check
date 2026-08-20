import { defineConfig, type DecisionPolicy, type ProjectDefinition } from "vibe-check";

import { PROJECT_GATE_CATALOG } from "../../project-gate/catalog.ts";
import { GATE_COMMAND_FAILURE_RECORD_TYPE, createProcessCheck } from "./process-check.ts";

export const PROJECT_GATE_POLICY_NAME = "repository-gate";

export function createProjectGateDefinition(invocationLogDirectory: string): ProjectDefinition {
  return defineConfig({
    checks: PROJECT_GATE_CATALOG.map((descriptor) =>
      createProcessCheck(descriptor, invocationLogDirectory)
    ),
    effects: {
      cache: { enabled: false },
      logs: { enabled: false },
      output: { enabled: false },
      progress: { enabled: true }
    },
    policies: {
      [PROJECT_GATE_POLICY_NAME]: repositoryGatePolicy()
    },
    scheduler: { maxParallel: 4 },
    selectedPolicy: PROJECT_GATE_POLICY_NAME
  });
}

function repositoryGatePolicy(): DecisionPolicy {
  const policy: DecisionPolicy = {
    policyId: PROJECT_GATE_POLICY_NAME,
    references: [],
    acceptance: [],
    views: [
      {
        viewId: "gate-command-failures",
        selectors: PROJECT_GATE_CATALOG.map(({ checkId }) => ({
          checkId,
          recordTypeId: GATE_COMMAND_FAILURE_RECORD_TYPE
        })),
        acceptance: "all",
        predicates: []
      }
    ],
    readiness: [],
    blockWhen: { kind: "view-not-empty", viewId: "gate-command-failures" }
  };
  return Object.freeze(policy);
}
