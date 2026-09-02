import type { FunctionMetric } from "./measurement-model.ts";

/** Exact, already-admitted source texts passed from one functionMetrics Check to its Worker. */
export interface FunctionMetricsAnalysisWorkerRequest {
  readonly files: readonly Readonly<{
    readonly path: string;
    readonly source: string;
  }>[];
}

/** The one-shot Worker response; errors never carry partial measurements. */
export type FunctionMetricsAnalysisWorkerResponse =
  | Readonly<{ readonly kind: "analysis-failed" }>
  | Readonly<{ readonly kind: "complete"; readonly metrics: readonly FunctionMetric[] }>;
