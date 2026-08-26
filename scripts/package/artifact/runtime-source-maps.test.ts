import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  assertRuntimeSourceMapMatchesSource,
  normalizeRuntimeSourceMap
} from "./runtime-source-maps.ts";

describe("runtime source maps", () => {
  it("normalizes and verifies one map against its packaged TypeScript source", () => {
    const stagingDirectory = mkdtempSync(join(tmpdir(), "vibe-check-source-map-"));
    try {
      const modulePath = join(stagingDirectory, "dist", "esm", "nested", "example.mjs");
      const sourceMapPath = `${modulePath}.map`;
      const packagedSourcePath = join(stagingDirectory, "src", "nested", "example.ts");
      const packagedSource = "export const example: number = 1;\n";
      mkdirSync(join(stagingDirectory, "dist", "esm", "nested"), { recursive: true });
      mkdirSync(join(stagingDirectory, "src", "nested"), { recursive: true });
      writeFileSync(packagedSourcePath, packagedSource, "utf8");

      const normalized = normalizeRuntimeSourceMap({
        modulePath,
        source: JSON.stringify({
          file: "example.js",
          mappings: "",
          names: [],
          sources: ["../../../../repository-files/src/nested/example.ts"],
          sourcesContent: [packagedSource],
          version: 3
        }),
        sourceMapPath: `${modulePath.slice(0, -".mjs".length)}.js.map`,
        stagingDirectory
      });
      writeFileSync(sourceMapPath, normalized, "utf8");

      const normalizedMap: unknown = JSON.parse(readFileSync(sourceMapPath, "utf8"));
      assert.deepEqual(normalizedMap, {
        file: "example.mjs",
        mappings: "",
        names: [],
        sources: ["../../../src/nested/example.ts"],
        sourcesContent: [packagedSource],
        version: 3
      });
      assert.doesNotThrow(() =>
        assertRuntimeSourceMapMatchesSource({ sourceMapPath, stagingDirectory })
      );

      writeFileSync(packagedSourcePath, "export const example = 2;\n", "utf8");
      assert.throws(
        () => assertRuntimeSourceMapMatchesSource({ sourceMapPath, stagingDirectory }),
        /source map content differs from packaged source/
      );
    } finally {
      rmSync(stagingDirectory, { force: true, recursive: true });
    }
  });
});
