import assert from "node:assert/strict";

import { defineConfig } from "./project-definition.ts";
import { validateProjectDefinition } from "./project-definition-validation.ts";
import { passed } from "./project-definition.test-support.ts";

/** Exercises each closed flag grammar boundary while preserving the owning test node's Case identity. */
export function assertMalformedFlagEnablementRejected(): void {
  for (const check of [
    {
      checkId: "invalid-empty-flags",
      displayName: "Invalid empty flags",
      enabledByFlags: { flags: [], mode: "all" },
      execute: passed
    },
    {
      checkId: "invalid-shorthand-and-expression",
      displayName: "Invalid combined forms",
      enabledByFlags: { flags: ["analysis"], mode: "all", when: { kind: "flag", flag: "x" } },
      execute: passed
    },
    {
      checkId: "invalid-empty-string-condition",
      displayName: "Invalid empty string condition",
      enabledByFlags: { when: "" },
      execute: passed
    },
    {
      checkId: "invalid-empty-nested-string-condition",
      displayName: "Invalid empty nested string condition",
      enabledByFlags: { when: { kind: "all", conditions: ["analysis", ""] } },
      execute: passed
    },
    {
      checkId: "invalid-empty-conditions",
      displayName: "Invalid empty conditions",
      enabledByFlags: { when: { kind: "all", conditions: [] } },
      execute: passed
    },
    {
      checkId: "invalid-condition-key",
      displayName: "Invalid condition key",
      enabledByFlags: { when: { kind: "flag", flag: "analysis", unexpected: true } },
      execute: passed
    },
    {
      checkId: "invalid-condition-kind",
      displayName: "Invalid condition kind",
      enabledByFlags: { when: { kind: "unknown", flag: "analysis" } },
      execute: passed
    },
    {
      checkId: "invalid-propagation-false",
      displayName: "Invalid propagation false",
      enabledByFlags: { when: { kind: "flag", flag: "analysis" }, propagateDependsOn: false },
      execute: passed
    },
    {
      checkId: "invalid-container-flags",
      displayName: "Invalid container flags",
      enabledByFlags: { when: { kind: "flag", flag: "analysis" } },
      checks: []
    },
    {
      checkId: "retired-single-flag",
      displayName: "Retired single flag",
      enabledByFlag: "analysis",
      execute: passed
    }
  ]) {
    assert.equal(validateProjectDefinition({ ...defineConfig({}), checks: [check] }).ok, false);
  }

  let tooDeep: unknown = { kind: "flag", flag: "analysis" };
  for (let depth = 0; depth < 16; depth += 1) tooDeep = { kind: "not", condition: tooDeep };
  assert.equal(
    validateProjectDefinition({
      ...defineConfig({}),
      checks: [
        {
          checkId: "too-deep",
          displayName: "Too deep",
          enabledByFlags: { when: tooDeep },
          execute: passed
        }
      ]
    }).ok,
    false
  );
  const atNodeLimit = Array.from({ length: 255 }, (_, index) => ({
    kind: "flag" as const,
    flag: `flag-${index}`
  }));
  assert.equal(
    validateProjectDefinition({
      ...defineConfig({}),
      checks: [
        {
          checkId: "at-node-limit",
          displayName: "At node limit",
          enabledByFlags: { when: { kind: "all", conditions: atNodeLimit } },
          execute: passed
        }
      ]
    }).ok,
    true
  );
  assert.equal(
    validateProjectDefinition({
      ...defineConfig({}),
      checks: [
        {
          checkId: "above-node-limit",
          displayName: "Above node limit",
          enabledByFlags: {
            when: {
              kind: "all",
              conditions: [...atNodeLimit, { kind: "flag", flag: "one-too-many" }]
            }
          },
          execute: passed
        }
      ]
    }).ok,
    false
  );

  for (const changes of [
    undefined,
    {
      source: { kind: "git", compareWith: "origin/main" },
      flags: { "product-runtime": { include: ["src/**"], exclude: [] } }
    }
  ]) {
    assert.equal(
      validateProjectDefinition({
        ...defineConfig({}),
        ...(changes === undefined ? {} : { changes }),
        checks: [
          {
            checkId: "unknown-change-flag",
            displayName: "Unknown change flag",
            enabledByFlags: {
              when: { kind: "flag", flag: "vibe-check:change:unknown" }
            },
            execute: passed
          }
        ]
      }).ok,
      false
    );
  }
  for (const changes of [
    { source: { kind: "git", compareWith: "origin/main" }, flags: {} },
    {
      source: { kind: "git", compareWith: "origin/main", unexpected: true },
      flags: { "product-runtime": { include: ["src/**"], exclude: [] } }
    },
    {
      source: { kind: "git", compareWith: "origin/main" },
      flags: { "product-runtime": { include: [], exclude: [], unexpected: true } }
    },
    {
      source: { kind: "git", compareWith: "--output=unexpected" },
      flags: { "product-runtime": { include: ["src/**"], exclude: [] } }
    },
    {
      source: { kind: "git", compareWith: "origin/main\0unexpected" },
      flags: { "product-runtime": { include: ["src/**"], exclude: [] } }
    }
  ]) {
    assert.equal(validateProjectDefinition({ ...defineConfig({}), changes }).ok, false);
  }
}
