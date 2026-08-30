import assert from "node:assert/strict";
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
    assert.equal(
      validateProjectDefinition({
        ...definition,
        outputs: {
          ...definition.outputs,
          diagnosticLogging: { directory: "../outside-project", enabled: true }
        }
      }).ok,
      false
    );
    assert.equal(Object.getPrototypeOf(definition), Object.prototype);
  });
});
