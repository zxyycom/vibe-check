import { strict as assert } from "node:assert";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { Ajv2020 } from "ajv/dist/2020.js";
import type { AnySchema } from "ajv";

import {
  LegacyProjectConfigError,
  loadSemanticProjectConfig,
  ProjectConfigError
} from "./config-file.ts";
import {
  SEMANTIC_PROJECT_CONFIG_V1_EDITOR_SCHEMA,
  SEMANTIC_PROJECT_CONFIG_V1_SCHEMA_ID,
  SEMANTIC_PROJECT_CONFIG_V1_SCHEMA_PATH,
  parseSemanticProjectConfigV1,
  resolveQualityConfig,
  serializeSemanticProjectConfigV1EditorSchema,
  SemanticProjectConfigV1Schema,
  type SemanticProjectConfigV1,
  type SemanticProjectConfigV1EditorSchema
} from "./config-schema.ts";

const CANONICAL_CONFIG_EXAMPLE_PATH =
  "docs/examples/json/vibe-check-config.json";

describe("semantic project config v1 schema", () => {
  it("accepts a complete tool-neutral document and returns a detached value", () => {
    const input = semanticConfigInput();

    const parsed: SemanticProjectConfigV1 = parseSemanticProjectConfigV1(input);

    assert.deepEqual(parsed, input);
    assert.notStrictEqual(parsed, input);
    assert.notStrictEqual(parsed.include, input.include);
    assert.notStrictEqual(parsed.checks, input.checks);
    assert.notStrictEqual(parsed.codeAreas, input.codeAreas);
    assert.notStrictEqual(parsed.report, input.report);
    assert.equal(parsed.checks.files.codeLines.absoluteFloor, -1.5);
    assert.equal(parsed.report.topN, 10.5);

    const include = input.include as string[];
    include.push("later/**/*.ts");
    const checks = input.checks as Record<string, Record<string, unknown>>;
    const files = checks.files as Record<string, Record<string, unknown>>;
    const codeLines = files.codeLines as Record<string, unknown>;
    codeLines.absoluteFloor = 999;

    assert.deepEqual(parsed.include, ["src/**/*.ts"]);
    assert.equal(parsed.checks.files.codeLines.absoluteFloor, -1.5);
  });

  it("rejects structural and semantic failures with field paths", () => {
    const cases: ReadonlyArray<{
      mutate: (input: Record<string, unknown>) => unknown;
      expected: RegExp;
    }> = [
      {
        mutate: () => null,
        expected: /config/
      },
      {
        mutate: (input) => {
          delete input.version;
          return input;
        },
        expected: /config\.version/
      },
      {
        mutate: (input) => {
          input.$schema = "./config.schema.json";
          return input;
        },
        expected: /config\.\$schema/
      },
      {
        mutate: (input) => {
          input.version = "2";
          return input;
        },
        expected: /config\.version/
      },
      {
        mutate: (input) => {
          const checks = input.checks as Record<string, Record<string, unknown>>;
          checks.files!.unexpected = true;
          return input;
        },
        expected: /config\.checks\.files\.unexpected/
      },
      {
        mutate: (input) => {
          const checks = input.checks as Record<string, Record<string, unknown>>;
          const files = checks.files as Record<string, Record<string, unknown>>;
          files.codeLines!.absoluteFloor = Number.NaN;
          return input;
        },
        expected: /config\.checks\.files\.codeLines\.absoluteFloor/
      },
      {
        mutate: (input) => {
          const report = input.report as Record<string, unknown>;
          report.timeZone = "Not/A_Real_Zone";
          return input;
        },
        expected: /config\.report\.timeZone/
      },
      {
        mutate: (input) => {
          const checks = input.checks as Record<string, Record<string, unknown>>;
          const duplication = checks.duplication as Record<string, unknown>;
          duplication.minimumTokensByCodeArea = { missing: 50 };
          return input;
        },
        expected:
          /config\.checks\.duplication\.minimumTokensByCodeArea\.missing/
      },
      {
        mutate: (input) => {
          input.acceptedWarnings = [{
            checkId: "lizard-cyclomatic-complexity",
            reason: "known"
          }];
          return input;
        },
        expected: /config\.acceptedWarnings\[0\]\.checkId/
      },
      {
        mutate: (input) => {
          input.acceptedWarnings = [{
            checkId: "function-cyclomatic-complexity",
            reason: "known",
            sourceTool: "lizard"
          }];
          return input;
        },
        expected: /config\.acceptedWarnings\[0\]\.sourceTool/
      }
    ];

    for (const testCase of cases) {
      const input = semanticConfigInput();
      assert.throws(
        () => parseSemanticProjectConfigV1(testCase.mutate(input)),
        testCase.expected
      );
    }
  });

  it("exposes only closed product-semantic fields", () => {
    assert.deepEqual(
      Object.keys(SemanticProjectConfigV1Schema.properties).sort(),
      [
        "acceptedWarnings",
        "artifactDir",
        "cacheDir",
        "checks",
        "codeAreas",
        "excludeDirs",
        "generatedFiles",
        "include",
        "report",
        "version"
      ]
    );

    const propertyNames = schemaPropertyNames(SemanticProjectConfigV1Schema);
    for (const field of [
      "$schema",
      "args",
      "command",
      "formatByCodeArea",
      "jscpd",
      "lizard",
      "maxParallelTasks",
      "ruleId",
      "scc",
      "sourceTool",
      "tools"
    ]) {
      assert.ok(!propertyNames.has(field), `unexpected public schema field ${field}`);
    }
    assertClosedObjectSchemas(SemanticProjectConfigV1Schema);
    assert.deepEqual(
      SemanticProjectConfigV1Schema.properties.acceptedWarnings.items.properties
        .checkId.enum,
      [
        "file-code-lines",
        "function-cyclomatic-complexity",
        "function-code-lines",
        "function-parameter-count",
        "duplicate-code"
      ]
    );
  });

  it("maps the document to a frozen resolved config and applies only CLI overrides", () => {
    const document = parseSemanticProjectConfigV1(semanticConfigInput());

    const resolved = resolveQualityConfig(document, {
      artifactDir: "cli-artifacts",
      topN: 3
    });

    assert.equal(resolved.artifactDir, "cli-artifacts");
    assert.equal(resolved.report.topN, 3);
    assert.equal(resolved.cacheDir, document.cacheDir);
    assert.deepEqual(resolved.checks, document.checks);
    assert.notStrictEqual(resolved, document);
    assert.ok(Object.isFrozen(resolved));
    assert.ok(Object.isFrozen(resolved.checks.functions));
    assert.ok(Object.isFrozen(resolved.include));
  });

  it("publishes the editor schema and canonical config from the runtime source", () => {
    const typedProjection: SemanticProjectConfigV1EditorSchema =
      SEMANTIC_PROJECT_CONFIG_V1_EDITOR_SCHEMA;
    const publishedSchemaBytes = readFileSync(
      SEMANTIC_PROJECT_CONFIG_V1_SCHEMA_PATH,
      "utf8"
    );
    const publishedSchema = JSON.parse(publishedSchemaBytes) as AnySchema;
    const canonicalInput = JSON.parse(
      readFileSync(CANONICAL_CONFIG_EXAMPLE_PATH, "utf8")
    ) as unknown;

    assert.strictEqual(typedProjection, SEMANTIC_PROJECT_CONFIG_V1_EDITOR_SCHEMA);
    assert.equal(
      publishedSchemaBytes,
      serializeSemanticProjectConfigV1EditorSchema()
    );
    assert.deepEqual(publishedSchema, SEMANTIC_PROJECT_CONFIG_V1_EDITOR_SCHEMA);
    assert.equal(
      SEMANTIC_PROJECT_CONFIG_V1_EDITOR_SCHEMA.$schema,
      "https://json-schema.org/draft/2020-12/schema"
    );
    assert.equal(
      SEMANTIC_PROJECT_CONFIG_V1_EDITOR_SCHEMA.$id,
      SEMANTIC_PROJECT_CONFIG_V1_SCHEMA_ID
    );
    assert.equal(Object.hasOwn(SemanticProjectConfigV1Schema, "$schema"), false);

    const validate = new Ajv2020({ allErrors: true, strict: true }).compile(
      publishedSchema
    );
    assert.equal(validate(canonicalInput), true, JSON.stringify(validate.errors));
    assert.deepEqual(parseSemanticProjectConfigV1(canonicalInput), canonicalInput);
  });
});

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

function semanticConfigInput(): Record<string, unknown> {
  return {
    acceptedWarnings: [{
      checkId: "function-cyclomatic-complexity",
      codeArea: "app",
      messageIncludes: ["complexity"],
      metric: "cyclomaticComplexity",
      path: "src/app.ts",
      reason: "Reviewed complexity",
      suggestionIncludes: ["simplify"],
      value: -0.5
    }],
    artifactDir: "artifacts/quality",
    cacheDir: ".cache/quality",
    checks: {
      duplication: {
        defaultMinimumTokens: 75.5,
        fragments: {
          changedDelta: -1
        },
        minimumTokensByCodeArea: {
          app: 80.25
        }
      },
      files: {
        codeLines: {
          absoluteFloor: -1.5,
          changedDelta: 0.5,
          lowDecisionTokenAllowance: {
            codeLineFloor: 500.5,
            maxDecisionTokens: -2
          }
        }
      },
      functions: {
        codeLines: {
          absoluteFloor: 50.5,
          changedDelta: -20,
          lowComplexityAllowance: {
            codeLineFloor: 150.25,
            maxCyclomaticComplexityExclusive: 5.5
          }
        },
        cyclomaticComplexity: {
          absoluteFloor: 10.5,
          changedDelta: -5
        },
        parameterCount: {
          absoluteFloor: 5.25,
          changedDelta: -2
        }
      }
    },
    codeAreas: {
      app: {
        description: "Application source",
        excludeGlobs: ["**/*.generated.ts"],
        globs: ["src/**/*.ts"],
        warningPolicy: "moderate"
      }
    },
    excludeDirs: ["vendor"],
    generatedFiles: ["**/generated/**"],
    include: ["src/**/*.ts"],
    report: {
      footerGeneratedBy: "Vibe Check",
      footerNotice: "Review the generated report.",
      nonBlockingNotice: "Development snapshot.",
      showWatchlist: true,
      timeZone: "UTC",
      title: "Quality Snapshot",
      topN: 10.5,
      watchlistMax: 20.25
    },
    version: "1"
  };
}

function schemaPropertyNames(schema: unknown): Set<string> {
  const names = new Set<string>();
  visitSchema(schema, (value) => {
    if (!isRecord(value.properties)) return;
    for (const name of Object.keys(value.properties)) names.add(name);
  });
  return names;
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
