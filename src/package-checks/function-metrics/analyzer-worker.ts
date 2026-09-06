import { analyzeFunctionMetricsSources } from "./analyzer-adapter.ts";
import { parentPort } from "node:worker_threads";
import type {
  FunctionMetricsAnalysisWorkerRequest,
  FunctionMetricsAnalysisWorkerResponse
} from "./analyzer-worker-contract.ts";

if (parentPort === null) throw new Error("functionMetrics analyzer requires a parent Worker port");
const workerPort = parentPort;

workerPort.once("message", (value: unknown): void => {
  workerPort.postMessage(analyzeWorkerRequest(value));
  workerPort.close();
});

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
