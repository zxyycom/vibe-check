import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createDeclarativeFingerprint,
  defineConfig,
  normalizeProjectDefinition
} from "./project-definition.ts";
import {
  validateProjectDefinition
} from "./project-definition-validation.ts";
import { validateRunControls } from "./run-control-validation.ts";

describe("Project Definition", () => {
  it("creates a plain value with product-owned authoring defaults", () => {
    const definition = defineConfig({});

    assert.deepEqual(definition.effects, {
      cache: { directory: ".cache/vibe-check", enabled: true },
      logs: { enabled: true },
      output: { directory: "artifacts/vibe-check", enabled: true },
      progress: { enabled: true }
    });
    assert.equal(definition.apiVersion, "1");
    assert.equal(definition.scheduler.maxParallel, 4);
    assert.equal("acceptedWarnings" in definition.quality, false);
    assert.equal("artifactDir" in definition.quality, false);
    assert.equal("cacheDir" in definition.quality, false);
    assert.equal("version" in definition.quality, false);
    assert.equal(Object.getPrototypeOf(definition), Object.prototype);
  });

  it("validates closed definitions and controls without reflecting sensitive values", () => {
    const definition = defineConfig({});
    assert.equal(validateProjectDefinition(definition).ok, true);
    assert.deepEqual(validateProjectDefinition({ ...definition, extra: "secret" }), {
      ok: false,
      error: {
        kind: "invalid-project-definition",
        path: "definition.extra",
        reason: "unknown-key"
      }
    });
    assert.deepEqual(validateRunControls({ operationalDependencies: { file: { executable: "secret" } }, unknown: true }), {
      ok: false,
      error: {
        kind: "invalid-run-controls",
        path: "controls.unknown",
        reason: "unknown-key"
      }
    });
    assert.deepEqual(validateProjectDefinition({
      ...definition,
      quality: { ...definition.quality, artifactDir: "legacy-output" }
    }), {
      ok: false,
      error: {
        kind: "invalid-project-definition",
        path: "definition.quality",
        reason: "invalid-value"
      }
    });
    assert.deepEqual(validateProjectDefinition({
      ...definition,
      operationalDependencies: { file: { executable: "scc", extra: true } }
    }), {
      ok: false,
      error: {
        kind: "invalid-project-definition",
        path: "definition.operationalDependencies",
        reason: "invalid-value"
      }
    });
    assert.deepEqual(validateRunControls({
      operationalDependencies: { file: { executable: "scc", extra: true } }
    }), {
      ok: false,
      error: {
        kind: "invalid-run-controls",
        path: "controls.operationalDependencies",
        reason: "invalid-value"
      }
    });
    assert.deepEqual(validateProjectDefinition({
      ...definition,
      policies: { broken: { policyId: "broken" } },
      selectedPolicy: "broken"
    }), {
      ok: false,
      error: {
        kind: "invalid-project-definition",
        path: "definition.policies",
        reason: "invalid-value"
      }
    });
    const definitionWithCheck = defineConfig({
      checks: {
        custom: [customCheck(() => undefined)],
        schedules: [{ checkId: "custom-check", requiresChecks: [] }],
        selected: ["custom-check"]
      }
    });
    assert.deepEqual(validateProjectDefinition({
      ...definitionWithCheck,
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
  });

  it("separates frozen declarative data from function bindings and fingerprints neither binding", () => {
    const first = defineConfig({
      checks: {
        custom: [customCheck(() => undefined)],
        schedules: [{ checkId: "custom-check", requiresChecks: [] }],
        selected: ["custom-check"]
      },
      operationalDependencies: { file: { executable: "/first/scc" } },
      policies: { gate: customPolicy("failed") },
      selectedPolicy: "gate"
    });
    const second = defineConfig({
      checks: {
        custom: [customCheck(() => Promise.resolve())],
        schedules: [{ checkId: "custom-check", requiresChecks: [] }],
        selected: ["custom-check"]
      },
      operationalDependencies: { file: { executable: "/second/scc" } },
      policies: { gate: customPolicy("completed") },
      selectedPolicy: "gate"
    });

    const normalizedFirst = normalizeProjectDefinition(first);
    const normalizedSecond = normalizeProjectDefinition(second);

    assert.equal(Object.isFrozen(normalizedFirst.declarative), true);
    assert.equal(normalizedFirst.declarative.checks.custom[0]?.checkId, "custom-check");
    assert.equal(normalizedFirst.bindings.customChecks.get("custom-check")?.binding.kind, "direct");
    assert.equal(createDeclarativeFingerprint(normalizedFirst.declarative), createDeclarativeFingerprint(normalizedSecond.declarative));
    assert.deepEqual(Object.keys(normalizedFirst.declarative.checks.custom[0] ?? {}), [
      "checkId",
      "displayName",
      "recordTypes"
    ]);
    assert.doesNotMatch(JSON.stringify(normalizedFirst.declarative), /createTaskPlan/);
    assert.doesNotMatch(JSON.stringify(normalizedFirst.declarative), /\/first\/scc|blockWhen/);
  });

  // @ts-expect-error defineConfig rejects unknown top-level authoring keys.
  defineConfig({ unsupported: true });
});

function customCheck(execute: () => unknown) {
  return {
    definition: {
      checkId: "custom-check",
      displayName: "Custom check",
      recordTypes: []
    },
    applicability: () => ({ status: "applicable", workHandles: [] }),
    binding: { kind: "direct" as const, execute }
  };
}

function customPolicy(status: "completed" | "failed") {
  return {
    policyId: "gate",
    references: [],
    acceptance: [],
    views: [],
    readiness: [],
    blockWhen: { kind: "run-status" as const, checkId: "custom-check", status }
  };
}
