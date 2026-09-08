import {
  createLearnedCriticalPathStrategy,
  type AdmissionPolicy,
  type AdmissionPolicyContext,
  type AdmissionProposal,
  type SchedulerGraphSnapshot
} from "@zxyycom/vibe-check";

import { sha256Json } from "./evidence.ts";
import {
  prepareWritableState,
  removeWritableState,
  type WritablePolicyState
} from "./learned-heuristic-policy-state.ts";
import type { PolicyRegistryId } from "./scenario.ts";

export type DecisionPolicy = (context: AdmissionPolicyContext) => AdmissionProposal;
export type LearnedStrategyFactory = typeof createLearnedCriticalPathStrategy;

export interface PolicyIdentity {
  readonly expectedFallbackType: "cold-start" | "none";
  readonly historySnapshotSha256: string | null;
  readonly identityProjectionId: string | null;
  readonly kind: "prepared" | "static";
  readonly modelOptions: Readonly<{
    readonly coldStartDurationMs: number;
    readonly maxHistorySeries: number;
    readonly sampleWindow: number;
  }> | null;
  readonly policyId: string;
  readonly policyVersion: 1;
}

export interface PreparedPolicyHandle {
  /** Validating adapter for virtual simulation and public-policy conformance checks. */
  readonly decide: DecisionPolicy;
  /** Direct public prepared decision, for a bounded timing loop only. */
  readonly directDecide: DecisionPolicy;
  readonly assertValid: () => void;
  readonly dispose: () => Promise<void>;
  readonly identity: PolicyIdentity;
  /** Test-only observation of the isolated writable copy; it is never serialized as identity. */
  readonly stateDirectory: string | null;
}

export interface LearnedHistorySnapshot {
  readonly files: Readonly<Record<string, string>>;
  readonly snapshotId: string;
}

export interface LearnedPolicyFixture {
  readonly coldStartDurationMs?: number;
  readonly expectedFallbackType: "cold-start" | "none";
  readonly historySnapshot: LearnedHistorySnapshot;
  readonly identityForTask: (task: SchedulerGraphSnapshot["tasks"][number]) => unknown;
  readonly identityProjectionId: string;
  readonly maxHistorySeries?: number;
  readonly policyId: string;
  readonly sampleWindow?: number;
}

const EMPTY_HISTORY_SNAPSHOT = Object.freeze({
  files: Object.freeze({}),
  snapshotId: "empty-scheduler-history-v1"
});

export const REGISTERED_LEARNED_FIXTURE = Object.freeze({
  expectedFallbackType: "cold-start" as const,
  historySnapshot: EMPTY_HISTORY_SNAPSHOT,
  identityForTask: (task: SchedulerGraphSnapshot["tasks"][number]) => ({
    taskId: task.taskId
  }),
  identityProjectionId: "task-id-v1",
  policyId: "learned",
  coldStartDurationMs: 1,
  maxHistorySeries: 4096,
  sampleWindow: 32
});

export const staticPolicy: DecisionPolicy = (context) => {
  const selected = context.candidates.find(({ canAdmit }) => canAdmit);
  return selected === undefined
    ? Object.freeze({ kind: "wait" as const })
    : Object.freeze({ kind: "select" as const, taskId: selected.taskId });
};

export async function prepareRegisteredPolicy(
  policyId: PolicyRegistryId,
  graph: SchedulerGraphSnapshot
): Promise<PreparedPolicyHandle> {
  if (policyId === "static") {
    return preparePolicyDefinition(
      Object.freeze({ kind: "static" }),
      registeredPolicyIdentity("static")
    );
  }
  return prepareLearnedPolicy(REGISTERED_LEARNED_FIXTURE, graph);
}

export function registeredPolicyIdentity(policyId: PolicyRegistryId): PolicyIdentity {
  return policyId === "static"
    ? staticIdentity("static")
    : learnedIdentity(REGISTERED_LEARNED_FIXTURE);
}

/** Adapts only the public AdmissionPolicy grammar and calls prepared `prepare` exactly once. */
export async function preparePolicyDefinition(
  policy: AdmissionPolicy,
  identity: PolicyIdentity,
  graph?: SchedulerGraphSnapshot
): Promise<PreparedPolicyHandle> {
  if (policy.kind === "static") {
    return Object.freeze({
      assertValid: () => undefined,
      decide: staticPolicy,
      directDecide: staticPolicy,
      dispose: async () => undefined,
      identity,
      stateDirectory: null
    });
  }
  if (policy.strategy.kind === "simple") {
    return Object.freeze({
      assertValid: () => undefined,
      decide: policy.strategy.decide,
      directDecide: policy.strategy.decide,
      dispose: async () => undefined,
      identity,
      stateDirectory: null
    });
  }
  if (graph === undefined) throw new TypeError("prepared policy requires a graph");
  const prepared = await policy.strategy.prepare({ graph });
  return Object.freeze({
    assertValid: () => undefined,
    decide: prepared.decide,
    directDecide: prepared.decide,
    dispose: async () => undefined,
    identity,
    stateDirectory: null
  });
}

/** Copies one fixed history snapshot into a per-policy writable directory and never calls complete. */
export async function prepareLearnedPolicy(
  fixture: LearnedPolicyFixture,
  graph: SchedulerGraphSnapshot
): Promise<PreparedPolicyHandle> {
  return prepareLearnedPolicyWithFactory(createLearnedCriticalPathStrategy, fixture, graph);
}

/** Prepares a policy from a separately imported public package artifact. */
export async function prepareLearnedPolicyWithFactory(
  factory: LearnedStrategyFactory,
  fixture: LearnedPolicyFixture,
  graph: SchedulerGraphSnapshot
): Promise<PreparedPolicyHandle> {
  const modelOptions = learnedModelOptions(fixture);
  const writableState = await prepareWritableState(fixture.historySnapshot.files);
  try {
    const validation = createFallbackValidator(fixture);
    const strategy = factory({
      ...modelOptions,
      identityForTask: fixture.identityForTask,
      observe: validation.observe,
      stateDirectory: writableState.stateDirectory
    });
    if (strategy.kind !== "prepared") throw new TypeError("learned strategy is not prepared");
    const prepared = await strategy.prepare({ graph });
    validation.assertValid();
    return learnedPolicyHandle(
      fixture,
      modelOptions,
      writableState,
      prepared.decide,
      validation.assertValid
    );
  } catch (error) {
    await removeWritableState(writableState.stateParent);
    throw error;
  }
}

function learnedModelOptions(fixture: LearnedPolicyFixture): Readonly<{
  readonly coldStartDurationMs: number;
  readonly maxHistorySeries: number;
  readonly sampleWindow: number;
}> {
  return Object.freeze({
    coldStartDurationMs: fixture.coldStartDurationMs ?? 1,
    maxHistorySeries: fixture.maxHistorySeries ?? 4096,
    sampleWindow: fixture.sampleWindow ?? 32
  });
}

function createFallbackValidator(fixture: LearnedPolicyFixture): Readonly<{
  readonly assertValid: () => void;
  readonly observe: (event: Readonly<{ readonly kind: string; readonly source?: string }>) => void;
}> {
  const allowedSources = expectedPredictionSources(fixture.expectedFallbackType);
  let invalidFallback: string | undefined;
  return Object.freeze({
    assertValid: () => {
      if (invalidFallback !== undefined) throw new Error(invalidFallback);
    },
    observe: (event) => {
      if (invalidFallback !== undefined) return;
      invalidFallback = invalidFallbackReason(event, allowedSources);
    }
  });
}

function expectedPredictionSources(
  expectedFallbackType: LearnedPolicyFixture["expectedFallbackType"]
): ReadonlySet<string> {
  return expectedFallbackType === "cold-start"
    ? new Set(["cold-start"])
    : new Set(["learned", "project-prior"]);
}

function invalidFallbackReason(
  event: Readonly<{ readonly kind: string; readonly source?: string }>,
  allowedSources: ReadonlySet<string>
): string | undefined {
  if (event.kind === "history-unavailable")
    return "learned policy history/setup fallback invalidates this comparison";
  if (event.kind !== "selection-proposed") return undefined;
  if (event.source !== undefined && allowedSources.has(event.source)) return undefined;
  return `learned policy used unexpected prediction source; expected ${[...allowedSources].join(" or ")}`;
}

function learnedPolicyHandle(
  fixture: LearnedPolicyFixture,
  modelOptions: NonNullable<PolicyIdentity["modelOptions"]>,
  writableState: WritablePolicyState,
  directDecide: DecisionPolicy,
  assertValid: () => void
): PreparedPolicyHandle {
  const decide: DecisionPolicy = (context) => {
    const proposal = directDecide(context);
    assertValid();
    return proposal;
  };
  return Object.freeze({
    assertValid,
    decide,
    directDecide,
    dispose: async () => removeWritableState(writableState.stateParent),
    identity: learnedIdentity(
      fixture,
      sha256Json({
        files: fixture.historySnapshot.files,
        snapshotId: fixture.historySnapshot.snapshotId
      }),
      modelOptions
    ),
    stateDirectory: writableState.stateDirectory
  });
}

function learnedIdentity(
  fixture: LearnedPolicyFixture,
  snapshotSha256 = sha256Json({
    files: fixture.historySnapshot.files,
    snapshotId: fixture.historySnapshot.snapshotId
  }),
  modelOptions = Object.freeze({
    coldStartDurationMs: fixture.coldStartDurationMs ?? 1,
    maxHistorySeries: fixture.maxHistorySeries ?? 4096,
    sampleWindow: fixture.sampleWindow ?? 32
  })
): PolicyIdentity {
  return Object.freeze({
    expectedFallbackType: fixture.expectedFallbackType,
    historySnapshotSha256: snapshotSha256,
    identityProjectionId: fixture.identityProjectionId,
    kind: "prepared" as const,
    modelOptions,
    policyId: fixture.policyId,
    policyVersion: 1 as const
  });
}

export function staticIdentity(policyId: string): PolicyIdentity {
  return Object.freeze({
    expectedFallbackType: "none" as const,
    historySnapshotSha256: null,
    identityProjectionId: null,
    kind: "static" as const,
    modelOptions: null,
    policyId,
    policyVersion: 1 as const
  });
}
