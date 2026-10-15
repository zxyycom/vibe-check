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
import { resolveCheckTree } from "./check-tree/resolution.ts";
import {
  deepInheritedMutexTree,
  measureMutexSorting,
  overlappingSchedulingCollections
} from "./project-definition.scheduling-inheritance.test-support.ts";

describe("Project Definition", () => {
  it("restores sibling collections after exact and overlapping inherited edits", () => {
    const normalized = normalizeProjectDefinition(
      defineConfig({ checks: overlappingSchedulingCollections() })
    );
    for (const field of ["dependsOn", "mutex", "observes"] as const) {
      assert.deepEqual(
        normalized.checks.map((check) => [check.definition.checkId, check[field]]),
        [
          ["parent", ["a", "b", "z"]],
          ["cleared", []],
          ["replaced", ["replacement"]],
          ["edited", ["child", "replacement"]],
          ["restored-child", ["a", "b", "z"]],
          ["restored-sibling", ["a", "z"]],
          ["no-op", ["a", "z"]],
          ["independent", []]
        ]
      );
      for (const check of normalized.checks) assert.equal(Object.isFrozen(check[field]), true);
    }
  });

  it("materializes inherited collection prefixes only for executable consumers", () => {
    for (const size of [16, 64, 256]) {
      const check = deepInheritedMutexTree(size);
      const { value: tree, sortedElements } = measureMutexSorting(() =>
        resolveCheckTree([check], 1)
      );
      assert.equal(tree?.leaves.length, 1);
      assert.equal(tree.leaves[0]?.mutex.length, size);
      assert.equal(sortedElements, size);
    }
  });

  it("uses exact scheduling inheritance and rejects retired catalog fields", () => {
    const inherited = defineCheck({
      checkId: "inherited-check",
      displayName: "Inherited check",
      dependsOn: inherit({ remove: ["legacy"], add: ["compile", "compile"] }),
      mutex: inherit({ add: ["compiler", "compiler"] }),
      observes: inherit({ remove: ["legacy-observation"], add: ["audit", "audit"] }),
      execute: passed
    });
    const parent = {
      checkId: "analysis",
      displayName: "Analysis",
      dependsOn: ["legacy", "prepare"],
      mutex: ["shared"],
      observes: ["legacy-observation", "release"],
      checks: [inherited]
    } satisfies Check;
    const checks = normalizeProjectDefinition(defineConfig({ checks: [parent] })).checks;

    assert.deepEqual(checks[0]?.dependsOn, ["compile", "prepare"]);
    assert.deepEqual(checks[0]?.mutex, ["compiler", "shared"]);
    assert.deepEqual(checks[0]?.observes, ["audit", "release"]);
    const exactCollections = normalizeProjectDefinition(
      defineConfig({
        checks: [
          defineCheck({
            checkId: "exact-collections",
            displayName: "Exact collections",
            dependsOn: ["zeta", "alpha", "zeta", "__proto__", "alpha"],
            observes: ["observer", "observer"],
            mutex: ["shared", "shared"],
            execute: passed
          })
        ]
      })
    ).checks[0];
    assert.deepEqual(exactCollections?.dependsOn, ["__proto__", "alpha", "zeta"]);
    assert.deepEqual(exactCollections?.observes, ["observer"]);
    assert.deepEqual(exactCollections?.mutex, ["shared"]);
    assert.equal(Object.isFrozen(exactCollections?.dependsOn), true);
    assert.equal(
      validateProjectDefinition({
        ...defineConfig({}),
        checks: [
          {
            checkId: "legacy",
            displayName: "Legacy",
            execute: passed,
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
            execute: passed
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
      execute: passed
    });
    const overridden = defineCheck({
      admissionPriority: 7,
      checkId: "overridden-priority",
      displayName: "Overridden priority",
      execute: passed
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
            execute: passed
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
            execute: passed
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
              execute: passed
            }
          ]
        }).ok,
        false
      );
    }
  });

  it("normalizes closed named resource capacities and exact replacement claims", () => {
    const definition = defineConfig({
      scheduler: { resourceCapacities: { browser: 2, memory: 4 } },
      checks: [
        {
          checkId: "resource-group",
          displayName: "Resource group",
          resourceClaims: { memory: 2, browser: 1 },
          checks: [
            defineCheck({
              checkId: "inherited-resource-claims",
              displayName: "Inherited resource claims",
              execute: passed
            }),
            defineCheck({
              checkId: "cleared-resource-claims",
              displayName: "Cleared resource claims",
              execute: passed,
              resourceClaims: {}
            }),
            defineCheck({
              checkId: "replaced-resource-claims",
              displayName: "Replaced resource claims",
              execute: passed,
              resourceClaims: { browser: 2 }
            })
          ]
        }
      ]
    });
    const normalized = normalizeProjectDefinition(definition);

    assert.deepEqual(normalized.declarative.scheduler.resourceCapacities, {
      browser: 2,
      memory: 4
    });
    assert.deepEqual(
      normalized.checks.map(({ definition: descriptor, resourceClaims }) => [
        descriptor.checkId,
        resourceClaims
      ]),
      [
        ["inherited-resource-claims", { browser: 1, memory: 2 }],
        ["cleared-resource-claims", {}],
        ["replaced-resource-claims", { browser: 2 }]
      ]
    );
    assert.equal(Object.isFrozen(normalized.checks[0]?.resourceClaims), true);

    for (const invalid of [
      defineConfig({
        scheduler: { resourceCapacities: { browser: 1 } },
        checks: [
          defineCheck({
            checkId: "unknown-resource",
            displayName: "Unknown resource",
            execute: passed,
            resourceClaims: { database: 1 }
          })
        ]
      }),
      defineConfig({
        scheduler: { resourceCapacities: { browser: 1 } },
        checks: [
          defineCheck({
            checkId: "oversized-claim",
            displayName: "Oversized claim",
            execute: passed,
            resourceClaims: { browser: 2 }
          })
        ]
      })
    ]) {
      assert.equal(validateProjectDefinition(invalid).ok, false);
    }
  });
});
