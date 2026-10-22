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
import { abba, compareSamples } from "./sampling.ts";
import type { RawSample } from "./contract.ts";

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
    for (const inheritedOption of ["__proto__", "constructor", "toString"]) {
      assert.throws(
        () => parseArguments([inheritedOption]),
        new RegExp(`unknown argument: ${inheritedOption}`)
      );
      assert.throws(() => parseArguments(["--layer", inheritedOption]), /A, B, C, or all/);
    }
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
    const nonFiniteLocationMetrics = parseChildResult({
      metrics: [
        {
          ccn: 1,
          endLine: 4,
          file: "same.ts",
          name: "zeta",
          nloc: 4,
          parameterCount: 0,
          startLine: Infinity
        },
        {
          ccn: 1,
          endLine: 4,
          file: "same.ts",
          name: "alpha",
          nloc: 4,
          parameterCount: 0,
          startLine: Infinity
        }
      ]
    }).metrics;
    assert.deepEqual(
      canonicalMetrics(nonFiniteLocationMetrics).map(({ name }) => name),
      ["alpha", "zeta"]
    );
  });

  it("uses every ABBA block in deterministic bootstrap classification and only marks IQR outliers", () => {
    assert.deepEqual(abba(1, "python-lizard-1.24", "typescript-port"), [
      "python-lizard-1.24",
      "typescript-port",
      "typescript-port",
      "python-lizard-1.24"
    ]);
    assert.deepEqual(abba(2, "python-lizard-1.24", "typescript-port"), [
      "typescript-port",
      "python-lizard-1.24",
      "python-lizard-1.24",
      "typescript-port"
    ]);
    const samples = [
      performanceSample("python-lizard-1.24", 1, 1, 2),
      performanceSample("typescript-port", 1, 2, 1),
      performanceSample("typescript-port", 1, 3, 1),
      performanceSample("python-lizard-1.24", 1, 4, 8),
      performanceSample("typescript-port", 2, 1, 2),
      performanceSample("python-lizard-1.24", 2, 2, 4),
      performanceSample("python-lizard-1.24", 2, 3, 16),
      performanceSample("typescript-port", 2, 4, 8),
      performanceSample("python-lizard-1.24", 3, 1, 1),
      performanceSample("typescript-port", 3, 2, 1),
      performanceSample("typescript-port", 3, 3, 9),
      performanceSample("python-lizard-1.24", 3, 4, 9)
    ];
    const comparison = compareSamples(samples, "python-lizard-1.24", "typescript-port", "cold");
    // Geometric block means are (4, 8, 3) and (1, 4, 3), not raw sample pairs.
    assert.deepEqual(comparison.pairedRatio.ratios, [4, 2, 1]);
    assert.deepEqual(comparison.pairedRatio.ci95, [1, 4]);
    assert.throws(
      () => compareSamples(samples.slice(0, -1), "python-lizard-1.24", "typescript-port", "cold"),
      /incomplete block/u
    );
    const ratios = pairedBlockRatios([4, 8, 3], [1, 4, 3]);
    assert.deepEqual(ratios, [4, 2, 1]);
    const ci95 = bootstrapMedianRatio95(ratios, 123, 500);
    assert.deepEqual(ci95, [1, 4]);
    assert.deepEqual(ci95, bootstrapMedianRatio95(ratios, 123, 500));
    assert.deepEqual(bootstrapMedianRatio95([2, 2, 2], 123, 500), [2, 2]);
    for (const [interval, pythonP90, typescriptP90, expected] of [
      [[1.06, 1.2], 2, 1, "typescript-faster"],
      [[0.8, 0.94], 1, 2, "python-faster"],
      [[0.95, 1.05], 1, 1, "no-material-stable-difference"],
      [[1.05, 1.06], 2, 1, "inconclusive"],
      [[0.94, 0.95], 1, 2, "inconclusive"],
      [[1.06, 1.2], 1, 2, "inconclusive"]
    ] as const) {
      assert.equal(
        classifyComparison({ ci95: interval, comparable: true, pythonP90, typescriptP90 }),
        expected
      );
    }
    assert.equal(
      classifyComparison({ ci95, comparable: false, pythonP90: 2.1, typescriptP90: 1 }),
      "not-comparable"
    );
    assert.deepEqual(summarize([1, 1, 1, 1, 10]).outliers, [10]);
    assert.deepEqual(summarize([4, 1, 3, 2]), {
      iqr: 1.5,
      max: 4,
      median: 2.5,
      min: 1,
      outliers: [],
      p90: 3.7
    });
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
    assert.doesNotThrow(() => {
      assertStableOutputDigest("same", "same", "sample");
    });
    assert.throws(() => {
      assertStableOutputDigest("expected", "changed", "sample");
    }, /output drift/);
    assert.equal(isSupportedSupervisorPlatform("linux"), true);
    assert.equal(isSupportedSupervisorPlatform("darwin"), false);
  });
});

function performanceSample(
  condition: RawSample["condition"],
  block: number,
  ordinal: number,
  observedWallMs: number
): RawSample {
  return {
    condition,
    block,
    ordinal,
    observedWallMs,
    operationWallMs: observedWallMs,
    outputDigest: "fixture",
    status: "complete",
    stderr: "",
    sessionDiagnostics: {
      resource: {
        cpuScope: "fixture",
        peakRssBytes: null,
        peakRssScope: "fixture",
        systemCpuMs: null,
        unit: "bytes",
        userCpuMs: null
      }
    }
  };
}

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
