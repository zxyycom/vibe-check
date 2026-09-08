import type { AdmissionState } from "@zxyycom/vibe-check";

import {
  EVIDENCE_SCHEMA_VERSION,
  POLICY_CONTEXT_ID,
  SEED_DERIVATION_ID,
  TRACE_VOCABULARY_ID,
  scenarioEvidenceIdentity,
  sha256Json,
  type CandidateIdentity
} from "./evidence.ts";
import type { PolicyIdentity } from "./policy.ts";
import type { Profile, Scenario } from "./scenario.ts";
import {
  freezeValue,
  required,
  type Run,
  type SampledWork,
  type SimulationResult,
  type StateSummary
} from "./simulation-types.ts";

export interface SimulationIdentity {
  readonly candidateIdentity: CandidateIdentity;
  readonly policyIdentity: PolicyIdentity;
  readonly replicate: number;
  readonly seed: number;
}

export function resultFor(run: Run, identity: SimulationIdentity): SimulationResult {
  const scenario = run.scenario;
  return freezeValue({
    actionObservations: run.observations,
    assumptions: {
      ids: scenario.assumptionIds,
      resourceContention: {
        alpha: contentionAlpha(scenario.contention),
        preset: scenario.contention,
        source: "synthetic-sensitivity" as const
      },
      virtualTimeIsGateTiming: false as const
    },
    candidateIdentity: identity.candidateIdentity,
    makespanMs: run.virtualTimeMs,
    policyContextId: POLICY_CONTEXT_ID,
    policyIdentity: identity.policyIdentity,
    profileSetIdentity: profileSetIdentity(scenario),
    replicate: identity.replicate,
    resourceUnitTimeMs: run.unitTimeMs,
    sampledWork: run.sampledWork,
    sampledWorkCommitment: sha256Json(run.sampledWork),
    scenarioIdentity: scenarioEvidenceIdentity(scenario),
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    seed: identity.seed,
    seedDerivationId: SEED_DERIVATION_ID,
    slotTimeMs: run.slotTimeMs,
    source: "virtual" as const,
    status: "success" as const,
    trace: run.trace,
    traceVocabularyId: TRACE_VOCABULARY_ID
  });
}

export function sampleScenarioWork(
  scenario: Scenario,
  seed: number,
  replicate: number
): readonly SampledWork[] {
  const profiles = new Map(scenario.profiles.map((entry) => [entry.id, entry]));
  return Object.freeze(
    scenario.graph.graph.tasks
      .map(({ taskId }) =>
        sampleTaskWork(
          scenario,
          required(profiles, scenario.taskProfiles[taskId] ?? "", "profile"),
          taskId,
          seed,
          replicate
        )
      )
      .sort((left, right) => left.taskId.localeCompare(right.taskId))
  );
}

function sampleTaskWork(
  scenario: Scenario,
  profile: Profile,
  taskId: string,
  seed: number,
  replicate: number
): SampledWork {
  const random = mulberry32(
    fnv1a32([scenario.scenarioVersion, scenario.scenarioId, taskId, replicate, seed])
  );
  const multiplierIndex = Math.floor(random() * profile.multiplierSamples.length);
  const multiplier = profile.multiplierSamples[multiplierIndex];
  if (multiplier === undefined) throw new Error(`profile ${profile.id} has no samples`);
  const workMs = profile.nominalWorkMs * multiplier;
  if (!Number.isFinite(workMs) || workMs <= 0)
    throw new Error(`sampled work is invalid for ${taskId}`);
  return freezeValue({ multiplier, multiplierIndex, profileId: profile.id, taskId, workMs });
}

export function fnv1a32(parts: readonly (number | string)[]): number {
  let hash = 2166136261;
  const bytes = Buffer.from(parts.map(String).join("\0"), "utf8");
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function contentionAlpha(preset: Scenario["contention"]): 0 | 0.25 | 1 {
  if (preset === "weak") return 0.25;
  if (preset === "strong") return 1;
  return 0;
}

export function profileSetIdentity(scenario: Scenario): string {
  return sha256Json({ profiles: scenario.profiles, taskProfiles: scenario.taskProfiles });
}

export function stateSummary(state: AdmissionState): StateSummary {
  return freezeValue({
    nextBoundary: state.inspection.nextBoundary,
    runningTaskIds: state.inspection.runningTaskIds,
    selectableTaskIds: state.catalog.selectableTaskIds,
    settledTaskIds: state.inspection.settledTasks.map(({ taskId }) => taskId)
  });
}
