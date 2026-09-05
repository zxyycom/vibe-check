import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { analyzeSourceCode } from "./pipeline.ts";
import { getExtensions } from "./extensions/registry.ts";
import {
  analyzeLizardSource,
  isLizardSourceSupported,
  lizardSourceExtensions
} from "./port-facade.ts";
import { get_reader_for, languages } from "./reader-registry.ts";

const fixtureRoot = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures/lizard-1.24.0");
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const selectedExtensionObservationsPath = resolve(
  fixtureRoot,
  "evidence/lizard-1.24-selected-extension-observations.json"
);

describe("Lizard port façade", () => {
  it("provides case-insensitive suffix capability and supplied-source Lizard-domain analysis", () => {
    assert.equal(lizardSourceExtensions().length, 55);
    assert.equal(isLizardSourceSupported("source/upper-case.CPP"), true);
    assert.equal(isLizardSourceSupported("source/unsupported.md"), false);

    const analysis = analyzeLizardSource({
      filename: "source/example.cpp",
      sourceCode: "int classify(int value) {\n  if (value) return value;\n  return 0;\n}"
    });

    assert.deepEqual(analysis, {
      function_list: [
        {
          complex_tags: [["if", 2]],
          cyclomatic_complexity: 2,
          end_line: 4,
          filename: "source/example.cpp",
          name: "classify",
          max_nesting_depth: 1,
          nloc: 4,
          parameter_count: 1,
          start_line: 1
        }
      ]
    });
    assert.equal(Object.isFrozen(analysis), true);
    assert.equal(Object.isFrozen(analysis?.function_list), true);
    assert.equal(
      analyzeLizardSource({ filename: "source/unsupported.md", sourceCode: "# heading" }),
      undefined
    );
  });

  it("matches source-order registry resolution for fast paths and explicit fallbacks", () => {
    const sourceOrderReaders = languages();
    const declaredEntries = sourceOrderReaders.flatMap((reader) =>
      reader.ext.map((extension) => ({ extension, reader }))
    );
    const extensionsByCanonicalSuffix = new Map<string, string>();
    for (const { extension } of declaredEntries) {
      extensionsByCanonicalSuffix.set(extension.toLowerCase(), extension);
    }

    assert.equal(sourceOrderReaders.length, 27);
    assert.equal(declaredEntries.length, 56);
    assert.equal(extensionsByCanonicalSuffix.size, 55);
    assert.deepEqual(lizardSourceExtensions(), [...extensionsByCanonicalSuffix.values()]);

    for (const { extension, reader } of declaredEntries) {
      const sourceCode = normalFixtureSourceForSuffix(extension);
      for (const filename of [
        `root.with.dots/nested/file.name.${mixedAsciiCase(extension)}`,
        `root.with.dots\\nested\\file.name.${extension.toUpperCase()}`
      ]) {
        assert.equal(get_reader_for(filename), reader, filename);
        assertFacadeMatchesRegistry(filename, sourceCode);
      }
    }

    for (const [filename, sourceCode] of [
      ["source", ""],
      ["source.", ""],
      ["source.unknown", ""],
      ["unicode-prefix/éxample.kt", normalFixtureSourceForSuffix("kt")],
      ["unicode-suffix/example.é", ""],
      ["unicode-fold/example.Kt", normalFixtureSourceForSuffix("kt")],
      ["unicode-fold/example.ſt", normalFixtureSourceForSuffix("st")],
      ["line-feed\n/example.kt", normalFixtureSourceForSuffix("kt")],
      ["carriage-return\r/example.kt", normalFixtureSourceForSuffix("kt")],
      [`line-separator\u2028/example.kt`, normalFixtureSourceForSuffix("kt")],
      [`paragraph-separator\u2029/example.kt`, normalFixtureSourceForSuffix("kt")]
    ]) {
      assertFacadeMatchesRegistry(filename, sourceCode);
    }
  });

  it("matches the fixed-tag selected-extension corpus across every reader fixture and semantic case", () => {
    const observations: unknown = JSON.parse(
      readFileSync(selectedExtensionObservationsPath, "utf8")
    );
    assertSelectedExtensionObservations(observations);

    assert.equal(observations.fixtureCount, 110);
    assert.equal(observations.semanticCaseCount, 10);
    for (const observation of [...observations.fixtures, ...observations.semanticCases]) {
      const sourceCode =
        observation.source ??
        readFileSync(resolve(workspaceRoot, observation.fixture ?? ""), "utf8");
      assert.deepEqual(
        analyzeLizardSource({
          filename: `fixed-tag/${observation.id ?? observation.fixture ?? "missing"}.${observation.canonicalExtension}`,
          sourceCode
        })?.function_list.map(measurement),
        observation.measurements.map(expectedMeasurement),
        observation.id ?? observation.fixture
      );
    }
  });
});

interface ExtensionObservation {
  readonly canonicalExtension: string;
  readonly fixture?: string;
  readonly id?: string;
  readonly measurements: readonly ExtensionMeasurement[];
  readonly source?: string;
}

interface ExtensionMeasurement {
  readonly ccn: number;
  readonly complexityContributors: readonly { readonly line: number; readonly token: string }[];
  readonly endLine: number;
  readonly functionName: string;
  readonly maxNestingDepth: number;
  readonly nloc: number;
  readonly parameterCount: number;
  readonly startLine: number;
}

function measurement(
  functionInfo: NonNullable<ReturnType<typeof analyzeLizardSource>>["function_list"][number]
) {
  return {
    ccn: functionInfo.cyclomatic_complexity,
    complexityContributors: functionInfo.complex_tags.map(([token, line]) => ({ line, token })),
    endLine: functionInfo.end_line,
    functionName: functionInfo.name,
    maxNestingDepth: functionInfo.max_nesting_depth,
    nloc: functionInfo.nloc,
    parameterCount: functionInfo.parameter_count,
    startLine: functionInfo.start_line
  };
}

function expectedMeasurement(expected: ExtensionMeasurement): ExtensionMeasurement {
  return expected;
}

function assertSelectedExtensionObservations(value: unknown): asserts value is {
  readonly fixtureCount: number;
  readonly fixtures: readonly ExtensionObservation[];
  readonly semanticCaseCount: number;
  readonly semanticCases: readonly ExtensionObservation[];
} {
  assert.ok(isObject(value));
  assert.equal(typeof value.fixtureCount, "number");
  const fixtures = readUnknownArray(value.fixtures);
  assert.equal(typeof value.semanticCaseCount, "number");
  const semanticCases = readUnknownArray(value.semanticCases);
  for (const observation of [...fixtures, ...semanticCases]) {
    assertExtensionObservation(observation);
  }
}

function assertExtensionObservation(value: unknown): asserts value is ExtensionObservation {
  assert.ok(isObject(value));
  assert.equal(typeof value.canonicalExtension, "string");
  const measurements = readUnknownArray(value.measurements);
  assert.ok(typeof value.fixture === "string" || typeof value.source === "string");
  for (const observedMeasurement of measurements) {
    assertExtensionMeasurement(observedMeasurement);
  }
}

function assertExtensionMeasurement(value: unknown): asserts value is ExtensionMeasurement {
  assert.ok(isObject(value));
  for (const key of ["ccn", "endLine", "maxNestingDepth", "nloc", "parameterCount", "startLine"]) {
    assert.equal(typeof value[key], "number");
  }
  assert.equal(typeof value.functionName, "string");
  const contributors = readUnknownArray(value.complexityContributors);
  for (const contributor of contributors) {
    assert.ok(isObject(contributor));
    assert.equal(typeof contributor.line, "number");
    assert.equal(typeof contributor.token, "string");
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readUnknownArray(value: unknown): readonly unknown[] {
  assert.ok(isUnknownArray(value));
  return value;
}

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function assertFacadeMatchesRegistry(filename: string, sourceCode: string): void {
  const expected = analyzeThroughRegistry(filename, sourceCode);
  assert.equal(isLizardSourceSupported(filename), expected !== undefined, filename);
  assert.deepEqual(analyzeLizardSource({ filename, sourceCode }), expected, filename);
}

function analyzeThroughRegistry(filename: string, sourceCode: string) {
  const reader = get_reader_for(filename);
  if (reader === undefined) return undefined;

  const fileInformation = analyzeSourceCode(
    filename,
    sourceCode,
    reader,
    getExtensions(["complextags", "nd"])
  );
  return {
    function_list: fileInformation.function_list.map((functionInfo) => ({
      complex_tags: functionInfo.complex_tags ?? [],
      cyclomatic_complexity: functionInfo.cyclomatic_complexity,
      end_line: functionInfo.end_line,
      filename: functionInfo.filename,
      name: functionInfo.name,
      max_nesting_depth: functionInfo.max_nesting_depth,
      nloc: functionInfo.nloc,
      parameter_count: functionInfo.parameter_count,
      start_line: functionInfo.start_line
    }))
  };
}

function normalFixtureSourceForSuffix(extension: string): string {
  const fixtureName = `normal.${extension}`;
  for (const entry of readdirSync(fixtureRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const fixturePath = resolve(fixtureRoot, entry.name, fixtureName);
    if (existsSync(fixturePath)) return readFileSync(fixturePath, "utf8");
  }
  throw new Error(`missing normal fixture for registered suffix: ${extension}`);
}

function mixedAsciiCase(extension: string): string {
  return Array.from(extension, (character, index) =>
    index % 2 === 0 ? character.toUpperCase() : character.toLowerCase()
  ).join("");
}
