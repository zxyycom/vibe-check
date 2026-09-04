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
  it("normalizes executable flag enablement as declarative identity", () => {
    const source = defineConfig({
      checks: [
        defineCheck({
          checkId: "deep-analysis",
          displayName: "Deep analysis",
          enabledByFlags: {
            flags: ["analysis:slow", "analysis:deep", "analysis:slow"],
            mode: "all"
          },
          execution: passed
        })
      ]
    });
    const normalized = normalizeProjectDefinition(source);
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
            execution: passed
          })
        ]
      })
    );
    const differentMode = normalizeProjectDefinition(
      defineConfig({
        checks: [
          {
            ...source.checks[0],
            enabledByFlags: { flags: ["analysis:deep", "analysis:slow"], mode: "any" }
          }
        ]
      })
    );
    const validated = validateProjectDefinition(source);

    const expected = {
      flags: ["analysis:deep", "analysis:slow"],
      mode: "all"
    } as const;
    assert.deepEqual(normalized.checks[0]?.enabledByFlags, expected);
    assert.deepEqual(normalized.declarative.checks[0]?.enabledByFlags, expected);
    assert.equal(Object.isFrozen(normalized.checks[0]?.enabledByFlags), true);
    assert.equal(Object.isFrozen(normalized.checks[0]?.enabledByFlags?.flags), true);
    assert.equal(
      createDeclarativeFingerprint(normalized.declarative),
      createDeclarativeFingerprint(canonical.declarative)
    );
    assert.notEqual(
      createDeclarativeFingerprint(normalized.declarative),
      createDeclarativeFingerprint(differentMode.declarative)
    );
    assert.equal(validated.ok, true);
    if (validated.ok) {
      assert.deepEqual(validated.value.checks[0]?.enabledByFlags, expected);
    }
  });

  it("normalizes opt-in dependency propagation as declarative identity", () => {
    const source = defineConfig({
      checks: [
        defineCheck({
          checkId: "deep-analysis",
          displayName: "Deep analysis",
          enabledByFlags: {
            flags: ["analysis:slow", "analysis:deep", "analysis:slow"],
            mode: "all",
            propagateDependsOn: true
          },
          execution: passed
        })
      ]
    });
    const canonical = defineConfig({
      checks: [
        defineCheck({
          checkId: "deep-analysis",
          displayName: "Deep analysis",
          enabledByFlags: {
            flags: ["analysis:deep", "analysis:slow"],
            mode: "all",
            propagateDependsOn: true
          },
          execution: passed
        })
      ]
    });
    const withoutPropagation = defineConfig({
      checks: [
        defineCheck({
          checkId: "deep-analysis",
          displayName: "Deep analysis",
          enabledByFlags: { flags: ["analysis:deep", "analysis:slow"], mode: "all" },
          execution: passed
        })
      ]
    });
    const normalized = normalizeProjectDefinition(source);

    const expected = {
      flags: ["analysis:deep", "analysis:slow"],
      mode: "all",
      propagateDependsOn: true
    } as const;
    assert.deepEqual(normalized.checks[0]?.enabledByFlags, expected);
    assert.deepEqual(normalized.declarative.checks[0]?.enabledByFlags, expected);
    assert.equal(Object.isFrozen(normalized.checks[0]?.enabledByFlags), true);
    assert.equal(
      createDeclarativeFingerprint(normalized.declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(canonical).declarative)
    );
    assert.notEqual(
      createDeclarativeFingerprint(normalized.declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(withoutPropagation).declarative)
    );
  });

  it("rejects malformed and container flag enablement", () => {
    for (const check of [
      {
        checkId: "invalid-empty-flags",
        displayName: "Invalid empty flags",
        enabledByFlags: { flags: [], mode: "all" },
        execution: passed
      },
      {
        checkId: "invalid-flag-token",
        displayName: "Invalid flag token",
        enabledByFlags: { flags: [""], mode: "any" },
        execution: passed
      },
      {
        checkId: "invalid-flags-type",
        displayName: "Invalid flags type",
        enabledByFlags: { flags: "analysis", mode: "none" },
        execution: passed
      },
      {
        checkId: "invalid-flag-mode",
        displayName: "Invalid flag mode",
        enabledByFlags: { flags: ["analysis"], mode: "exactly-one" },
        execution: passed
      },
      {
        checkId: "invalid-control-key",
        displayName: "Invalid control key",
        enabledByFlags: { flags: ["analysis"], mode: "not-all", unexpected: true },
        execution: passed
      },
      {
        checkId: "invalid-propagation-false",
        displayName: "Invalid propagation false",
        enabledByFlags: { flags: ["analysis"], mode: "all", propagateDependsOn: false },
        execution: passed
      },
      {
        checkId: "invalid-propagation-value",
        displayName: "Invalid propagation value",
        enabledByFlags: { flags: ["analysis"], mode: "all", propagateDependsOn: "true" },
        execution: passed
      },
      {
        checkId: "invalid-container-flags",
        displayName: "Invalid container flags",
        enabledByFlags: { flags: ["analysis"], mode: "all" },
        checks: []
      },
      {
        checkId: "retired-single-flag",
        displayName: "Retired single flag",
        enabledByFlag: "analysis",
        execution: passed
      }
    ]) {
      assert.equal(validateProjectDefinition({ ...defineConfig({}), checks: [check] }).ok, false);
    }
  });
});
