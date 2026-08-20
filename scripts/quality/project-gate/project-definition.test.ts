import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PROJECT_GATE_CATALOG } from "../../project-gate/catalog.ts";
import { PROJECT_GATE_POLICY_NAME, createProjectGateDefinition } from "./project-definition.ts";
import { GATE_COMMAND_FAILURE_RECORD_TYPE } from "./process-check.ts";

describe("Project Gate Definition", () => {
  it("projects every catalog command into one process Check and named blocking policy", () => {
    const definition = createProjectGateDefinition("/tmp/project-gate-logs");

    assert.deepEqual(
      definition.checks.map(({ checkId }) => checkId),
      PROJECT_GATE_CATALOG.map(({ checkId }) => checkId)
    );
    assert.deepEqual(definition.effects, {
      cache: { directory: ".cache/vibe-check", enabled: false },
      logs: { enabled: false },
      output: { directory: "artifacts/vibe-check", enabled: false },
      progress: { enabled: true }
    });
    assert.deepEqual(
      definition.checks.map(({ dependsOn }) => dependsOn ?? []),
      PROJECT_GATE_CATALOG.map(({ dependencies }) => dependencies)
    );
    assert.deepEqual(definition.scheduler, { maxParallel: 4 });
    assert.equal(definition.selectedPolicy, PROJECT_GATE_POLICY_NAME);

    const policy = definition.policies[PROJECT_GATE_POLICY_NAME];
    assert.deepEqual(policy.blockWhen, {
      kind: "view-not-empty",
      viewId: "gate-command-failures"
    });
    assert.deepEqual(
      policy.views[0]?.selectors,
      PROJECT_GATE_CATALOG.map(({ checkId }) => ({
        checkId,
        recordTypeId: GATE_COMMAND_FAILURE_RECORD_TYPE
      }))
    );
  });
});
