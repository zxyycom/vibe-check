/**
 * Lizard 1.23.0 malformed-source differential observations.
 * The checked-in corpus is generated only by the pinned upstream oracle;
 * this test executes the Product-owned in-memory port against that corpus.
 */

import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { analyzeSourceCode, type FunctionInfo } from "../core.ts";
import { get_reader_for, languages } from "../reader-registry.ts";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../");
const evidenceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/lizard-1.23.0/evidence"
);
const malformedOracle = parseMalformedOracle(
  readJson(resolve(evidenceRoot, "lizard-1.23-malformed-reader-observations.json"))
);
const readerExtensionMapping = parseReaderExtensionMapping(
  readJson(resolve(evidenceRoot, "lizard-1.23-reader-extension-mapping.json"))
);

test("every source-order reader preserves Lizard 1.23 malformed-source whole-file observations", () => {
  const registry = languages();
  const registrySignature = registry.map((reader) => ({
    extensions: [...new Set(reader.ext.map((extension) => extension.toLowerCase()))],
    readerClass: reader.name
  }));

  assert.equal(malformedOracle.oracle.tag, "1.23.0");
  assert.equal(malformedOracle.oracle.revision, "06284ec87c1966fee4ddbf3f068ccf89b987b0f8");
  assert.equal(malformedOracle.readerCount, 27);
  assert.equal(malformedOracle.extensionCount, 55);
  assert.equal(malformedOracle.fixtures.length, malformedOracle.readerCount);
  assert.equal(readerExtensionMapping.readerCount, malformedOracle.readerCount);
  assert.equal(readerExtensionMapping.extensionCount, malformedOracle.extensionCount);
  assert.deepEqual(
    registrySignature,
    readerExtensionMapping.readers.map(({ extensions, readerClass }) => ({
      extensions,
      readerClass
    }))
  );
  assert.equal(
    new Set(registry.flatMap((reader) => reader.ext.map((extension) => extension.toLowerCase())))
      .size,
    malformedOracle.extensionCount
  );
  assert.deepEqual(
    malformedOracle.fixtures.map(({ readerClass, readerId }) => ({ readerClass, readerId })),
    readerExtensionMapping.readers.map(({ readerClass, readerId }) => ({ readerClass, readerId }))
  );

  for (const [index, observation] of malformedOracle.fixtures.entries()) {
    const reader = registry[index];
    assert.ok(reader, `missing source-order reader at index ${index}`);
    assert.equal(reader.name, observation.readerClass);
    assert.ok(
      reader.ext
        .map((extension) => extension.toLowerCase())
        .includes(observation.canonicalExtension),
      `${observation.readerClass} must own ${observation.canonicalExtension}`
    );
    assert.equal(get_reader_for(observation.fixture), reader);

    const sourceCode = readFileSync(resolve(workspaceRoot, observation.fixture), "utf8");
    assert.equal(sha256(sourceCode), observation.sourceSha256);
    const fileInformation = analyzeSourceCode(observation.fixture, sourceCode, reader);
    assert.deepEqual(
      fileInformation.functionList.map((functionInfo) => toMeasurement(functionInfo)),
      observation.measurements,
      `${observation.readerClass}: ${observation.kind}`
    );
  }
});

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function toMeasurement(functionInfo: FunctionInfo): FunctionMeasurement {
  return {
    ccn: functionInfo.cyclomaticComplexity,
    endLine: functionInfo.endLine,
    file: functionInfo.filename,
    functionName: functionInfo.name,
    length: functionInfo.length,
    longName: functionInfo.longName,
    nloc: functionInfo.nloc,
    parameterCount: functionInfo.parameterCount,
    startLine: functionInfo.startLine,
    tokenCount: functionInfo.tokenCount
  };
}

type FunctionMeasurement = Readonly<{
  readonly ccn: number | null;
  readonly endLine: number;
  readonly file: string;
  readonly functionName: string;
  readonly length: number;
  readonly longName: string;
  readonly nloc: number;
  readonly parameterCount: number;
  readonly startLine: number;
  readonly tokenCount: number;
}>;

type MalformedFixture = Readonly<{
  readonly canonicalExtension: string;
  readonly fixture: string;
  readonly kind: string;
  readonly measurements: readonly FunctionMeasurement[];
  readonly readerClass: string;
  readonly readerId: string;
  readonly sourceSha256: string;
}>;

type MalformedOracle = Readonly<{
  readonly extensionCount: number;
  readonly fixtures: readonly MalformedFixture[];
  readonly oracle: Readonly<{
    readonly revision: string;
    readonly tag: string;
  }>;
  readonly readerCount: number;
}>;

type ReaderExtensionMapping = Readonly<{
  readonly extensionCount: number;
  readonly readerCount: number;
  readonly readers: readonly Readonly<{
    readonly extensions: readonly string[];
    readonly readerClass: string;
    readonly readerId: string;
  }>[];
}>;

function parseMalformedOracle(value: unknown): MalformedOracle {
  if (!isMalformedOracle(value))
    throw new Error("Malformed reader oracle observations are invalid.");
  return value;
}

function parseReaderExtensionMapping(value: unknown): ReaderExtensionMapping {
  if (!isReaderExtensionMapping(value)) throw new Error("Reader extension mapping is invalid.");
  return value;
}

function isMalformedOracle(value: unknown): value is MalformedOracle {
  return (
    isRecord(value) &&
    typeof value.extensionCount === "number" &&
    Array.isArray(value.fixtures) &&
    value.fixtures.every(isMalformedFixture) &&
    isRecord(value.oracle) &&
    typeof value.oracle.revision === "string" &&
    typeof value.oracle.tag === "string" &&
    typeof value.readerCount === "number"
  );
}

function isMalformedFixture(value: unknown): value is MalformedFixture {
  return (
    isRecord(value) &&
    typeof value.canonicalExtension === "string" &&
    typeof value.fixture === "string" &&
    typeof value.kind === "string" &&
    Array.isArray(value.measurements) &&
    value.measurements.every(isFunctionMeasurement) &&
    typeof value.readerClass === "string" &&
    typeof value.readerId === "string" &&
    typeof value.sourceSha256 === "string"
  );
}

function isFunctionMeasurement(value: unknown): value is FunctionMeasurement {
  return (
    isRecord(value) &&
    (typeof value.ccn === "number" || value.ccn === null) &&
    typeof value.endLine === "number" &&
    typeof value.file === "string" &&
    typeof value.functionName === "string" &&
    typeof value.length === "number" &&
    typeof value.longName === "string" &&
    typeof value.nloc === "number" &&
    typeof value.parameterCount === "number" &&
    typeof value.startLine === "number" &&
    typeof value.tokenCount === "number"
  );
}

function isReaderExtensionMapping(value: unknown): value is ReaderExtensionMapping {
  return (
    isRecord(value) &&
    typeof value.extensionCount === "number" &&
    typeof value.readerCount === "number" &&
    Array.isArray(value.readers) &&
    value.readers.every(isReaderExtensionMappingEntry)
  );
}

function isReaderExtensionMappingEntry(
  value: unknown
): value is ReaderExtensionMapping["readers"][number] {
  return (
    isRecord(value) &&
    Array.isArray(value.extensions) &&
    value.extensions.every((extension) => typeof extension === "string") &&
    typeof value.readerClass === "string" &&
    typeof value.readerId === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
