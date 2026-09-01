import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defineCheck, inherit, type Check } from "../check/check.ts";
import {
  createDeclarativeFingerprint,
  defineConfig,
  normalizeProjectDefinition
} from "./project-definition.ts";
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

  it("normalizes signed admission priority by nearest explicit ancestor", () => {
    const inherited = defineCheck({
      checkId: "inherited-priority",
      displayName: "Inherited priority",
      execution: passed
    });
    const overridden = defineCheck({
      admissionPriority: 7,
      checkId: "overridden-priority",
      displayName: "Overridden priority",
      execution: passed
    });
    const parent = {
      admissionPriority: -3,
      checkId: "priority-group",
      checks: [inherited, overridden],
      displayName: "Priority group"
    } satisfies Check;
    const defaultPriority = normalizeProjectDefinition(
      defineConfig({
        checks: [
          defineCheck({
            checkId: "default-priority",
            displayName: "Default priority",
            execution: passed
          })
        ]
      })
    );
    const explicitZero = normalizeProjectDefinition(
      defineConfig({
        checks: [
          defineCheck({
            admissionPriority: 0,
            checkId: "default-priority",
            displayName: "Default priority",
            execution: passed
          })
        ]
      })
    );
    const normalized = normalizeProjectDefinition(defineConfig({ checks: [parent] }));

    assert.deepEqual(
      normalized.checks.map(({ definition, admissionPriority }) => ({
        admissionPriority,
        checkId: definition.checkId
      })),
      [
        { admissionPriority: -3, checkId: "inherited-priority" },
        { admissionPriority: 7, checkId: "overridden-priority" }
      ]
    );
    assert.equal(Object.isFrozen(normalized.checks[0]), true);
    assert.equal(Object.isFrozen(normalized.declarative.checks[0]), true);
    assert.equal(
      createDeclarativeFingerprint(defaultPriority.declarative),
      createDeclarativeFingerprint(explicitZero.declarative)
    );
    assert.notEqual(
      createDeclarativeFingerprint(defaultPriority.declarative),
      createDeclarativeFingerprint(normalized.declarative)
    );

    for (const admissionPriority of [Number.NaN, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
      assert.equal(
        validateProjectDefinition({
          ...defineConfig({}),
          checks: [
            {
              admissionPriority,
              checkId: "invalid-priority",
              displayName: "Invalid priority",
              execution: passed
            }
          ]
        }).ok,
        false
      );
    }
  });
});
