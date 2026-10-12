/** Current-baseline public Run observation. Import/defineConfig/assertions/IO excluded.
 * Baseline and copied source run in the same cwd with the same explicit projectRoot.
 * The complete run(definition) API remains inside the wall-time window.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { RunResult } from "/workspace/vibe-check/src/index.js";
import { resetObservations, readObservations, type RunStages } from "./profiling-observer.ts";
import { fileSha256, sourceManifest, manifestSha256 } from "./source-identity.ts";

type PublicApi = Pick<typeof import("/workspace/vibe-check/src/index.js"), "defineConfig" | "run">;
type Shape = "independent" | "chain";
type Mode = "baseline" | "instrumented";
interface RunSample {
  readonly wallMs: number;
  readonly stages: RunStages;
}
function argument(name: string, fallback: string): string {
  const position = process.argv.indexOf(name);
  if (position < 0) return fallback;
  const text = process.argv[position + 1];
  if (text === undefined || text.length === 0 || text.startsWith("--"))
    throw new Error(`${name} requires a value`);
  return text;
}
function positiveInteger(name: string, fallback: number): number {
  const parsed = Number(argument(name, String(fallback)));
  if (!Number.isSafeInteger(parsed) || parsed <= 0)
    throw new Error(`${name} requires a positive safe integer`);
  return parsed;
}
function parseShape(text: string): Shape {
  if (text !== "independent" && text !== "chain")
    throw new Error("--shape requires independent or chain");
  return text;
}
function parseMode(text: string): Mode {
  if (text !== "baseline" && text !== "instrumented")
    throw new Error("--mode requires baseline or instrumented");
  return text;
}
function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return candidate !== null && typeof candidate === "object" && !Array.isArray(candidate);
}
function assertPublicApi(candidate: unknown): asserts candidate is PublicApi {
  if (
    !isRecord(candidate) ||
    typeof candidate.defineConfig !== "function" ||
    typeof candidate.run !== "function"
  )
    throw new Error("Trusted source entry is missing callable defineConfig/run");
}
const artifactRoot = fileURLToPath(new URL("./", import.meta.url));
const mode = parseMode(argument("--mode", "baseline"));
const shape = parseShape(argument("--shape", "independent"));
const size = positiveInteger("--size", 8);
const warmups = positiveInteger("--warmups", 3);
const samples = positiveInteger("--samples", 9);
const iterations = positiveInteger("--iterations", 1);
const sourceRoot =
  mode === "baseline" ? "/workspace/vibe-check" : resolve(artifactRoot, "instrumented");
const sourceManifestSha256 = manifestSha256(sourceManifest(sourceRoot));
const loaded: unknown = await import(pathToFileURL(resolve(sourceRoot, "src/index.ts")).href);
assertPublicApi(loaded);
const { defineConfig, run } = loaded;
const ids = Array.from({ length: size }, (_, index) => `task-${String(index).padStart(6, "0")}`);
const definition = defineConfig({
  checks: ids.map((checkId, index) => {
    const predecessor = ids[index - 1];
    if (shape === "chain" && index > 0 && predecessor === undefined)
      throw new Error("Missing predecessor");
    return {
      checkId,
      displayName: checkId,
      execute: () => ({ status: "passed" as const, data: {} }),
      ...(shape === "chain" && predecessor !== undefined ? { dependsOn: [predecessor] } : {})
    };
  }),
  scheduler: { admissionPolicy: { kind: "static" }, maxParallel: 1 },
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});
let semanticDigest: string | undefined;
let resultSignature: string | undefined;
let declarativeFingerprint: string | undefined;
function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
function verify(runResult: RunResult): void {
  if (runResult.kind !== "completed" || runResult.aggregate !== "passed")
    throw new Error(`Unexpected Run branch: ${runResult.kind}`);
  if (runResult.snapshot.checks.length !== size || runResult.snapshot.records.length !== 0)
    throw new Error("Wrong facts count");
  for (const [index, check] of runResult.snapshot.checks.entries()) {
    if (check.checkId !== ids[index] || check.outcome.status !== "passed")
      throw new Error("Wrong Check order/outcome");
  }
  if (runResult.checkMessages.length !== 0 || runResult.definitionWarnings.length !== 0)
    throw new Error("Unexpected messages/warnings");
  for (const output of [
    runResult.outputs.machinePublication,
    runResult.outputs.progressRendering,
    runResult.outputs.diagnosticLogging,
    runResult.outputs.terminalEffects
  ]) {
    if (output.enabled || output.status !== "disabled") throw new Error("An output was enabled");
  }
  for (const channel of Object.values(runResult.outputs.diagnosticLogging.channels)) {
    if (channel.enabled || channel.status !== "disabled" || channel.file !== null)
      throw new Error("A diagnostic channel was enabled");
  }
  if (runResult.checkDurations.length !== size) throw new Error("Wrong duration count");
  for (const [index, duration] of runResult.checkDurations.entries()) {
    if (
      duration.checkId !== ids[index] ||
      duration.durationMs === null ||
      !Number.isFinite(duration.durationMs) ||
      duration.durationMs < 0
    )
      throw new Error("Wrong duration identity/availability");
  }
  const digest = sha256(JSON.stringify(runResult.snapshot));
  // Compare every completed-result field, replacing only measured durationMs.
  const signature = sha256(
    JSON.stringify({
      ...runResult,
      checkDurations: runResult.checkDurations.map((duration) => ({
        checkId: duration.checkId,
        durationMs: "finite-nonnegative"
      }))
    })
  );
  if (semanticDigest !== undefined && semanticDigest !== digest) throw new Error("Snapshot drift");
  if (resultSignature !== undefined && resultSignature !== signature)
    throw new Error("Result signature drift");
  if (
    declarativeFingerprint !== undefined &&
    declarativeFingerprint !== runResult.declarativeFingerprint
  )
    throw new Error("Definition drift");
  semanticDigest = digest;
  resultSignature = signature;
  declarativeFingerprint = runResult.declarativeFingerprint;
}
function verifyStages(stages: RunStages): void {
  if (mode === "baseline") {
    if (
      [
        stages.planMs.length,
        stages.prepare.length,
        stages.schedulerStateSetupMs.length,
        stages.schedulerLoopInclusiveMs.length
      ].some((count) => count !== 0)
    )
      throw new Error("Baseline unexpectedly observed spans");
    return;
  }
  if (
    stages.planMs.length !== 4 ||
    stages.prepare.length !== 4 ||
    stages.schedulerStateSetupMs.length !== 1 ||
    stages.schedulerLoopInclusiveMs.length !== 1
  )
    throw new Error("Unexpected current-public-Run stage counts");
  const milliseconds = [
    ...stages.planMs,
    ...stages.schedulerStateSetupMs,
    ...stages.schedulerLoopInclusiveMs,
    ...stages.prepare.flatMap((span) => [
      span.inclusiveMs,
      span.normalizeCatalogMs,
      span.validateMs,
      span.dtoFreezeMs
    ])
  ];
  if (milliseconds.some((span) => !Number.isFinite(span) || span < 0))
    throw new Error("Invalid observed stage duration");
}
async function measuredRun(): Promise<RunSample> {
  resetObservations();
  let runResult: RunResult | undefined;
  let wallMs: number;
  let stages: RunStages;
  const startedAt = performance.now();
  try {
    runResult = await run(definition, { projectRoot: "/workspace/vibe-check" });
  } finally {
    wallMs = performance.now() - startedAt;
    stages = readObservations();
  }
  // Failure aborts this process; finally captured the boundary and the next run
  // can only start after an explicit reset. No file/console work occurs above.
  if (runResult === undefined) throw new Error("Run did not return a result");
  verify(runResult);
  verifyStages(stages);
  if (!Number.isFinite(wallMs) || wallMs < 0 || wallMs > 10_000)
    throw new Error("Run exceeded bounded protocol");
  return { wallMs, stages };
}
const warmupSamples: RunSample[] = [];
for (let index = 0; index < warmups; index += 1) warmupSamples.push(await measuredRun());
const batches: { readonly index: number; readonly runs: readonly RunSample[] }[] = [];
for (let index = 0; index < samples; index += 1) {
  const runs: RunSample[] = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) runs.push(await measuredRun());
  batches.push({ index, runs });
}
console.log(
  JSON.stringify(
    {
      protocol: "public-run-r04-current-baseline-v1",
      observedAt: new Date().toISOString(),
      mode,
      shape,
      checkCount: size,
      edgeCount: shape === "chain" ? size - 1 : 0,
      sourceRoot,
      sourceManifestSha256,
      projectRoot: "/workspace/vibe-check",
      cwd: process.cwd(),
      scheduler: "static/maxParallel=1",
      outputs: "all four disabled; no terminalEffects configured",
      timingScope:
        "complete await run(definition, same explicit projectRoot); import, defineConfig, reset, assertions, digest and IO excluded",
      stageOrder: [
        "invocation-planning",
        "admission-strategy-preparation",
        "resolved-checks-validation",
        "scheduler-preparation"
      ],
      exclusions:
        "scheduler loop excludes graph preparation/state/setup/initial reconciliation; unobserved intervals remain unattributed",
      resultSignatureExclusions: ["checkDurations[].durationMs (validated finite nonnegative)"],
      runtime: {
        executable: process.execPath,
        versions: process.versions,
        platform: process.platform,
        arch: process.arch
      },
      hashes: {
        harness: fileSha256(fileURLToPath(import.meta.url)),
        observer: fileSha256(resolve(artifactRoot, "profiling-observer.ts")),
        identityHelper: fileSha256(resolve(artifactRoot, "source-identity.ts")),
        pnpmLock: fileSha256("/workspace/vibe-check/pnpm-lock.yaml"),
        miseLock: fileSha256("/workspace/vibe-check/mise.lock"),
        package: sha256(readFileSync("/workspace/vibe-check/package.json", "utf8"))
      },
      warmups,
      samples,
      iterations,
      semanticDigest,
      resultSignature,
      declarativeFingerprint,
      warmupSamples,
      batches
    },
    null,
    2
  )
);
