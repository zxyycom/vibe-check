import type {
  FunctionMetricsAnalyzerInput,
  FunctionMetricsAnalyzerResult
} from "./analyzer-adapter.ts";

/** Exact, already-admitted source texts passed from one functionMetrics Check to its Worker. */
export type FunctionMetricsAnalysisWorkerRequest = FunctionMetricsAnalyzerInput;

/** The one-shot Worker response; errors never carry partial measurements. */
export type FunctionMetricsAnalysisWorkerResponse = FunctionMetricsAnalyzerResult;
