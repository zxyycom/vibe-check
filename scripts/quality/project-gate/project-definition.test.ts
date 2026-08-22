import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PROJECT_GATE_CATALOG } from "../../project-gate/catalog.ts";
import { projectGateEligibility } from "../../project-gate/eligibility.ts";
import { createProjectGateDefinition } from "./project-definition.ts";
import { projectGateAggregation } from "./project-run.ts";

describe("Project Gate Definition", () => {
  it("projects every catalog command into one process Check without a policy", () => {
    const definition = createProjectGateDefinition("/tmp/project-gate-logs");

    assert.deepEqual(
      definition.checks.map(({ checkId }) => checkId),
      PROJECT_GATE_CATALOG.map(({ checkId }) => checkId)
    );
    assert.deepEqual(definition.effects, {
      cache: { directory: ".cache/vibe-check", enabled: false },
      output: { directory: "artifacts/vibe-check", enabled: false },
      progress: { enabled: true }
    });
    assert.deepEqual(
      definition.checks.map(({ dependsOn }) => dependsOn ?? []),
      PROJECT_GATE_CATALOG.map(({ dependencies }) => dependencies)
    );
    assert.deepEqual(definition.scheduler, { maxParallel: 4 });
    assert.equal(Object.hasOwn(definition, "policies"), false);
    assert.equal(Object.hasOwn(definition, "selectedPolicy"), false);
  });

  it("binds required, full, and partial eligibility selections to explicit aggregation", () => {
    const selections = [
      { profile: "required" as const, disabledTags: [] as const },
      { profile: "full" as const, disabledTags: [] as const },
      { profile: "required" as const, disabledTags: ["quality"] as const }
    ];

    for (const selection of selections) {
      assert.deepEqual(projectGateAggregation(selection), {
        checks: PROJECT_GATE_CATALOG.filter(
          (descriptor) => projectGateEligibility(descriptor, selection).eligible
        ).map(({ checkId }) => checkId),
        empty: "failed",
        mode: "all",
        notApplicable: "fail",
        unavailable: "propagate"
      });
    }
  });
});
