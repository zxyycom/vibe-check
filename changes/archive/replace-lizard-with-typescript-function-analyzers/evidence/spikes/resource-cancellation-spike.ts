import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { FunctionMeasurementResult } from "../../../../../src/package-checks/function-metrics/measurement.ts";

const EVIDENCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = resolve(EVIDENCE_ROOT, "../../../..");
const OUTPUT_PATH = join(EVIDENCE_ROOT, "baselines/resource-cancellation-observations.json");
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const MEBIBYTE = 1024 * 1024;
const FILE_LIMIT_BYTES = 8 * MEBIBYTE;
const AGGREGATE_LIMIT_BYTES = 64 * MEBIBYTE;
const ADMISSION_CHUNK_BYTES = 32 * 1024;
const RUNS = 3;
const WORKER_ABORT_DELAY_MS = 30;

const { measureFunctionMetrics } = await import(
  new URL("../../../../../src/package-checks/function-metrics/measurement.ts", import.meta.url).href
);

type Scenario =
  | "representative"
  | "exact-file-limit"
  | "over-file-limit"
  | "over-aggregate-limit"
  | "admission-cancel"
  | "worker-complete"
  | "worker-cancel";

const SCENARIOS: readonly Scenario[] = [
  "representative",
  "exact-file-limit",
  "over-file-limit",
  "over-aggregate-limit",
  "admission-cancel",
  "worker-complete",
  "worker-cancel"
];

interface MemoryObservation {
  readonly endpointMiB: Readonly<{
    readonly external: number;
    readonly heapUsed: number;
    readonly rss: number;
  }>;
  readonly maxRssKiB: number;
}

interface ScenarioObservation {
  readonly result: string;
  readonly scenario: Scenario;
  readonly wallMs: number;
  readonly workerStarts: number;
  readonly workerTerminates: number;
  readonly memory: MemoryObservation;
}

interface WorkerTracker {
  readonly restore: () => void;
  readonly starts: () => number;
  readonly terminates: () => number;
}

if (process.argv[2] === "--child") {
  const scenario = process.argv[3];
  if (!isScenario(scenario)) throw new Error(`Unknown resource scenario: ${scenario}`);
  console.log(JSON.stringify(await observeScenario(scenario)));
} else {
  const observations = Object.fromEntries(
    SCENARIOS.map((scenario) => [
      scenario,
      Array.from({ length: RUNS }, () => observeInFreshProcess(scenario))
    ])
  );
  const report = Object.freeze({
    environment: Object.freeze({
      admissionChunkBytes: ADMISSION_CHUNK_BYTES,
      bun: Bun.version,
      fileLimitBytes: FILE_LIMIT_BYTES,
      aggregateLimitBytes: AGGREGATE_LIMIT_BYTES,
      platform: process.platform,
      runs: RUNS,
      workerAbortDelayMs: WORKER_ABORT_DELAY_MS
    }),
    observations,
    packageBoundary: await observePackageBoundary(),
    schemaVersion: 2
  });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

function isScenario(value: string | undefined): value is Scenario {
  return value !== undefined && SCENARIOS.includes(value as Scenario);
}

function observeInFreshProcess(scenario: Scenario): ScenarioObservation {
  const result = Bun.spawnSync({
    cmd: [process.execPath, SCRIPT_PATH, "--child", scenario],
    stderr: "pipe",
    stdout: "pipe"
  });
  if (result.exitCode !== 0) {
    throw new Error(
      `Resource scenario ${scenario} failed:\n${new TextDecoder().decode(result.stderr)}`
    );
  }
  return JSON.parse(new TextDecoder().decode(result.stdout)) as ScenarioObservation;
}

async function observeScenario(scenario: Scenario): Promise<ScenarioObservation> {
  const root = `/tmp/vibe-check-resource-${scenario}-${process.pid}-${Date.now()}`;
  const sourceDirectory = join(root, "src");
  mkdirSync(sourceDirectory, { recursive: true });
  const controller = new AbortController();
  let tracker: WorkerTracker | undefined;
  let cancellation: ReturnType<typeof setTimeout> | undefined;
  try {
    const paths = writeScenarioInputs(sourceDirectory, scenario);
    tracker = installWorkerTracker(
      scenario === "worker-cancel" ? () => controller.abort() : undefined
    );
    if (scenario === "admission-cancel") {
      cancellation = setTimeout(() => controller.abort(), 0);
    }
    const startedAt = performance.now();
    const result = await measureFunctionMetrics({
      input: Object.freeze({ approvedExactPaths: paths, areas: [], rootDir: root }),
      signal: controller.signal
    });
    return Object.freeze({
      memory: memoryObservation(),
      result: summarize(result),
      scenario,
      wallMs: round(performance.now() - startedAt),
      workerStarts: tracker?.starts() ?? 0,
      workerTerminates: tracker?.terminates() ?? 0
    });
  } finally {
    if (cancellation !== undefined) clearTimeout(cancellation);
    tracker?.restore();
    rmSync(root, { force: true, recursive: true });
  }
}

function writeScenarioInputs(sourceDirectory: string, scenario: Scenario): readonly string[] {
  switch (scenario) {
    case "representative":
      writeFileSync(
        join(sourceDirectory, "sample.ts"),
        "export function sample(value: number) { if (value > 0) return value; return 0; }\n",
        "utf8"
      );
      return Object.freeze(["src/sample.ts"]);
    case "exact-file-limit":
    case "admission-cancel":
      writeFileSync(join(sourceDirectory, "sample.ts"), Buffer.alloc(FILE_LIMIT_BYTES, 0x20));
      return Object.freeze(["src/sample.ts"]);
    case "over-file-limit":
      writeFileSync(join(sourceDirectory, "sample.ts"), Buffer.alloc(FILE_LIMIT_BYTES + 1, 0x20));
      return Object.freeze(["src/sample.ts"]);
    case "over-aggregate-limit": {
      const paths = Array.from({ length: 9 }, (_, index) => `src/sample-${index}.ts`);
      for (const path of paths.slice(0, 8)) {
        writeFileSync(
          join(sourceDirectory, path.slice("src/".length)),
          Buffer.alloc(FILE_LIMIT_BYTES, 0x20)
        );
      }
      writeFileSync(join(sourceDirectory, "sample-8.ts"), " ", "utf8");
      return Object.freeze(paths);
    }
    case "worker-complete":
    case "worker-cancel": {
      const nestedConditionals = `${"value ? ".repeat(6000)}0${" : 0".repeat(6000)}`;
      writeFileSync(
        join(sourceDirectory, "sample.ts"),
        `export function adversarial(value: boolean) { return ${nestedConditionals}; }\n`,
        "utf8"
      );
      return Object.freeze(["src/sample.ts"]);
    }
  }
}

function installWorkerTracker(onWorkerStart?: () => void): WorkerTracker {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "Worker");
  if (descriptor === undefined) throw new Error("Bun Worker must be available for this spike.");
  const OriginalWorker = globalThis.Worker;
  let starts = 0;
  let terminates = 0;
  Object.defineProperty(globalThis, "Worker", {
    configurable: true,
    value: class extends OriginalWorker {
      public constructor(...arguments_: ConstructorParameters<typeof Worker>) {
        starts += 1;
        super(...arguments_);
        if (onWorkerStart !== undefined) setTimeout(onWorkerStart, WORKER_ABORT_DELAY_MS);
      }

      public override terminate(): void {
        terminates += 1;
        super.terminate();
      }
    }
  });
  return Object.freeze({
    restore: () => Object.defineProperty(globalThis, "Worker", descriptor),
    starts: () => starts,
    terminates: () => terminates
  });
}

function summarize(result: FunctionMeasurementResult): string {
  return result.kind === "complete" ? `complete:${result.metrics.length}` : result.kind;
}

function memoryObservation(): MemoryObservation {
  const memory = process.memoryUsage();
  return Object.freeze({
    endpointMiB: Object.freeze({
      external: round(memory.external / MEBIBYTE),
      heapUsed: round(memory.heapUsed / MEBIBYTE),
      rss: round(memory.rss / MEBIBYTE)
    }),
    maxRssKiB: process.resourceUsage().maxRSS
  });
}

async function observePackageBoundary(): Promise<object> {
  const status = Bun.spawnSync({
    cmd: [process.execPath, join(ROOT, "scripts/package/command.ts"), "status"],
    stderr: "pipe",
    stdout: "pipe"
  });
  const emittedWorker = join(
    ROOT,
    "build/package/dist/esm/package-checks/function-metrics/analyzer-worker.mjs"
  );
  const emittedWorkerObservation = existsSync(emittedWorker)
    ? await observeEmittedWorker(emittedWorker)
    : Object.freeze({ status: "not-present" });
  return Object.freeze({
    emittedWorker: emittedWorkerObservation,
    packageStatus: Object.freeze({
      exitCode: status.exitCode,
      stderr: new TextDecoder().decode(status.stderr).trim(),
      stdout: new TextDecoder().decode(status.stdout).trim()
    }),
    scope:
      "The emitted Worker is probed directly only. A stale candidate never establishes installed public API or tar-consumer behavior."
  });
}

async function observeEmittedWorker(emittedWorker: string): Promise<object> {
  const worker = new Worker(pathToFileURL(emittedWorker).href);
  try {
    const result = await new Promise<unknown>((resolveResult, reject) => {
      worker.onmessage = (event: MessageEvent<unknown>) => resolveResult(event.data);
      worker.onerror = () => reject(new Error("emitted Worker error"));
      worker.postMessage(
        Object.freeze({
          files: Object.freeze([
            Object.freeze({
              path: "src/sample.ts",
              source: "export function sample() { return 1; }\n"
            })
          ])
        })
      );
    });
    return Object.freeze({ result, status: "responded" });
  } finally {
    worker.terminate();
  }
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
