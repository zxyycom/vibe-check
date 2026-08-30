import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defineCheck, inherit, type Check } from "../check/check.ts";
import { defineConfig, normalizeProjectDefinition } from "./project-definition.ts";
import { validateProjectDefinition } from "./project-definition-validation.ts";
import { passed } from "./project-definition.test-support.ts";

describe("Project Definition", () => {
  it("uses exact scheduling inheritance and rejects retired catalog fields", () => {
    const inherited = defineCheck({
      checkId: "inherited-check",
      displayName: "Inherited check",
      dependsOn: inherit({ remove: ["legacy"], add: ["compile", "compile"] }),
      mutex: inherit({ add: ["compiler", "compiler"] }),
      execution: passed
    });
    const parent = {
      checkId: "analysis",
      displayName: "Analysis",
      dependsOn: ["legacy", "prepare"],
      mutex: ["shared"],
      checks: [inherited]
    } satisfies Check;
    const checks = normalizeProjectDefinition(defineConfig({ checks: [parent] })).checks;

    assert.deepEqual(checks[0]?.dependsOn, ["compile", "prepare"]);
    assert.deepEqual(checks[0]?.mutex, ["compiler", "shared"]);
    assert.equal(
      validateProjectDefinition({
        ...defineConfig({}),
        checks: [
          {
            checkId: "legacy",
            displayName: "Legacy",
            execution: passed,
            recordTypes: []
          }
        ]
      }).ok,
      false
    );

    const inheritedWithUnknownKey = inherit({ add: ["compile"] });
    Object.defineProperty(inheritedWithUnknownKey, "__proto__", {
      enumerable: true,
      value: { injected: true }
    });
    assert.equal(
      validateProjectDefinition({
        ...defineConfig({}),
        checks: [
          {
            checkId: "invalid-inherited-shape",
            displayName: "Invalid inherited shape",
            dependsOn: inheritedWithUnknownKey,
            execution: passed
          }
        ]
      }).ok,
      false
    );
  });
});
