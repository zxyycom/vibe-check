import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defineCheck, type Check } from "../check/check.ts";
import { defineConfig, normalizeProjectDefinition } from "./project-definition.ts";
import { passed } from "./project-definition.test-support.ts";

describe("Project Definition", () => {
  it("normalizes ordinary recursive Checks without a Record catalog", () => {
    const child = defineCheck({
      checkId: "child-check",
      displayName: "Child check",
      options: { maximum: 3 },
      preflight: (preparedOptions) => ({ status: "success", preparedOptions }),
      execution({ options }) {
        assert.equal(options.maximum, 3);
        return passed();
      }
    });
    const parent = defineCheck({
      checkId: "parent-check",
      displayName: "Parent check",
      dependsOn: ["prepare"],
      mutex: ["analysis"],
      execution: passed,
      checks: [child]
    });
    const informationRoot = {
      checkId: "repository-quality",
      displayName: "Repository quality",
      maxParallel: 2,
      checks: [parent]
    } satisfies Check;
    const normalized = normalizeProjectDefinition(defineConfig({ checks: [informationRoot] }));

    assert.deepEqual(
      normalized.checks.map((check) => check.definition),
      [
        { checkId: "parent-check", displayName: "Parent check" },
        { checkId: "child-check", displayName: "Child check" }
      ]
    );
    assert.equal(Object.hasOwn(normalized.checks[0]?.definition ?? {}, "recordTypes"), false);
    assert.deepEqual(normalized.checks[0]?.dependsOn, ["prepare"]);
    assert.deepEqual(normalized.checks[0]?.mutex, ["analysis"]);
    assert.equal(normalized.checks[0]?.maxParallel, 2);
    assert.equal(normalized.checks[1]?.maxParallel, 2);
    assert.equal(
      normalized.declarative.checks.some((check) => "execution" in check),
      false
    );
  });
});
