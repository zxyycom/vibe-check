/** One-off public Run timing observation, not a Product test or timing gate.
 * No intrinsic wrappers, forced GC, profiler, output writers or external work.
 * Root module import and defineConfig are outside the run-only timing window.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { RunResult } from "../../../../src/index.ts";
import { argument, positiveIntegerArgument, loadBenchmarkApi } from "./benchmark-boundaries.ts";

const size = positiveIntegerArgument({ name: "--size", fallback: 1 });
const shape = argument({ name: "--shape", fallback: "independent" });
if (shape !== "chain" && shape !== "independent") throw new Error("Invalid shape");
const warmups = positiveIntegerArgument({ name: "--warmups", fallback: 3 });
const sampleCount = positiveIntegerArgument({ name: "--samples", fallback: 9 });
const iterations = positiveIntegerArgument({ name: "--iterations", fallback: size <= 8 ? 20 : 1 });
const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const sourceRoot = resolve(argument({ name: "--source-root", fallback: repositoryRoot }));
const { defineConfig, run } = await loadBenchmarkApi(sourceRoot);
const ids = Array.from({ length: size }, (_, index) => `task-${String(index).padStart(6, "0")}`);
const definition = defineConfig({
  checks: ids.map((checkId, index) => {
    const previousCheckId = ids[index - 1];
    if (shape === "chain" && index > 0 && previousCheckId === undefined) {
      throw new Error("Missing predecessor while constructing the chain workload");
    }
    return {
      checkId,
      displayName: checkId,
      execute: () => ({ status: "passed" as const, data: {} }),
      ...(shape === "chain" && previousCheckId !== undefined
        ? { dependsOn: [previousCheckId] }
        : {})
    };
  }),
  scheduler: { maxParallel: 1 },
  outputs: {
    machinePublication: { enabled: false },
    progressRendering: { enabled: false },
    diagnosticLogging: { enabled: false }
  }
});

let semanticDigest: string | undefined;
let declarativeFingerprint: string | undefined;
function verify(result: RunResult): void {
  if (result.kind !== "completed" || result.aggregate !== "passed")
    throw new Error(`Unexpected Run branch: ${result.kind}`);
  if (result.snapshot.checks.length !== size || result.snapshot.records.length !== 0)
    throw new Error("Unexpected facts count");
  for (const [index, check] of result.snapshot.checks.entries()) {
    if (check.checkId !== ids[index] || check.outcome.status !== "passed")
      throw new Error("Unexpected Check order/outcome");
  }
  if (result.checkMessages.length !== 0 || result.definitionWarnings.length !== 0)
    throw new Error("Unexpected messages/warnings");
  const outputs = [
    result.outputs.machinePublication,
    result.outputs.progressRendering,
    result.outputs.diagnosticLogging,
    result.outputs.terminalEffects
  ];
  if (outputs.some((output) => output.enabled || output.status !== "disabled"))
    throw new Error("Output participant was enabled");
  for (const channel of Object.values(result.outputs.diagnosticLogging.channels))
    if (channel.enabled || channel.status !== "disabled" || channel.file !== null)
      throw new Error("Diagnostic channel was enabled");
  const digest = createHash("sha256").update(JSON.stringify(result.snapshot)).digest("hex");
  if (semanticDigest !== undefined && semanticDigest !== digest) throw new Error("Facts drift");
  if (
    declarativeFingerprint !== undefined &&
    declarativeFingerprint !== result.declarativeFingerprint
  )
    throw new Error("Declarative fingerprint drift");
  semanticDigest = digest;
  declarativeFingerprint = result.declarativeFingerprint;
}

const measuredRun = async (): Promise<number> => {
  const started = performance.now();
  const result = await run(definition);
  const wallMs = performance.now() - started;
  verify(result); // Assertions and digest are deliberately outside the timing window.
  if (!Number.isFinite(wallMs) || wallMs < 0 || wallMs > 10_000)
    throw new Error("Run wall sample exceeded the bounded protocol");
  return wallMs;
};
const warmupWallMs: number[] = [];
for (let index = 0; index < warmups; index += 1) warmupWallMs.push(await measuredRun());
const samples: {
  readonly index: number;
  readonly runWallMs: readonly number[];
  readonly meanRunWallMs: number;
  readonly batchIncludingValidationWallMs: number;
}[] = [];
for (let index = 0; index < sampleCount; index += 1) {
  const runWallMs: number[] = [];
  const batchStarted = performance.now();
  for (let iteration = 0; iteration < iterations; iteration += 1)
    runWallMs.push(await measuredRun());
  const batchIncludingValidationWallMs = performance.now() - batchStarted;
  samples.push({
    index,
    runWallMs,
    meanRunWallMs: runWallMs.reduce((sum, value) => sum + value, 0) / iterations,
    batchIncludingValidationWallMs
  });
}
console.log(
  JSON.stringify(
    {
      protocol: "public-run-v1",
      observedAt: new Date().toISOString(),
      timingScope:
        "await run(definition); root import, defineConfig, assertions, digest and JSON output excluded",
      shape,
      checkCount: size,
      edgeCount: shape === "chain" ? size - 1 : 0,
      maxParallel: 1,
      strategy: "default static",
      outputs: "all disabled",
      warmups,
      sampleCount,
      iterations,
      runtime: {
        executable: process.execPath,
        versions: process.versions,
        platform: process.platform,
        arch: process.arch
      },
      invocation: { cwd: process.cwd(), argv: process.argv, sourceRoot },
      harnessSha256: createHash("sha256")
        .update(readFileSync(fileURLToPath(import.meta.url)))
        .digest("hex"),
      memoryAfter: process.memoryUsage(),
      resourceUsageAfter: process.resourceUsage(),
      semanticDigest,
      declarativeFingerprint,
      warmupWallMs,
      samples
    },
    null,
    2
  )
);
