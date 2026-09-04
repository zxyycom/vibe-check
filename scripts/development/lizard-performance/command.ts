/** Explicit developer-only comparison. It is intentionally absent from package.json and Project Gate. */
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runProcessSync } from "../../process-execution/execution.ts";
import {
  BENCHMARK_ID,
  LIZARD_PYTHON_VERSION,
  REQUIRED_ABBA_BLOCKS,
  type BenchmarkLayer,
  type BenchmarkMode,
  type CanonicalMetric,
  type RawSample,
  type ResourceMeasurement,
  type WorkloadManifest
} from "./contract.ts";
import { canonicalDigest, canonicalMetrics, metricsEqual } from "./canonical.ts";
import {
  bootstrapMedianRatio95,
  classifyComparison,
  pairedBlockRatios,
  summarize
} from "./statistics.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)));
const manifestPath = resolve(scriptRoot, "workload-manifest.json");
const supervisorPath = resolve(scriptRoot, "supervisor.py");
const pythonDriverPath = resolve(scriptRoot, "python-driver.py");
const portHarnessPath = resolve(
  root,
  "src/package-checks/function-metrics/analyzer/performance-harness.test-support.ts"
);
const publicProductDriverPath = resolve(scriptRoot, "public-product-driver.ts");
const historicalParent = "853b30eaaa1a0545edf24b3622a5245d16c94a63";
const fixedLizard124Commit = "308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec";
const currentHarnessPath = resolve(
  root,
  "src/package-checks/function-metrics/measurement-performance-harness.test-support.ts"
);

type Condition = RawSample["condition"];
interface ChildResult {
  readonly metrics: readonly CanonicalMetric[];
  readonly operationWallMs?: number;
  readonly productDigest?: string;
  readonly scannerExecutable?: string;
  readonly stageScopes?: Record<string, string>;
  readonly stages?: Record<string, number | null>;
}
interface SupervisorResult {
  readonly exitCode: number;
  readonly resource: ResourceMeasurement;
  readonly stderr: string;
  readonly stdout: string;
  readonly wallMs: number;
}
interface Arguments {
  readonly historicalWorktree?: string;
  readonly layers: readonly BenchmarkLayer[];
  readonly lizard123?: string;
  readonly lizard124Source?: string;
  readonly mode: BenchmarkMode;
  readonly outputDirectory: string;
  readonly temperature: "cold" | "warmed-operation";
}

export function parseArguments(argv: readonly string[]): Arguments {
  let mode: BenchmarkMode = "smoke";
  let layers: readonly BenchmarkLayer[] = [
    "analyzer-only",
    "current-decomposition",
    "historical-product"
  ];
  let outputDirectory = resolve(
    root,
    "artifacts/development-benchmarks",
    new Date().toISOString().replaceAll(":", "-")
  );
  let historicalWorktree: string | undefined;
  let lizard123: string | undefined;
  let lizard124Source: string | undefined;
  let temperature: "cold" | "warmed-operation" = "cold";
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--mode") {
      const parsed = argv[++index];
      if (parsed !== "smoke" && parsed !== "full") throw new Error("--mode must be smoke or full");
      mode = parsed;
      continue;
    }
    if (value === "--layer") {
      const parsed = argv[++index];
      const map: Record<string, BenchmarkLayer> = {
        A: "historical-product",
        B: "analyzer-only",
        C: "current-decomposition",
        all: "analyzer-only"
      };
      if (parsed === "all")
        layers = ["analyzer-only", "current-decomposition", "historical-product"];
      else if (parsed !== undefined && map[parsed] !== undefined) layers = [map[parsed]];
      else throw new Error("--layer must be A, B, C, or all");
      continue;
    }
    if (value === "--temperature") {
      const parsed = argv[++index];
      if (parsed !== "cold" && parsed !== "warmed-operation")
        throw new Error("--temperature must be cold or warmed-operation");
      temperature = parsed;
      continue;
    }
    if (value === "--historical-worktree") {
      const parsed = argv[++index];
      if (parsed === undefined || parsed.startsWith("-"))
        throw new Error("--historical-worktree requires a directory");
      historicalWorktree = resolve(parsed);
      continue;
    }
    if (value === "--lizard123") {
      const parsed = argv[++index];
      if (parsed === undefined || parsed.startsWith("-") || !isAbsolute(parsed))
        throw new Error("--lizard123 requires an absolute executable");
      lizard123 = parsed;
      continue;
    }
    if (value === "--lizard124-source") {
      const parsed = argv[++index];
      if (parsed === undefined || parsed.startsWith("-") || !isAbsolute(parsed))
        throw new Error("--lizard124-source requires an absolute source checkout");
      lizard124Source = parsed;
      continue;
    }
    if (value === "--output") {
      const parsed = argv[++index];
      if (parsed === undefined || parsed.startsWith("-"))
        throw new Error("--output requires a directory");
      outputDirectory = resolve(parsed);
      continue;
    }
    throw new Error(`unknown argument: ${value}`);
  }
  return Object.freeze({
    ...(historicalWorktree === undefined ? {} : { historicalWorktree }),
    layers,
    ...(lizard123 === undefined ? {} : { lizard123 }),
    ...(lizard124Source === undefined ? {} : { lizard124Source }),
    mode,
    outputDirectory,
    temperature
  });
}

export function runComparison(args: Arguments): void {
  mkdirSync(args.outputDirectory, { recursive: true });
  const manifest = readManifest();
  const manifestSources = readSources(manifest.analyzerSourcePaths);
  const productFiles = readSources(manifest.productSourcePaths);
  const identity = Object.freeze({
    benchmarkId: BENCHMARK_ID,
    driverSnapshotDigest: fileSnapshotDigest([
      resolve(scriptRoot, "canonical.ts"),
      resolve(scriptRoot, "command.ts"),
      resolve(scriptRoot, "contract.ts"),
      currentHarnessPath,
      resolve(
        root,
        "src/package-checks/function-metrics/measurement-performance-worker.test-support.ts"
      ),
      portHarnessPath,
      publicProductDriverPath,
      pythonDriverPath,
      resolve(scriptRoot, "statistics.ts"),
      supervisorPath,
      resolve(scriptRoot, "supervisor-parent-child.py")
    ]),
    dirty: git("status", "--porcelain"),
    head: git("rev-parse", "HEAD"),
    manifestDigest: canonicalDigest(manifest),
    sourceDigest: sourceDigest(manifestSources),
    worktree: root
  });
  const layers: object[] = [];
  for (const layer of args.layers) {
    if (!isSupportedSupervisorPlatform(process.platform)) {
      layers.push(
        Object.freeze({
          layer,
          reason:
            "The wait4 supervisor is validated only on Linux; no CPU/RSS or timing evidence was collected.",
          status: "not-comparable"
        })
      );
      continue;
    }
    try {
      if (layer === "analyzer-only")
        layers.push(
          runAnalyzerOnly(
            args.mode,
            args.outputDirectory,
            manifest,
            args.lizard124Source,
            args.temperature
          )
        );
      else if (layer === "current-decomposition")
        layers.push(runCurrentDecomposition(args.mode, args.outputDirectory, productFiles));
      else
        layers.push(
          runHistoricalProduct(
            args.mode,
            args.outputDirectory,
            productFiles,
            args.historicalWorktree,
            args.lizard123,
            args.temperature
          )
        );
    } catch (error) {
      layers.push(
        Object.freeze({
          layer,
          reason: error instanceof Error ? error.message : String(error),
          status: "failed"
        })
      );
    }
  }
  const evidence = Object.freeze({
    identity,
    layers: Object.freeze(layers),
    machine: machineMetadata(),
    mode: args.mode,
    temperature: args.temperature,
    protocol: Object.freeze({
      abbaBlocks: args.mode === "full" ? REQUIRED_ABBA_BLOCKS : 1,
      cold: "Each counted sample is a fresh direct-child target process after untimed equality preflight.",
      warm:
        args.temperature === "cold"
          ? "not run"
          : "Each counted operation follows one uncounted same-process analysis. RSS remains a whole target/session diagnostic, not a per-operation peak.",
      practicalEquivalenceBand: [0.95, 1.05],
      resource:
        "CPU is Linux wait4 target plus reaped descendants; RSS is max single process RSS, never a tree aggregate."
    })
  });
  writeFileSync(
    resolve(args.outputDirectory, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`
  );
  writeFileSync(resolve(args.outputDirectory, "summary.md"), renderSummary(evidence));
  console.log(`Wrote developer benchmark evidence: ${args.outputDirectory}`);
}

interface FixedLizard124 {
  readonly cleanup: () => void;
  readonly command: (
    driver: string,
    warmupArguments: readonly string[],
    requestPath: string
  ) => string[];
  readonly identity: Readonly<Record<string, unknown>>;
}

function provisionFixedLizard124(outputDirectory: string, source: string): FixedLizard124 {
  if (gitAt(source, "rev-parse", "HEAD") !== fixedLizard124Commit)
    throw new Error(`--lizard124-source must be upstream commit ${fixedLizard124Commit}`);
  void outputDirectory;
  const environment = mkdtempSync(resolve(tmpdir(), "vibe-check-lizard-1.24-"));
  const executable = resolve(environment, "bin/python");
  try {
    requireSuccess(
      runProcessSync({
        args: ["venv", "--no-project", "--python", "python3", environment],
        command: "uv",
        cwd: root
      }),
      "output-local Lizard 1.24 Python venv provision"
    );
    requireSuccess(
      runProcessSync({
        args: ["pip", "install", "--python", executable, "--no-deps", "Pygments==2.18.0"],
        command: "uv",
        cwd: root
      }),
      "pinned Pygments provision"
    );
    const probe = requireSuccess(
      runProcessSync({
        args: [
          `PYTHONPATH=${source}`,
          executable,
          "-c",
          "import hashlib,importlib.metadata,json,lizard,pygments,sys; from lizard_ext.version import version as lizard_version; d=importlib.metadata.distribution('Pygments'); record=next(f for f in d.files or [] if str(f).endswith('.dist-info/RECORD')); print(json.dumps({'lizardModule':lizard.__file__,'lizardVersion':lizard_version,'pygmentsVersion':pygments.__version__,'pygmentsRecordSha256':hashlib.sha256(d.locate_file(record).read_bytes()).hexdigest(),'pythonExecutable':sys.executable,'pythonVersion':sys.version}))"
        ],
        command: "env",
        cwd: root
      }),
      "fixed Lizard 1.24 provision probe"
    );
    const rawProbe = parseJson(probe.stdout, "fixed Lizard 1.24 provision probe");
    const identity = Object.freeze({
      lizardSourceCommit: fixedLizard124Commit,
      lizardSourcePathAtFormation: source,
      provisionedPythonPathAtFormation: executable,
      pygments: rawProbe,
      runtimeDisposition:
        "ephemeral task-owned venv was provisioned before samples and deleted after this B layer; it is not a retained reproduction resource.",
      uvVersion: runProcessSync({ args: ["--version"], command: "uv", cwd: root }).stdout.trim()
    });
    return Object.freeze({
      cleanup: () => rmSync(environment, { force: true, recursive: true }),
      command: (driver: string, warmupArguments: readonly string[], requestPath: string) => [
        "env",
        `PYTHONPATH=${source}`,
        executable,
        driver,
        ...warmupArguments,
        requestPath
      ],
      identity
    });
  } catch (error) {
    rmSync(environment, { force: true, recursive: true });
    throw error;
  }
}

function requireSuccess(
  result: ReturnType<typeof runProcessSync>,
  label: string
): ReturnType<typeof runProcessSync> {
  if (result.status !== 0) throw new Error(`${label} failed: ${result.stderr || result.stdout}`);
  return result;
}

function runAnalyzerOnly(
  mode: BenchmarkMode,
  outputDirectory: string,
  manifest: WorkloadManifest,
  lizard124Source: string | undefined,
  temperature: "cold" | "warmed-operation"
) {
  if (lizard124Source === undefined)
    return Object.freeze({
      layer: "B fixed Lizard 1.24 analyzer-only",
      reason:
        "B requires --lizard124-source at upstream commit 308b1c3...; ephemeral provisioning is excluded from samples.",
      status: "not-comparable",
      temperature
    });
  const python = provisionFixedLizard124(outputDirectory, lizard124Source);
  try {
    const tinyFiles = readSources(manifest.productSourcePaths);
    const representativeFiles = repeatAnalyzerSources(
      readSources(manifest.analyzerSourcePaths),
      manifest.analyzerBatchReplications
    );
    return Object.freeze({
      layer: "B fixed Lizard 1.24 analyzer-only",
      provision: python.identity,
      status: "comparable-wall-only",
      temperature,
      workloads: Object.freeze([
        runAnalyzerWorkload(
          "tiny-cold-start",
          mode,
          outputDirectory,
          python,
          tinyFiles,
          temperature
        ),
        runAnalyzerWorkload(
          "representative-batch",
          mode,
          outputDirectory,
          python,
          representativeFiles,
          temperature
        )
      ])
    });
  } finally {
    python.cleanup();
  }
}

function runAnalyzerWorkload(
  workload: "representative-batch" | "tiny-cold-start",
  mode: BenchmarkMode,
  outputDirectory: string,
  python: FixedLizard124,
  files: readonly { readonly path: string; readonly source: string }[],
  temperature: "cold" | "warmed-operation"
) {
  const requestPath = writeRequest(outputDirectory, `${workload}-request.json`, {
    files,
    rootDir: root
  });
  const warmupArguments = temperatureArguments(temperature);
  const pythonObserved = runTarget(python.command(pythonDriverPath, warmupArguments, requestPath));
  const typescript = runTarget([
    process.execPath,
    portHarnessPath,
    ...warmupArguments,
    requestPath
  ]);
  const pyValue = childValue(pythonObserved, "Python Lizard 1.24 preflight");
  const tsValue = childValue(typescript, "TypeScript port preflight");
  const equal = metricsEqual(pyValue.metrics, tsValue.metrics);
  const preflight = Object.freeze({
    equal,
    pythonDigest: canonicalDigest(canonicalMetrics(pyValue.metrics)),
    typescriptDigest: canonicalDigest(canonicalMetrics(tsValue.metrics)),
    pythonVersion: LIZARD_PYTHON_VERSION
  });
  if (!equal)
    return Object.freeze({
      layer: "B fixed Lizard 1.24 analyzer-only",
      preflight,
      status: "not-comparable",
      temperature
    });

  const samples: RawSample[] = [];
  const blocks = mode === "full" ? REQUIRED_ABBA_BLOCKS : 1;
  for (let block = 1; block <= blocks; block += 1) {
    for (const condition of abba(block, "python-lizard-1.24", "typescript-port")) {
      const target =
        condition === "python-lizard-1.24"
          ? python.command(pythonDriverPath, warmupArguments, requestPath)
          : [process.execPath, portHarnessPath, requestPath];
      if (condition === "typescript-port") target.splice(2, 0, ...warmupArguments);
      const observed = runTarget(target);
      const value = childValue(observed, `${condition} block ${block}`);
      const outputDigest = canonicalDigest(canonicalMetrics(value.metrics));
      assertStableOutputDigest(
        preflight.pythonDigest,
        outputDigest,
        `${workload} ${condition} block ${block}`
      );
      samples.push(
        sampleFromObservation(block, condition, samples.length + 1, outputDigest, observed, value)
      );
    }
  }
  const summary = compareSamples(samples, "python-lizard-1.24", "typescript-port", temperature);
  return Object.freeze({
    workload,
    input: Object.freeze({
      byteCount: byteCount(files),
      fileCount: files.length,
      sourceDigest: sourceDigest(files)
    }),
    preflight,
    samples: Object.freeze(samples),
    ...summary,
    status: "comparable-wall-only",
    temperature
  });
}

function runCurrentDecomposition(
  mode: BenchmarkMode,
  outputDirectory: string,
  files: readonly { readonly path: string; readonly source: string }[]
) {
  const requestPath = writeRequest(outputDirectory, "current-decomposition-request.json", {
    files,
    rootDir: root
  });
  const preflight = childValue(
    runTarget([process.execPath, currentHarnessPath, requestPath]),
    "current Product preflight"
  );
  const preflightDigest = canonicalDigest(canonicalMetrics(preflight.metrics));
  const corePreflight = childValue(
    runTarget([process.execPath, portHarnessPath, requestPath]),
    "C direct port preflight"
  );
  assertStableOutputDigest(
    preflightDigest,
    canonicalDigest(canonicalMetrics(corePreflight.metrics)),
    "C direct port preflight"
  );
  const samples: object[] = [];
  const count = mode === "full" ? REQUIRED_ABBA_BLOCKS * 2 : 2;
  for (let ordinal = 1; ordinal <= count; ordinal += 1) {
    const observed = runTarget([process.execPath, currentHarnessPath, requestPath]);
    const value = childValue(observed, `current Product sample ${ordinal}`);
    const outputDigest = canonicalDigest(canonicalMetrics(value.metrics));
    assertStableOutputDigest(preflightDigest, outputDigest, `C current Product sample ${ordinal}`);
    const core = childValue(
      runTarget([process.execPath, portHarnessPath, requestPath]),
      `C direct port sample ${ordinal}`
    );
    assertStableOutputDigest(
      preflightDigest,
      canonicalDigest(canonicalMetrics(core.metrics)),
      `C direct port sample ${ordinal}`
    );
    if (core.operationWallMs === undefined)
      throw new Error(`C direct port sample ${ordinal} emitted no operation duration`);
    samples.push(
      Object.freeze({
        ordinal,
        observedWallMs: observed.wallMs,
        operationWallMs: value.operationWallMs ?? null,
        outputDigest,
        sessionDiagnostics: Object.freeze({ resource: observed.resource }),
        stageScopes: Object.freeze({
          ...(value.stageScopes ?? {}),
          directPortFacadeHarnessMs:
            "separate process operation diagnostic; it includes port-facade output mapping and is not additive"
        }),
        stages: Object.freeze({
          ...(value.stages ?? {}),
          directPortFacadeHarnessMs: core.operationWallMs
        })
      })
    );
  }
  return Object.freeze({
    layer: "C current Product decomposition",
    preflight: Object.freeze({
      outputDigest: preflightDigest,
      directPortFacadeHarnessMs: corePreflight.operationWallMs ?? null,
      stages: preflight.stages ?? {}
    }),
    samples: Object.freeze(samples),
    status: "current-only; no historical equivalence claim"
  });
}

function runHistoricalProduct(
  mode: BenchmarkMode,
  outputDirectory: string,
  files: readonly { readonly path: string; readonly source: string }[],
  historicalWorktree: string | undefined,
  lizard123: string | undefined,
  temperature: "cold" | "warmed-operation"
) {
  if (historicalWorktree === undefined || lizard123 === undefined) {
    return Object.freeze({
      layer: "A historical Product end-to-end",
      reason:
        "A requires explicit --historical-worktree at 853b30e... and --lizard123 absolute executable; B/C are not substitutes.",
      status: "not-comparable"
    });
  }
  const historicalIdentity = verifyHistoricalInputs(historicalWorktree, lizard123);
  const warmupArguments = temperatureArguments(temperature);
  const requestPath = writeRequest(outputDirectory, "historical-product-request.json", {
    paths: files.map(({ path }) => path),
    rootDir: root
  });
  const historicalDriver = writeHistoricalProductDriver(historicalWorktree);
  try {
    const current = childValue(
      runTarget([process.execPath, publicProductDriverPath, ...warmupArguments, requestPath]),
      "current Product A preflight"
    );
    const historical = childValue(
      runTarget([
        "env",
        `VIBE_CHECK_LIZARD_CMD=${lizard123}`,
        process.execPath,
        historicalDriver,
        ...warmupArguments,
        requestPath
      ]),
      "historical Product A preflight"
    );
    const equal =
      current.productDigest !== undefined && current.productDigest === historical.productDigest;
    if (historical.scannerExecutable !== lizard123)
      throw new Error("historical Product did not report the requested scanner executable");
    const preflight = Object.freeze({
      currentDigest: current.productDigest ?? null,
      equal,
      historicalDigest: historical.productDigest ?? null,
      historicalParent,
      historicalScannerExecutable: historical.scannerExecutable,
      historicalWorktreeHead: historicalIdentity.worktreeHead,
      lizard123Version: historicalIdentity.lizard123Version,
      lizard123
    });
    if (!equal)
      return Object.freeze({
        layer: "A historical Product end-to-end",
        preflight,
        status: "not-comparable"
      });
    const samples: RawSample[] = [];
    const blocks = mode === "full" ? REQUIRED_ABBA_BLOCKS : 1;
    for (let block = 1; block <= blocks; block += 1) {
      for (const condition of abba(
        block,
        "historical-python-product",
        "current-typescript-product"
      )) {
        const command =
          condition === "historical-python-product"
            ? [
                "env",
                `VIBE_CHECK_LIZARD_CMD=${lizard123}`,
                process.execPath,
                historicalDriver,
                ...warmupArguments,
                requestPath
              ]
            : [process.execPath, publicProductDriverPath, ...warmupArguments, requestPath];
        const observed = runTarget(command);
        const value = childValue(observed, `${condition} A block ${block}`);
        if (condition === "historical-python-product" && value.scannerExecutable !== lizard123)
          throw new Error(`A ${condition} did not use the requested scanner executable`);
        const outputDigest = value.productDigest;
        if (outputDigest === undefined) throw new Error(`A ${condition} emitted no Product digest`);
        assertStableOutputDigest(
          preflight.currentDigest,
          outputDigest,
          `A ${condition} block ${block}`
        );
        samples.push(
          sampleFromObservation(block, condition, samples.length + 1, outputDigest, observed, value)
        );
      }
    }
    return Object.freeze({
      layer: "A historical Product end-to-end",
      preflight,
      samples: Object.freeze(samples),
      ...compareSamples(
        samples,
        "historical-python-product",
        "current-typescript-product",
        temperature
      ),
      status: "comparable-wall-only",
      temperature
    });
  } finally {
    try {
      rmSync(historicalDriver, { force: true });
    } catch {
      // The caller owns the explicit historical worktree; retained driver text is diagnosable cleanup evidence.
    }
  }
}

function verifyHistoricalInputs(
  worktree: string,
  lizard123: string
): Readonly<{ readonly lizard123Version: string; readonly worktreeHead: string }> {
  const worktreeHead = gitAt(worktree, "rev-parse", "HEAD");
  if (worktreeHead !== historicalParent)
    throw new Error(`historical worktree must be ${historicalParent}`);
  const version = runProcessSync({ args: ["--version"], command: lizard123, cwd: worktree });
  if (version.status !== 0 || !/^1\.23\.\d+$/.test(version.stdout.trim()))
    throw new Error("--lizard123 must output canonical 1.23.<patch>");
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

export function statisticalWallMs(
  sample: Pick<RawSample, "observedWallMs" | "operationWallMs">,
  temperature: Arguments["temperature"]
): number {
  return temperature === "cold" ? sample.observedWallMs : sample.operationWallMs;
}

export function temperatureArguments(
  temperature: Arguments["temperature"]
): readonly ["--warmup"] | readonly [] {
  return temperature === "warmed-operation" ? ["--warmup"] : [];
}

export function assertStableOutputDigest(
  expected: string | null | undefined,
  actual: string | null | undefined,
  label: string
): void {
  if (expected === undefined || expected === null || actual !== expected)
    throw new Error(`${label} output drift from equality preflight`);
}

export function isSupportedSupervisorPlatform(platform: string): boolean {
  return platform === "linux";
}

function compareSamples(
  samples: readonly RawSample[],
  leftCondition: Condition,
  rightCondition: Condition,
  temperature: Arguments["temperature"]
) {
  const left = samples.filter(({ condition }) => condition === leftCondition);
  const right = samples.filter(({ condition }) => condition === rightCondition);
  const leftByBlock = pairedGeometricMeans(left, temperature);
  const rightByBlock = pairedGeometricMeans(right, temperature);
  const ratios = pairedBlockRatios(leftByBlock, rightByBlock);
  const ci95 = bootstrapMedianRatio95(ratios);
  const leftSummary = summarize(left.map((sample) => statisticalWallMs(sample, temperature)));
  const rightSummary = summarize(right.map((sample) => statisticalWallMs(sample, temperature)));
  return Object.freeze({
    conclusion: classifyComparison({
      ci95,
      comparable: true,
      pythonP90: leftSummary.p90,
      typescriptP90: rightSummary.p90
    }),
    pairedRatio: Object.freeze({
      ci95,
      leftCondition,
      ratios,
      rightCondition,
      statisticWallScope: temperature === "cold" ? "whole-fresh-target" : "counted-operation"
    }),
    statistics: Object.freeze({
      left: Object.freeze({ condition: leftCondition, ...leftSummary }),
      right: Object.freeze({ condition: rightCondition, ...rightSummary })
    }),
    resourceComparison:
      "not-comparable: supervisor CPU/RSS are whole-target session diagnostics; RSS is max single-process only."
  });
}

function pairedGeometricMeans(
  samples: readonly RawSample[],
  temperature: Arguments["temperature"]
): readonly number[] {
  const values: number[] = [];
  for (let index = 0; index < samples.length; index += 2) {
    const left =
      samples[index] === undefined ? undefined : statisticalWallMs(samples[index], temperature);
    const right =
      samples[index + 1] === undefined
        ? undefined
        : statisticalWallMs(samples[index + 1], temperature);
    if (left === undefined || right === undefined)
      throw new Error("ABBA condition has incomplete block");
    values.push(Math.sqrt(left * right));
  }
  return Object.freeze(values);
}
function abba<T extends Condition>(block: number, left: T, right: T): readonly T[] {
  return block % 2 === 1 ? [left, right, right, left] : [right, left, left, right];
}
function runTarget(command: readonly string[]): SupervisorResult {
  const result = runProcessSync({
    args: [supervisorPath, JSON.stringify(command)],
    command: "python3",
    cwd: root,
    maxBuffer: 16 * 1024 * 1024
  });
  if (result.status !== 0)
    throw new Error(`resource supervisor failed: ${result.stderr || result.stdout}`);
  return parseSupervisorResult(parseJson(result.stdout, "resource supervisor"));
}
function sampleFromObservation(
  block: number,
  condition: RawSample["condition"],
  ordinal: number,
  outputDigest: string,
  observed: SupervisorResult,
  child: ChildResult
): RawSample {
  if (child.operationWallMs === undefined)
    throw new Error(`${condition} emitted no counted-operation duration`);
  return Object.freeze({
    block,
    condition,
    observedWallMs: observed.wallMs,
    operationWallMs: child.operationWallMs,
    ordinal,
    outputDigest,
    ...(child.scannerExecutable === undefined
      ? {}
      : { scannerExecutable: child.scannerExecutable }),
    sessionDiagnostics: Object.freeze({ resource: observed.resource }),
    status: "complete",
    stderr: observed.stderr
  });
}
function childValue(observed: SupervisorResult, description: string): ChildResult {
  if (observed.exitCode !== 0) throw new Error(`${description} failed: ${observed.stderr}`);
  return parseChildResult(parseJson(observed.stdout, description));
}
function writeRequest(directory: string, name: string, value: object): string {
  const path = resolve(directory, name);
  writeFileSync(path, `${JSON.stringify(value)}\n`);
  return path;
}
function readManifest(): WorkloadManifest {
  const manifest = parseWorkloadManifest(
    parseJson(readFileSync(manifestPath, "utf8"), "benchmark manifest")
  );
  const sources = readSources(manifest.analyzerSourcePaths);
  if (manifest.sourceSha256 !== sourceDigest(sources))
    throw new Error("benchmark manifest sourceSha256 does not match its exact source snapshot");
  return manifest;
}
function readSources(paths: readonly string[]) {
  return Object.freeze(
    paths.map((path) => Object.freeze({ path, source: readFileSync(resolve(root, path), "utf8") }))
  );
}

function repeatAnalyzerSources(
  sources: readonly { readonly path: string; readonly source: string }[],
  replications: number
) {
  const result: { path: string; source: string }[] = [];
  for (let repetition = 0; repetition < replications; repetition += 1)
    for (const source of sources)
      result.push(
        Object.freeze({
          path: `benchmark-representative/${String(repetition + 1)}/${source.path}`,
          source: source.source
        })
      );
  return Object.freeze(result);
}

function byteCount(files: readonly { readonly source: string }[]): number {
  return files.reduce((total, { source }) => total + Buffer.byteLength(source), 0);
}
function sourceDigest(
  files: readonly { readonly path: string; readonly source: string }[]
): string {
  return createHash("sha256")
    .update(files.map(({ path, source }) => `${path}\0${source}`).join("\0"))
    .digest("hex");
}

function fileSnapshotDigest(paths: readonly string[]): string {
  return createHash("sha256")
    .update(
      paths.map((path) => `${relative(root, path)}\0${readFileSync(path, "utf8")}`).join("\0")
    )
    .digest("hex");
}
function git(...args: string[]): string {
  return gitAt(root, ...args);
}

function gitAt(cwd: string, ...args: string[]): string {
  const result = runProcessSync({ args, command: "git", cwd });
  return result.status === 0 ? result.stdout.trim() : `unavailable: ${result.stderr.trim()}`;
}
function machineMetadata() {
  return Object.freeze({
    arch: process.arch,
    bun: process.versions.bun ?? "unknown",
    platform: process.platform,
    supervisorPython: runProcessSync({
      args: ["--version"],
      command: "python3",
      cwd: root
    }).stdout.trim()
  });
}
function renderSummary(evidence: {
  readonly identity: { readonly head: string; readonly sourceDigest: string };
  readonly layers: readonly unknown[];
  readonly mode: string;
}) {
  return `# Lizard / TypeScript performance evidence\n\n- Mode: \`${evidence.mode}\`\n- HEAD: \`${evidence.identity.head}\` (worktree state is recorded in JSON)\n- Source snapshot SHA-256: \`${evidence.identity.sourceDigest}\`\n\nThe machine-readable evidence is \`evidence.json\`; raw samples remain there rather than being duplicated here. A/B/C remain distinct; a missing A result is not replaced by B or C.\n\n${evidence.layers.map(renderLayerSummary).join("\n")}\n`;
}

function renderLayerSummary(layer: unknown): string {
  const value = record(layer);
  if (value === undefined) return "- invalid layer evidence";
  const name = typeof value.layer === "string" ? value.layer : "unknown layer";
  const status = typeof value.status === "string" ? value.status : "unknown";
  const workloads = Array.isArray(value.workloads) ? `; workloads: ${value.workloads.length}` : "";
  const reason = typeof value.reason === "string" ? `; ${value.reason}` : "";
  return `- ${name}: ${status}${workloads}${reason}`;
}

function parseJson(text: string, label: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${label} did not emit JSON: ${text}`);
  }
}

function record(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSupervisorResult(value: unknown): SupervisorResult {
  const input = record(value);
  const resource = input === undefined ? undefined : record(input.resource);
  if (
    input === undefined ||
    resource === undefined ||
    typeof input.exitCode !== "number" ||
    typeof input.stderr !== "string" ||
    typeof input.stdout !== "string" ||
    typeof input.wallMs !== "number" ||
    typeof resource.cpuScope !== "string" ||
    typeof resource.peakRssScope !== "string" ||
    typeof resource.systemCpuMs !== "number" ||
    typeof resource.userCpuMs !== "number" ||
    typeof resource.peakRssBytes !== "number" ||
    resource.unit !== "bytes"
  )
    throw new Error("resource supervisor emitted an invalid evidence shape");
  return Object.freeze({
    exitCode: input.exitCode,
    resource: Object.freeze({
      cpuScope: resource.cpuScope,
      peakRssBytes: resource.peakRssBytes,
      peakRssScope: resource.peakRssScope,
      systemCpuMs: resource.systemCpuMs,
      unit: "bytes",
      userCpuMs: resource.userCpuMs
    }),
    stderr: input.stderr,
    stdout: input.stdout,
    wallMs: input.wallMs
  });
}

export function parseChildResult(value: unknown): ChildResult {
  const input = record(value);
  if (input === undefined || !Array.isArray(input.metrics))
    throw new Error("benchmark target emitted no metrics array");
  const metrics = Array.from(input.metrics, parseCanonicalMetric);
  const productDigest = typeof input.productDigest === "string" ? input.productDigest : undefined;
  const scannerExecutable =
    typeof input.scannerExecutable === "string" ? input.scannerExecutable : undefined;
  const operationWallMs =
    typeof input.operationWallMs === "number" && Number.isFinite(input.operationWallMs)
      ? input.operationWallMs
      : undefined;
  const stagesSource = input.stages === undefined ? undefined : record(input.stages);
  const stages =
    stagesSource === undefined
      ? undefined
      : Object.fromEntries(
          Object.entries(stagesSource).map(([key, duration]) => {
            if (typeof duration !== "number" && duration !== null)
              throw new Error(`benchmark target emitted an invalid stages.${key} duration`);
            return [key, duration];
          })
        );
  const stageScopesSource = input.stageScopes === undefined ? undefined : record(input.stageScopes);
  const stageScopes =
    stageScopesSource === undefined
      ? undefined
      : Object.fromEntries(
          Object.entries(stageScopesSource).map(([key, scope]) => {
            if (typeof scope !== "string")
              throw new Error(`benchmark target emitted an invalid stageScopes.${key} value`);
            return [key, scope];
          })
        );
  return Object.freeze({
    metrics: Object.freeze(metrics),
    ...(operationWallMs === undefined ? {} : { operationWallMs }),
    ...(productDigest === undefined ? {} : { productDigest }),
    ...(scannerExecutable === undefined ? {} : { scannerExecutable }),
    ...(stageScopes === undefined ? {} : { stageScopes }),
    ...(stages === undefined ? {} : { stages })
  });
}

function parseCanonicalMetric(value: unknown, index: number): CanonicalMetric {
  const metric = record(value);
  if (metric === undefined) throw invalidMetric(index, "value", "an object");
  const ccn = metric.ccn;
  if (typeof ccn !== "number" && ccn !== null)
    throw invalidMetric(index, "ccn", "a number or null");
  return Object.freeze({
    ccn,
    endLine: metricNumber(metric, "endLine", index),
    file: metricString(metric, "file", index),
    name: metricString(metric, "name", index),
    nloc: metricNumber(metric, "nloc", index),
    parameterCount: metricNumber(metric, "parameterCount", index),
    startLine: metricNumber(metric, "startLine", index)
  });
}

function metricString(
  metric: Readonly<Record<string, unknown>>,
  field: "file" | "name",
  index: number
): string {
  const value = metric[field];
  if (typeof value !== "string") throw invalidMetric(index, field, "a string");
  return value;
}

function metricNumber(
  metric: Readonly<Record<string, unknown>>,
  field: "endLine" | "nloc" | "parameterCount" | "startLine",
  index: number
): number {
  const value = metric[field];
  if (typeof value !== "number") throw invalidMetric(index, field, "a number");
  return value;
}

function invalidMetric(index: number, field: string, requirement: string): Error {
  return new Error(`benchmark target metrics[${index}].${field} must be ${requirement}`);
}

export function parseWorkloadManifest(value: unknown): WorkloadManifest {
  const input = record(value);
  if (input === undefined) throw invalidManifest("root", "an object");
  if (input.fixedLizardVersion !== LIZARD_PYTHON_VERSION) {
    throw invalidManifest("fixedLizardVersion", LIZARD_PYTHON_VERSION);
  }
  const analyzerBatchReplications = manifestPositiveSafeInteger(input, "analyzerBatchReplications");
  const analyzerSourcePaths = manifestStringArray(input, "analyzerSourcePaths");
  const productSourcePaths = manifestStringArray(input, "productSourcePaths");
  return Object.freeze({
    analyzerBatchReplications,
    analyzerSourcePaths,
    fixedLizardVersion: LIZARD_PYTHON_VERSION,
    id: manifestString(input, "id"),
    productSourcePaths,
    sourceSha256: manifestString(input, "sourceSha256")
  });
}

function manifestString(
  manifest: Readonly<Record<string, unknown>>,
  field: "id" | "sourceSha256"
): string {
  const value = manifest[field];
  if (typeof value !== "string") throw invalidManifest(field, "a string");
  return value;
}

function manifestStringArray(
  manifest: Readonly<Record<string, unknown>>,
  field: "analyzerSourcePaths" | "productSourcePaths"
): readonly string[] {
  const value = manifest[field];
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((item) => typeof item === "string")
  ) {
    throw invalidManifest(field, "a non-empty string array");
  }
  return Object.freeze([...value]);
}

function manifestPositiveSafeInteger(
  manifest: Readonly<Record<string, unknown>>,
  field: "analyzerBatchReplications"
): number {
  const value = manifest[field];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw invalidManifest(field, "a positive safe integer");
  }
  return value;
}

function invalidManifest(field: string, requirement: string): Error {
  return new Error(`fixed Lizard benchmark manifest ${field} must be ${requirement}`);
}

if (import.meta.main) runComparison(parseArguments(process.argv.slice(2)));
