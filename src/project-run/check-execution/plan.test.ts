import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defineCheck } from "../../check/check.ts";
import {
  defineConfig,
  normalizeProjectDefinition
} from "../../project-definition/project-definition.ts";
import { passed } from "../../project-definition/project-definition.test-support.ts";

import { planStaticCheckGraph } from "./plan.ts";

describe("Check execution plan", () => {
  it("projects normalized admission priority into the static task graph", () => {
    const normalized = normalizeProjectDefinition(
      defineConfig({
        scheduler: { resourceCapacities: { browser: 2 } },
        checks: [
          defineCheck({
            admissionPriority: -2,
            checkId: "lowered",
            displayName: "Lowered",
            observes: ["defaulted"],
            resourceClaims: { browser: 1 },
            execution: passed
          }),
          defineCheck({ checkId: "defaulted", displayName: "Defaulted", execution: passed })
        ]
      })
    );
    const graph = planStaticCheckGraph(
      normalized.checks,
      normalized.declarative.scheduler.resourceCapacities
    );

    assert.deepEqual(
      graph.tasks.map(({ admissionPriority, id, observes, resourceClaims }) => ({
        admissionPriority,
        id,
        observes,
        resourceClaims
      })),
      [
        {
          admissionPriority: -2,
          id: "lowered",
          observes: ["defaulted"],
          resourceClaims: { browser: 1 }
        },
        { admissionPriority: 0, id: "defaulted", observes: [], resourceClaims: {} }
      ]
    );
    assert.deepEqual(graph.resourceCapacities, { browser: 2 });
  });
});
