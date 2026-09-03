import { analyzeFunctionMetricsSources } from "./analyzer-adapter.ts";
import type {
  FunctionMetricsAnalysisWorkerRequest,
  FunctionMetricsAnalysisWorkerResponse
} from "./analyzer-worker-contract.ts";

self.onmessage = (event: MessageEvent<unknown>) => {
  postMessage(analyzeWorkerRequest(event.data));
  self.close();
};

function analyzeWorkerRequest(value: unknown): FunctionMetricsAnalysisWorkerResponse {
  if (!isWorkerRequest(value)) return Object.freeze({ kind: "analysis-failed" });
  return analyzeFunctionMetricsSources(value);
}

function isWorkerRequest(value: unknown): value is FunctionMetricsAnalysisWorkerRequest {
  return isRecord(value) && Array.isArray(value.files) && value.files.every(isWorkerFile);
}

function isWorkerFile(value: unknown): boolean {
  return isRecord(value) && typeof value.path === "string" && typeof value.source === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
