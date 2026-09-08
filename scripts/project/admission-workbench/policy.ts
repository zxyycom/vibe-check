import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createLearnedCriticalPathStrategy,
  type AdmissionPolicy,
  type AdmissionPolicyContext,
  type AdmissionProposal,
  type SchedulerGraphSnapshot
} from "@zxyycom/vibe-check";

import { sha256Json } from "./evidence.ts";
import type { PolicyRegistryId } from "./scenario.ts";

export type DecisionPolicy = (context: AdmissionPolicyContext) => AdmissionProposal;

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
  readonly decide: DecisionPolicy;
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

const REGISTERED_LEARNED_FIXTURE = Object.freeze({
  expectedFallbackType: "cold-start" as const,
  historySnapshot: EMPTY_HISTORY_SNAPSHOT,
  identityForTask: (task: SchedulerGraphSnapshot["tasks"][number]) => ({ taskId: task.taskId }),
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
      decide: staticPolicy,
      dispose: async () => undefined,
      identity,
      stateDirectory: null
    });
  }
  if (policy.strategy.kind === "simple") {
    return Object.freeze({
      decide: policy.strategy.decide,
      dispose: async () => undefined,
      identity,
      stateDirectory: null
    });
  }
  if (graph === undefined) throw new TypeError("prepared policy requires a graph");
  const prepared = await policy.strategy.prepare({ graph });
  return Object.freeze({
    decide: prepared.decide,
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
  const modelOptions = Object.freeze({
    coldStartDurationMs: fixture.coldStartDurationMs ?? 1,
    maxHistorySeries: fixture.maxHistorySeries ?? 4096,
    sampleWindow: fixture.sampleWindow ?? 32
  });
  const historySnapshotSha256 = sha256Json({
    files: fixture.historySnapshot.files,
    snapshotId: fixture.historySnapshot.snapshotId
  });
  const snapshotRoot = await mkdtemp(join(tmpdir(), "vibe-check-history-snapshot-"));
  const stateParent = await mkdtemp(join(tmpdir(), "vibe-check-admission-workbench-"));
  const stateDirectory = join(stateParent, "state");
  try {
    await materializeSnapshot(snapshotRoot, fixture.historySnapshot.files);
    await cp(snapshotRoot, stateDirectory, { recursive: true, force: false, errorOnExist: true });
    const observations: Array<
      | Readonly<{ readonly kind: "history-unavailable"; readonly reason: string }>
      | Readonly<{ readonly kind: "selection-proposed"; readonly source: string }>
      | Readonly<{ readonly kind: "recording-unavailable" }>
    > = [];
    const strategy = createLearnedCriticalPathStrategy({
      ...modelOptions,
      identityForTask: fixture.identityForTask,
      observe: (event) => {
        observations.push(event);
      },
      stateDirectory
    });
    if (strategy.kind !== "prepared") throw new TypeError("learned strategy is not prepared");
    const prepared = await strategy.prepare({ graph });
    assertNoUnexpectedFallback(observations, fixture.expectedFallbackType);
    const decide: DecisionPolicy = (context) => {
      const proposal = prepared.decide(context);
      assertNoUnexpectedFallback(observations, fixture.expectedFallbackType);
      return proposal;
    };
    return Object.freeze({
      decide,
      dispose: async () => {
        await rm(stateParent, { recursive: true, force: true });
      },
      identity: learnedIdentity(fixture, historySnapshotSha256, modelOptions),
      stateDirectory
    });
  } catch (error) {
    await rm(stateParent, { recursive: true, force: true });
    throw error;
  } finally {
    await rm(snapshotRoot, { recursive: true, force: true });
  }
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

function assertNoUnexpectedFallback(
  observations: readonly Readonly<{ readonly kind: string; readonly source?: string }>[],
  expectedFallbackType: LearnedPolicyFixture["expectedFallbackType"]
): void {
  if (observations.some(({ kind }) => kind === "history-unavailable")) {
    throw new Error("learned policy history/setup fallback invalidates this comparison");
  }
  const allowedSources =
    expectedFallbackType === "cold-start"
      ? new Set(["cold-start"])
      : new Set(["learned", "project-prior"]);
  if (
    observations.some(
      (event) =>
        event.kind === "selection-proposed" &&
        (event.source === undefined || !allowedSources.has(event.source))
    )
  ) {
    throw new Error(
      `learned policy used unexpected prediction source; expected ${[...allowedSources].join(" or ")}`
    );
  }
}

async function materializeSnapshot(
  root: string,
  files: Readonly<Record<string, string>>
): Promise<void> {
  for (const [relativePath, content] of Object.entries(files).sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    if (
      relativePath.length === 0 ||
      relativePath.startsWith("/") ||
      relativePath.split("/").some((part) => part === "" || part === "." || part === "..")
    ) {
      throw new TypeError("history snapshot path must be a safe relative path");
    }
    const path = join(root, relativePath);
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, content, { encoding: "utf8", flag: "wx" });
  }
}
