import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defineCheck } from "../check/check.ts";
import {
  createDeclarativeFingerprint,
  defineConfig,
  normalizeProjectDefinition
} from "./project-definition.ts";
import { validateProjectDefinition } from "./project-definition-validation.ts";
import { passed } from "./project-definition.test-support.ts";

describe("Project Definition", () => {
  it("fingerprints canonical declarative data without retaining callback functions", () => {
    const first = defineConfig({
      checks: [
        defineCheck({
          checkId: "check",
          displayName: "Check",
          options: { threshold: 2, nested: { mode: "strict" } },
          preflight: (options) => ({ status: "success", preparedOptions: options }),
          dependsOn: ["prepare", "compile"],
          observes: ["release", "audit"],
          execution: passed
        })
      ]
    });
    const second = defineConfig({
      checks: [
        defineCheck({
          checkId: "check",
          displayName: "Check",
          options: { nested: { mode: "strict" }, threshold: 2 },
          preflight: (options) => ({ status: "success", preparedOptions: options }),
          dependsOn: ["compile", "prepare", "compile"],
          observes: ["audit", "release", "audit"],
          execution: async () => passed()
        })
      ]
    });

    assert.equal(
      createDeclarativeFingerprint(normalizeProjectDefinition(first).declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(second).declarative)
    );

    const withoutObserves = defineConfig({
      checks: [
        defineCheck({
          checkId: "check",
          displayName: "Check",
          options: { threshold: 2, nested: { mode: "strict" } },
          preflight: (options) => ({ status: "success", preparedOptions: options }),
          dependsOn: ["prepare", "compile"],
          execution: passed
        })
      ]
    });
    assert.notEqual(
      createDeclarativeFingerprint(normalizeProjectDefinition(first).declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(withoutObserves).declarative)
    );

    const options = {};
    Object.defineProperty(options, "__proto__", {
      enumerable: true,
      value: { preserved: true }
    });
    const validated = validateProjectDefinition(
      defineConfig({
        checks: [
          {
            checkId: "own-prototype-key",
            displayName: "Own prototype key",
            execution: passed,
            options,
            preflight: (preparedOptions) => ({ status: "success", preparedOptions })
          }
        ]
      })
    );
    assert.equal(validated.ok, true);
    if (validated.ok) {
      const validatedOptions = validated.value.checks[0]?.options;
      assert.equal(Object.getPrototypeOf(validatedOptions), Object.prototype);
      assert.equal(Object.hasOwn(validatedOptions ?? {}, "__proto__"), true);
      assert.deepEqual(
        Object.getOwnPropertyDescriptor(validatedOptions ?? {}, "__proto__")?.value,
        { preserved: true }
      );
    }
  });
});
