import { readFileSync } from "node:fs";

interface Sample {
  readonly round: number;
  readonly variant: "before" | "candidate";
  readonly keyShape: string;
  readonly keyOrder: string;
  readonly keyCount: number;
  readonly elapsedMs: number;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseSample(value: unknown, index: number): Sample {
  if (
    !record(value) ||
    (value.variant !== "before" && value.variant !== "candidate") ||
    typeof value.keyCount !== "number" ||
    !Number.isSafeInteger(value.keyCount) ||
    value.keyCount < 0 ||
    typeof value.elapsedMs !== "number" ||
    !Number.isFinite(value.elapsedMs) ||
    value.elapsedMs <= 0 ||
    (value.keyShape !== undefined && typeof value.keyShape !== "string") ||
    (value.keyOrder !== undefined && typeof value.keyOrder !== "string")
  ) {
    throw new TypeError(`Invalid sample at index ${index}`);
  }
  if (
    typeof value.round !== "number" ||
    !Number.isSafeInteger(value.round) ||
    value.round < 0 ||
    value.round > 7
  ) {
    throw new TypeError(`Invalid round at index ${index}`);
  }
  return {
    round: value.round,
    variant: value.variant,
    keyShape: value.keyShape ?? "initial-region-prefix",
    keyOrder: value.keyOrder ?? "same",
    keyCount: value.keyCount,
    elapsedMs: value.elapsedMs
  };
}

function median(values: readonly number[]): number {
  if (values.length !== 8) throw new Error(`Expected all eight samples, got ${values.length}`);
  const sorted = [...values].sort((left, right) => left - right);
  const lower = sorted[3];
  const upper = sorted[4];
  if (lower === undefined || upper === undefined) throw new Error("Missing median observations");
  return (lower + upper) / 2;
}

const inputPath = process.argv[2];
if (process.argv.length !== 3 || inputPath === undefined)
  throw new Error("usage: summarize.ts <samples.json>");
const parsed: unknown = JSON.parse(readFileSync(inputPath, "utf8"));
if (!record(parsed) || !Array.isArray(parsed.samples))
  throw new TypeError(`${inputPath}: missing samples array`);
const samples = parsed.samples.map(parseSample);
const groups = new Map<string, Sample[]>();
for (const sample of samples) {
  const key = `${sample.keyShape}:${sample.keyOrder}:${sample.keyCount}`;
  const group = groups.get(key) ?? [];
  group.push(sample);
  groups.set(key, group);
}
const summary = Array.from(groups, ([workload, observations]) => {
  const beforeSamples = observations.filter((sample) => sample.variant === "before");
  const candidateSamples = observations.filter((sample) => sample.variant === "candidate");
  if (
    new Set(beforeSamples.map((sample) => sample.round)).size !== 8 ||
    new Set(candidateSamples.map((sample) => sample.round)).size !== 8
  ) {
    throw new Error(`${workload}: expected eight unique AB/BA rounds`);
  }
  const pairedRatios = beforeSamples.map((sample) => {
    const candidate = candidateSamples.find((row) => row.round === sample.round);
    if (candidate === undefined)
      throw new Error(`${workload}: missing candidate round ${sample.round}`);
    return candidate.elapsedMs / sample.elapsedMs;
  });
  const before = observations
    .filter((sample) => sample.variant === "before")
    .map((sample) => sample.elapsedMs);
  const candidate = observations
    .filter((sample) => sample.variant === "candidate")
    .map((sample) => sample.elapsedMs);
  return {
    workload,
    beforeMedianMs: median(before),
    candidateMedianMs: median(candidate),
    candidateOverBefore: median(candidate) / median(before),
    pairedRatios,
    pairedMedianRatio: median(pairedRatios),
    candidateSlowerPairs: pairedRatios.filter((ratio) => ratio > 1).length,
    beforeRangeMs: [Math.min(...before), Math.max(...before)],
    candidateRangeMs: [Math.min(...candidate), Math.max(...candidate)]
  };
});
process.stdout.write(
  `${JSON.stringify({ inputPath, allSamplesRetained: true, summary }, null, 2)}\n`
);
