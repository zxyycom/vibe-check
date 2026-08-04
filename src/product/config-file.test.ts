import { strict as assert } from "node:assert";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  LegacyProjectConfigError,
  loadSemanticProjectConfig,
  ProjectConfigError
} from "./config-file.ts";
import { semanticConfigInput } from "./config-test-input.ts";

describe("semantic project config file loading", () => {
  it("loads and validates a complete UTF-8 semantic document", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-config-valid-"));
    const configPath = join(tempDir, "quality.json");

    try {
      const input = semanticConfigInput();
      writeFileSync(configPath, JSON.stringify(input), "utf8");

      const parsed = await loadSemanticProjectConfig(configPath);

      assert.equal(parsed.version, "1");
      assert.deepEqual(parsed, input);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("wraps file, UTF-8, JSON, object, and structure failures with the config path and cause", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-config-invalid-"));
    const cases = [
      {
        path: join(tempDir, "missing.json"),
        prepare: () => undefined
      },
      {
        path: join(tempDir, "directory.json"),
        prepare: (path: string) => mkdirSync(path)
      },
      {
        path: join(tempDir, "invalid-utf8.json"),
        prepare: (path: string) => writeFileSync(path, Buffer.from([0xff]))
      },
      {
        path: join(tempDir, "invalid-json.json"),
        prepare: (path: string) => writeFileSync(path, "{", "utf8")
      },
      {
        path: join(tempDir, "array.json"),
        prepare: (path: string) => writeFileSync(path, "[]", "utf8")
      },
      {
        path: join(tempDir, "incomplete.json"),
        prepare: (path: string) => writeFileSync(path, "{\"version\":\"only\"}", "utf8")
      },
      {
        expectedCause: /config\.\$schema/,
        path: join(tempDir, "invalid-schema-reference.json"),
        prepare: (path: string) => writeFileSync(
          path,
          JSON.stringify({
            ...semanticConfigInput(),
            $schema: 1
          }),
          "utf8"
        )
      }
    ] as const;

    try {
      for (const testCase of cases) {
        testCase.prepare(testCase.path);
        await assert.rejects(
          loadSemanticProjectConfig(testCase.path),
          (error: unknown) => {
            assert.ok(error instanceof ProjectConfigError);
            assert.equal(error.code, "invalid-project-config");
            assert.equal(error.configPath, testCase.path);
            assert.ok(error.message.includes(`config "${testCase.path}"`));
            assert.ok(error.cause instanceof Error);
            if ("expectedCause" in testCase) {
              assert.match(error.cause.message, testCase.expectedCause);
            }
            return true;
          }
        );
      }
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("rejects legacy tool-shaped documents with actionable migration guidance", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-config-legacy-"));
    const configPath = join(tempDir, "quality.json");
    const secretCommand = "must-not-appear-or-run";

    try {
      writeFileSync(configPath, JSON.stringify({
        jscpd: { defaultMinimumTokens: 75 },
        lizard: { cyclomaticComplexity: { absoluteFloor: 10 } },
        scc: { fileCodeLines: { absoluteFloor: 300 } },
        tools: { lizard: { args: ["--secret"], command: secretCommand } },
        version: "0.2.0"
      }), "utf8");

      await assert.rejects(
        loadSemanticProjectConfig(configPath),
        (error: unknown) => {
          assert.ok(error instanceof LegacyProjectConfigError);
          assert.equal(error.code, "legacy-project-config");
          assert.match(error.message, /version "1"/);
          assert.match(error.message, /checks\.files/);
          assert.match(error.message, /checks\.functions/);
          assert.match(error.message, /checks\.duplication/);
          assert.match(error.message, /VIBE_CHECK_LIZARD_CMD/);
          assert.match(error.message, /VIBE_CHECK_SCC_ARGS/);
          assert.match(error.message, /VIBE_CHECK_JSCPD_ARGS/);
          assert.ok(!error.message.includes(secretCommand));
          assert.ok(!error.message.includes("--secret"));
          return true;
        }
      );
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });
});
