import { sha256Json } from "./evidence.ts";
import type {
  Artifact,
  CapturedCorpusEntry,
  CostSummary,
  Protocol,
  ScenarioCase,
  TimingCorpusEntry,
  TimingSummary
} from "./learned-heuristic-evaluation-types.ts";
import {
  prepareLearnedPolicyWithFactory,
  REGISTERED_LEARNED_FIXTURE,
  type PreparedPolicyHandle
} from "./policy.ts";
import { simulateEvidence } from "./simulate.ts";

/** Measures only fresh public prepared `decide` calls over the baseline-captured context corpus. */
export async function measureComparableCost(
  baseline: Artifact,
  candidate: Artifact,
  scenarios: readonly ScenarioCase[],
  protocol: Protocol
): Promise<CostSummary> {
  const captured = await baselineContextCorpus(baseline, scenarios, protocol);
  const baselineContextCorpusSha256 = contextCorpusHash(captured);
  const timed = await freshTimingCorpus(baseline, candidate, captured);
  try {
    warmTimingCorpus(timed, protocol.hostCost.warmups, protocol.hostCost.corpusIterations);
    const samples = collectTimingSamples(timed, protocol.hostCost);
    assertTimingCorpusValid(timed);
    assertCorpusUnchanged(captured, baselineContextCorpusSha256);
    return Object.freeze({
      baseline: timingSummary(samples.baseline),
      baselineContextCorpusSha256,
      candidate: timingSummary(samples.candidate),
      corpusContextCounts: corpusContextCounts(captured),
      measurementBoundary: "fresh-public-prepared-direct-decide" as const,
      measurementOrder: "alternating-baseline-first" as const,
      warmupCount: protocol.hostCost.warmups
    });
  } finally {
    await Promise.all(timed.map(({ dispose }) => dispose()));
  }
}

async function baselineContextCorpus(
  baseline: Artifact,
  scenarios: readonly ScenarioCase[],
  protocol: Protocol
): Promise<readonly CapturedCorpusEntry[]> {
  const entries: CapturedCorpusEntry[] = [];
  for (const scenarioCase of scenarios)
    entries.push(await captureScenarioContexts(baseline, scenarioCase, protocol));
  return Object.freeze(entries);
}

async function captureScenarioContexts(
  baseline: Artifact,
  scenarioCase: ScenarioCase,
  protocol: Protocol
): Promise<CapturedCorpusEntry> {
  const policy = await prepareLearnedPolicyWithFactory(
    baseline.factory,
    REGISTERED_LEARNED_FIXTURE,
    scenarioCase.scenario.graph.graph
  );
  try {
    const contexts = captureContexts(policy, baseline, scenarioCase, protocol);
    policy.assertValid();
    return Object.freeze({
      contexts: Object.freeze(contexts),
      scenario: scenarioCase.scenario,
      scenarioId: scenarioCase.scenarioId
    });
  } finally {
    await policy.dispose();
  }
}

function captureContexts(
  policy: PreparedPolicyHandle,
  baseline: Artifact,
  scenarioCase: ScenarioCase,
  protocol: Protocol
) {
  const contexts: Parameters<typeof policy.decide>[0][] = [];
  for (let replicate = 0; replicate < protocol.virtualComparison.replicates; replicate += 1) {
    const evidence = simulateEvidence(
      scenarioCase.scenario,
      (context) => {
        contexts.push(context);
        return policy.decide(context);
      },
      protocol.virtualComparison.seed,
      replicate,
      policy.identity,
      baseline.identity
    );
    if (evidence.status !== "success")
      throw new Error(`${scenarioCase.scenarioId}/${replicate}: baseline context capture failed`);
  }
  return contexts;
}

async function freshTimingCorpus(
  baseline: Artifact,
  candidate: Artifact,
  captured: readonly CapturedCorpusEntry[]
): Promise<readonly TimingCorpusEntry[]> {
  const entries: TimingCorpusEntry[] = [];
  try {
    for (const entry of captured) entries.push(await freshTimingEntry(baseline, candidate, entry));
    return Object.freeze(entries);
  } catch (error) {
    await Promise.all(entries.map(({ dispose }) => dispose()));
    throw error;
  }
}

async function freshTimingEntry(
  baseline: Artifact,
  candidate: Artifact,
  entry: CapturedCorpusEntry
): Promise<TimingCorpusEntry> {
  const baselinePolicy = await prepareLearnedPolicyWithFactory(
    baseline.factory,
    REGISTERED_LEARNED_FIXTURE,
    entry.scenario.graph.graph
  );
  let candidatePolicy: PreparedPolicyHandle | undefined;
  try {
    candidatePolicy = await prepareLearnedPolicyWithFactory(
      candidate.factory,
      REGISTERED_LEARNED_FIXTURE,
      entry.scenario.graph.graph
    );
    return timingEntry(baselinePolicy, candidatePolicy, entry);
  } catch (error) {
    await baselinePolicy.dispose();
    await candidatePolicy?.dispose();
    throw error;
  }
}

function timingEntry(
  baseline: PreparedPolicyHandle,
  candidate: PreparedPolicyHandle,
  entry: CapturedCorpusEntry
): TimingCorpusEntry {
  return Object.freeze({
    assertValid: () => {
      baseline.assertValid();
      candidate.assertValid();
    },
    baselineDecide: baseline.directDecide,
    candidateDecide: candidate.directDecide,
    contexts: entry.contexts,
    dispose: async () => {
      await Promise.all([baseline.dispose(), candidate.dispose()]);
    }
  });
}

function warmTimingCorpus(
  entries: readonly TimingCorpusEntry[],
  warmups: number,
  iterations: number
): void {
  for (let index = 0; index < warmups; index += 1)
    runDecisionCorpus(entries, iterations, index % 2 === 0);
}

function collectTimingSamples(
  entries: readonly TimingCorpusEntry[],
  hostCost: Protocol["hostCost"]
): Readonly<{ readonly baseline: readonly number[]; readonly candidate: readonly number[] }> {
  const baseline: number[] = [];
  const candidate: number[] = [];
  for (let index = 0; index < hostCost.samples; index += 1) {
    const sample = timedDecisionCorpus(entries, hostCost.corpusIterations, index % 2 === 0);
    baseline.push(sample.baselineMs);
    candidate.push(sample.candidateMs);
  }
  return Object.freeze({ baseline: Object.freeze(baseline), candidate: Object.freeze(candidate) });
}

function runDecisionCorpus(
  entries: readonly TimingCorpusEntry[],
  iterations: number,
  baselineFirst: boolean
): void {
  for (const policy of orderedPolicies(baselineFirst)) runCorpusFor(entries, iterations, policy);
}

function timedDecisionCorpus(
  entries: readonly TimingCorpusEntry[],
  iterations: number,
  baselineFirst: boolean
): Readonly<{ readonly baselineMs: number; readonly candidateMs: number }> {
  const [first, second] = orderedPolicies(baselineFirst);
  const firstMs = timedCorpus(entries, iterations, first);
  const secondMs = timedCorpus(entries, iterations, second);
  return first === "baseline"
    ? Object.freeze({ baselineMs: firstMs, candidateMs: secondMs })
    : Object.freeze({ baselineMs: secondMs, candidateMs: firstMs });
}

function orderedPolicies(
  baselineFirst: boolean
): readonly ["baseline", "candidate"] | readonly ["candidate", "baseline"] {
  return baselineFirst ? ["baseline", "candidate"] : ["candidate", "baseline"];
}

function timedCorpus(
  entries: readonly TimingCorpusEntry[],
  iterations: number,
  policy: "baseline" | "candidate"
): number {
  const start = performance.now();
  runCorpusFor(entries, iterations, policy);
  return performance.now() - start;
}

function runCorpusFor(
  entries: readonly TimingCorpusEntry[],
  iterations: number,
  policy: "baseline" | "candidate"
): void {
  for (let iteration = 0; iteration < iterations; iteration += 1)
    for (const entry of entries) {
      const decide = policy === "baseline" ? entry.baselineDecide : entry.candidateDecide;
      for (const context of entry.contexts) void decide(context);
    }
}

function assertTimingCorpusValid(entries: readonly TimingCorpusEntry[]): void {
  for (const entry of entries) entry.assertValid();
}

function assertCorpusUnchanged(
  entries: readonly CapturedCorpusEntry[],
  expectedSha256: string
): void {
  if (contextCorpusHash(entries) !== expectedSha256)
    throw new Error("public context corpus was mutated during cost replay");
}

function corpusContextCounts(
  entries: readonly CapturedCorpusEntry[]
): CostSummary["corpusContextCounts"] {
  return Object.freeze(
    entries.map(({ contexts, scenarioId }) => Object.freeze({ count: contexts.length, scenarioId }))
  );
}

function contextCorpusHash(entries: readonly CapturedCorpusEntry[]): string {
  return sha256Json(
    JSON.parse(
      JSON.stringify(
        entries.map(({ contexts, scenarioId }) => Object.freeze({ contexts, scenarioId }))
      )
    )
  );
}

function timingSummary(samplesMs: readonly number[]): TimingSummary {
  return Object.freeze({
    p50Ms: percentile(samplesMs, 0.5),
    p95Ms: percentile(samplesMs, 0.95),
    samplesMs: Object.freeze(samplesMs)
  });
}

function percentile(values: readonly number[], fraction: number): number {
  const value = [...values].sort((left, right) => left - right)[
    Math.ceil(values.length * fraction) - 1
  ];
  if (value === undefined) throw new TypeError("timing sample is missing");
  return value;
}
