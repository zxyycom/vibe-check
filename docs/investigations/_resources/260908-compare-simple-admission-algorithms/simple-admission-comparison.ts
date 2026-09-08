import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type {
  AdmissionProposal,
  AdmissionPolicyContext,
  SchedulerMeasurementContext
} from "../../../../scripts/project/node_modules/@zxyycom/vibe-check/types/index.d.ts";

type PublicApi =
  typeof import("../../../../scripts/project/node_modules/@zxyycom/vibe-check/types/index.d.ts");
const publicApi = (await import(
  new URL(
    "../../../../scripts/project/node_modules/@zxyycom/vibe-check/dist/esm/index.mjs",
    import.meta.url
  ).href
)) as PublicApi;
const { createAdmissionGraph, createLearnedCriticalPathStrategy } = publicApi;

import {
  canonicalJsonText,
  installedCandidateIdentity,
  sha256Json
} from "../../../../scripts/project/admission-workbench/evidence.ts";
import {
  staticIdentity,
  type PolicyIdentity
} from "../../../../scripts/project/admission-workbench/policy.ts";
import {
  simulateEvidence,
  type SimulationEvidence
} from "../../../../scripts/project/admission-workbench/simulate.ts";
import type { Scenario } from "../../../../scripts/project/admission-workbench/scenario.ts";
import {
  createCandidatePolicy,
  solveBnb,
  type CandidatePolicyId,
  type PredictionMap
} from "./comparison-algorithms.ts";
import { comparisonScenarios, LEGACY_COLD_FIXTURE_IDS } from "./comparison-fixtures.ts";
import { parseOutputTarget, writeNewEvidence } from "./comparison-output.ts";

const SEED = 7;
const REPLICATES = 5;
const NEW_IDS = [
  "packing-33222",
  "packing-5432",
  "unlock-long-tail",
  "weighted-resource-choice",
  "constrained-scope-choice",
  "regression-id-permutation-a",
  "regression-id-permutation-b"
] as const;
const CANDIDATES = [
  "spt-global",
  "lpt-global",
  "critical-path-global",
  "bounded-bnb-global"
] as const;
type RegimeId = "cold-all-1" | "synthetic-nonuniform" | "synthetic-mismatch";
type PolicyId = "public-learned-baseline" | CandidatePolicyId;

interface Input {
  readonly directory: string;
  readonly expectedEstimate: PredictionMap;
  readonly expectedSampleCount: number;
  readonly expectedSource: "cold-start" | "learned";
  readonly regimeId: RegimeId;
  readonly sha256: string;
}
interface RunRecord {
  readonly bnb: ReturnType<ReturnType<typeof createCandidatePolicy>["totals"]>;
  readonly evidence: readonly SimulationEvidence[];
  readonly policyId: PolicyId;
  readonly prediction: Pick<
    Input,
    "expectedSampleCount" | "expectedSource" | "regimeId" | "sha256"
  >;
  readonly scenarioId: string;
}

async function main(arguments_: readonly string[]): Promise<void> {
  const output = await parseOutputTarget(arguments_);
  const scenarios = await comparisonScenarios();
  const records: RunRecord[] = [];
  for (const scenarioId of LEGACY_COLD_FIXTURE_IDS) {
    records.push(
      ...(await compareScenario(required(scenarios[scenarioId], scenarioId), "cold-all-1"))
    );
  }
  for (const scenarioId of NEW_IDS)
    for (const regimeId of ["cold-all-1", "synthetic-nonuniform", "synthetic-mismatch"] as const)
      records.push(
        ...(await compareScenario(required(scenarios[scenarioId], scenarioId), regimeId))
      );
  const selfValidation = await validateBnb(scenarios);
  const cost = await measureCost(scenarios);
  const evidence = Object.freeze({
    schemaVersion: 1,
    protocolSha256: await protocolSha256(),
    command:
      "bun docs/investigations/_resources/260908-compare-simple-admission-algorithms/simple-admission-comparison.ts",
    seed: SEED,
    replicates: REPLICATES,
    records,
    selfValidation,
    cost,
    adoptionScreen: summarizeScreen(records, cost)
  });
  await writeNewEvidence(output, `${canonicalJsonText(evidence, 2)}\n`);
}

async function compareScenario(
  scenario: Scenario,
  regimeId: RegimeId
): Promise<readonly RunRecord[]> {
  const input = await createInput(scenario, regimeId);
  try {
    const records: RunRecord[] = [];
    records.push(await runPublicBaseline(scenario, input));
    for (const policyId of CANDIDATES) records.push(await runCandidate(scenario, input, policyId));
    assertWorkCommitments(records);
    return records;
  } finally {
    await rm(input.directory, { recursive: true, force: true });
  }
}

async function runPublicBaseline(scenario: Scenario, input: Input): Promise<RunRecord> {
  const evidence: SimulationEvidence[] = [];
  for (let replicate = 0; replicate < REPLICATES; replicate += 1) {
    const mismatch: string[] = [];
    const prepared = await preparePublic(scenario, input, (event) => {
      if (event.kind !== "selection-proposed") return;
      if (
        event.taskId === undefined ||
        event.estimatedDurationMs !== input.expectedEstimate[event.taskId] ||
        event.sampleCount !== input.expectedSampleCount ||
        event.source !== input.expectedSource
      )
        mismatch.push(`public helper prediction mismatch for ${event.taskId}`);
    });
    try {
      evidence.push(
        simulateEvidence(
          scenario,
          prepared.decide,
          SEED,
          replicate,
          learnedIdentity(input),
          installedCandidateIdentity()
        )
      );
      if (mismatch.length > 0) throw new Error(mismatch.join("; "));
    } finally {
      await prepared.dispose();
    }
  }
  return Object.freeze({
    bnb: null,
    evidence: Object.freeze(evidence),
    policyId: "public-learned-baseline",
    prediction: predictionMeta(input),
    scenarioId: scenario.scenarioId
  });
}

async function runCandidate(
  scenario: Scenario,
  input: Input,
  policyId: CandidatePolicyId
): Promise<RunRecord> {
  const candidate = createCandidatePolicy(policyId, input.expectedEstimate);
  const evidence = Array.from({ length: REPLICATES }, (_, replicate) =>
    simulateEvidence(
      scenario,
      candidate.decide,
      SEED,
      replicate,
      staticIdentity("static"),
      installedCandidateIdentity()
    )
  );
  return Object.freeze({
    bnb: candidate.totals(),
    evidence: Object.freeze(evidence),
    policyId,
    prediction: predictionMeta(input),
    scenarioId: scenario.scenarioId
  });
}

async function createInput(scenario: Scenario, regimeId: RegimeId): Promise<Input> {
  const directory = await mkdtemp(join(tmpdir(), "vibe-check-simple-admission-"));
  const nominal = nominalPredictions(scenario);
  const expectedEstimate =
    regimeId === "cold-all-1"
      ? Object.freeze(
          Object.fromEntries(scenario.graph.graph.tasks.map(({ taskId }) => [taskId, 1]))
        )
      : regimeId === "synthetic-nonuniform"
        ? nominal
        : mismatchPredictions(nominal);
  if (regimeId !== "cold-all-1") {
    const initial = await preparePublic(scenario, {
      directory,
      expectedEstimate: Object.freeze(
        Object.fromEntries(scenario.graph.graph.tasks.map(({ taskId }) => [taskId, 1]))
      ),
      expectedSampleCount: 0,
      expectedSource: "cold-start",
      regimeId: "cold-all-1",
      sha256: "bootstrap"
    });
    try {
      if (initial.complete === undefined) throw new Error("public helper did not supply complete");
      await initial.complete(syntheticTerminal(scenario, expectedEstimate));
    } finally {
      await initial.dispose();
    }
  }
  return Object.freeze({
    directory,
    expectedEstimate,
    expectedSampleCount: regimeId === "cold-all-1" ? 0 : 1,
    expectedSource: regimeId === "cold-all-1" ? "cold-start" : "learned",
    regimeId,
    sha256: sha256Json({
      expectedEstimate,
      regimeId,
      scenarioId: scenario.scenarioId
    })
  });
}

function nominalPredictions(scenario: Scenario): PredictionMap {
  const profiles = new Map(
    scenario.profiles.map((profile) => [profile.id, profile.nominalWorkMs] as const)
  );
  return Object.freeze(
    Object.fromEntries(
      Object.entries(scenario.taskProfiles).map(([taskId, profileId]) => [
        taskId,
        required(profiles.get(profileId), profileId)
      ])
    )
  );
}
function mismatchPredictions(nominal: PredictionMap): PredictionMap {
  const ids = Object.keys(nominal).sort();
  const values = ids.map((id) => required(nominal[id], id));
  return Object.freeze(
    Object.fromEntries(
      ids.map((id, index) => [id, required(values[(index + 1) % values.length], id)])
    )
  );
}

async function preparePublic(
  scenario: Scenario,
  input: Input,
  observe?: (
    event: Readonly<{
      readonly kind: string;
      readonly taskId?: string;
      readonly estimatedDurationMs?: number;
      readonly sampleCount?: number;
      readonly source?: string;
    }>
  ) => void
): Promise<
  Readonly<{
    readonly complete?: (terminal: SchedulerMeasurementContext) => void | Promise<void>;
    readonly decide: (context: AdmissionPolicyContext) => AdmissionProposal;
    readonly dispose: () => Promise<void>;
  }>
> {
  const strategy = createLearnedCriticalPathStrategy({
    stateDirectory: input.directory,
    identityForTask: (task) => ({ taskId: task.taskId }),
    sampleWindow: 1,
    maxHistorySeries: 4096,
    coldStartDurationMs: 1,
    observe
  });
  if (strategy.kind !== "prepared") throw new Error("public helper is not prepared");
  const prepared = await strategy.prepare({ graph: scenario.graph.graph });
  return Object.freeze({
    complete: prepared.complete,
    decide: prepared.decide,
    dispose: async () => undefined
  });
}

function syntheticTerminal(
  scenario: Scenario,
  durations: PredictionMap
): SchedulerMeasurementContext {
  let clock = 0;
  const admissions = scenario.graph.graph.tasks.map(({ taskId }) => {
    const admittedAtMonotonicMs = clock;
    clock += required(durations[taskId], taskId);
    return Object.freeze({
      admissionDelay: Object.freeze({
        admissiblePendingMs: 0,
        capacityBlockedMs: 0,
        mutexBlockedMs: 0
      }),
      admittedAtMonotonicMs,
      settledAtMonotonicMs: clock,
      taskId
    });
  });
  const ids = scenario.graph.graph.tasks.map(({ taskId }) => taskId);
  return Object.freeze({
    graph: scenario.graph.graph,
    execution: Object.freeze({
      admittedTaskIds: Object.freeze(ids),
      settledTasks: Object.freeze(
        ids.map((taskId) => Object.freeze({ kind: "completed" as const, taskId }))
      )
    }),
    rawMeasurement: Object.freeze({
      declarativeFingerprint: `synthetic-history:${scenario.scenarioId}`,
      discrete: Object.freeze({
        acceptedWaitCount: 0,
        admittedCount: ids.length,
        completionTailActiveTaskIds: Object.freeze([]),
        lastSettledTaskId: ids.at(-1) ?? null,
        maxRunning: 1
      }),
      peaks: Object.freeze({
        admissionViablePendingTaskCount: 0,
        admissiblePendingTaskCount: 0,
        capacityBlockedTaskCount: 0,
        mutexBlockedTaskCount: 0
      }),
      timing: Object.freeze({ availability: "available" as const }),
      timingFacts: Object.freeze({
        admissions: Object.freeze(admissions),
        acceptedWaitMs: 0,
        effectiveCapacitySlotMs: clock,
        endedAtMonotonicMs: clock,
        rootCapacitySlotMs: clock,
        schedulerControlPathMs: 0,
        schedulerDecisionObservationMs: 0,
        startedAtMonotonicMs: 0,
        taskSlotMs: clock
      })
    })
  });
}

function learnedIdentity(input: Input): PolicyIdentity {
  return Object.freeze({
    expectedFallbackType: input.regimeId === "cold-all-1" ? "cold-start" : "none",
    historySnapshotSha256: input.sha256,
    identityProjectionId: "task-id-v1",
    kind: "prepared",
    modelOptions: Object.freeze({
      coldStartDurationMs: 1,
      maxHistorySeries: 4096,
      sampleWindow: 1
    }),
    policyId: "learned",
    policyVersion: 1
  });
}
function predictionMeta(input: Input) {
  return Object.freeze({
    expectedSampleCount: input.expectedSampleCount,
    expectedSource: input.expectedSource,
    regimeId: input.regimeId,
    sha256: input.sha256
  });
}
function assertWorkCommitments(records: readonly RunRecord[]): void {
  const baseline = required(
    records.find(({ policyId }) => policyId === "public-learned-baseline"),
    "baseline"
  );
  for (const record of records)
    for (let index = 0; index < REPLICATES; index += 1) {
      const expected = baseline.evidence[index];
      const actual = record.evidence[index];
      if (
        expected?.status !== "success" ||
        actual?.status !== "success" ||
        expected.sampledWorkCommitment !== actual.sampledWorkCommitment
      )
        throw new Error(
          `unequal work commitment: ${record.scenarioId}/${record.policyId}/${index}`
        );
    }
}

async function validateBnb(scenarios: Readonly<Record<string, Scenario>>) {
  const small: Record<string, unknown> = {};
  for (const id of ["packing-33222", "packing-5432", "unlock-long-tail"]) {
    const scenario = required(scenarios[id], id);
    const predictions = nominalPredictions(scenario);
    const context = initialContext(scenario);
    const exhaustive = solveBnb(context, predictions, 1_000_000, false);
    const pruned = solveBnb(context, predictions, 1_000_000, true);
    if (
      !exhaustive.complete ||
      !pruned.complete ||
      exhaustive.predictedMakespan !== pruned.predictedMakespan
    )
      throw new Error(`bnb pruning validation failed: ${id}`);
    small[id] = { exhaustive, pruned };
  }
  const large = independentValidationScenario(12);
  const largeContext = initialContext(large);
  const largePredictions = nominalPredictions(large);
  const truncated = solveBnb(largeContext, largePredictions, 4096, false);
  const fallback = solveBnb(largeContext, largePredictions, 0, true);
  if (
    truncated.complete ||
    fallback.firstAction.kind !== "select" ||
    !largeContext.admissionState.select(fallback.firstAction.taskId).accepted
  )
    throw new Error("bnb budget or legal fallback validation failed");
  return Object.freeze({
    small,
    truncatedWithoutPruning: truncated,
    zeroBudgetLegalFallback: fallback
  });
}

function independentValidationScenario(count: number): Scenario {
  const tasks = Array.from({ length: count }, (_, index) => `x${index}`);
  return {
    assumptionIds: ["self-validation"],
    contention: "zero",
    graph: {
      graph: {
        resourceCapacities: [],
        scopes: [],
        tasks: tasks.map((taskId) => ({
          admissionPriority: 0,
          dependsOn: [],
          mutex: [],
          observes: [],
          resourceClaims: [],
          scopeId: null,
          taskId
        }))
      },
      maxParallel: 2
    },
    policyIds: ["static", "learned"],
    profiles: tasks.map((id) => ({
      id,
      nominalWorkMs: 1,
      multiplierSamples: [1],
      resourceClaims: []
    })),
    scenarioId: "bnb-self-validation",
    scenarioVersion: 1,
    taskProfiles: Object.fromEntries(tasks.map((id) => [id, id]))
  } as Scenario;
}
function initialContext(scenario: Scenario): AdmissionPolicyContext {
  const admissionState = createAdmissionGraph(scenario.graph).initialState();
  return Object.freeze({
    activeScopeIds: Object.freeze([]),
    admissionState,
    candidates: Object.freeze(
      admissionState.catalog.selectableTaskIds.map((taskId) =>
        Object.freeze({ canAdmit: true, taskId })
      )
    ),
    capacity: admissionState.inspection.capacity,
    graph: scenario.graph.graph,
    measurement: Object.freeze({
      cumulative: Object.freeze({
        declarativeFingerprint: "self-validation",
        discrete: Object.freeze({
          acceptedWaitCount: 0,
          admittedCount: 0,
          maxRunning: 0
        }),
        peaks: Object.freeze({
          admissionViablePendingTaskCount: 0,
          admissiblePendingTaskCount: 0,
          capacityBlockedTaskCount: 0,
          mutexBlockedTaskCount: 0
        }),
        timing: Object.freeze({
          availability: "unavailable" as const,
          reason: "clock-threw" as const
        })
      }),
      measurementAt: () => undefined,
      measurementCount: 0
    }),
    runningTaskIds: Object.freeze([]),
    runtime: Object.freeze({ abortRequested: false, cancelled: false }),
    settledTaskIds: Object.freeze([])
  });
}

async function measureCost(scenarios: Readonly<Record<string, Scenario>>) {
  const specifications: readonly Readonly<{
    readonly id: string;
    readonly regime: RegimeId;
  }>[] = [
    { id: "packing-5432", regime: "synthetic-nonuniform" },
    { id: "unlock-long-tail", regime: "synthetic-nonuniform" },
    { id: "weighted-mutex-multi-resource", regime: "cold-all-1" },
    { id: "gate-shape-v1", regime: "cold-all-1" }
  ];
  const captured: Array<{
    readonly contexts: readonly AdmissionPolicyContext[];
    readonly input: Input;
    readonly scenario: Scenario;
  }> = [];
  try {
    for (const spec of specifications) {
      const scenario = required(scenarios[spec.id], spec.id);
      const input = await createInput(scenario, spec.regime);
      const contexts: AdmissionPolicyContext[] = [];
      const baseline = await preparePublic(scenario, input);
      try {
        const result = simulateEvidence(
          scenario,
          (context) => {
            if (contexts.length < 6) contexts.push(context);
            return baseline.decide(context);
          },
          SEED,
          0,
          learnedIdentity(input),
          installedCandidateIdentity()
        );
        if (result.status !== "success") throw new Error(`cost capture failed: ${spec.id}`);
      } finally {
        await baseline.dispose();
      }
      captured.push({ contexts: Object.freeze(contexts), input, scenario });
    }
    const contextHash = sha256Json(
      JSON.parse(
        JSON.stringify(
          captured.map(({ contexts, scenario }) => ({
            scenarioId: scenario.scenarioId,
            contexts
          }))
        )
      )
    );
    const totals: Record<string, { prepareMs: number; samplesMs: number[] }> = Object.fromEntries(
      ["public-learned-baseline", ...CANDIDATES].map((id) => [id, { prepareMs: 0, samplesMs: [] }])
    );
    for (let warmup = 0; warmup < 2; warmup += 1)
      for (const policyId of rotate(warmup)) await timedPolicy(policyId, captured, false, totals);
    for (let sample = 0; sample < 9; sample += 1)
      for (const policyId of rotate(sample)) await timedPolicy(policyId, captured, true, totals);
    return Object.freeze({
      contextCount: captured.reduce((total, item) => total + item.contexts.length, 0),
      contextHash,
      perPolicy: Object.freeze(
        Object.fromEntries(
          Object.entries(totals).map(([id, value]) => [
            id,
            {
              ...value,
              p50Ms: percentile(value.samplesMs, 0.5),
              p95Ms: percentile(value.samplesMs, 0.95)
            }
          ])
        )
      )
    });
  } finally {
    await Promise.all(
      captured.map(({ input }) => rm(input.directory, { recursive: true, force: true }))
    );
  }
}

async function timedPolicy(
  policyId: PolicyId,
  captured: readonly Readonly<{
    readonly contexts: readonly AdmissionPolicyContext[];
    readonly input: Input;
    readonly scenario: Scenario;
  }>[],
  collect: boolean,
  totals: Record<string, { prepareMs: number; samplesMs: number[] }>
) {
  const startPrepare = performance.now();
  const handles = await Promise.all(
    captured.map(async ({ input, scenario }) =>
      policyId === "public-learned-baseline"
        ? await preparePublic(scenario, input)
        : createCandidatePolicy(policyId, input.expectedEstimate)
    )
  );
  const prepareMs = performance.now() - startPrepare;
  const decide = (index: number, context: AdmissionPolicyContext) =>
    handles[index]?.decide(context) ??
    (() => {
      throw new Error("missing timing policy");
    })();
  const start = performance.now();
  for (const [index, entry] of captured.entries())
    for (const context of entry.contexts) void decide(index, context);
  const elapsed = performance.now() - start;
  for (const handle of handles) if ("dispose" in handle) await handle.dispose();
  const total = required(totals[policyId], policyId);
  total.prepareMs += prepareMs;
  if (collect) total.samplesMs.push(elapsed);
}
function rotate(index: number): readonly PolicyId[] {
  const all: PolicyId[] = ["public-learned-baseline", ...CANDIDATES];
  return Object.freeze([...all.slice(index % all.length), ...all.slice(0, index % all.length)]);
}
function percentile(values: readonly number[], fraction: number): number {
  return [...values].sort((a, b) => a - b)[Math.ceil(values.length * fraction) - 1] ?? 0;
}
function summarizeScreen(
  records: readonly RunRecord[],
  cost: Awaited<ReturnType<typeof measureCost>>
) {
  const baseline = cost.perPolicy["public-learned-baseline"].p95Ms;
  return Object.freeze({
    preservedThreshold: baseline * 1.25,
    costP95Ms: Object.fromEntries(
      Object.entries(cost.perPolicy).map(([id, value]) => [id, value.p95Ms])
    ),
    rule: "reported only; no product adoption is performed by this experiment",
    successfulRecords: records.filter(({ evidence }) =>
      evidence.every(({ status }) => status === "success")
    ).length,
    totalRecords: records.length
  });
}
async function protocolSha256() {
  return (
    await readFile(
      "docs/investigations/_resources/260908-compare-simple-admission-algorithms/protocol.sha256",
      "utf8"
    )
  )
    .trim()
    .split(/\s+/)[0];
}
function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`missing ${label}`);
  return value;
}

if (import.meta.main)
  await main(process.argv.slice(2)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`simple-admission-comparison: ${message}\n`);
    process.exitCode = 2;
  });
