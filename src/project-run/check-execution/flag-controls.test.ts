import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  defineConfig,
  normalizeProjectDefinition
} from "../../project-definition/project-definition.ts";
import { selectEffectiveCheckIds } from "./flag-controls.ts";

const CONTROL_FLAGS = ["feature:alpha", "feature:beta"] as const;

describe("Check flag selection", () => {
  it("selects only matching Checks across all, any, none, and not-all modes", () => {
    const scenarios = [
      { mode: "all", matchingFlags: CONTROL_FLAGS, nonmatchingFlags: ["feature:alpha"] },
      { mode: "any", matchingFlags: ["feature:beta"], nonmatchingFlags: ["feature:other"] },
      { mode: "any", matchingFlags: CONTROL_FLAGS, nonmatchingFlags: ["feature:other"] },
      { mode: "none", matchingFlags: ["feature:other"], nonmatchingFlags: ["feature:alpha"] },
      { mode: "not-all", matchingFlags: ["feature:alpha"], nonmatchingFlags: CONTROL_FLAGS },
      { mode: "not-all", matchingFlags: [], nonmatchingFlags: CONTROL_FLAGS }
    ] as const;

    for (const { mode, matchingFlags, nonmatchingFlags } of scenarios) {
      const { checks } = normalizeProjectDefinition(
        defineConfig({
          checks: [
            {
              checkId: "flag-controlled",
              displayName: "Flag-controlled",
              enabledByFlags: { when: { kind: mode, conditions: CONTROL_FLAGS } },
              execute: () => {
                throw new Error("Selection must not execute author work");
              }
            }
          ]
        })
      );

      assert.deepEqual(selectEffectiveCheckIds(checks, matchingFlags), ["flag-controlled"]);
      assert.deepEqual(selectEffectiveCheckIds(checks, nonmatchingFlags), []);
    }
  });
});
