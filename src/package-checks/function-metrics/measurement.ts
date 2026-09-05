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
    const codePoint = decodeUtf8CodePoint(bytes, index);
    if (codePoint === undefined) {
      index += 1;
      continue;
    }
    decoded += String.fromCodePoint(codePoint);
    index += utf8SequenceByteLength(codePoint);
  }
  return decoded;
}

function decodeUtf8CodePoint(bytes: Uint8Array, index: number): number | undefined {
  const first = bytes[index];
  if (first === undefined) return undefined;
  if (first <= 0x7f) return first;
  if (first >= 0xc2 && first <= 0xdf) return decodeTwoByteUtf8Sequence(first, bytes[index + 1]);
  if (first >= 0xe0 && first <= 0xef) {
    return decodeThreeByteUtf8Sequence(first, bytes[index + 1], bytes[index + 2]);
  }
  if (first >= 0xf0 && first <= 0xf4) {
    return decodeFourByteUtf8Sequence(first, bytes[index + 1], bytes[index + 2], bytes[index + 3]);
  }
  return undefined;
}

function decodeTwoByteUtf8Sequence(first: number, second: number | undefined): number | undefined {
  if (!isUtf8Continuation(second)) return undefined;
  return ((first & 0x1f) << 6) | (second & 0x3f);
}

function decodeThreeByteUtf8Sequence(
  first: number,
  second: number | undefined,
  third: number | undefined
): number | undefined {
  if (!isUtf8SecondByteForThreeByteSequence(first, second) || !isUtf8Continuation(third)) {
    return undefined;
  }
  return ((first & 0x0f) << 12) | ((second & 0x3f) << 6) | (third & 0x3f);
}

function decodeFourByteUtf8Sequence(
  first: number,
  second: number | undefined,
  third: number | undefined,
  fourth: number | undefined
): number | undefined {
  if (
    !isUtf8SecondByteForFourByteSequence(first, second) ||
    !isUtf8Continuation(third) ||
    !isUtf8Continuation(fourth)
  ) {
    return undefined;
  }
  return ((first & 0x07) << 18) | ((second & 0x3f) << 12) | ((third & 0x3f) << 6) | (fourth & 0x3f);
}

function utf8SequenceByteLength(codePoint: number): number {
  if (codePoint <= 0x7f) return 1;
  if (codePoint <= 0x7ff) return 2;
  if (codePoint <= 0xffff) return 3;
  return 4;
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
