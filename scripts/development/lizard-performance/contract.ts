export const BENCHMARK_ID = "compare-lizard-python-typescript-performance" as const;
export const LIZARD_PYTHON_VERSION = "1.24.0" as const;
export const PRACTICAL_EQUIVALENCE_BAND = Object.freeze({ lower: 0.95, upper: 1.05 });
export const REQUIRED_ABBA_BLOCKS = 15;

export type BenchmarkLayer = "analyzer-only" | "current-decomposition" | "historical-product";
export type BenchmarkMode = "smoke" | "full";
export type ComparisonConclusion =
  | "inconclusive"
  | "no-material-stable-difference"
  | "not-comparable"
  | "python-faster"
  | "typescript-faster";

export interface CanonicalMetric {
  readonly ccn: number | null;
  readonly endLine: number;
  readonly file: string;
  readonly name: string;
  readonly nloc: number;
  readonly parameterCount: number;
  readonly startLine: number;
}

export interface WorkloadSource {
  readonly path: string;
  readonly sha256: string;
}

export interface WorkloadManifest {
  readonly analyzerBatchReplications: number;
  readonly analyzerSourcePaths: readonly string[];
  readonly fixedLizardVersion: typeof LIZARD_PYTHON_VERSION;
  readonly id: string;
  readonly productSourcePaths: readonly string[];
  readonly sourceSha256: string;
}

export interface ResourceMeasurement {
  readonly cpuScope: string;
  readonly peakRssBytes: number | null;
  readonly peakRssScope: string;
  readonly systemCpuMs: number | null;
  readonly unit: "bytes";
  readonly userCpuMs: number | null;
}

export interface RawSample {
  readonly block: number;
  readonly condition:
    | "current-typescript-product"
    | "historical-python-product"
    | "python-lizard-1.24"
    | "typescript-port";
  readonly ordinal: number;
  /** Timed by the target around its counted operation; used only for warmed-operation statistics. */
  readonly operationWallMs: number;
  /** Supervisor elapsed for the whole fresh target; used for cold statistics. */
  readonly observedWallMs: number;
  readonly outputDigest: string;
  /** Historical Product only: executable explicitly passed to its scanner configuration. */
  readonly scannerExecutable?: string;
  /** Whole-target observations, never operation-level CPU/RSS. */
  readonly sessionDiagnostics: Readonly<{ readonly resource: ResourceMeasurement }>;
  readonly status: "complete" | "failed";
  readonly stderr: string;
}
