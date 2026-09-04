import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runProcessSync } from "../../process-execution/execution.ts";
import { canonicalMetrics, metricsEqual } from "./canonical.ts";
import {
  assertStableOutputDigest,
  isSupportedSupervisorPlatform,
  parseArguments,
  parseChildResult,
  parseWorkloadManifest,
  statisticalWallMs,
  temperatureArguments
} from "./command.ts";
import {
  bootstrapMedianRatio95,
  classifyComparison,
  pairedBlockRatios,
  summarize
} from "./statistics.ts";

describe("Lizard TypeScript developer performance evidence", () => {
  it("requires an explicit bounded developer invocation", () => {
    assert.deepEqual(
      parseArguments(["--mode", "full", "--layer", "B", "--output", "/tmp/evidence"]),
      {
        layers: ["analyzer-only"],
        mode: "full",
        outputDirectory: "/tmp/evidence",
        temperature: "cold"
      }
    );
    assert.throws(() => parseArguments(["--layer", "python"]), /A, B, C, or all/);
    assert.throws(() => parseArguments(["--lizard123", "relative/lizard"]), /absolute executable/);
    assert.throws(
      () => parseArguments(["--lizard124-source", "relative/source"]),
      /absolute source checkout/
    );
    assert.equal(
      parseArguments(["--output", "relative/evidence"]).outputDirectory,
      new URL("../../../relative/evidence", import.meta.url).pathname
    );
  });

  it("locates invalid child and manifest fields at the evidence boundary", () => {
    assert.throws(
      () =>
        parseChildResult({
          metrics: [
            {
              ccn: null,
              endLine: 1,
              file: 12,
              name: "fixture",
              nloc: 1,
              parameterCount: 0,
              startLine: 1
            }
          ]
        }),
      /metrics\[0\]\.file/
    );
    const sparseMetrics = new Array<unknown>(1);
    assert.throws(() => parseChildResult({ metrics: sparseMetrics }), /metrics\[0\]\.value/);
    assert.throws(
      () =>
        parseWorkloadManifest({
          analyzerBatchReplications: 1,
          analyzerSourcePaths: [],
          fixedLizardVersion: "1.24.0",
          id: "fixture",
          productSourcePaths: ["sample.ts"],
          sourceSha256: "digest"
        }),
      /analyzerSourcePaths/
    );
  });

  it("canonicalizes metric ordering before output equality", () => {
    const first = [
      { ccn: 2, endLine: 8, file: "b.ts", name: "b", nloc: 8, parameterCount: 1, startLine: 1 },
      { ccn: 1, endLine: 4, file: "a.ts", name: "a", nloc: 4, parameterCount: 0, startLine: 1 }
    ];
    const second = [...first].reverse();
    assert.deepEqual(canonicalMetrics(first), canonicalMetrics(second));
    assert.equal(metricsEqual(first, second), true);
  });

  it("uses every ABBA block in deterministic bootstrap classification and only marks IQR outliers", () => {
    const ratios = pairedBlockRatios([2, 2.1, 2, 2.05], [1, 1, 1, 1]);
    const ci95 = bootstrapMedianRatio95(ratios, 123, 500);
    assert.deepEqual(ci95, bootstrapMedianRatio95(ratios, 123, 500));
    assert.equal(
      classifyComparison({ ci95, comparable: true, pythonP90: 2.1, typescriptP90: 1 }),
      "typescript-faster"
    );
    assert.equal(
      classifyComparison({ ci95, comparable: false, pythonP90: 2.1, typescriptP90: 1 }),
      "not-comparable"
    );
    assert.deepEqual(summarize([1, 1, 1, 1, 10]).outliers, [10]);
  });

  it("selects counted-operation wall only for warmed statistics and gives both B sides one warmup flag", () => {
    const sample = { observedWallMs: 101, operationWallMs: 7 };
    assert.equal(statisticalWallMs(sample, "cold"), 101);
    assert.equal(statisticalWallMs(sample, "warmed-operation"), 7);
    const warmup = temperatureArguments("warmed-operation");
    assert.deepEqual(warmup, ["--warmup"]);
    assert.deepEqual(temperatureArguments("cold"), []);
  });

  it("blocks statistical sampling on counted output drift and refuses non-Linux supervisor semantics", () => {
    assert.doesNotThrow(() => assertStableOutputDigest("same", "same", "sample"));
    assert.throws(() => assertStableOutputDigest("expected", "changed", "sample"), /output drift/);
    assert.equal(isSupportedSupervisorPlatform("linux"), true);
    assert.equal(isSupportedSupervisorPlatform("darwin"), false);
  });
});

it("labels Linux wait4 resource scope without relabeling max RSS as tree aggregate", () => {
  const result = runProcessSync({
    args: [
      new URL("./supervisor.py", import.meta.url).pathname,
      JSON.stringify(["python3", new URL("./supervisor-parent-child.py", import.meta.url).pathname])
    ],
    command: "python3",
    cwd: process.cwd()
  });
  assert.equal(result.status, 0, result.stderr);
  const value = parseResourceEvidence(JSON.parse(result.stdout) as unknown);
  assert.match(value.cpuScope, /reaped-descendants/);
  assert.match(value.peakRssScope, /not tree aggregate/);
  assert.equal(value.unit, "bytes");
});

function parseResourceEvidence(value: unknown): Readonly<{
  readonly cpuScope: string;
  readonly peakRssScope: string;
  readonly unit: string;
}> {
  if (!isRecord(value)) throw new Error("invalid resource fixture");
  const resource = value.resource;
  if (!isRecord(resource)) throw new Error("invalid resource fixture");
  const cpuScope = resource.cpuScope;
  const peakRssScope = resource.peakRssScope;
  const unit = resource.unit;
  if (typeof cpuScope !== "string" || typeof peakRssScope !== "string" || typeof unit !== "string")
    throw new Error("invalid resource fixture");
  return Object.freeze({ cpuScope, peakRssScope, unit });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
