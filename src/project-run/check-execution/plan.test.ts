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
    const checks = normalizeProjectDefinition(
      defineConfig({
        checks: [
          defineCheck({
            admissionPriority: -2,
            checkId: "lowered",
            displayName: "Lowered",
            observes: ["defaulted"],
            execution: passed
          }),
          defineCheck({ checkId: "defaulted", displayName: "Defaulted", execution: passed })
        ]
      })
    ).checks;

    assert.deepEqual(
      planStaticCheckGraph(checks).tasks.map(({ admissionPriority, id, observes }) => ({
        admissionPriority,
        id,
        observes
      })),
      [
        { admissionPriority: -2, id: "lowered", observes: ["defaulted"] },
        { admissionPriority: 0, id: "defaulted", observes: [] }
      ]
    );
  });
});
