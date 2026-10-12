/** Frozen-protocol descriptive summary. Main unit: within-process batch mean.
 * Individual Runs are retained in raw files; 180 Runs are not independent trials.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { PrepareSpan, RunStages } from "./profiling-observer.ts";
import { sourceManifest, manifestSha256, fileSha256 } from "./source-identity.ts";
interface RunSample {
  readonly wallMs: number;
  readonly stages: RunStages;
}
interface Batch {
  readonly index: number;
  readonly runs: readonly RunSample[];
}
interface RawObservation {
  readonly mode: "baseline" | "instrumented";
  readonly shape: "independent" | "chain";
  readonly checkCount: number;
  readonly semanticDigest: string;
  readonly resultSignature: string;
  readonly declarativeFingerprint: string;
  readonly batches: readonly Batch[];
  readonly sourceManifestSha256: string;
  readonly hashes: Readonly<Record<string, string>>;
}
const artifactRoot = fileURLToPath(new URL("./", import.meta.url));
const expectedHashes: Readonly<Record<string, string>> = {
  harness: fileSha256(resolve(artifactRoot, "public-run-profile.ts")),
  observer: fileSha256(resolve(artifactRoot, "profiling-observer.ts")),
  identityHelper: fileSha256(resolve(artifactRoot, "source-identity.ts")),
  pnpmLock: fileSha256("/workspace/vibe-check/pnpm-lock.yaml"),
  miseLock: fileSha256("/workspace/vibe-check/mise.lock"),
  package: fileSha256("/workspace/vibe-check/package.json")
};
const expectedSourceHashes = {
  baseline: manifestSha256(sourceManifest("/workspace/vibe-check")),
  instrumented: manifestSha256(sourceManifest(resolve(artifactRoot, "instrumented")))
};
if (
  expectedSourceHashes.baseline !==
  "817a47c1ecfb19f12f74d5bac7ff55743b97e7aa4153a3c3d2db56d236129f0f"
)
  throw new Error("Current baseline source changed");
function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return candidate !== null && typeof candidate === "object" && !Array.isArray(candidate);
}
function isNonnegativeFinite(candidate: unknown): candidate is number {
  return typeof candidate === "number" && Number.isFinite(candidate) && candidate >= 0;
}
function assertNumberArray(candidate: unknown): asserts candidate is readonly number[] {
  if (!Array.isArray(candidate)) throw new Error("Expected numerical span array");
  const entries: readonly unknown[] = candidate;
  if (!entries.every(isNonnegativeFinite)) throw new Error("Invalid span duration");
}
function assertPrepare(candidate: unknown): asserts candidate is PrepareSpan {
  if (
    !isRecord(candidate) ||
    !isNonnegativeFinite(candidate.inclusiveMs) ||
    !isNonnegativeFinite(candidate.normalizeCatalogMs) ||
    !isNonnegativeFinite(candidate.validateMs) ||
    !isNonnegativeFinite(candidate.dtoFreezeMs)
  )
    throw new Error("Invalid prepare subspans");
  const parts = candidate.normalizeCatalogMs + candidate.validateMs + candidate.dtoFreezeMs;
  if (Math.abs(candidate.inclusiveMs - parts) > 0.000001)
    throw new Error("Prepare parts do not partition inclusive span");
}
function assertStages(candidate: unknown): asserts candidate is RunStages {
  if (!isRecord(candidate)) throw new Error("Expected stage record");
  assertNumberArray(candidate.planMs);
  assertNumberArray(candidate.schedulerStateSetupMs);
  assertNumberArray(candidate.schedulerLoopInclusiveMs);
  if (!Array.isArray(candidate.prepare)) throw new Error("Expected prepare array");
  const spans: readonly unknown[] = candidate.prepare;
  for (const span of spans) assertPrepare(span);
}
function parseHashes(candidate: unknown): Readonly<Record<string, string>> {
  if (!isRecord(candidate)) throw new Error("Missing raw hashes");
  if (Object.keys(candidate).sort().join(",") !== Object.keys(expectedHashes).sort().join(","))
    throw new Error("Raw hash field set changed");
  const hashes: Record<string, string> = {};
  for (const [name, digest] of Object.entries(candidate)) {
    if (typeof digest !== "string" || digest !== expectedHashes[name])
      throw new Error(`Raw identity changed: ${name}`);
    hashes[name] = digest;
  }
  return hashes;
}
function parseObservation(path: string): RawObservation {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (
    !isRecord(parsed) ||
    parsed.protocol !== "public-run-r04-current-baseline-v1" ||
    (parsed.mode !== "baseline" && parsed.mode !== "instrumented") ||
    (parsed.shape !== "independent" && parsed.shape !== "chain") ||
    !isNonnegativeFinite(parsed.checkCount) ||
    typeof parsed.semanticDigest !== "string" ||
    typeof parsed.resultSignature !== "string" ||
    typeof parsed.declarativeFingerprint !== "string" ||
    typeof parsed.sourceManifestSha256 !== "string" ||
    !Array.isArray(parsed.batches)
  )
    throw new Error(`Invalid raw observation: ${path}`);
  if (![8, 32, 128, 512].includes(parsed.checkCount)) throw new Error("Unexpected workload size");
  let expectedIterations = 1;
  if (parsed.checkCount === 8) expectedIterations = 10;
  else if (parsed.checkCount === 32) expectedIterations = 5;
  if (
    parsed.warmups !== 3 ||
    parsed.samples !== 9 ||
    parsed.iterations !== expectedIterations ||
    parsed.batches.length !== 9 ||
    !Array.isArray(parsed.warmupSamples) ||
    parsed.warmupSamples.length !== 3
  )
    throw new Error("Incomplete frozen sample protocol");
  if (
    parsed.projectRoot !== "/workspace/vibe-check" ||
    parsed.cwd !== "/workspace/vibe-check" ||
    parsed.scheduler !== "static/maxParallel=1" ||
    parsed.outputs !== "all four disabled; no terminalEffects configured"
  )
    throw new Error("Run options/context changed");
  if (
    !isRecord(parsed.runtime) ||
    !isRecord(parsed.runtime.versions) ||
    parsed.runtime.versions.bun !== "1.3.14"
  )
    throw new Error("Wrong locked runtime");
  if (parsed.sourceManifestSha256 !== expectedSourceHashes[parsed.mode])
    throw new Error("Raw source identity changed");
  const hashes = parseHashes(parsed.hashes);
  const batches: Batch[] = [];
  const rawBatches: readonly unknown[] = parsed.batches;
  for (const [index, batch] of rawBatches.entries()) {
    if (
      !isRecord(batch) ||
      batch.index !== index ||
      !Array.isArray(batch.runs) ||
      batch.runs.length !== expectedIterations
    )
      throw new Error("Incomplete or unordered raw batch");
    const runs: RunSample[] = [];
    const rawRuns: readonly unknown[] = batch.runs;
    for (const run of rawRuns) {
      if (!isRecord(run) || !isNonnegativeFinite(run.wallMs) || run.wallMs === 0)
        throw new Error("Invalid raw run");
      assertStages(run.stages);
      const counts = [
        run.stages.planMs.length,
        run.stages.prepare.length,
        run.stages.schedulerStateSetupMs.length,
        run.stages.schedulerLoopInclusiveMs.length
      ];
      const expectedCounts = parsed.mode === "baseline" ? [0, 0, 0, 0] : [4, 4, 1, 1];
      if (counts.join(",") !== expectedCounts.join(","))
        throw new Error("Unexpected Run span count");
      runs.push({ wallMs: run.wallMs, stages: run.stages });
    }
    batches.push({ index, runs });
  }
  return {
    mode: parsed.mode,
    shape: parsed.shape,
    checkCount: parsed.checkCount,
    semanticDigest: parsed.semanticDigest,
    resultSignature: parsed.resultSignature,
    declarativeFingerprint: parsed.declarativeFingerprint,
    sourceManifestSha256: parsed.sourceManifestSha256,
    hashes,
    batches
  };
}
function sum(milliseconds: readonly number[]): number {
  return milliseconds.reduce((total, duration) => total + duration, 0);
}
function mean(milliseconds: readonly number[]): number {
  if (milliseconds.length === 0) throw new Error("No mean samples");
  return sum(milliseconds) / milliseconds.length;
}
function median(sorted: readonly number[]): number {
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle];
  if (upper === undefined) throw new Error("No samples");
  if (sorted.length % 2 !== 0) return upper;
  const lower = sorted[middle - 1];
  if (lower === undefined) throw new Error("No lower median sample");
  return (lower + upper) / 2;
}
function distribution(samples: readonly number[]) {
  const sorted = [...samples].sort((left, right) => left - right);
  const center = median(sorted);
  return {
    count: sorted.length,
    median: center,
    mad: median(
      sorted.map((duration) => Math.abs(duration - center)).sort((left, right) => left - right)
    ),
    minimum: sorted[0],
    maximum: sorted.at(-1)
  };
}
function runMetrics(run: RunSample) {
  const planMs = sum(run.stages.planMs);
  const prepareMs = sum(run.stages.prepare.map((span) => span.inclusiveMs));
  const r04Ms = planMs + prepareMs;
  const setupMs = sum(run.stages.schedulerStateSetupMs);
  const loopInclusiveMs = sum(run.stages.schedulerLoopInclusiveMs);
  const unattributedMs = run.wallMs - r04Ms - setupMs - loopInclusiveMs;
  if (unattributedMs < -0.000001) throw new Error("Overlapping stage attribution");
  return {
    wallMs: run.wallMs,
    planMs,
    prepareMs,
    r04Ms,
    r04Percent: (100 * r04Ms) / run.wallMs,
    normalizeCatalogMs: sum(run.stages.prepare.map((span) => span.normalizeCatalogMs)),
    validateMs: sum(run.stages.prepare.map((span) => span.validateMs)),
    dtoFreezeMs: sum(run.stages.prepare.map((span) => span.dtoFreezeMs)),
    setupMs,
    loopInclusiveMs,
    loopPercent: (100 * loopInclusiveMs) / run.wallMs,
    unattributedMs,
    unattributedPercent: (100 * unattributedMs) / run.wallMs
  };
}
const metricKeys = [
  "wallMs",
  "planMs",
  "prepareMs",
  "r04Ms",
  "r04Percent",
  "normalizeCatalogMs",
  "validateMs",
  "dtoFreezeMs",
  "setupMs",
  "loopInclusiveMs",
  "loopPercent",
  "unattributedMs",
  "unattributedPercent"
] as const;
function summarizeStageBatches(batches: readonly Batch[]) {
  const perBatch = batches.map((batch) => {
    const runs = batch.runs.map(runMetrics);
    return Object.fromEntries(metricKeys.map((key) => [key, mean(runs.map((run) => run[key]))]));
  });
  const distributions = Object.fromEntries(
    metricKeys.map((key) => {
      const batchMeans = perBatch.map((batch) => {
        const duration: unknown = batch[key];
        if (!isNonnegativeFinite(duration)) throw new Error(`Invalid batch metric: ${key}`);
        return duration;
      });
      return [key, distribution(batchMeans)];
    })
  );
  return { perBatch, distributions };
}
function assertFormalIdentity(name: string): void {
  const parsed: unknown = JSON.parse(readFileSync(resolve(artifactRoot, name), "utf8"));
  if (!isRecord(parsed) || !isRecord(parsed.baseline) || !isRecord(parsed.instrumented))
    throw new Error("Missing formal before/after identity");
  if (
    parsed.baseline.sourceManifestSha256 !== expectedSourceHashes.baseline ||
    parsed.instrumented.sourceManifestSha256 !== expectedSourceHashes.instrumented ||
    parsed.baseline.fileCount !== 722 ||
    parsed.instrumented.fileCount !== 722
  )
    throw new Error("Formal before/after source identity differs");
  if (
    !Array.isArray(parsed.instrumented.changedPaths) ||
    parsed.instrumented.changedPaths.length !== 3
  )
    throw new Error("Wrong formal instrumentation changes");
}
assertFormalIdentity("identity-formal-before.json");
assertFormalIdentity("identity-formal-after.json");
const rawRoot = resolve(artifactRoot, "raw");
const files = readdirSync(rawRoot)
  .filter((name) => name.startsWith("formal-") && name.endsWith(".json"))
  .sort();
if (files.length !== 32) throw new Error("Expected all 8 workloads × 4 processes");
const observations = files.map((name) => ({
  file: name,
  observation: parseObservation(resolve(rawRoot, name))
}));
const workloads = ["independent", "chain"].flatMap((shape) =>
  [8, 32, 128, 512].map((size) => `${shape}-${size}`)
);
const summaries = workloads.map((workload) => {
  const matching = observations.filter(
    ({ observation }) => `${observation.shape}-${observation.checkCount}` === workload
  );
  const first = matching[0]?.observation;
  if (first === undefined || matching.length !== 4)
    throw new Error(`Expected four interleaved processes: ${workload}`);
  const expectedModes =
    first.shape === "independent"
      ? ["baseline", "instrumented", "instrumented", "baseline"]
      : ["instrumented", "baseline", "baseline", "instrumented"];
  if (matching.map(({ observation }) => observation.mode).join(",") !== expectedModes.join(","))
    throw new Error("Interleaved process mode order changed");
  for (const { observation } of matching) {
    if (
      observation.semanticDigest !== first.semanticDigest ||
      observation.resultSignature !== first.resultSignature ||
      observation.declarativeFingerprint !== first.declarativeFingerprint
    )
      throw new Error(`Semantic mismatch: ${workload}`);
  }
  const processSummaries = matching.map(({ file, observation }) => ({
    file,
    mode: observation.mode,
    batchMeanWallMs: distribution(
      observation.batches.map((batch) => mean(batch.runs.map((run) => run.wallMs)))
    ),
    ...(observation.mode === "instrumented"
      ? { stages: summarizeStageBatches(observation.batches).distributions }
      : {})
  }));
  const baselineBatches = matching
    .filter(({ observation }) => observation.mode === "baseline")
    .flatMap(({ observation }) => observation.batches);
  const instrumentedBatches = matching
    .filter(({ observation }) => observation.mode === "instrumented")
    .flatMap(({ observation }) => observation.batches);
  if (baselineBatches.length !== 18 || instrumentedBatches.length !== 18)
    throw new Error("Expected 2 processes × 9 batches per variant");
  const baselineWall = distribution(
    baselineBatches.map((batch) => mean(batch.runs.map((run) => run.wallMs)))
  );
  const instrumentedWall = distribution(
    instrumentedBatches.map((batch) => mean(batch.runs.map((run) => run.wallMs)))
  );
  const callerNames = [
    "invocation-planning",
    "admission-strategy-preparation",
    "resolved-checks-validation",
    "scheduler-preparation"
  ];
  const callers = callerNames.map((caller, index) => ({
    caller,
    planCallsPerRun: 1,
    prepareCallsPerRun: 1,
    planMs: distribution(
      instrumentedBatches.map((batch) =>
        mean(
          batch.runs.map((run) => {
            const span = run.stages.planMs[index];
            if (span === undefined) throw new Error("Missing plan ordinal");
            return span;
          })
        )
      )
    ),
    prepareMs: distribution(
      instrumentedBatches.map((batch) =>
        mean(
          batch.runs.map((run) => {
            const span = run.stages.prepare[index];
            if (span === undefined) throw new Error("Missing prepare ordinal");
            return span.inclusiveMs;
          })
        )
      )
    ),
    combinedPercent: distribution(
      instrumentedBatches.map((batch) =>
        mean(
          batch.runs.map((run) => {
            const plan = run.stages.planMs[index];
            const prepare = run.stages.prepare[index];
            if (plan === undefined || prepare === undefined)
              throw new Error("Missing caller ordinal");
            return (100 * (plan + prepare.inclusiveMs)) / run.wallMs;
          })
        )
      )
    )
  }));
  const stageSummary = summarizeStageBatches(instrumentedBatches);
  const pairedProcessDisturbancePercent = [0, 2].map((index) => {
    const pair = processSummaries.slice(index, index + 2);
    const baseline = pair.find((processSummary) => processSummary.mode === "baseline");
    const instrumented = pair.find((processSummary) => processSummary.mode === "instrumented");
    if (baseline === undefined || instrumented === undefined)
      throw new Error("Incomplete adjacent process pair");
    return 100 * (instrumented.batchMeanWallMs.median / baseline.batchMeanWallMs.median - 1);
  });
  return {
    workload,
    semanticDigest: first.semanticDigest,
    resultSignature: first.resultSignature,
    declarativeFingerprint: first.declarativeFingerprint,
    processSummaries,
    baselineWallMs: baselineWall,
    instrumentedWallMs: instrumentedWall,
    observedMedianWallDifferencePercent: 100 * (instrumentedWall.median / baselineWall.median - 1),
    pairedProcessDisturbancePercent,
    stageSummary: stageSummary.distributions,
    perBatchStageMeans: stageSummary.perBatch,
    callers
  };
});
writeFileSync(
  resolve(artifactRoot, "summary.json"),
  JSON.stringify(
    {
      protocol: "public-run-r04-current-baseline-v1",
      generatedAt: new Date().toISOString(),
      verifiedComplete: true,
      files,
      verifiedHashes: expectedHashes,
      verifiedSourceHashes: expectedSourceHashes,
      summaryMethod:
        "Each Run first sums nonoverlapping spans and divides by its own wallMs; then within-batch averages; then descriptive median/MAD/range across 18 batches (two processes × nine). No sum of stage medians; no independent-180-sample inference, p95, confidence interval or overhead correction.",
      summaries
    },
    null,
    2
  ) + "\n"
);
console.log(
  JSON.stringify(
    summaries.map((summary) => ({
      workload: summary.workload,
      baseline: summary.baselineWallMs,
      instrumented: summary.instrumentedWallMs,
      disturbancePercent: summary.observedMedianWallDifferencePercent,
      pairedDisturbance: summary.pairedProcessDisturbancePercent,
      stages: summary.stageSummary
    })),
    null,
    2
  )
);
