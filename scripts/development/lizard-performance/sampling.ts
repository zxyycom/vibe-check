import type { BenchmarkTemperature } from "./arguments.ts";
import type { RawSample } from "./contract.ts";
import {
  bootstrapMedianRatio95,
  classifyComparison,
  pairedBlockRatios,
  summarize
} from "./statistics.ts";

type Condition = RawSample["condition"];

export function statisticalWallMs(
  sample: Pick<RawSample, "observedWallMs" | "operationWallMs">,
  temperature: BenchmarkTemperature
): number {
  return temperature === "cold" ? sample.observedWallMs : sample.operationWallMs;
}

export function temperatureArguments(
  temperature: BenchmarkTemperature
): readonly ["--warmup"] | readonly [] {
  return temperature === "warmed-operation" ? ["--warmup"] : [];
}

export function assertStableOutputDigest(
  expected: string | null | undefined,
  actual: string | null | undefined,
  label: string
): void {
  if (expected === undefined || expected === null || actual !== expected) {
    throw new Error(`${label} output drift from equality preflight`);
  }
}

export function compareSamples(
  samples: readonly RawSample[],
  leftCondition: Condition,
  rightCondition: Condition,
  temperature: BenchmarkTemperature
) {
  const left = samples.filter(({ condition }) => condition === leftCondition);
  const right = samples.filter(({ condition }) => condition === rightCondition);
  const leftByBlock = pairedGeometricMeans(left, temperature);
  const rightByBlock = pairedGeometricMeans(right, temperature);
  const ratios = pairedBlockRatios(leftByBlock, rightByBlock);
  const ci95 = bootstrapMedianRatio95(ratios);
  const leftSummary = summarize(left.map((sample) => statisticalWallMs(sample, temperature)));
  const rightSummary = summarize(right.map((sample) => statisticalWallMs(sample, temperature)));
  return Object.freeze({
    conclusion: classifyComparison({
      ci95,
      comparable: true,
      pythonP90: leftSummary.p90,
      typescriptP90: rightSummary.p90
    }),
    pairedRatio: Object.freeze({
      ci95,
      leftCondition,
      ratios,
      rightCondition,
      statisticWallScope: temperature === "cold" ? "whole-fresh-target" : "counted-operation"
    }),
    statistics: Object.freeze({
      left: Object.freeze({ condition: leftCondition, ...leftSummary }),
      right: Object.freeze({ condition: rightCondition, ...rightSummary })
    }),
    resourceComparison:
      "not-comparable: supervisor CPU/RSS are whole-target session diagnostics; RSS is max single-process only."
  });
}

export function abba<T extends Condition>(block: number, left: T, right: T): readonly T[] {
  return block % 2 === 1 ? [left, right, right, left] : [right, left, left, right];
}

function pairedGeometricMeans(
  samples: readonly RawSample[],
  temperature: BenchmarkTemperature
): readonly number[] {
  const values: number[] = [];
  for (let index = 0; index < samples.length; index += 2) {
    const left = sampleWallAt(samples, index, temperature);
    const right = sampleWallAt(samples, index + 1, temperature);
    if (left === undefined || right === undefined) {
      throw new Error("ABBA condition has incomplete block");
    }
    values.push(Math.sqrt(left * right));
  }
  return Object.freeze(values);
}

function sampleWallAt(
  samples: readonly RawSample[],
  index: number,
  temperature: BenchmarkTemperature
): number | undefined {
  const sample = samples[index];
  return sample === undefined ? undefined : statisticalWallMs(sample, temperature);
}
