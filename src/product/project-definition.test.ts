import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  duplicateDetection,
  fileMetrics,
  createDeclarativeFingerprint,
  defineConfig,
  normalizeProjectDefinition
} from "./project-definition.ts";
import { validateProjectDefinition } from "./project-definition-validation.ts";
import { validateRunControls } from "./run-control-validation.ts";

const customLeaf = (overrides: Readonly<Record<string, unknown>> = {}) => ({
  kind: "custom" as const,
  checkId: "custom-check",
  displayName: "Custom check",
  recordTypes: [],
  applicability: () => ({ status: "applicable" as const, workHandles: [] }),
  binding: { kind: "direct" as const, execute: () => undefined },
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
      checks: [customLeaf(), {
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
    const file = normalized.declarative.checks.schedules.find(({ checkId }) => checkId === "file-metrics");
    const duplicate = normalized.declarative.checks.schedules.find(({ checkId }) => checkId === "duplicate-detection");

    assert.deepEqual(file?.requiresChecks, ["custom-check"]);
    assert.deepEqual(duplicate?.requiresChecks, ["custom-check"]);
    assert.deepEqual(normalized.declarative.checks.mutexes.find(({ checkId }) => checkId === "file-metrics")?.mutex, ["metrics", "native"]);
    assert.deepEqual([...normalized.declarative.checks.selected].sort(), [
      "custom-check",
      "duplicate-detection",
      "file-metrics"
    ]);
    assert.equal(normalized.builtInOptions["file-metrics"]?.codeLines.absoluteFloor, 300);
    assert.deepEqual(normalized.checkMaxParallelById, {
      "custom-check": 4,
      "duplicate-detection": 2,
      "file-metrics": 1
    });
    assert.deepEqual(normalized.declarative.checks.maxParallel, [
      { checkId: "custom-check", maxParallel: 4 },
      { checkId: "duplicate-detection", maxParallel: 2 },
      { checkId: "file-metrics", maxParallel: 1 }
    ]);
  });

  it("exports frozen non-callable built-in defaults for ordinary TypeScript composition", () => {
    const overridden = {
      ...fileMetrics,
      options: {
        ...fileMetrics.options,
        codeLines: { ...fileMetrics.options.codeLines, absoluteFloor: 123 }
      }
    };

    assert.equal(Object.isFrozen(duplicateDetection), true);
    assert.equal(typeof duplicateDetection, "object");
    assert.equal(typeof (duplicateDetection as unknown), "object");
    assert.equal(overridden.options.codeLines.absoluteFloor, 123);
    assert.equal(fileMetrics.options.codeLines.absoluteFloor, 300);
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
  });

  it("separates frozen declarative data from function bindings and fingerprints neither binding", () => {
    const first = defineConfig({
      checks: [customLeaf({ binding: { kind: "direct", execute: () => undefined } })],
      operationalDependencies: { file: { executable: "/first/scc" } },
      policies: { gate: policy("failed") },
      selectedPolicy: "gate"
    });
    const second = defineConfig({
      checks: [customLeaf({ binding: { kind: "direct", execute: () => Promise.resolve() } })],
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
  });

  // @ts-expect-error defineConfig rejects unknown top-level authoring keys.
  defineConfig({ unsupported: true });
});

function policy(status: "completed" | "failed") {
  return {
    policyId: "gate",
    references: [],
    acceptance: [],
    views: [],
    readiness: [],
    blockWhen: { kind: "run-status" as const, checkId: "custom-check", status }
  };
}
