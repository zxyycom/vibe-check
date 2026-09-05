import { rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { runProcessSync } from "../../process-execution/execution.ts";
import type { BenchmarkTemperature } from "./arguments.ts";
import { benchmarkRoot, historicalParent, publicProductDriverPath } from "./benchmark-context.ts";
import { gitAt } from "./benchmark-identity.ts";
import { REQUIRED_ABBA_BLOCKS, type BenchmarkMode, type RawSample } from "./contract.ts";
import {
  abba,
  assertStableOutputDigest,
  compareSamples,
  temperatureArguments
} from "./sampling.ts";
import { childValue, runTarget, sampleFromObservation } from "./target-evidence.ts";
import { writeRequest, type WorkloadFile } from "./workload.ts";

interface HistoricalProductInput {
  readonly files: readonly WorkloadFile[];
  readonly historicalWorktree: string | undefined;
  readonly lizard123: string | undefined;
  readonly mode: BenchmarkMode;
  readonly outputDirectory: string;
  readonly temperature: BenchmarkTemperature;
}

interface HistoricalIdentity {
  readonly lizard123Version: string;
  readonly worktreeHead: string;
}

interface HistoricalSampleInput {
  readonly historicalDriver: string;
  readonly lizard123: string;
  readonly preflightDigest: string | null;
  readonly requestPath: string;
}

export function runHistoricalProduct(input: HistoricalProductInput) {
  if (input.historicalWorktree === undefined || input.lizard123 === undefined) {
    return unavailableHistoricalProduct();
  }
  const historicalIdentity = verifyHistoricalInputs(input.historicalWorktree, input.lizard123);
  const warmupArguments = temperatureArguments(input.temperature);
  const requestPath = writeRequest(input.outputDirectory, "historical-product-request.json", {
    paths: input.files.map(({ path }) => path),
    rootDir: benchmarkRoot
  });
  const historicalDriver = writeHistoricalProductDriver(input.historicalWorktree);
  try {
    const preflight = historicalPreflight({
      historicalDriver,
      historicalIdentity,
      lizard123: input.lizard123,
      requestPath,
      warmupArguments
    });
    if (!preflight.equal) return incomparableHistoricalProduct(preflight);
    const samples = collectHistoricalSamples({
      historicalDriver,
      lizard123: input.lizard123,
      mode: input.mode,
      preflightDigest: preflight.currentDigest,
      requestPath,
      warmupArguments
    });
    return Object.freeze({
      layer: "A historical Product end-to-end",
      preflight,
      samples: Object.freeze(samples),
      ...compareSamples(
        samples,
        "historical-python-product",
        "current-typescript-product",
        input.temperature
      ),
      status: "comparable-wall-only",
      temperature: input.temperature
    });
  } finally {
    try {
      rmSync(historicalDriver, { force: true });
    } catch {
      // The caller owns the explicit historical worktree; retained driver text is diagnosable cleanup evidence.
    }
  }
}

function unavailableHistoricalProduct() {
  return Object.freeze({
    layer: "A historical Product end-to-end",
    reason:
      "A requires explicit --historical-worktree at 853b30e... and --lizard123 absolute executable; B/C are not substitutes.",
    status: "not-comparable"
  });
}

function historicalPreflight(input: {
  readonly historicalDriver: string;
  readonly historicalIdentity: HistoricalIdentity;
  readonly lizard123: string;
  readonly requestPath: string;
  readonly warmupArguments: readonly string[];
}) {
  const current = childValue(
    runTarget([
      process.execPath,
      publicProductDriverPath,
      ...input.warmupArguments,
      input.requestPath
    ]),
    "current Product A preflight"
  );
  const historical = childValue(
    runTarget(
      historicalTarget(
        input.historicalDriver,
        input.lizard123,
        input.warmupArguments,
        input.requestPath
      )
    ),
    "historical Product A preflight"
  );
  if (historical.scannerExecutable !== input.lizard123) {
    throw new Error("historical Product did not report the requested scanner executable");
  }
  return Object.freeze({
    currentDigest: current.productDigest ?? null,
    equal:
      current.productDigest !== undefined && current.productDigest === historical.productDigest,
    historicalDigest: historical.productDigest ?? null,
    historicalParent,
    historicalScannerExecutable: historical.scannerExecutable,
    historicalWorktreeHead: input.historicalIdentity.worktreeHead,
    lizard123Version: input.historicalIdentity.lizard123Version,
    lizard123: input.lizard123
  });
}

function incomparableHistoricalProduct(preflight: object) {
  return Object.freeze({
    layer: "A historical Product end-to-end",
    preflight,
    status: "not-comparable"
  });
}

function collectHistoricalSamples(
  input: HistoricalSampleInput & {
    readonly mode: BenchmarkMode;
    readonly warmupArguments: readonly string[];
  }
): RawSample[] {
  const samples: RawSample[] = [];
  const blocks = input.mode === "full" ? REQUIRED_ABBA_BLOCKS : 1;
  for (let block = 1; block <= blocks; block += 1) {
    for (const condition of abba(
      block,
      "historical-python-product",
      "current-typescript-product"
    )) {
      const observed = runTarget(historicalSampleTarget(input, condition));
      const value = childValue(observed, `${condition} A block ${block}`);
      verifyHistoricalSampleScanner(condition, value.scannerExecutable, input.lizard123);
      const outputDigest = requiredProductDigest(value.productDigest, condition);
      assertStableOutputDigest(
        input.preflightDigest,
        outputDigest,
        `${condition} A block ${block}`
      );
      samples.push(
        sampleFromObservation({
          block,
          child: value,
          condition,
          observed,
          ordinal: samples.length + 1,
          outputDigest
        })
      );
    }
  }
  return samples;
}

function historicalSampleTarget(
  input: HistoricalSampleInput & { readonly warmupArguments: readonly string[] },
  condition: "historical-python-product" | "current-typescript-product"
): string[] {
  if (condition === "historical-python-product") {
    return historicalTarget(
      input.historicalDriver,
      input.lizard123,
      input.warmupArguments,
      input.requestPath
    );
  }
  return [process.execPath, publicProductDriverPath, ...input.warmupArguments, input.requestPath];
}

function historicalTarget(
  historicalDriver: string,
  lizard123: string,
  warmupArguments: readonly string[],
  requestPath: string
): string[] {
  return [
    "env",
    `VIBE_CHECK_LIZARD_CMD=${lizard123}`,
    process.execPath,
    historicalDriver,
    ...warmupArguments,
    requestPath
  ];
}

function verifyHistoricalSampleScanner(
  condition: "historical-python-product" | "current-typescript-product",
  scannerExecutable: string | undefined,
  lizard123: string
): void {
  if (condition === "historical-python-product" && scannerExecutable !== lizard123) {
    throw new Error(`A ${condition} did not use the requested scanner executable`);
  }
}

function requiredProductDigest(
  value: string | undefined,
  condition: "historical-python-product" | "current-typescript-product"
): string {
  if (value === undefined) throw new Error(`A ${condition} emitted no Product digest`);
  return value;
}

function verifyHistoricalInputs(worktree: string, lizard123: string): HistoricalIdentity {
  const worktreeHead = gitAt(worktree, "rev-parse", "HEAD");
  if (worktreeHead !== historicalParent) {
    throw new Error(`historical worktree must be ${historicalParent}`);
  }
  const version = runProcessSync({ args: ["--version"], command: lizard123, cwd: worktree });
  if (version.status !== 0 || !/^1\.23\.\d+$/.test(version.stdout.trim())) {
    throw new Error("--lizard123 must output canonical 1.23.<patch>");
  }
  return Object.freeze({ lizard123Version: version.stdout.trim(), worktreeHead });
}

function writeHistoricalProductDriver(worktree: string): string {
  const path = resolve(worktree, ".lizard-performance-historical-driver.ts");
  writeFileSync(path, HISTORICAL_PRODUCT_DRIVER);
  return path;
}

const HISTORICAL_PRODUCT_DRIVER = String.raw`import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { defineConfig, functionMetrics, run } from "./src/index.ts";
const requestPath = process.argv.find((argument) => argument !== "--warmup" && argument.endsWith(".json"));
const request = JSON.parse(readFileSync(requestPath ?? "", "utf8"));
const warmup = process.argv.includes("--warmup");
const scannerExecutable = process.env.VIBE_CHECK_LIZARD_CMD;
if (typeof scannerExecutable !== "string" || scannerExecutable.length === 0) throw new Error("historical benchmark requires VIBE_CHECK_LIZARD_CMD");
const check = functionMetrics({ scanner: { executable: scannerExecutable }, findingPolicy: "non-blocking", codeAreas: { benchmark: { files: { include: request.paths }, limits: { codeLines: { maximum: 1, lowComplexityAllowance: { cyclomaticComplexityBelow: 6, maximum: 1 } }, cyclomaticComplexity: { maximum: 1 }, parameters: { maximum: 1 } } } } });
const definition = defineConfig({ checks: [check], outputs: { diagnosticLogging: { enabled: false }, machinePublication: { enabled: false }, progressRendering: { enabled: false } } });
if (warmup) await run(definition, { projectRoot: request.rootDir });
const started = performance.now();
const result = await run(definition, { projectRoot: request.rootDir });
if (result.kind !== "completed") throw new Error("historical public Product did not complete");
console.log(JSON.stringify({ metrics: [], operationWallMs: performance.now() - started, productDigest: createHash("sha256").update(JSON.stringify(result.snapshot)).digest("hex"), scannerExecutable }));
`;
