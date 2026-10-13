import type { FunctionMetricsWorkerPort } from "../../../../../src/package-checks/function-metrics/analyzer-worker-port.ts";
import type { FunctionMetric } from "../../../../../src/package-checks/function-metrics/measurement-model.ts";
type CorpusManifestEntry = Readonly<{ path: string; bytes: number; sha256: string }>;
type WorkerEvent =
  | Readonly<{ kind: "constructed" | "terminate-request"; ms: number }>
  | Readonly<{ kind: "physical-exit" | "terminate-resolved"; code: number; ms: number }>
  | Readonly<{ kind: "port-return"; ms: number; result: string }>;
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";

const root = "/workspace/vibe-check";
const work = `${root}/tmp/optimization-20261012/tokenizer`;
const [variant, mode, kind, sizeText = "0", prefixText = "0", ...extra] = process.argv.slice(2);
if (variant !== "baseline" && variant !== "candidate")
  throw new Error("variant: expected baseline or candidate");
if (mode !== "run" && mode !== "port" && mode !== "corpus" && mode !== "raw")
  throw new Error("mode: expected run, port, corpus or raw");
if (mode === "corpus" ? kind !== "real" : kind !== "comment" && kind !== "template")
  throw new Error("kind: expected real for corpus, otherwise comment or template");
if (prefixText !== "0" && prefixText !== "1") throw new Error("prefix: expected 0 or 1");
if (
  extra.length > 1 ||
  extra.some((flag) => flag !== "--exit-wait-3000") ||
  (extra.length > 0 && mode !== "port")
)
  throw new Error("extra arguments: only port accepts --exit-wait-3000");
if (!/^\d+$/.test(sizeText)) throw new Error("size: expected decimal integer");
const base = `${work}/${variant === "candidate" ? "candidate" : "baseline"}`;
const size = Number(sizeText),
  hasPrefix = prefixText === "1";
if (!Number.isInteger(size) || size < 0 || size > 16000) throw new Error("explicit size bound");
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const load = (path: string) => import(pathToFileURL(`${base}/${path}`).href);
const extension = kind === "comment" ? "c" : "ts";
const prefix = hasPrefix
  ? "/* ordinary */\nconst x = `closed ${value}`;\nfunction f(){ return 1; }\n"
  : "";
const source = prefix + (kind === "comment" ? "/* ".repeat(size) : "`" + "${x}".repeat(size));
const filename = `input.${extension}`;
const versions = { ...process.versions };
let payload: unknown;
if (mode === "raw") {
  const module: typeof import("../../../../../src/package-checks/function-metrics/analyzer/shared/clike.ts") &
    typeof import("../../../../../src/package-checks/function-metrics/analyzer/readers/typescript.ts") =
    await load(
      `src/package-checks/function-metrics/analyzer/${kind === "comment" ? "shared/clike.ts" : "readers/typescript.ts"}`
    );
  const reader = module[kind === "comment" ? "CLikeReader" : "TypeScriptReader"];
  const start = performance.now();
  const tokens = [...reader.generateTokens(source)];
  payload = {
    elapsedMs: performance.now() - start,
    tokens: tokens.length,
    tokenDigest: digest(tokens)
  };
} else if (mode === "port") {
  const {
    analyzeAdmittedSources
  }: typeof import("../../../../../src/package-checks/function-metrics/analyzer-worker-port.ts") =
    await load("src/package-checks/function-metrics/analyzer-worker-port.ts");
  const workerEvents: (
    | WorkerEvent
    | Readonly<{ kind: "terminate-rejected"; message: string; ms: number }>
  )[] = [];
  let exitPromise: Promise<unknown>;
  const started = performance.now();
  const createWorker = () => {
    const worker = new Worker(
      pathToFileURL(`${base}/src/package-checks/function-metrics/analyzer-worker.ts`)
    );
    workerEvents.push({ kind: "constructed", ms: performance.now() - started });
    exitPromise = new Promise((resolve) =>
      worker.once("exit", (code) => {
        const event = { kind: "physical-exit" as const, code, ms: performance.now() - started };
        workerEvents.push(event);
        resolve(event);
      })
    );
    return {
      postMessage: (value: unknown) => worker.postMessage(value),
      subscribe(listeners: Parameters<FunctionMetricsWorkerPort["subscribe"]>[0]) {
        worker.once("message", listeners.message);
        worker.once("error", listeners.error);
        worker.once("exit", listeners.exit);
        return () => {
          worker.off("message", listeners.message);
          worker.off("error", listeners.error);
          worker.off("exit", listeners.exit);
        };
      },
      terminate() {
        workerEvents.push({ kind: "terminate-request", ms: performance.now() - started });
        void worker
          .terminate()
          .then((code) =>
            workerEvents.push({ kind: "terminate-resolved", code, ms: performance.now() - started })
          )
          .catch((error: unknown) => {
            workerEvents.push({
              kind: "terminate-rejected",
              message: error instanceof Error ? error.message : String(error),
              ms: performance.now() - started
            });
          });
      }
    };
  };
  const signal = AbortSignal.timeout(1000);
  const result = await analyzeAdmittedSources(
    { files: [{ path: filename, source }] },
    [filename],
    signal,
    createWorker
  );
  const returned = performance.now() - started;
  workerEvents.push({ kind: "port-return", ms: returned, result: result.kind });
  const exitObservationMs = process.argv.includes("--exit-wait-3000") ? 3000 : 500;
  let observationTimer: ReturnType<typeof setTimeout>;
  const exitObservation = await Promise.race([
    exitPromise!,
    new Promise((resolve) => {
      observationTimer = setTimeout(() => resolve("not-observed-within-window"), exitObservationMs);
    })
  ]);
  clearTimeout(observationTimer!);
  payload = {
    elapsedMs: returned,
    result: result.kind,
    metricDigest: result.kind === "complete" ? digest(result.metrics) : undefined,
    workerEvents,
    exitObservationMs,
    exitObservation,
    note: "diagnostic transport clone of production Worker wrapper, production settlement used unchanged; physical exit awaited only after timing window"
  };
} else if (mode === "corpus") {
  const {
    analyzeFunctionMetricsSources
  }: typeof import("../../../../../src/package-checks/function-metrics/analyzer-adapter.ts") =
    await load("src/package-checks/function-metrics/analyzer-adapter.ts");
  const manifest = readCorpusManifest(`${work}/corpus-manifest.json`);
  const files = manifest.map((file: CorpusManifestEntry) => {
    const source = readFileSync(`${work}/frozen-input/${file.path}`, "utf8");
    if (createHash("sha256").update(source).digest("hex") !== file.sha256)
      throw new Error("corpus drift");
    return { path: file.path, source };
  });
  const warm = analyzeFunctionMetricsSources({ files });
  const start = performance.now();
  const result: ReturnType<typeof analyzeFunctionMetricsSources> & {
    readonly metrics?: readonly FunctionMetric[];
  } = analyzeFunctionMetricsSources({ files });
  const elapsedMs = performance.now() - start;
  if (digest(result) !== digest(warm)) throw new Error("warm result differs");
  payload = {
    elapsedMs,
    files: files.length,
    bytes: manifest.reduce((n: number, file: CorpusManifestEntry) => n + file.bytes, 0),
    result: result.kind,
    metrics: result.metrics?.length,
    metricDigest: digest(result)
  };
} else {
  const { defineConfig, functionMetrics, run }: typeof import("../../../../../src/index.ts") =
    await load("src/index.ts");
  const fixture = `${work}/fixture-${extension}`;
  const { mkdirSync } = await import("node:fs");
  mkdirSync(fixture, { recursive: true });
  writeFileSync(`${fixture}/${filename}`, source);
  const definition = defineConfig({
    checks: [functionMetrics({ codeAreas: { input: { files: { patterns: [filename] } } } })],
    scheduler: { maxParallel: 1 },
    outputs: {
      progressRendering: { enabled: false },
      machinePublication: { enabled: false },
      diagnosticLogging: { enabled: false }
    }
  });
  const start = performance.now();
  const result = await run(definition, { projectRoot: fixture, signal: AbortSignal.timeout(1000) });
  payload = {
    elapsedMs: performance.now() - start,
    result: result.kind,
    semanticDigest: digest(
      result.kind === "completed"
        ? {
            outcomes: result.snapshot.checks.map((check) => check.outcome),
            records: result.snapshot.records
          }
        : { kind: result.kind }
    )
  };
}
console.log(
  JSON.stringify({
    variant,
    mode,
    kind,
    size,
    hasPrefix,
    bytes: Buffer.byteLength(source),
    versions,
    ...(payload as object)
  })
);

function readEvidenceJson(sourcePath: string): unknown {
  try {
    return JSON.parse(readFileSync(sourcePath, "utf8"));
  } catch (error: unknown) {
    throw new Error(`Cannot read evidence JSON ${sourcePath}`, { cause: error });
  }
}

function readCorpusManifest(sourcePath: string): readonly CorpusManifestEntry[] {
  const decoded = readEvidenceJson(sourcePath);
  if (!Array.isArray(decoded)) throw new Error(`${sourcePath}: expected corpus array`);
  return decoded.map((entry: unknown, index: number) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      Array.isArray(entry) ||
      !("path" in entry) ||
      !("bytes" in entry) ||
      !("sha256" in entry)
    ) {
      throw new Error(`${sourcePath}[${index}]: expected path/bytes/sha256 entry`);
    }
    if (
      typeof entry.path !== "string" ||
      !entry.path ||
      entry.path.startsWith("/") ||
      entry.path.includes("\\") ||
      entry.path.split("/").some((part) => !part || part === "." || part === "..")
    ) {
      throw new Error(`${sourcePath}[${index}].path: expected relative contained path`);
    }
    if (typeof entry.bytes !== "number" || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0) {
      throw new Error(`${sourcePath}[${index}].bytes: expected nonnegative safe integer`);
    }
    if (typeof entry.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
      throw new Error(`${sourcePath}[${index}].sha256: expected SHA-256`);
    }
    return { path: entry.path, bytes: entry.bytes, sha256: entry.sha256 };
  });
}
