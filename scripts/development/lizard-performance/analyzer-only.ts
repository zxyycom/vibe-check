import type { BenchmarkTemperature } from "./arguments.ts";
import { benchmarkRoot, portHarnessPath, pythonDriverPath } from "./benchmark-context.ts";
import { canonicalDigest, canonicalMetrics, metricsEqual } from "./canonical.ts";
import {
  LIZARD_PYTHON_VERSION,
  REQUIRED_ABBA_BLOCKS,
  type BenchmarkMode,
  type RawSample,
  type WorkloadManifest
} from "./contract.ts";
import { provisionFixedLizard124, type FixedLizard124 } from "./fixed-lizard124.ts";
import {
  abba,
  assertStableOutputDigest,
  compareSamples,
  temperatureArguments
} from "./sampling.ts";
import { childValue, runTarget, sampleFromObservation } from "./target-evidence.ts";
import {
  byteCount,
  readSources,
  repeatAnalyzerSources,
  sourceDigest,
  writeRequest,
  type WorkloadFile
} from "./workload.ts";

interface AnalyzerOnlyInput {
  readonly lizard124Source: string | undefined;
  readonly manifest: WorkloadManifest;
  readonly mode: BenchmarkMode;
  readonly outputDirectory: string;
  readonly temperature: BenchmarkTemperature;
}

interface AnalyzerWorkloadInput {
  readonly files: readonly WorkloadFile[];
  readonly mode: BenchmarkMode;
  readonly outputDirectory: string;
  readonly python: FixedLizard124;
  readonly temperature: BenchmarkTemperature;
  readonly workload: "representative-batch" | "tiny-cold-start";
}

interface AnalyzerPreflight {
  readonly equal: boolean;
  readonly pythonDigest: string;
  readonly pythonVersion: typeof LIZARD_PYTHON_VERSION;
  readonly typescriptDigest: string;
}

interface AnalyzerSampleCollectionInput {
  readonly mode: BenchmarkMode;
  readonly preflight: AnalyzerPreflight;
  readonly python: FixedLizard124;
  readonly requestPath: string;
  readonly warmupArguments: readonly string[];
  readonly workload: "representative-batch" | "tiny-cold-start";
}

export function runAnalyzerOnly(input: AnalyzerOnlyInput) {
  if (input.lizard124Source === undefined) return unavailableAnalyzerOnly(input.temperature);
  const python = provisionFixedLizard124(input.lizard124Source);
  try {
    const tinyFiles = readSources(input.manifest.productSourcePaths);
    const representativeFiles = repeatAnalyzerSources(
      readSources(input.manifest.analyzerSourcePaths),
      input.manifest.analyzerBatchReplications
    );
    return Object.freeze({
      layer: "B fixed Lizard 1.24 analyzer-only",
      provision: python.identity,
      status: "comparable-wall-only",
      temperature: input.temperature,
      workloads: Object.freeze([
        runAnalyzerWorkload({
          files: tinyFiles,
          mode: input.mode,
          outputDirectory: input.outputDirectory,
          python,
          temperature: input.temperature,
          workload: "tiny-cold-start"
        }),
        runAnalyzerWorkload({
          files: representativeFiles,
          mode: input.mode,
          outputDirectory: input.outputDirectory,
          python,
          temperature: input.temperature,
          workload: "representative-batch"
        })
      ])
    });
  } finally {
    python.cleanup();
  }
}

function unavailableAnalyzerOnly(temperature: BenchmarkTemperature) {
  return Object.freeze({
    layer: "B fixed Lizard 1.24 analyzer-only",
    reason:
      "B requires --lizard124-source at upstream commit 308b1c3...; ephemeral provisioning is excluded from samples.",
    status: "not-comparable",
    temperature
  });
}

function runAnalyzerWorkload(input: AnalyzerWorkloadInput) {
  const requestPath = writeRequest(input.outputDirectory, `${input.workload}-request.json`, {
    files: input.files,
    rootDir: benchmarkRoot
  });
  const warmupArguments = temperatureArguments(input.temperature);
  const preflight = analyzerPreflight(input.python, warmupArguments, requestPath);
  if (!preflight.equal) return incomparableAnalyzerWorkload(preflight, input.temperature);
  const samples = collectAnalyzerSamples({
    mode: input.mode,
    preflight,
    python: input.python,
    requestPath,
    warmupArguments,
    workload: input.workload
  });
  return Object.freeze({
    workload: input.workload,
    input: Object.freeze({
      byteCount: byteCount(input.files),
      fileCount: input.files.length,
      sourceDigest: sourceDigest(input.files)
    }),
    preflight,
    samples: Object.freeze(samples),
    ...compareSamples(samples, "python-lizard-1.24", "typescript-port", input.temperature),
    status: "comparable-wall-only",
    temperature: input.temperature
  });
}

function analyzerPreflight(
  python: FixedLizard124,
  warmupArguments: readonly string[],
  requestPath: string
): AnalyzerPreflight {
  const pythonObserved = runTarget(python.command(pythonDriverPath, warmupArguments, requestPath));
  const typescript = runTarget([
    process.execPath,
    portHarnessPath,
    ...warmupArguments,
    requestPath
  ]);
  const pyValue = childValue(pythonObserved, "Python Lizard 1.24 preflight");
  const tsValue = childValue(typescript, "TypeScript port preflight");
  return Object.freeze({
    equal: metricsEqual(pyValue.metrics, tsValue.metrics),
    pythonDigest: canonicalDigest(canonicalMetrics(pyValue.metrics)),
    typescriptDigest: canonicalDigest(canonicalMetrics(tsValue.metrics)),
    pythonVersion: LIZARD_PYTHON_VERSION
  });
}

function incomparableAnalyzerWorkload(
  preflight: AnalyzerPreflight,
  temperature: BenchmarkTemperature
) {
  return Object.freeze({
    layer: "B fixed Lizard 1.24 analyzer-only",
    preflight,
    status: "not-comparable",
    temperature
  });
}

function collectAnalyzerSamples(input: AnalyzerSampleCollectionInput): RawSample[] {
  const samples: RawSample[] = [];
  const blocks = input.mode === "full" ? REQUIRED_ABBA_BLOCKS : 1;
  for (let block = 1; block <= blocks; block += 1) {
    for (const condition of abba(block, "python-lizard-1.24", "typescript-port")) {
      const observed = runTarget(analyzerTarget(input, condition));
      const value = childValue(observed, `${condition} block ${block}`);
      const outputDigest = canonicalDigest(canonicalMetrics(value.metrics));
      assertStableOutputDigest(
        input.preflight.pythonDigest,
        outputDigest,
        `${input.workload} ${condition} block ${block}`
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

function analyzerTarget(
  input: Pick<AnalyzerWorkloadInput, "python"> & {
    readonly requestPath: string;
    readonly warmupArguments: readonly string[];
  },
  condition: "python-lizard-1.24" | "typescript-port"
): string[] {
  if (condition === "python-lizard-1.24") {
    return input.python.command(pythonDriverPath, input.warmupArguments, input.requestPath);
  }
  return [process.execPath, portHarnessPath, ...input.warmupArguments, input.requestPath];
}
