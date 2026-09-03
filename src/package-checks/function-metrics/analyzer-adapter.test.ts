import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { analyzeFunctionMetricsSources } from "./analyzer-adapter.ts";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const oracle = parseOracleObservations(
  JSON.parse(
    readFileSync(
      new URL(
        "./analyzer/fixtures/lizard-1.23.0/evidence/lizard-1.23-oracle-observations.json",
        import.meta.url
      ),
      "utf8"
    )
  )
);

describe("functionMetrics Product analyzer adapter", () => {
  it("maps all 27 reader families and 55 registered extensions from supplied source", () => {
    const normalFixtures = oracle.fixtures.filter(({ fixture }) => fixture.includes("/normal."));
    assert.equal(normalFixtures.length, 55);
    assert.equal(new Set(normalFixtures.map(({ fixture }) => fixture.split(".").at(-1))).size, 55);

    const result = analyzeFunctionMetricsSources({
      files: normalFixtures.map(({ fixture }) =>
        Object.freeze({
          path: fixture,
          source: readFileSync(resolve(repositoryRoot, fixture), "utf8")
        })
      )
    });

    assert.equal(result.kind, "complete");
    if (result.kind !== "complete") return;
    assert.deepEqual(
      result.metrics,
      normalFixtures.flatMap(({ measurements }) =>
        measurements.map((measurement) => ({
          cyclomaticComplexity: { source: "typescript-analyzer", value: measurement.ccn },
          endLine: measurement.endLine,
          file: measurement.file,
          lines: measurement.nloc,
          name: measurement.functionName,
          parameterCount: measurement.parameterCount,
          startLine: measurement.startLine
        }))
      )
    );
  });

  it("fails the complete input when any supplied source has no translated reader", () => {
    assert.deepEqual(
      analyzeFunctionMetricsSources({
        files: [
          {
            path: "source/supported.ts",
            source: "export function supported() { return 1; }"
          },
          { path: "source/unsupported.md", source: "# unsupported" }
        ]
      }),
      { kind: "analysis-failed" }
    );
  });
});

type OracleObservations = Readonly<{
  readonly fixtures: readonly Readonly<{
    readonly fixture: string;
    readonly measurements: readonly Readonly<{
      readonly ccn: number;
      readonly endLine: number;
      readonly file: string;
      readonly functionName: string;
      readonly nloc: number;
      readonly parameterCount: number;
      readonly startLine: number;
    }>[];
  }>[];
}>;

function parseOracleObservations(value: unknown): OracleObservations {
  if (!isOracleObservations(value))
    throw new Error("Function analyzer oracle observations are invalid.");
  return value;
}

function isOracleObservations(value: unknown): value is OracleObservations {
  return isRecord(value) && Array.isArray(value.fixtures) && value.fixtures.every(isOracleFixture);
}

function isOracleFixture(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.fixture === "string" &&
    Array.isArray(value.measurements) &&
    value.measurements.every(isOracleMeasurement)
  );
}

function isOracleMeasurement(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.ccn === "number" &&
    typeof value.endLine === "number" &&
    typeof value.file === "string" &&
    typeof value.functionName === "string" &&
    typeof value.nloc === "number" &&
    typeof value.parameterCount === "number" &&
    typeof value.startLine === "number"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
