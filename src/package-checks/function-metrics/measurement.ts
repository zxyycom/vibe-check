import { closeSync, openSync, readSync } from "node:fs";
import { resolve } from "node:path";

import type {
  FunctionMetricsAnalysisWorkerRequest,
  FunctionMetricsAnalysisWorkerResponse
} from "./analyzer-worker-contract.ts";
import type { FunctionMetric, FunctionMetricsExactInputSet } from "./measurement-model.ts";

const MAXIMUM_FILE_BYTES = 8 * 1024 * 1024;
const MAXIMUM_AGGREGATE_BYTES = 64 * 1024 * 1024;
const READ_CHUNK_BYTES = 32 * 1024;

export type FunctionMeasurementResult = Readonly<
  | { kind: "analysis-failed" }
  | { kind: "cancelled" }
  | { kind: "complete"; metrics: readonly FunctionMetric[] }
  | { kind: "resource-limit-exceeded" }
  | { kind: "source-unavailable" }
>;

interface FunctionMeasurementInput {
  readonly input: FunctionMetricsExactInputSet;
  readonly signal: AbortSignal;
}

interface FunctionMeasurementDependencies {
  readonly yieldAdmission: () => Promise<void>;
}

const DEFAULT_FUNCTION_MEASUREMENT_DEPENDENCIES: FunctionMeasurementDependencies = Object.freeze({
  yieldAdmission: yieldAdmissionToTimer
});

/**
 * The Check parent admits exactly its selected sources and bounds their bytes;
 * one Worker only analyzes those source texts and never discovers or reads paths.
 */
export async function measureFunctionMetrics(
  { input, signal }: FunctionMeasurementInput,
  dependencies: FunctionMeasurementDependencies = DEFAULT_FUNCTION_MEASUREMENT_DEPENDENCIES
): Promise<FunctionMeasurementResult> {
  const admitted = await readExactFunctionSources(input, signal, dependencies.yieldAdmission);
  if (admitted.kind !== "complete") return admitted;
  if (signal.aborted) return Object.freeze({ kind: "cancelled" });
  return analyzeAdmittedSources(admitted.request, input.approvedExactPaths, signal);
}

async function readExactFunctionSources(
  input: FunctionMetricsExactInputSet,
  signal: AbortSignal,
  yieldAdmission: () => Promise<void>
): Promise<
  | Readonly<{ readonly kind: "cancelled" }>
  | Readonly<{ readonly kind: "complete"; readonly request: FunctionMetricsAnalysisWorkerRequest }>
  | Readonly<{ readonly kind: "resource-limit-exceeded" }>
  | Readonly<{ readonly kind: "source-unavailable" }>
> {
  let aggregateBytes = 0;
  const files: FunctionMetricsAnalysisWorkerRequest["files"][number][] = [];
  for (const path of input.approvedExactPaths) {
    if (signal.aborted) return Object.freeze({ kind: "cancelled" });
    const source = await readBoundedSource(
      resolve(input.rootDir, path),
      aggregateBytes,
      signal,
      yieldAdmission
    );
    if (source.kind !== "complete") return source;
    aggregateBytes += source.byteLength;
    files.push(Object.freeze({ path, source: source.source }));
  }
  return Object.freeze({
    kind: "complete",
    request: Object.freeze({ files: Object.freeze(files) })
  });
}

async function readBoundedSource(
  absolutePath: string,
  aggregateBytes: number,
  signal: AbortSignal,
  yieldAdmission: () => Promise<void>
): Promise<
  | Readonly<{ readonly kind: "cancelled" }>
  | Readonly<{ readonly kind: "complete"; readonly byteLength: number; readonly source: string }>
  | Readonly<{ readonly kind: "resource-limit-exceeded" }>
  | Readonly<{ readonly kind: "source-unavailable" }>
> {
  let descriptor: number;
  try {
    descriptor = openSync(absolutePath, "r");
  } catch {
    return Object.freeze({ kind: "source-unavailable" });
  }
  try {
    const chunks: Buffer[] = [];
    const chunk = Buffer.allocUnsafe(READ_CHUNK_BYTES);
    let fileBytes = 0;
    while (true) {
      if (signal.aborted) return Object.freeze({ kind: "cancelled" });
      const bytesRead = readSync(descriptor, chunk, 0, chunk.length, null);
      if (bytesRead === 0) break;
      fileBytes += bytesRead;
      if (fileBytes > MAXIMUM_FILE_BYTES || aggregateBytes + fileBytes > MAXIMUM_AGGREGATE_BYTES) {
        return Object.freeze({ kind: "resource-limit-exceeded" });
      }
      chunks.push(Buffer.from(chunk.subarray(0, bytesRead)));
      if (signal.aborted) return Object.freeze({ kind: "cancelled" });
      await yieldAdmission();
    }
    return Object.freeze({
      kind: "complete",
      byteLength: fileBytes,
      source: decodeLizardAutoRead(Buffer.concat(chunks, fileBytes))
    });
  } catch {
    return Object.freeze({ kind: "source-unavailable" });
  } finally {
    closeSync(descriptor);
  }
}

function yieldAdmissionToTimer(): Promise<void> {
  return new Promise<void>((resolveYield) => setTimeout(resolveYield, 0));
}

/**
 * Product-owned replacement for Lizard 1.24 `auto_open.auto_read` at the
 * admitted-source boundary. A valid initial UTF-8 BOM is `utf-8-sig` and text
 * newlines are universal; a decoding failure retries the complete byte sequence
 * with Python's `errors="ignore"`, which deliberately retains an initial BOM
 * and raw newlines on that retry.
 */
export function decodeLizardAutoRead(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/\r\n?/gu, "\n");
  } catch {
    return decodeUtf8IgnoringInvalidBytes(bytes);
  }
}

function decodeUtf8IgnoringInvalidBytes(bytes: Uint8Array): string {
  let decoded = "";
  for (let index = 0; index < bytes.length;) {
    const first = bytes[index];
    if (first <= 0x7f) {
      decoded += String.fromCodePoint(first);
      index += 1;
      continue;
    }
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const fourth = bytes[index + 3];
    if (first >= 0xc2 && first <= 0xdf && isUtf8Continuation(second)) {
      decoded += String.fromCodePoint(((first & 0x1f) << 6) | (second & 0x3f));
      index += 2;
      continue;
    }
    if (
      first >= 0xe0 &&
      first <= 0xef &&
      isUtf8SecondByteForThreeByteSequence(first, second) &&
      isUtf8Continuation(third)
    ) {
      decoded += String.fromCodePoint(
        ((first & 0x0f) << 12) | ((second & 0x3f) << 6) | (third & 0x3f)
      );
      index += 3;
      continue;
    }
    if (
      first >= 0xf0 &&
      first <= 0xf4 &&
      isUtf8SecondByteForFourByteSequence(first, second) &&
      isUtf8Continuation(third) &&
      isUtf8Continuation(fourth)
    ) {
      decoded += String.fromCodePoint(
        ((first & 0x07) << 18) | ((second & 0x3f) << 12) | ((third & 0x3f) << 6) | (fourth & 0x3f)
      );
      index += 4;
      continue;
    }
    index += 1;
  }
  return decoded;
}

function isUtf8Continuation(value: number | undefined): value is number {
  return value !== undefined && value >= 0x80 && value <= 0xbf;
}

function isUtf8SecondByteForThreeByteSequence(
  first: number,
  second: number | undefined
): second is number {
  return (
    isUtf8Continuation(second) &&
    !(first === 0xe0 && second < 0xa0) &&
    !(first === 0xed && second > 0x9f)
  );
}

function isUtf8SecondByteForFourByteSequence(
  first: number,
  second: number | undefined
): second is number {
  return (
    isUtf8Continuation(second) &&
    !(first === 0xf0 && second < 0x90) &&
    !(first === 0xf4 && second > 0x8f)
  );
}

async function analyzeAdmittedSources(
  request: FunctionMetricsAnalysisWorkerRequest,
  approvedExactPaths: readonly string[],
  signal: AbortSignal
): Promise<FunctionMeasurementResult> {
  let worker: Worker;
  try {
    worker = new Worker(new URL("./analyzer-worker.ts", import.meta.url).href);
  } catch {
    return Object.freeze({ kind: "analysis-failed" });
  }
  return new Promise((resolveResult) => {
    let settled = false;
    const finish = (result: FunctionMeasurementResult): void => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", cancelled);
      worker.terminate();
      resolveResult(result);
    };
    const cancelled = (): void => finish(Object.freeze({ kind: "cancelled" }));
    worker.onmessage = (event: MessageEvent<unknown>): void => {
      if (signal.aborted) return cancelled();
      const response = parseWorkerResponse(event.data, approvedExactPaths);
      finish(response);
    };
    worker.onerror = (): void => finish(Object.freeze({ kind: "analysis-failed" }));
    signal.addEventListener("abort", cancelled, { once: true });
    if (signal.aborted) return cancelled();
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
): FunctionMeasurementResult {
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
    typeof value === "object" &&
    value !== null &&
    "file" in value &&
    typeof value.file === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "startLine" in value &&
    Number.isSafeInteger(value.startLine) &&
    "endLine" in value &&
    Number.isSafeInteger(value.endLine) &&
    "lines" in value &&
    Number.isSafeInteger(value.lines) &&
    "parameterCount" in value &&
    Number.isSafeInteger(value.parameterCount) &&
    "cyclomaticComplexity" in value &&
    typeof value.cyclomaticComplexity === "object" &&
    value.cyclomaticComplexity !== null &&
    "source" in value.cyclomaticComplexity &&
    value.cyclomaticComplexity.source === "typescript-analyzer" &&
    "value" in value.cyclomaticComplexity &&
    (value.cyclomaticComplexity.value === null ||
      (typeof value.cyclomaticComplexity.value === "number" &&
        Number.isSafeInteger(value.cyclomaticComplexity.value)))
  );
}
