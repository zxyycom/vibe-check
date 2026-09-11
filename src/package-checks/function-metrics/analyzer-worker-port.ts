import { Worker } from "node:worker_threads";

import type {
  FunctionMetricsAnalysisWorkerRequest,
  FunctionMetricsAnalysisWorkerResponse
} from "./analyzer-worker-contract.ts";
import type { FunctionMetric } from "./measurement-model.ts";

type FunctionMetricsWorkerAnalysisResult = Readonly<
  | { kind: "analysis-failed" }
  | { kind: "cancelled" }
  | { kind: "complete"; metrics: readonly FunctionMetric[] }
>;

export interface FunctionMetricsWorkerPort {
  readonly postMessage: (value: unknown) => void;
  readonly subscribe: (
    listeners: Readonly<{
      readonly error: () => void;
      readonly exit: (code: number) => void;
      readonly message: (value: unknown) => void;
    }>
  ) => () => void;
  readonly terminate: () => void;
}

/** Creates the private Node Worker transport for one admitted analyzer batch. */
export function createNodeFunctionMetricsWorker(): FunctionMetricsWorkerPort {
  const worker = new Worker(new URL("./analyzer-worker.ts", import.meta.url));
  return Object.freeze({
    postMessage: (value: unknown): void => {
      worker.postMessage(value);
    },
    subscribe: (listeners: Parameters<FunctionMetricsWorkerPort["subscribe"]>[0]): (() => void) => {
      worker.once("message", listeners.message);
      worker.once("error", listeners.error);
      worker.once("exit", listeners.exit);
      return (): void => {
        worker.off("message", listeners.message);
        worker.off("error", listeners.error);
        worker.off("exit", listeners.exit);
      };
    },
    terminate: (): void => {
      void worker.terminate().catch(() => undefined);
    }
  });
}

/** Runs one admitted batch through a Worker and settles its transport exactly once. */
export async function analyzeAdmittedSources(
  request: FunctionMetricsAnalysisWorkerRequest,
  approvedExactPaths: readonly string[],
  signal: AbortSignal,
  createWorker: () => FunctionMetricsWorkerPort
): Promise<FunctionMetricsWorkerAnalysisResult> {
  let worker: FunctionMetricsWorkerPort;
  try {
    worker = createWorker();
  } catch {
    return Object.freeze({ kind: "analysis-failed" });
  }
  return new Promise((resolveResult) => {
    let settled = false;
    let unsubscribe = (): void => {};
    const finish = (result: FunctionMetricsWorkerAnalysisResult): void => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", cancelled);
      unsubscribe();
      worker.terminate();
      resolveResult(result);
    };
    const cancelled = (): void => {
      finish(Object.freeze({ kind: "cancelled" }));
    };
    unsubscribe = worker.subscribe({
      error: () => {
        finish(Object.freeze({ kind: "analysis-failed" }));
      },
      exit: () => {
        finish(Object.freeze({ kind: "analysis-failed" }));
      },
      message: (value: unknown): void => {
        if (signal.aborted) {
          cancelled();
          return;
        }
        finish(parseWorkerResponse(value, approvedExactPaths));
      }
    });
    signal.addEventListener("abort", cancelled, { once: true });
    if (signal.aborted) {
      cancelled();
      return;
    }
    try {
      worker.postMessage(request);
    } catch {
      finish(Object.freeze({ kind: "analysis-failed" }));
    }
  });
}

function parseWorkerResponse(
  value: unknown,
  approvedExactPaths: readonly string[]
): FunctionMetricsWorkerAnalysisResult {
  if (!isWorkerResponse(value)) return Object.freeze({ kind: "analysis-failed" });
  if (value.kind === "analysis-failed") return value;
  const approvedPaths = new Set(approvedExactPaths);
  return value.metrics.every((metric) => approvedPaths.has(metric.file))
    ? Object.freeze({ kind: "complete", metrics: value.metrics })
    : Object.freeze({ kind: "analysis-failed" });
}

function isWorkerResponse(value: unknown): value is FunctionMetricsAnalysisWorkerResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    (value.kind === "analysis-failed" ||
      (value.kind === "complete" &&
        "metrics" in value &&
        Array.isArray(value.metrics) &&
        value.metrics.every(isFunctionMetric)))
  );
}

function isFunctionMetric(value: unknown): value is FunctionMetric {
  return (
    isRecord(value) &&
    hasFunctionMetricIdentity(value) &&
    hasFunctionMetricMeasurements(value) &&
    isTypeScriptAnalyzerCyclomaticComplexity(value.cyclomaticComplexity)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasFunctionMetricIdentity(metric: Record<string, unknown>): boolean {
  return typeof metric.file === "string" && typeof metric.name === "string";
}

function hasFunctionMetricMeasurements(metric: Record<string, unknown>): boolean {
  return (
    Number.isSafeInteger(metric.startLine) &&
    Number.isSafeInteger(metric.endLine) &&
    Number.isSafeInteger(metric.lines) &&
    Number.isSafeInteger(metric.parameterCount)
  );
}

function isTypeScriptAnalyzerCyclomaticComplexity(value: unknown): boolean {
  return (
    isRecord(value) && value.source === "typescript-analyzer" && isNullableSafeInteger(value.value)
  );
}

function isNullableSafeInteger(value: unknown): boolean {
  return value === null || (typeof value === "number" && Number.isSafeInteger(value));
}
