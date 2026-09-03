/**
 * Opt-in outer measurement seam. Its independent diagnostics deliberately do
 * not alter, or claim to add up to, Product measurement behavior.
 */
import { readFileSync } from "node:fs";

import { decodeLizardAutoRead, measureFunctionMetrics } from "./measurement.ts";

interface Request {
  readonly files: readonly { readonly path: string; readonly source: string }[];
  readonly rootDir: string;
}

interface WorkerResponse {
  readonly adapterAndPortAnalysisMs: number;
  readonly kind: "analysis-failed" | "complete";
  readonly metrics?: readonly unknown[];
}

function metricView(
  metrics: readonly {
    readonly cyclomaticComplexity: { readonly value: number | null };
    readonly endLine: number;
    readonly file: string;
    readonly lines: number;
    readonly name: string;
    readonly parameterCount: number;
    readonly startLine: number;
  }[]
) {
  return metrics.map((metric) => ({
    ccn: metric.cyclomaticComplexity.value,
    endLine: metric.endLine,
    file: metric.file,
    name: metric.name,
    nloc: metric.lines,
    parameterCount: metric.parameterCount,
    startLine: metric.startLine
  }));
}

export async function runCurrentProductForPerformanceBenchmark(request: Request) {
  const totalStarted = performance.now();
  const product = await measureFunctionMetrics({
    input: {
      approvedExactPaths: Object.freeze(request.files.map(({ path }) => path)),
      areas: Object.freeze([]),
      rootDir: request.rootDir
    },
    signal: new AbortController().signal
  });
  const totalMs = performance.now() - totalStarted;
  if (product.kind !== "complete")
    throw new Error(`Product measurement did not complete: ${product.kind}`);

  const readStarted = performance.now();
  const admitted = request.files.map((file) => ({
    path: file.path,
    source: decodeLizardAutoRead(readFileSync(`${request.rootDir}/${file.path}`))
  }));
  const readDecodeMs = performance.now() - readStarted;
  const worker = await analyzeInOneShotWorker(admitted);
  if (worker.kind !== "complete" || worker.metrics === undefined)
    throw new Error("benchmark Worker did not complete");
  const workerStartTransferOverheadEstimateMs = Math.max(
    0,
    worker.roundtripMs - worker.adapterAndPortAnalysisMs
  );

  return Object.freeze({
    metrics: metricView(product.metrics),
    operationWallMs: totalMs,
    stageScopes: Object.freeze({
      adapterMappingMs:
        "not isolated: Product adapter invokes the port in one call; no inferred mapping attribution is reported",
      readDecodeMs: "independent exact path read/decode diagnostic",
      totalProductMeasurementMs:
        "normal Product measurement; it overlaps all independent diagnostics",
      workerAdapterAndPortAnalysisMs:
        "inside one benchmark-only Worker; includes production adapter mapping and port analysis",
      workerRoundtripMs:
        "one benchmark-only Worker lifecycle, message transfer, adapter, and port analysis",
      workerStartTransferOverheadEstimateMs:
        "max(0, workerRoundtripMs - workerAdapterAndPortAnalysisMs) from the same Worker operation"
    }),
    stages: Object.freeze({
      adapterMappingMs: null,
      readDecodeMs,
      totalProductMeasurementMs: totalMs,
      workerAdapterAndPortAnalysisMs: worker.adapterAndPortAnalysisMs,
      workerRoundtripMs: worker.roundtripMs,
      workerStartTransferOverheadEstimateMs
    })
  });
}

async function analyzeInOneShotWorker(
  files: readonly { readonly path: string; readonly source: string }[]
): Promise<WorkerResponse & Readonly<{ readonly roundtripMs: number }>> {
  let worker: Worker;
  try {
    worker = new Worker(
      new URL("./measurement-performance-worker.test-support.ts", import.meta.url).href
    );
  } catch {
    return Object.freeze({ adapterAndPortAnalysisMs: 0, kind: "analysis-failed", roundtripMs: 0 });
  }
  const started = performance.now();
  return new Promise((resolveResult) => {
    let settled = false;
    const finish = (value: WorkerResponse): void => {
      if (settled) return;
      settled = true;
      worker.terminate();
      resolveResult(Object.freeze({ ...value, roundtripMs: performance.now() - started }));
    };
    worker.onerror = () =>
      finish(Object.freeze({ adapterAndPortAnalysisMs: 0, kind: "analysis-failed" }));
    worker.onmessage = (event: MessageEvent<unknown>) => finish(parseWorkerResponse(event.data));
    try {
      worker.postMessage({ files });
    } catch {
      finish(Object.freeze({ adapterAndPortAnalysisMs: 0, kind: "analysis-failed" }));
    }
  });
}

function parseWorkerResponse(value: unknown): WorkerResponse {
  if (!isRecord(value) || typeof value.adapterAndPortAnalysisMs !== "number")
    return Object.freeze({ adapterAndPortAnalysisMs: 0, kind: "analysis-failed" });
  if (value.kind === "analysis-failed")
    return Object.freeze({
      adapterAndPortAnalysisMs: value.adapterAndPortAnalysisMs,
      kind: "analysis-failed"
    });
  if (value.kind !== "complete" || !Array.isArray(value.metrics))
    return Object.freeze({ adapterAndPortAnalysisMs: 0, kind: "analysis-failed" });
  return Object.freeze({
    adapterAndPortAnalysisMs: value.adapterAndPortAnalysisMs,
    kind: "complete",
    metrics: value.metrics
  });
}

if (import.meta.main) {
  const request = parseRequest(JSON.parse(readFileSync(process.argv[2] ?? "", "utf8")) as unknown);
  console.log(JSON.stringify(await runCurrentProductForPerformanceBenchmark(request)));
}

function parseRequest(value: unknown): Request {
  if (!isRecord(value) || !Array.isArray(value.files) || !value.files.every(isSource))
    throw new Error("invalid development benchmark request");
  const rootDir = value.rootDir;
  if (typeof rootDir !== "string") throw new Error("invalid development benchmark request");
  return Object.freeze({
    files: Object.freeze(
      value.files.map((file) => Object.freeze({ path: file.path, source: file.source }))
    ),
    rootDir
  });
}

function isSource(value: unknown): value is { readonly path: string; readonly source: string } {
  return isRecord(value) && typeof value.path === "string" && typeof value.source === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
