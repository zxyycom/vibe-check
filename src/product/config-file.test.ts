import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { loadQualityConfig } from "./config-file.ts";
import { parseQualityConfig } from "./config-parser.ts";
import { DEFAULT_CONFIG } from "./config.ts";

describe("complete quality config parsing", () => {
  it("returns a detached QualityConfig with the supplied values unchanged", () => {
    const input = configInput();
    input.version = "fixture-config-1";
    input.include = ["custom/**/*.ts"];
    input.tools = {
      jscpd: { args: ["tools/scanner.ts", "jscpd"], command: "bun" },
      lizard: { args: ["tools/scanner.ts", "lizard"], command: "bun" },
      scc: { args: ["tools/scanner.ts", "scc"], command: "bun" }
    };

    const parsed = parseQualityConfig(input);

    assert.deepEqual(parsed, input);
    assert.notStrictEqual(parsed, input);
    assert.notStrictEqual(parsed.include, input.include);
    assert.notStrictEqual(parsed.report, input.report);
    assert.notStrictEqual(parsed.tools, input.tools);

    (input.include as string[]).push("later/**/*.ts");
    assert.deepEqual(parsed.include, ["custom/**/*.ts"]);
  });

  it("rejects incomplete, unknown, and invalid nested values", () => {
    const cases: ReadonlyArray<{
      mutate: (input: Record<string, unknown>) => void;
      expected: RegExp;
    }> = [
      {
        mutate: (input) => {
          delete input.version;
        },
        expected: /config is missing required field "version"/
      },
      {
        mutate: (input) => {
          input.unexpected = true;
        },
        expected: /config has unknown field "unexpected"/
      },
      {
        mutate: (input) => {
          (input.report as Record<string, unknown>).unexpected = true;
        },
        expected: /config\.report has unknown field "unexpected"/
      },
      {
        mutate: (input) => {
          (input.report as Record<string, unknown>).topN = "10";
        },
        expected: /config\.report\.topN must be a finite number/
      },
      {
        mutate: (input) => {
          (input.report as Record<string, unknown>).timeZone = "Not/A_Real_Zone";
        },
        expected: /config\.report\.timeZone must be a valid time zone/
      },
      {
        mutate: (input) => {
          const codeAreas = input.codeAreas as Record<string, Record<string, unknown>>;
          codeAreas["product-source"]!.warningPolicy = "sometimes";
        },
        expected: /config\.codeAreas\.product-source\.warningPolicy must be one of/
      },
      {
        mutate: (input) => {
          input.acceptedWarnings = [{
            reason: "known",
            ruleId: "rule",
            unexpected: true
          }];
        },
        expected: /config\.acceptedWarnings\[0\] has unknown field "unexpected"/
      }
    ];

    for (const testCase of cases) {
      const input = configInput();
      testCase.mutate(input);
      assert.throws(() => parseQualityConfig(input), testCase.expected);
    }
  });

  it("rejects non-object input", () => {
    for (const input of [null, [], "config", 1, true]) {
      assert.throws(() => parseQualityConfig(input), /config must be an object/);
    }
  });
});

describe("quality config file loading", () => {
  it("loads a complete UTF-8 JSON file", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-config-valid-"));
    const configPath = join(tempDir, "quality.json");

    try {
      const input = configInput();
      input.version = "loaded-config";
      writeFileSync(configPath, JSON.stringify(input), "utf8");

      const parsed = await loadQualityConfig(configPath);

      assert.equal(parsed.version, "loaded-config");
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
      }
    ] as const;

    try {
      for (const testCase of cases) {
        testCase.prepare(testCase.path);
        await assert.rejects(
          loadQualityConfig(testCase.path),
          (error: unknown) => {
            assert.ok(error instanceof Error);
            assert.ok(error.message.includes(`config "${testCase.path}"`));
            assert.ok(error.cause instanceof Error);
            return true;
          }
        );
      }
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });
});

function configInput(): Record<string, unknown> {
  return structuredClone(DEFAULT_CONFIG) as unknown as Record<string, unknown>;
}
