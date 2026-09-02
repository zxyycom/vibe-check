import assert from "node:assert/strict";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import {
  defineAdmissionPolicy,
  defineConfig,
  normalizeProjectDefinition
} from "./project-definition.ts";
import { validateProjectDefinition } from "./project-definition-validation.ts";
import type { ProjectDefinition } from "./project-definition.ts";

describe("Project Definition", () => {
  it("creates a plain value with Product-owned authoring defaults", () => {
    const definition = defineConfig({});
    assertDefinitionDefaults(definition);
    assertCustomAdmissionPolicy();
    assertLearnedCriticalPathAdmissionPolicy();
    assertSchedulerValidation(definition);
    assertOutputDirectoryValidation(definition);
    assert.equal(Object.getPrototypeOf(definition), Object.prototype);
  });
});

function assertDefinitionDefaults(definition: ProjectDefinition): void {
  assert.deepEqual(definition.checks, []);
  assert.deepEqual(definition.outputs, {
    machinePublication: { directory: "artifacts/vibe-check", enabled: true },
    progressRendering: { enabled: true },
    diagnosticLogging: { directory: ".log/vibe-check", enabled: false }
  });
  assert.equal(definition.apiVersion, "1");
  assert.equal(definition.scheduler.maxParallel, 4);
  assert.deepEqual(definition.scheduler.admissionPolicy, { kind: "static" });
  assert.deepEqual(definition.scheduler.measurementHooks, []);
  assert.deepEqual(
    normalizeProjectDefinition(defineConfig({})).declarative.scheduler,
    normalizeProjectDefinition(defineConfig({ scheduler: { admissionPolicy: { kind: "static" } } }))
      .declarative.scheduler
  );
}

function assertCustomAdmissionPolicy(): void {
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
  const normalized = normalizeProjectDefinition(customDefinition);
  assert.equal(normalized.scheduler.admissionPolicy.kind, "custom");
  if (normalized.scheduler.admissionPolicy.kind === "custom") {
    assert.equal(
      normalized.scheduler.admissionPolicy.proposeAdmission,
      Reflect.get(policy, "proposeAdmission")
    );
  }
}

function assertLearnedCriticalPathAdmissionPolicy(): void {
  const policy = defineAdmissionPolicy({
    kind: "learned-critical-path",
    stateDirectory: ".vibe-check/duration-state"
  });
  const definition = defineConfig({ scheduler: { admissionPolicy: policy } });
  assert.equal(definition.scheduler.admissionPolicy, policy);
  assert.equal(validateProjectDefinition(definition).ok, true);
  assert.deepEqual(normalizeProjectDefinition(definition).scheduler.admissionPolicy, policy);
}

function assertSchedulerValidation(definition: ProjectDefinition): void {
  assert.equal(
    validateProjectDefinition({ ...definition, scheduler: { maxParallel: 1 } }).ok,
    true
  );
  for (const scheduler of [
    { admissionPolicy: { kind: "static", extra: true }, maxParallel: 1 },
    { admissionPolicy: { kind: "custom" }, maxParallel: 1 },
    {
      admissionPolicy: { kind: "custom", proposeAdmission: 1 },
      maxParallel: 1
    },
    { admissionPolicy: { kind: "learned-critical-path" }, maxParallel: 1 },
    {
      admissionPolicy: { kind: "learned-critical-path", stateDirectory: 1 },
      maxParallel: 1
    },
    {
      admissionPolicy: { kind: "learned-critical-path", stateDirectory: "" },
      maxParallel: 1
    },
    {
      admissionPolicy: { kind: "learned-critical-path", stateDirectory: "state\0directory" },
      maxParallel: 1
    },
    {
      admissionPolicy: {
        kind: "learned-critical-path",
        stateDirectory: "state-directory",
        unexpected: true
      },
      maxParallel: 1
    },
    { admissionPolicy: { kind: "unknown" }, maxParallel: 1 },
    { admissionPolicy: undefined, maxParallel: 1 },
    {
      admissionPolicy: { kind: "static" },
      maxParallel: 1,
      measurementHooks: ["invalid"]
    },
    { admissionPolicy: { kind: "static" }, maxParallel: 1, unexpected: true }
  ]) {
    assert.equal(validateProjectDefinition({ ...definition, scheduler }).ok, false);
  }
}

function assertOutputDirectoryValidation(definition: ProjectDefinition): void {
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
}
