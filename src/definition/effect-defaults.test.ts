import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_PROJECT_EFFECTS } from "./effect-defaults.ts";
import { defineConfig } from "./project-definition.ts";

describe("Project Definition effect defaults", () => {
  it("uses the Definition-owned default effect values", () => {
    assert.deepEqual(DEFAULT_PROJECT_EFFECTS, {
      cache: { directory: ".cache/vibe-check", enabled: true },
      output: { directory: "artifacts/vibe-check", enabled: true },
      progress: { enabled: true }
    });
    assert.deepEqual(defineConfig({}).effects, DEFAULT_PROJECT_EFFECTS);
  });
});
