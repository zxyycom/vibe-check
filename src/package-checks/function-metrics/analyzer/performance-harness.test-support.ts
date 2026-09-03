/** Opt-in development evidence seam. It is excluded from Product and package compiler roots. */
import { readFileSync } from "node:fs";

import { analyzeLizardSource } from "./port-facade.ts";

interface Request {
  readonly files: readonly { readonly path: string; readonly source: string }[];
}

export interface BenchmarkMetric {
  readonly ccn: number | null;
  readonly endLine: number;
  readonly file: string;
  readonly name: string;
  readonly nloc: number;
  readonly parameterCount: number;
  readonly startLine: number;
}

export function analyzePortForPerformanceBenchmark(
  files: Request["files"]
): readonly BenchmarkMetric[] {
  const metrics: BenchmarkMetric[] = [];
  for (const file of files) {
    const analysis = analyzeLizardSource({ filename: file.path, sourceCode: file.source });
    if (analysis === undefined) throw new Error(`unsupported benchmark source: ${file.path}`);
    for (const functionInfo of analysis.function_list) {
      metrics.push(
        Object.freeze({
          ccn: functionInfo.cyclomatic_complexity,
          endLine: functionInfo.end_line,
          file: file.path,
          name: functionInfo.name,
          nloc: functionInfo.nloc,
          parameterCount: functionInfo.parameter_count,
          startLine: functionInfo.start_line
        })
      );
    }
  }
  return Object.freeze(metrics);
}

if (import.meta.main) {
  const warmup = process.argv.includes("--warmup");
  const requestPath = process.argv.find(
    (argument) => argument !== "--warmup" && argument.endsWith(".json")
  );
  const request = parseRequest(JSON.parse(readFileSync(requestPath ?? "", "utf8")) as unknown);
  if (warmup) analyzePortForPerformanceBenchmark(request.files);
  const started = performance.now();
  const metrics = analyzePortForPerformanceBenchmark(request.files);
  console.log(JSON.stringify({ metrics, operationWallMs: performance.now() - started }));
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
