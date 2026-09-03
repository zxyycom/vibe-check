import { PRACTICAL_EQUIVALENCE_BAND, type ComparisonConclusion } from "./contract.ts";

export interface DistributionSummary {
  readonly iqr: number;
  readonly max: number;
  readonly median: number;
  readonly min: number;
  readonly outliers: readonly number[];
  readonly p90: number;
}

export function summarize(values: readonly number[]): DistributionSummary {
  if (values.length === 0) throw new Error("cannot summarize no samples");
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  return Object.freeze({
    iqr,
    max: sorted.at(-1) ?? 0,
    median: quantile(sorted, 0.5),
    min: sorted[0] ?? 0,
    outliers: Object.freeze(
      sorted.filter((value) => value < q1 - 1.5 * iqr || value > q3 + 1.5 * iqr)
    ),
    p90: quantile(sorted, 0.9)
  });
}

export function pairedBlockRatios(
  pythonWallMs: readonly number[],
  typescriptWallMs: readonly number[]
): readonly number[] {
  if (pythonWallMs.length !== typescriptWallMs.length || pythonWallMs.length === 0) {
    throw new Error("paired block samples must have equal non-zero lengths");
  }
  return Object.freeze(pythonWallMs.map((value, index) => value / (typescriptWallMs[index] ?? 1)));
}

/** Deterministic percentile bootstrap of median paired ratios. */
export function bootstrapMedianRatio95(
  ratios: readonly number[],
  seed = 0x5eed_1234,
  iterations = 10_000
): readonly [number, number] {
  if (ratios.length === 0) throw new Error("cannot bootstrap no ratios");
  let state = seed >>> 0;
  const random = (): number => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
  const medians: number[] = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const draw = Array.from(
      { length: ratios.length },
      () => ratios[Math.floor(random() * ratios.length)] ?? 1
    );
    medians.push(
      quantile(
        draw.sort((a, b) => a - b),
        0.5
      )
    );
  }
  medians.sort((a, b) => a - b);
  return Object.freeze([quantile(medians, 0.025), quantile(medians, 0.975)]);
}

export function classifyComparison(
  input: Readonly<{
    readonly ci95: readonly [number, number];
    readonly comparable: boolean;
    readonly pythonP90: number;
    readonly typescriptP90: number;
  }>
): ComparisonConclusion {
  if (!input.comparable) return "not-comparable";
  const [lower, upper] = input.ci95;
  if (upper < PRACTICAL_EQUIVALENCE_BAND.lower && input.pythonP90 < input.typescriptP90) {
    return "python-faster";
  }
  if (lower > PRACTICAL_EQUIVALENCE_BAND.upper && input.typescriptP90 < input.pythonP90) {
    return "typescript-faster";
  }
  if (lower >= PRACTICAL_EQUIVALENCE_BAND.lower && upper <= PRACTICAL_EQUIVALENCE_BAND.upper) {
    return "no-material-stable-difference";
  }
  return "inconclusive";
}

function quantile(sorted: readonly number[], probability: number): number {
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const fraction = position - lower;
  return (sorted[lower] ?? 0) * (1 - fraction) + (sorted[upper] ?? 0) * fraction;
}
