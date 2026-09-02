import { analyzeSourceCode } from "./analyzer/core.ts";
import { getReaderFor } from "./analyzer/reader-registry.ts";
import type {
  FunctionMetricsAnalysisWorkerRequest,
  FunctionMetricsAnalysisWorkerResponse
} from "./analyzer-worker-contract.ts";
import type { FunctionMetric } from "./measurement-model.ts";

self.onmessage = (event: MessageEvent<unknown>) => {
  postMessage(analyzeWorkerRequest(event.data));
  self.close();
};

function analyzeWorkerRequest(value: unknown): FunctionMetricsAnalysisWorkerResponse {
  if (!isWorkerRequest(value)) return Object.freeze({ kind: "analysis-failed" });
  try {
    const metrics: FunctionMetric[] = [];
    for (const file of value.files) {
      const reader = getReaderFor(file.path);
      if (reader === undefined) return Object.freeze({ kind: "analysis-failed" });
      const analysis = analyzeSourceCode(file.path, file.source, reader);
      for (const functionInfo of analysis.functionList) {
        metrics.push(
          Object.freeze({
            cyclomaticComplexity: Object.freeze({
              source: "typescript-analyzer" as const,
              value: functionInfo.cyclomaticComplexity
            }),
            endLine: functionInfo.endLine,
            file: file.path,
            lines: functionInfo.nloc,
            name: functionInfo.name,
            parameterCount: functionInfo.parameterCount,
            startLine: functionInfo.startLine
          })
        );
      }
    }
    return Object.freeze({ kind: "complete", metrics: Object.freeze(metrics) });
  } catch {
    return Object.freeze({ kind: "analysis-failed" });
  }
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
