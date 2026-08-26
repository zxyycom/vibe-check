import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_PROJECT_OUTPUTS } from "./output-defaults.ts";
import { defineConfig } from "./project-definition.ts";

describe("Project Definition output defaults", () => {
  it("uses the Definition-owned default output values", () => {
    assert.deepEqual(DEFAULT_PROJECT_OUTPUTS, {
      machinePublication: { directory: "artifacts/vibe-check", enabled: true },
      progressRendering: { enabled: true }
    });
    assert.deepEqual(defineConfig({}).outputs, DEFAULT_PROJECT_OUTPUTS);
  });
});
