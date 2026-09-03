/** Current public Product runner for the historical end-to-end comparison only. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { defineConfig, functionMetrics, run } from "../../../src/index.ts";

interface Request {
  readonly paths: readonly string[];
  readonly rootDir: string;
}

const warmup = process.argv.includes("--warmup");
const requestPath = process.argv.find(
  (argument) => argument !== "--warmup" && argument.endsWith(".json")
);
const request = parseRequest(JSON.parse(readFileSync(requestPath ?? "", "utf8")) as unknown);
if (warmup) await runProduct(request);
const started = performance.now();
const snapshot = await runProduct(request);
console.log(
  JSON.stringify({
    metrics: [],
    operationWallMs: performance.now() - started,
    productDigest: digest(snapshot)
  })
);

async function runProduct(input: Request): Promise<unknown> {
  const check = functionMetrics({
    codeAreas: {
      benchmark: {
        files: { include: input.paths },
        limits: {
          codeLines: {
            lowComplexityAllowance: { cyclomaticComplexityBelow: 6, maximum: 1 },
            maximum: 1
          },
          cyclomaticComplexity: { maximum: 1 },
          parameters: { maximum: 1 }
        }
      }
    },
    findingPolicy: "non-blocking"
  });
  const result = await run(
    defineConfig({
      checks: [check],
      outputs: {
        diagnosticLogging: { enabled: false },
        machinePublication: { enabled: false },
        progressRendering: { enabled: false }
      }
    }),
    { projectRoot: input.rootDir }
  );
  if (result.kind !== "completed")
    throw new Error(`public Product run did not complete: ${result.kind}`);
  return result.snapshot;
}

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function parseRequest(value: unknown): Request {
  if (!isRecord(value)) throw new Error("invalid Product benchmark request");
  const paths = value.paths;
  const rootDir = value.rootDir;
  if (
    !Array.isArray(paths) ||
    !paths.every((path) => typeof path === "string") ||
    typeof rootDir !== "string"
  )
    throw new Error("invalid Product benchmark request");
  return Object.freeze({ paths: Object.freeze([...paths]), rootDir });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
