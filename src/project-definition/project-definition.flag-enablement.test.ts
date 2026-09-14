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
import { assertFlagBuilderAuthoringAndCanonicalization } from "./project-definition.flag-builders.test-support.ts";
import { assertMalformedFlagEnablementRejected } from "./project-definition.flag-enablement.test-support.ts";

describe("Project Definition", () => {
  it("normalizes executable flag enablement as declarative identity", () => {
    assertFlagBuilderAuthoringAndCanonicalization();

    const source = defineConfig({
      checks: [
        defineCheck({
          checkId: "deep-analysis",
          displayName: "Deep analysis",
          enabledByFlags: {
            when: {
              kind: "all",
              conditions: ["analysis:slow", "analysis:deep", "analysis:slow"]
            }
          },
          execute: passed
        })
      ]
    });
    const withPropagation = defineConfig({
      checks: [
        defineCheck({
          checkId: "deep-analysis",
          displayName: "Deep analysis",
          enabledByFlags: {
            when: { kind: "all", conditions: ["analysis:slow", "analysis:deep", "analysis:slow"] },
            propagateDependsOn: true
          },
          execute: passed
        })
      ]
    });
    const normalized = normalizeProjectDefinition(source);
    const expected = {
      when: { kind: "all", conditions: ["analysis:slow", "analysis:deep", "analysis:slow"] }
    } as const;

    assert.deepEqual(normalized.checks[0]?.enabledByFlags, expected);
    assert.deepEqual(normalized.declarative.checks[0]?.enabledByFlags, expected);
    assert.equal(Object.isFrozen(normalized.checks[0]?.enabledByFlags), true);
    assert.equal(Object.isFrozen(normalized.checks[0]?.enabledByFlags?.when), true);
    const when = normalized.checks[0]?.enabledByFlags?.when;
    assert.equal(typeof when === "string" ? false : Object.isFrozen(when?.conditions), true);
    assert.notEqual(
      createDeclarativeFingerprint(normalized.declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(withPropagation).declarative)
    );
    const validated = validateProjectDefinition(source);
    assert.equal(validated.ok, true);
    if (validated.ok) {
      assert.deepEqual(
        normalizeProjectDefinition(validated.value).checks[0]?.enabledByFlags,
        expected
      );
    }
  });

  it("normalizes opt-in dependency propagation as declarative identity", () => {
    const repeated = defineConfig({
      checks: [
        defineCheck({
          checkId: "exactly-one",
          displayName: "Exactly one",
          enabledByFlags: {
            when: {
              kind: "exactly-one",
              conditions: ["analysis", "analysis"]
            },
            propagateDependsOn: true
          },
          execute: passed
        })
      ]
    });
    const reordered = defineConfig({
      checks: [
        defineCheck({
          checkId: "exactly-one",
          displayName: "Exactly one",
          enabledByFlags: {
            when: {
              kind: "exactly-one",
              conditions: ["other", "analysis"]
            },
            propagateDependsOn: true
          },
          execute: passed
        })
      ]
    });
    const normalized = normalizeProjectDefinition(repeated);
    const control = normalized.checks[0]?.enabledByFlags;

    assert.deepEqual(control, {
      when: {
        kind: "exactly-one",
        conditions: ["analysis", "analysis"]
      },
      propagateDependsOn: true
    });
    assert.equal(Object.isFrozen(control?.when.conditions), true);
    assert.equal(Object.isFrozen(control?.when.conditions[0]), true);
    assert.notEqual(
      createDeclarativeFingerprint(normalized.declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(reordered).declarative)
    );
    const ordered = defineConfig({
      checks: [
        defineCheck({
          checkId: "ordered",
          displayName: "Ordered",
          enabledByFlags: {
            when: {
              kind: "all",
              conditions: ["analysis", "other"]
            }
          },
          execute: passed
        })
      ]
    });
    const reversed = defineConfig({
      checks: [
        defineCheck({
          checkId: "ordered",
          displayName: "Ordered",
          enabledByFlags: {
            when: {
              kind: "all",
              conditions: ["other", "analysis"]
            }
          },
          execute: passed
        })
      ]
    });
    assert.notEqual(
      createDeclarativeFingerprint(normalizeProjectDefinition(ordered).declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(reversed).declarative)
    );
  });

  it("rejects malformed and container flag enablement", () => {
    assertMalformedFlagEnablementRejected();
  });
});
