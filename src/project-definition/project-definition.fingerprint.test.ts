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
          preflight: (options) => ({
            status: "success",
            preparedOptions: options
          }),
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
          preflight: (options) => ({
            status: "success",
            preparedOptions: options
          }),
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
          preflight: (options) => ({
            status: "success",
            preparedOptions: options
          }),
          dependsOn: ["prepare", "compile"],
          execution: passed
        })
      ]
    });
    assert.notEqual(
      createDeclarativeFingerprint(normalizeProjectDefinition(first).declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(withoutObserves).declarative)
    );

    const firstCustomPolicy = defineConfig({
      scheduler: {
        admissionPolicy: {
          kind: "custom",
          strategy: { kind: "simple", decide: () => ({ kind: "wait" }) }
        }
      }
    });
    const secondCustomPolicy = defineConfig({
      scheduler: {
        admissionPolicy: {
          kind: "custom",
          strategy: {
            kind: "simple",
            decide: () => ({
              kind: "select",
              taskId: "different-closure"
            })
          }
        }
      }
    });
    const preparedCustomPolicy = defineConfig({
      scheduler: {
        admissionPolicy: {
          kind: "custom",
          strategy: {
            kind: "prepared",
            prepare: () => ({ decide: () => ({ kind: "wait" as const }) })
          }
        }
      }
    });
    const hooksOne = defineConfig({
      scheduler: { measurementHooks: [() => undefined] }
    });
    const hooksTwo = defineConfig({
      scheduler: { measurementHooks: [async () => undefined] }
    });
    const staticPolicy = defineConfig({
      scheduler: { admissionPolicy: { kind: "static" } }
    });
    const firstLearnedPolicy = defineConfig({
      scheduler: {
        admissionPolicy: {
          kind: "learned-critical-path",
          stateDirectory: ".vibe-check/duration-state"
        }
      }
    });
    const secondLearnedPolicy = defineConfig({
      scheduler: {
        admissionPolicy: {
          kind: "learned-critical-path",
          stateDirectory: ".vibe-check/other-duration-state"
        }
      }
    });
    assert.equal(
      createDeclarativeFingerprint(normalizeProjectDefinition(firstCustomPolicy).declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(secondCustomPolicy).declarative)
    );
    assert.notEqual(
      createDeclarativeFingerprint(normalizeProjectDefinition(firstCustomPolicy).declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(staticPolicy).declarative)
    );
    assert.notEqual(
      createDeclarativeFingerprint(normalizeProjectDefinition(firstCustomPolicy).declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(preparedCustomPolicy).declarative)
    );
    assert.equal(
      createDeclarativeFingerprint(normalizeProjectDefinition(hooksOne).declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(hooksTwo).declarative)
    );
    assert.notEqual(
      createDeclarativeFingerprint(normalizeProjectDefinition(firstLearnedPolicy).declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(secondLearnedPolicy).declarative)
    );
    assert.deepEqual(normalizeProjectDefinition(firstLearnedPolicy).declarative.scheduler, {
      admissionPolicy: {
        kind: "learned-critical-path",
        stateDirectory: ".vibe-check/duration-state"
      },
      maxParallel: 4
    });
    assert.deepEqual(normalizeProjectDefinition(firstCustomPolicy).declarative.scheduler, {
      admissionPolicy: { kind: "custom", strategy: { kind: "simple" } },
      maxParallel: 4
    });
    assert.deepEqual(normalizeProjectDefinition(preparedCustomPolicy).declarative.scheduler, {
      admissionPolicy: { kind: "custom", strategy: { kind: "prepared" } },
      maxParallel: 4
    });

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
            preflight: (preparedOptions) => ({
              status: "success",
              preparedOptions
            })
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
