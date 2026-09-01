import assert from "node:assert/strict";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import {
  defineAdmissionPolicy,
  defineConfig,
  normalizeProjectDefinition
} from "./project-definition.ts";
import { validateProjectDefinition } from "./project-definition-validation.ts";

describe("Project Definition", () => {
  it("creates a plain value with Product-owned authoring defaults", () => {
    const definition = defineConfig({});

    assert.deepEqual(definition.checks, []);
    assert.deepEqual(definition.outputs, {
      machinePublication: { directory: "artifacts/vibe-check", enabled: true },
      progressRendering: { enabled: true },
      diagnosticLogging: { directory: ".log/vibe-check", enabled: false }
    });
    assert.equal(definition.apiVersion, "1");
    assert.equal(definition.scheduler.maxParallel, 4);
    assert.deepEqual(definition.scheduler.admissionPolicy, { kind: "static" });
    assert.deepEqual(
      normalizeProjectDefinition(defineConfig({})).declarative.scheduler,
      normalizeProjectDefinition(
        defineConfig({ scheduler: { admissionPolicy: { kind: "static" } } })
      ).declarative.scheduler
    );

    const policy = defineAdmissionPolicy({
      kind: "custom",
      proposeAdmission(context) {
        const candidate = context.candidates.find(({ canAdmit }) => canAdmit);
        return candidate === undefined
          ? { kind: "wait" as const }
          : { kind: "select" as const, taskId: candidate.taskId };
      }
    });
    const customDefinition = defineConfig({ scheduler: { admissionPolicy: policy } });
    assert.equal(customDefinition.scheduler.admissionPolicy, policy);
    assert.equal(validateProjectDefinition(customDefinition).ok, true);
    assert.equal(
      validateProjectDefinition({ ...definition, scheduler: { maxParallel: 1 } }).ok,
      true
    );
    const normalizedCustomDefinition = normalizeProjectDefinition(customDefinition);
    assert.equal(normalizedCustomDefinition.scheduler.admissionPolicy.kind, "custom");
    if (normalizedCustomDefinition.scheduler.admissionPolicy.kind === "custom") {
      assert.equal(
        normalizedCustomDefinition.scheduler.admissionPolicy.proposeAdmission,
        Reflect.get(policy, "proposeAdmission")
      );
    }
    for (const scheduler of [
      { admissionPolicy: { kind: "static", extra: true }, maxParallel: 1 },
      { admissionPolicy: { kind: "custom" }, maxParallel: 1 },
      { admissionPolicy: { kind: "custom", proposeAdmission: 1 }, maxParallel: 1 },
      { admissionPolicy: { kind: "unknown" }, maxParallel: 1 },
      { admissionPolicy: undefined, maxParallel: 1 },
      { admissionPolicy: { kind: "static" }, maxParallel: 1, unexpected: true }
    ]) {
      assert.equal(validateProjectDefinition({ ...definition, scheduler }).ok, false);
    }
    for (const directory of ["nested/output", "../outside-project", resolve("vibe-check-output")]) {
      assert.equal(
        validateProjectDefinition({
          ...definition,
          outputs: {
            ...definition.outputs,
            machinePublication: { directory, enabled: true },
            diagnosticLogging: { directory, enabled: true }
          }
        }).ok,
        true
      );
    }
    for (const directory of ["", "directory\0with-nul"]) {
      assert.equal(
        validateProjectDefinition({
          ...definition,
          outputs: {
            ...definition.outputs,
            machinePublication: { directory, enabled: true },
            diagnosticLogging: { directory, enabled: true }
          }
        }).ok,
        false
      );
    }
    for (const output of [
      { directory: 1, enabled: true },
      { directory: "directory", enabled: true, unexpected: true }
    ]) {
      assert.equal(
        validateProjectDefinition({
          ...definition,
          outputs: { ...definition.outputs, diagnosticLogging: output }
        }).ok,
        false
      );
    }
    assert.equal(Object.getPrototypeOf(definition), Object.prototype);
  });
});
