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
import { assertMalformedFlagEnablementRejected } from "./project-definition.flag-enablement.test-support.ts";

describe("Project Definition", () => {
  it("normalizes executable flag enablement as declarative identity", () => {
    const shorthand = defineConfig({
      checks: [
        defineCheck({
          checkId: "deep-analysis",
          displayName: "Deep analysis",
          enabledByFlags: {
            flags: ["analysis:slow", "analysis:deep", "analysis:slow"],
            mode: "all"
          },
          execute: passed
        })
      ]
    });
    const raw = defineConfig({
      checks: [
        defineCheck({
          checkId: "deep-analysis",
          displayName: "Deep analysis",
          enabledByFlags: {
            when: {
              kind: "all",
              conditions: [
                { kind: "flag", flag: "analysis:deep" },
                { kind: "flag", flag: "analysis:slow" }
              ]
            },
            propagateDependsOn: true
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
            flags: ["analysis:deep", "analysis:slow"],
            mode: "all",
            propagateDependsOn: true
          },
          execute: passed
        })
      ]
    });
    const normalized = normalizeProjectDefinition(shorthand);
    const canonical = normalizeProjectDefinition(
      defineConfig({
        checks: [
          defineCheck({
            checkId: "deep-analysis",
            displayName: "Deep analysis",
            enabledByFlags: {
              flags: ["analysis:deep", "analysis:slow"],
              mode: "all"
            },
            execute: passed
          })
        ]
      })
    );
    const expected = {
      when: {
        kind: "all",
        conditions: [
          { kind: "flag", flag: "analysis:deep" },
          { kind: "flag", flag: "analysis:slow" }
        ]
      }
    } as const;

    assert.deepEqual(normalized.checks[0]?.enabledByFlags, expected);
    assert.deepEqual(normalized.declarative.checks[0]?.enabledByFlags, expected);
    assert.equal(Object.isFrozen(normalized.checks[0]?.enabledByFlags), true);
    assert.equal(Object.isFrozen(normalized.checks[0]?.enabledByFlags?.when), true);
    assert.equal(Object.isFrozen(normalized.checks[0]?.enabledByFlags?.when.conditions), true);
    assert.equal(
      createDeclarativeFingerprint(normalized.declarative),
      createDeclarativeFingerprint(canonical.declarative)
    );
    assert.equal(
      createDeclarativeFingerprint(normalizeProjectDefinition(raw).declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(withPropagation).declarative)
    );
    assert.notEqual(
      createDeclarativeFingerprint(normalized.declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(withPropagation).declarative)
    );
    const validated = validateProjectDefinition(shorthand);
    assert.equal(validated.ok, true);
    if (validated.ok) {
      assert.deepEqual(
        normalizeProjectDefinition(validated.value).checks[0]?.enabledByFlags,
        expected
      );
    }

    const configuredChanges = defineConfig({
      changes: {
        source: { kind: "git", compareWith: "origin/main" },
        flags: {
          "product-runtime": { include: ["src/**"], exclude: [] }
        }
      },
      checks: [
        defineCheck({
          checkId: "changed-runtime",
          displayName: "Changed runtime",
          enabledByFlags: {
            when: { kind: "flag", flag: "vibe-check:change:product-runtime" }
          },
          execute: passed
        })
      ]
    });
    const validatedChanges = validateProjectDefinition(configuredChanges);
    assert.equal(validatedChanges.ok, true);
    if (validatedChanges.ok) {
      const changes = normalizeProjectDefinition(validatedChanges.value).changes;
      assert.deepEqual(changes, {
        source: { kind: "git", compareWith: "origin/main" },
        flags: { "product-runtime": { include: ["src/**"], exclude: [] } }
      });
      assert.equal(Object.isFrozen(changes), true);
      assert.equal(Object.isFrozen(changes?.flags), true);
      assert.equal(Object.isFrozen(changes?.flags["product-runtime"]?.include), true);
    }
    const differentComparison = defineConfig({
      changes: {
        source: { kind: "git", compareWith: "origin/release" },
        flags: { "product-runtime": { include: ["src/**"], exclude: [] } }
      }
    });
    assert.notEqual(
      createDeclarativeFingerprint(normalizeProjectDefinition(configuredChanges).declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(differentComparison).declarative)
    );
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
              conditions: [
                { kind: "flag", flag: "analysis" },
                { kind: "flag", flag: "analysis" }
              ]
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
              conditions: [
                { kind: "flag", flag: "other" },
                { kind: "flag", flag: "analysis" }
              ]
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
        conditions: [
          { kind: "flag", flag: "analysis" },
          { kind: "flag", flag: "analysis" }
        ]
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
              conditions: [
                { kind: "flag", flag: "analysis" },
                { kind: "flag", flag: "other" }
              ]
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
              conditions: [
                { kind: "flag", flag: "other" },
                { kind: "flag", flag: "analysis" }
              ]
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
