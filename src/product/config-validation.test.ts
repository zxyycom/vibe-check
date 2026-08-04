import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import type { SemanticProjectConfigV1 } from "./config-schema.ts";
import { resolveQualityConfig } from "./config-resolution.ts";
import { semanticConfigInput } from "./config-test-input.ts";
import { parseSemanticProjectConfigV1 } from "./config-validation.ts";

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
});
