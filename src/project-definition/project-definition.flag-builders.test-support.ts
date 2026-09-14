import assert from "node:assert/strict";

import {
  all,
  any,
  changeFlag,
  exactlyOne,
  none,
  not,
  notAll,
  type CheckFlagConditionInput
} from "../check/flag-enablement.ts";
import { defineCheck } from "../check/check.ts";
import {
  createDeclarativeFingerprint,
  defineConfig,
  normalizeProjectDefinition
} from "./project-definition.ts";
import { validateProjectDefinition } from "./project-definition-validation.ts";
import { passed } from "./project-definition.test-support.ts";

/** Proves builders retain authoring input while Definition owns the normalized identity. */
export function assertFlagBuilderAuthoringAndCanonicalization(): void {
  const recursiveInput: CheckFlagConditionInput = {
    kind: "all",
    conditions: ["analysis:deep", { kind: "not", condition: "analysis:slow" }]
  };
  const builtCondition = all("analysis:deep", any("analysis:slow", "analysis:slow"));
  const changeToken: "vibe-check:change:product-runtime" = changeFlag("product-runtime");
  const builderKinds: readonly ["all", "any", "none", "not-all", "exactly-one", "not"] = [
    all("all:first").kind,
    any("any:first").kind,
    none("none:first").kind,
    notAll("not-all:first").kind,
    exactlyOne("exactly-one:first").kind,
    not("not").kind
  ];
  assert.deepEqual(builtCondition, {
    kind: "all",
    conditions: ["analysis:deep", { kind: "any", conditions: ["analysis:slow", "analysis:slow"] }]
  });
  assert.deepEqual(builderKinds, ["all", "any", "none", "not-all", "exactly-one", "not"]);
  assert.deepEqual(
    [
      any("any:first", "any:second"),
      none("none:first", "none:second"),
      notAll("not-all:first", "not-all:second"),
      exactlyOne("exactly-one:first", "exactly-one:second"),
      not("not")
    ],
    [
      { kind: "any", conditions: ["any:first", "any:second"] },
      { kind: "none", conditions: ["none:first", "none:second"] },
      { kind: "not-all", conditions: ["not-all:first", "not-all:second"] },
      { kind: "exactly-one", conditions: ["exactly-one:first", "exactly-one:second"] },
      { kind: "not", condition: "not" }
    ]
  );
  type FlagBuilderAcceptsEmptyConditions = [] extends Parameters<typeof all> ? true : false;
  const flagBuilderAcceptsEmptyConditions: FlagBuilderAcceptsEmptyConditions = false;
  assert.equal(flagBuilderAcceptsEmptyConditions, false);
  assert.equal(
    validateProjectDefinition(
      defineConfig({
        checks: [
          defineCheck({
            checkId: "untrusted-builder-input",
            displayName: "Untrusted builder input",
            enabledByFlags: {
              when: all({
                kind: "not",
                condition: "analysis",
                unexpected: true
              } as CheckFlagConditionInput)
            },
            execute: passed
          })
        ]
      })
    ).ok,
    false
  );
  assertEquivalentConditions(
    { checkId: "single-flag", when: "analysis" },
    { checkId: "single-flag", when: { kind: "flag", flag: "analysis" } }
  );
  assertEquivalentConditions(
    { checkId: "nested-strings", when: recursiveInput },
    {
      checkId: "nested-strings",
      when: {
        kind: "all",
        conditions: [
          { kind: "flag", flag: "analysis:deep" },
          { kind: "not", condition: { kind: "flag", flag: "analysis:slow" } }
        ]
      }
    }
  );
  assertEquivalentConditions(
    {
      checkId: "not-analysis",
      when: { kind: "not", condition: { kind: "flag", flag: "analysis" } }
    },
    { checkId: "not-analysis", when: not("analysis") }
  );
  const configuredChanges = defineConfig({
    changes: {
      source: { kind: "git", compareWith: "origin/main" },
      flags: { "product-runtime": { include: ["src/**"], exclude: [] } }
    },
    checks: [
      defineCheck({
        checkId: "changed-runtime",
        displayName: "Changed runtime",
        enabledByFlags: { when: changeToken },
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
}

function assertEquivalentConditions(
  left: Readonly<{ readonly checkId: string; readonly when: CheckFlagConditionInput }>,
  right: Readonly<{ readonly checkId: string; readonly when: CheckFlagConditionInput }>
): void {
  const define = (
    input: Readonly<{ readonly checkId: string; readonly when: CheckFlagConditionInput }>
  ) =>
    defineConfig({
      checks: [
        defineCheck({
          checkId: input.checkId,
          displayName: input.checkId,
          enabledByFlags: { when: input.when },
          execute: passed
        })
      ]
    });
  const leftNormalized = normalizeProjectDefinition(define(left));
  const rightNormalized = normalizeProjectDefinition(define(right));
  assert.deepEqual(
    leftNormalized.checks[0]?.enabledByFlags,
    rightNormalized.checks[0]?.enabledByFlags
  );
  assert.equal(
    createDeclarativeFingerprint(leftNormalized.declarative),
    createDeclarativeFingerprint(rightNormalized.declarative)
  );
}
