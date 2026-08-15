import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  append,
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  replace,
  createDeclarativeFingerprint,
  defineConfig,
  normalizeProjectDefinition,
  type CustomCheck
} from "./project.ts";
import { validateProjectDefinition } from "./validation.ts";
import { validateRunControls } from "../run/control-validation.ts";

const customLeaf = (overrides: Readonly<Record<string, unknown>> = {}) => ({
  kind: "custom" as const,
  checkId: "custom-check",
  displayName: "Custom check",
  recordTypes: [],
  applicability: () => ({ status: "applicable" as const }),
  binding: { kind: "direct" as const, execute: () => ({ verdict: "passed" as const }) },
  ...overrides
});

describe("Project Definition", () => {
  it("creates a plain value with product-owned authoring defaults", () => {
    const definition = defineConfig({});

    assert.deepEqual(definition.checks, []);
    assert.deepEqual(definition.effects, {
      cache: { directory: ".cache/vibe-check", enabled: true },
      logs: { enabled: true },
      output: { directory: "artifacts/vibe-check", enabled: true },
      progress: { enabled: true }
    });
    assert.equal(definition.apiVersion, "1");
    assert.equal(definition.scheduler.maxParallel, 4);
    assert.equal("checks" in definition.quality, false);
    assert.equal(Object.getPrototypeOf(definition), Object.prototype);
  });

  it("accepts direct built-ins and normalizes nested inherited tree scheduling", () => {
    const definition = defineConfig({
      checks: [customLeaf(), { ...functionMetrics, mutex: "functions" }, {
        id: "analysis",
        dependsOn: "custom-check",
        maxParallel: 2,
        mutex: "native",
        checks: [{
            ...fileMetrics,
            dependsOn: ["custom-check", "custom-check"],
            maxParallel: 1,
            mutex: ["native", "metrics"]
          },
          duplicateDetection
        ]
      }]
    });
    const normalized = normalizeProjectDefinition(definition);
    const file = normalized.declarative.checks.find(({ definition }) => definition.checkId === "file-metrics");
    const duplicate = normalized.declarative.checks.find(({ definition }) => definition.checkId === "duplicate-detection");

    assert.deepEqual(file?.dependsOn, ["custom-check"]);
    assert.deepEqual(duplicate?.dependsOn, ["custom-check"]);
    assert.deepEqual(file?.mutex, ["metrics", "native"]);
    assert.deepEqual(normalized.declarative.checks.map(({ definition }) => definition.checkId), [
      "custom-check",
      "duplicate-detection",
      "file-metrics",
      "function-metrics"
    ]);
    assert.equal(file?.kind, "built-in");
    if (file?.kind !== "built-in" || file.definition.checkId !== "file-metrics") {
      throw new TypeError("file-metrics must remain a normalized built-in Check");
    }
    assert.deepEqual(file.options, fileMetrics.options);
    assert.deepEqual(normalized.declarative.checks.map(({ definition, maxParallel }) => ({
      checkId: definition.checkId,
      maxParallel
    })), [
      { checkId: "custom-check", maxParallel: 4 },
      { checkId: "duplicate-detection", maxParallel: 2 },
      { checkId: "file-metrics", maxParallel: 1 },
      { checkId: "function-metrics", maxParallel: 4 }
    ]);
    assert.deepEqual(normalized.declarative.checks.find(({ definition }) => definition.checkId === "function-metrics")?.mutex, ["functions"]);
  });

  it("adjusts ordinary built-in data without mutating defaults", () => {
    const adjusted = append(
      replace(fileMetrics, { maxParallel: 1, options: { codeLines: { changedDelta: 100 } } }),
      { dependsOn: ["custom-check", "custom-check"], mutex: ["metrics", "metrics"] }
    );
    const duplicate = replace(duplicateDetection, {
      options: { defaultMinimumTokens: 100, minimumTokensByCodeArea: { docs: 150 } }
    });
    const functions = replace(functionMetrics, { options: { parameterCount: { changedDelta: 7 } } });
    const normalized = normalizeProjectDefinition(defineConfig({
      checks: [customLeaf(), adjusted, duplicate, functions],
      scheduler: { maxParallel: 2 }
    }));

    assert.equal(typeof duplicateDetection, "object");
    assert.equal(typeof (duplicateDetection as unknown), "object");
    assert.equal("replace" in adjusted, false);
    assert.equal("append" in adjusted, false);
    assert.equal(adjusted.options.codeLines.changedDelta, 100);
    assert.equal(adjusted.options.codeLines.absoluteFloor, 300);
    assert.deepEqual(adjusted.dependsOn, ["custom-check"]);
    assert.deepEqual(adjusted.mutex, ["metrics"]);
    assert.deepEqual(duplicate.options.minimumTokensByCodeArea, { docs: 150 });
    assert.equal(duplicate.options.fragments.changedDelta, 1);
    assert.equal(functions.options.parameterCount.changedDelta, 7);
    assert.equal(functions.options.codeLines.changedDelta, 20);
    assert.equal(fileMetrics.options.codeLines.changedDelta, 80);
    const file = normalized.declarative.checks.find(({ definition }) => definition.checkId === "file-metrics");
    assert.deepEqual(file?.dependsOn, ["custom-check"]);
    assert.deepEqual(file?.mutex, ["metrics"]);
    assert.deepEqual(file?.kind === "built-in" ? file.options : undefined, adjusted.options);
  });

  it("rejects invalid built-in adjustments without reading accessors or freezing inputs", () => {
    const codeAreaThresholds = { docs: 150 };
    const dependencies = ["custom-check"];
    const mutexes = ["metrics"];
    const adjusted = append(
      replace(duplicateDetection, { options: { minimumTokensByCodeArea: codeAreaThresholds } }),
      { dependsOn: dependencies, mutex: mutexes }
    );
    const outerAccessor: Record<string, unknown> = {};
    const nestedAccessor: Record<string, unknown> = {};
    let reads = 0;
    Object.defineProperty(outerAccessor, "options", {
      enumerable: true,
      get: () => {
        reads += 1;
        return {};
      }
    });
    Object.defineProperty(nestedAccessor, "changedDelta", {
      enumerable: true,
      get: () => {
        reads += 1;
        return 1;
      }
    });
    const forgedName = { ...fileMetrics, displayName: "Forged metrics" };
    const forgedRecordTypes = { ...fileMetrics, recordTypes: [] };
    const recordTypesAccessor = { ...fileMetrics };
    Object.defineProperty(recordTypesAccessor, "recordTypes", {
      enumerable: true,
      get: () => {
        reads += 1;
        return fileMetrics.recordTypes;
      }
    });

    assert.equal(Object.isFrozen(codeAreaThresholds), false);
    assert.equal(Object.isFrozen(dependencies), false);
    assert.equal(Object.isFrozen(mutexes), false);
    assert.deepEqual(adjusted.options.minimumTokensByCodeArea, { docs: 150 });
    assert.deepEqual(adjusted.dependsOn, ["custom-check"]);
    assert.deepEqual(adjusted.mutex, ["metrics"]);
    assert.throws(() => unsafeReplace(duplicateDetection, { unknown: true }), TypeError);
    assert.throws(() => unsafeReplace(duplicateDetection, {
      options: { fragments: { unknown: 1 } }
    }), TypeError);
    assert.throws(() => unsafeAppend(duplicateDetection, { maxParallel: 1 }), TypeError);
    assert.throws(() => unsafeReplace(duplicateDetection, { dependsOn: "not a check id" }), TypeError);
    assert.throws(() => unsafeAppend(duplicateDetection, { dependsOn: "not a check id" }), TypeError);
    assert.throws(() => unsafeReplace(duplicateDetection, outerAccessor), TypeError);
    assert.throws(() => unsafeReplace(duplicateDetection, {
      options: { fragments: nestedAccessor }
    }), TypeError);
    assert.throws(() => replace(forgedName, {}), TypeError);
    assert.throws(() => append(forgedRecordTypes, { mutex: "metrics" }), TypeError);
    assert.throws(() => replace(recordTypesAccessor, {}), TypeError);
    assert.throws(() => replace(new Proxy(duplicateDetection, {
      ownKeys: () => {
        throw new Error("proxy trap");
      }
    }), {}), TypeError);
    assert.equal(reads, 0);
  });

  it("validates closed definitions and controls without reflecting sensitive values", () => {
    const definition = defineConfig({ checks: [customLeaf()] });
    assert.equal(validateProjectDefinition(definition).ok, true);
    assert.deepEqual(validateProjectDefinition({ ...definition, extra: "secret" }), {
      ok: false,
      error: { kind: "invalid-project-definition", path: "definition.extra", reason: "unknown-key" }
    });
    assert.deepEqual(validateProjectDefinition({
      ...definition,
      checks: [{ id: "loop", dependsOn: "loop", checks: [customLeaf()] }]
    }), {
      ok: false,
      error: { kind: "invalid-project-definition", path: "definition.checks", reason: "invalid-value" }
    });
    assert.deepEqual(validateProjectDefinition({
      ...definition,
      checks: [{ id: "group", checks: [customLeaf(), { ...fileMetrics, checkId: "custom-check" }] }]
    }).ok, false);
    assert.equal(validateProjectDefinition({
      ...definition,
      checks: [{ ...fileMetrics, dependsOn: "missing" }]
    }).ok, false);
    assert.equal(validateProjectDefinition({
      ...definition,
      checks: [{
        id: "first",
        dependsOn: "second",
        checks: [customLeaf({ checkId: "first-leaf" })]
      }, {
        id: "second",
        dependsOn: "first",
        checks: [customLeaf({ checkId: "second-leaf" })]
      }]
    }).ok, false);
    assert.deepEqual(validateProjectDefinition({
      ...definition,
      checks: [{ ...fileMetrics, displayName: "forged" }]
    }).ok, false);
    assert.deepEqual(validateProjectDefinition({
      ...definition,
      checks: [{ id: "too-wide", maxParallel: 5, checks: [customLeaf()] }]
    }).ok, false);
    assert.deepEqual(validateProjectDefinition({
      ...definition,
      checks: [customLeaf({ maxParallel: 0 })]
    }).ok, false);
    assert.deepEqual(validateProjectDefinition({
      ...definition,
      checks: [customLeaf({ maxParallel: 1.5 })]
    }).ok, false);
    assert.deepEqual(validateProjectDefinition({
      ...definition,
      quality: { ...definition.quality, artifactDir: "legacy-output" }
    }), {
      ok: false,
      error: { kind: "invalid-project-definition", path: "definition.quality", reason: "invalid-value" }
    });
    assert.deepEqual(validateProjectDefinition({
      ...definition,
      operationalDependencies: { file: { executable: "scc", extra: true } }
    }), {
      ok: false,
      error: { kind: "invalid-project-definition", path: "definition.operationalDependencies", reason: "invalid-value" }
    });
    assert.deepEqual(validateRunControls({
      operationalDependencies: { file: { executable: "scc", extra: true } }
    }), {
      ok: false,
      error: { kind: "invalid-run-controls", path: "controls.operationalDependencies", reason: "invalid-value" }
    });
    assert.deepEqual(validateProjectDefinition({
      ...definition,
      policies: { broken: { policyId: "broken" } },
      selectedPolicy: "broken"
    }), {
      ok: false,
      error: { kind: "invalid-project-definition", path: "definition.policies", reason: "invalid-value" }
    });
    assert.equal(validateProjectDefinition({
      ...definition,
      policies: {
        comparison: {
          policyId: "comparison",
          references: [
            { referenceName: "baseline", checkIds: ["custom-check"] },
            { referenceName: "release", checkIds: ["custom-check"] }
          ],
          acceptance: [],
          views: [],
          readiness: [],
          blockWhen: { kind: "run-status", checkId: "custom-check", status: "failed" }
        }
      }
    }).ok, false);
    assert.deepEqual(validateRunControls({ operationalDependencies: { file: { executable: "secret" } }, unknown: true }), {
      ok: false,
      error: { kind: "invalid-run-controls", path: "controls.unknown", reason: "unknown-key" }
    });
    {
      const accessorDefinition = { ...definition };
      let reads = 0;
      Object.defineProperty(accessorDefinition, "checks", {
        enumerable: true,
        get: () => {
          reads += 1;
          return [fileMetrics];
        }
      });
      const accessorCheck = { ...fileMetrics };
      Object.defineProperty(accessorCheck, "options", {
        enumerable: true,
        get: () => {
          reads += 1;
          return fileMetrics.options;
        }
      });

      assert.deepEqual(validateProjectDefinition(accessorDefinition), {
        ok: false,
        error: { kind: "invalid-project-definition", path: "definition", reason: "invalid-value" }
      });
      assert.deepEqual(validateProjectDefinition({ ...definition, checks: [accessorCheck] }), {
        ok: false,
        error: { kind: "invalid-project-definition", path: "definition.checks", reason: "invalid-value" }
      });
      assert.deepEqual(validateProjectDefinition(new Proxy(definition, {
        ownKeys: () => {
          throw new Error("sensitive proxy trap");
        }
      })), {
        ok: false,
        error: { kind: "invalid-project-definition", path: "definition", reason: "invalid-value" }
      });
      assert.equal(reads, 0);
    }
    {
      const plainCopy = { ...fileMetrics };
      assert.equal(Object.isFrozen(plainCopy), false);
      assert.equal(validateProjectDefinition({ ...definition, checks: [plainCopy] }).ok, true);
    }
    {
      const symbolKey = { ...fileMetrics };
      const hiddenKey = { ...fileMetrics };
      const invalidPrototype = { ...fileMetrics };
      Object.setPrototypeOf(invalidPrototype, {});
      Object.defineProperty(symbolKey, Symbol("not-public"), { enumerable: true, value: true });
      Object.defineProperty(hiddenKey, "not-public", { enumerable: false, value: true });

      assert.equal(validateProjectDefinition({ ...definition, checks: [symbolKey] }).ok, false);
      assert.equal(validateProjectDefinition({ ...definition, checks: [hiddenKey] }).ok, false);
      assert.equal(validateProjectDefinition({ ...definition, checks: [invalidPrototype] }).ok, false);
    }
  });

  it("separates frozen declarative data from function bindings and fingerprints neither binding", () => {
    const first = defineConfig({
      checks: [customLeaf({ binding: { kind: "direct", execute: () => ({ verdict: "passed" as const }) } })],
      operationalDependencies: { file: { executable: "/first/scc" } },
      policies: { gate: policy("unavailable") },
      selectedPolicy: "gate"
    });
    const second = defineConfig({
      checks: [customLeaf({ binding: { kind: "direct", execute: () => Promise.resolve({ verdict: "passed" as const }) } })],
      operationalDependencies: { file: { executable: "/second/scc" } },
      policies: { gate: policy("completed") },
      selectedPolicy: "gate"
    });
    const normalizedFirst = normalizeProjectDefinition(first);
    const normalizedSecond = normalizeProjectDefinition(second);

    assert.equal(Object.isFrozen(normalizedFirst.declarative), true);
    assert.equal(createDeclarativeFingerprint(normalizedFirst.declarative), createDeclarativeFingerprint(normalizedSecond.declarative));
    assert.doesNotMatch(JSON.stringify(normalizedFirst.declarative), /execute|\/first\/scc|blockWhen/);

    const ordered = defineConfig({
      checks: [{ id: "analysis", checks: [
        customLeaf({ checkId: "alpha" }),
        customLeaf({ checkId: "beta", dependsOn: "alpha" })
      ] }, fileMetrics]
    });
    const reordered = defineConfig({
      checks: [fileMetrics, { id: "analysis", checks: [
        customLeaf({ checkId: "beta", dependsOn: "alpha" }),
        customLeaf({ checkId: "alpha" })
      ] }]
    });
    assert.equal(
      createDeclarativeFingerprint(normalizeProjectDefinition(ordered).declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(reordered).declarative)
    );

    const adjustedDefinition = defineConfig({
      checks: [replace(fileMetrics, { options: { codeLines: { absoluteFloor: 123 } } })]
    });
    const spreadAdjusted = defineConfig({
      checks: [replace({ ...fileMetrics }, { options: { codeLines: { absoluteFloor: 123 } } })]
    });
    assert.equal(
      createDeclarativeFingerprint(normalizeProjectDefinition(adjustedDefinition).declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(spreadAdjusted).declarative)
    );
  });

  // @ts-expect-error defineConfig rejects unknown top-level authoring keys.
  defineConfig({ unsupported: true });
});

function unsafeReplace(check: unknown, replacement: unknown): unknown {
  return Reflect.apply(replace, undefined, [check, replacement]);
}

function unsafeAppend(check: unknown, additions: unknown): unknown {
  return Reflect.apply(append, undefined, [check, additions]);
}

function _typeCheckBuiltInAdjustments() {
  const _duplicate: typeof duplicateDetection = replace(duplicateDetection, {
    options: { fragments: { changedDelta: 2 } }
  });
  const _file: typeof fileMetrics = replace(fileMetrics, {
    options: { codeLines: { absoluteFloor: 123 } }
  });
  const _functions: typeof functionMetrics = replace(functionMetrics, {
    options: { cyclomaticComplexity: { changedDelta: 4 } }
  });

  // @ts-expect-error a built-in replacement cannot introduce unknown public options.
  replace(duplicateDetection, { options: { unsupported: true } });
  // @ts-expect-error append is only for collection scheduling fields.
  append(duplicateDetection, { maxParallel: 1 });
}

function _typeCheckCustomCheckAuthoring() {
  const _custom: CustomCheck = {
    kind: "custom",
    checkId: "typed-custom",
    displayName: "Typed custom",
    recordTypes: [],
    applicability: (context) => {
      void context.definition.checkId;
      return { status: "applicable" };
    },
    binding: {
      kind: "task-plan",
      createTaskPlan: (context) => {
        void context.definition;
        return {
          tasks: [{
          id: "measure",
          run: ({ results, signal }) => {
            void signal.aborted;
            results.report({
              recordTypeId: "typed-record",
              level: "warning",
              semanticSubject: "subject",
              message: "message",
              fields: {},
              location: null
            });
          }
          }],
          complete: (outcomes, { signal }) => {
            void outcomes.measure;
            void signal.aborted;
            return { verdict: "passed" };
          }
        };
      }
    }
  };

  // @ts-expect-error scheduler-private Task definitions are not authoring exports.
  type _NoSchedulerTaskDefinition = import("./project.ts").TaskDefinition;
  const _noProvenance: import("./project.ts").QualityRecordCandidate = {
    // @ts-expect-error user code cannot supply Core-owned Check identity on a record candidate.
    checkId: "typed-custom",
    recordTypeId: "typed-record",
    level: "info",
    semanticSubject: "subject",
    message: "message",
    fields: {},
    location: null
  };
  void _noProvenance;
}

function policy(outcome: "completed" | "unavailable") {
  return {
    policyId: "gate",
    references: [],
    acceptance: [],
    views: [],
    readiness: [],
    blockWhen: { kind: "check-outcome" as const, checkId: "custom-check", outcome }
  };
}
