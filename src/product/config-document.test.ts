import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { loadSemanticProjectConfig } from "./config-file.ts";
import type { SelectedConfig } from "./config-selection.ts";
import { NeutralProjectConfig } from "./config.ts";
import {
  ConfigDocumentSchema,
  SemanticProjectConfigV1Schema,
  type ConfigDocument,
  type SemanticProjectConfigV1
} from "./config-schema.ts";
import { resolveQualityConfig } from "./config-resolution.ts";
import {
  parseConfigDocument,
  parseSemanticProjectConfigV1
} from "./config-validation.ts";

describe("neutral project config foundation", () => {
  it("pins the complete neutral semantic value and maps a detached runtime config", () => {
    const expected = neutralProjectConfigInput();

    assert.deepEqual(NeutralProjectConfig, expected);
    assert.deepEqual(parseSemanticProjectConfigV1(NeutralProjectConfig), expected);

    const resolved = resolveQualityConfig(NeutralProjectConfig);
    assert.deepEqual(resolved, expected);
    assert.notStrictEqual(resolved, NeutralProjectConfig);
    assert.notStrictEqual(resolved.checks, NeutralProjectConfig.checks);
    assert.notStrictEqual(resolved.include, NeutralProjectConfig.include);
    assert.ok(Object.isFrozen(resolved));

    const selections = [
      { config: resolved, source: "default" },
      {
        config: resolved,
        path: "/project/explicit.json",
        source: "explicit"
      },
      {
        config: resolved,
        path: "/project/.vibe-check/config.json",
        source: "discovered"
      }
    ] satisfies readonly SelectedConfig[];
    assert.deepEqual(
      selections.map((selection) => selection.source),
      ["default", "explicit", "discovered"]
    );
    assert.equal("path" in selections[0], false);
  });

  it("composes optional authoring metadata over the closed semantic schema and detaches it", () => {
    const input: ConfigDocument = {
      $schema: "./config.schema.json",
      ...neutralProjectConfigInput()
    };

    assert.deepEqual(
      Object.keys(ConfigDocumentSchema.properties).sort(),
      [...Object.keys(SemanticProjectConfigV1Schema.properties), "$schema"].sort()
    );
    assert.strictEqual(
      ConfigDocumentSchema.properties.checks,
      SemanticProjectConfigV1Schema.properties.checks
    );
    assertClosedObjectSchemas(ConfigDocumentSchema);

    const parsed = parseConfigDocument(input);
    assert.deepEqual(parsed, NeutralProjectConfig);
    assert.notStrictEqual(parsed, input);
    assert.notStrictEqual(parsed.include, input.include);
    assert.equal(Object.hasOwn(parsed, "$schema"), false);

    input.include.push("later/**/*.ts");
    assert.deepEqual(parsed.include, ["**/*"]);

    assert.deepEqual(
      parseConfigDocument(neutralProjectConfigInput()),
      NeutralProjectConfig
    );
    assert.throws(
      () => parseConfigDocument({ ...input, $schema: 1 }),
      /config\.\$schema/
    );
    assert.throws(
      () => parseConfigDocument({ ...input, unexpected: true }),
      /config\.unexpected/
    );

    const invalidTimeZone = structuredClone(input);
    invalidTimeZone.report.timeZone = "Not/A_Real_Zone";
    assert.throws(
      () => parseConfigDocument(invalidTimeZone),
      /config\.report\.timeZone/
    );
  });
});

describe("semantic project config file loading", () => {
  it("loads equivalent strict and annotated documents through one detached semantic mapping", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-config-jsonc-"));
    const strictPath = join(tempDir, "strict.json");
    const annotatedPath = join(tempDir, "annotated.json");

    try {
      const expected = neutralProjectConfigInput();
      const annotatedDocument: ConfigDocument = {
        $schema: "./config.schema.json",
        ...expected
      };
      const annotatedSource = [
        "// Vibe Check JSON accepts line comments.",
        "/* It also accepts block comments and trailing commas. */",
        JSON.stringify(annotatedDocument, null, 2).replace(/\n}$/, ",\n}")
      ].join("\n");
      writeFileSync(strictPath, JSON.stringify(expected), "utf8");
      writeFileSync(annotatedPath, annotatedSource, "utf8");

      const strict = await loadSemanticProjectConfig(strictPath);
      const annotated = await loadSemanticProjectConfig(annotatedPath);

      assert.deepEqual(strict, expected);
      assert.deepEqual(annotated, expected);
      assert.deepEqual(annotated, NeutralProjectConfig);
      assert.notStrictEqual(strict, annotated);
      assert.notStrictEqual(strict.checks, annotated.checks);
      assert.equal(Object.hasOwn(annotated, "$schema"), false);

      strict.include.push("later/**/*.ts");
      assert.deepEqual(annotated.include, ["**/*"]);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });
});

function neutralProjectConfigInput(): SemanticProjectConfigV1 {
  return {
    acceptedWarnings: [],
    artifactDir: "artifacts/vibe-check",
    cacheDir: ".cache/vibe-check",
    checks: {
      duplication: {
        defaultMinimumTokens: 75,
        fragments: {
          changedDelta: 1
        },
        minimumTokensByCodeArea: {}
      },
      files: {
        codeLines: {
          absoluteFloor: 300,
          changedDelta: 80,
          lowDecisionTokenAllowance: {
            codeLineFloor: 500,
            maxDecisionTokens: 10
          }
        }
      },
      functions: {
        codeLines: {
          absoluteFloor: 50,
          changedDelta: 20,
          lowComplexityAllowance: {
            codeLineFloor: 150,
            maxCyclomaticComplexityExclusive: 5
          }
        },
        cyclomaticComplexity: {
          absoluteFloor: 10,
          changedDelta: 5
        },
        parameterCount: {
          absoluteFloor: 5,
          changedDelta: 2
        }
      }
    },
    codeAreas: {
      project: {
        description: "This project",
        excludeGlobs: [],
        globs: ["**/*"],
        warningPolicy: "moderate"
      }
    },
    excludeDirs: [
      ".git",
      ".vibe-check",
      ".cache",
      ".venv",
      "artifacts",
      "build",
      "dist",
      "node_modules",
      "target",
      "vendor"
    ],
    generatedFiles: ["**/generated/**", "**/*.generated.*"],
    include: ["**/*"],
    report: {
      footerGeneratedBy: "Vibe Check",
      footerNotice: "Review findings for this project.",
      nonBlockingNotice:
        "This project scan is observational unless a gate is explicitly enabled.",
      showWatchlist: true,
      timeZone: "UTC",
      title: "This project quality report",
      topN: 20,
      watchlistMax: 50
    },
    version: "1"
  };
}

function assertClosedObjectSchemas(schema: unknown): void {
  visitSchema(schema, (value) => {
    if (!isRecord(value.properties)) return;
    assert.equal(
      value.additionalProperties,
      false,
      `schema object with properties ${Object.keys(value.properties).join(", ")} is open`
    );
  });
}

function visitSchema(
  schema: unknown,
  visit: (schema: Record<string, unknown>) => void
): void {
  if (!isRecord(schema)) return;
  visit(schema);
  for (const keyword of ["items", "properties", "patternProperties"]) {
    const nested = schema[keyword];
    if (Array.isArray(nested)) {
      for (const value of nested) visitSchema(value, visit);
    } else if (isRecord(nested)) {
      if (keyword === "properties" || keyword === "patternProperties") {
        for (const value of Object.values(nested)) visitSchema(value, visit);
      } else {
        visitSchema(nested, visit);
      }
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
