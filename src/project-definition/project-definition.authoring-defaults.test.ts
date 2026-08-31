import assert from "node:assert/strict";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import { defineConfig } from "./project-definition.ts";
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
