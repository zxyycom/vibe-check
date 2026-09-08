import type {
  AdmissionState,
  SchedulerMeasurementActionObservation,
  SchedulerMeasurementEffect
} from "@zxyycom/vibe-check";

import {
  EVIDENCE_SCHEMA_VERSION,
  POLICY_CONTEXT_ID,
  SEED_DERIVATION_ID,
  TRACE_VOCABULARY_ID,
  type CandidateIdentity,
  type ScenarioEvidenceIdentity
} from "./evidence.ts";
import type { PolicyIdentity } from "./policy.ts";
import type { Scenario } from "./scenario.ts";

export type ErrorCode =
  | "event-limit"
  | "graph-rejected"
  | "invalid-input"
  | "no-progress"
  | "non-advancing-event"
  | "non-positive-rate"
  | "policy-rejected";

export interface StateSummary {
  readonly nextBoundary: "complete" | "select" | "wait";
  readonly runningTaskIds: readonly string[];
  readonly selectableTaskIds: readonly string[];
  readonly settledTaskIds: readonly string[];
}

export type TraceEvent =
  | Readonly<{
      readonly atMs: number;
      readonly boundaryIndex: number;
      readonly kind: "select";
      readonly state: StateSummary;
      readonly taskId: string;
    }>
  | Readonly<{
      readonly atMs: number;
      readonly boundaryIndex: number;
      readonly deltaMs: number;
      readonly kind: "advance";
      readonly rates: readonly Readonly<{ readonly rate: number; readonly taskId: string }>[];
      readonly runningTaskIds: readonly string[];
    }>
  | Readonly<{
      readonly atMs: number;
      readonly boundaryIndex: number;
      readonly kind: "settle";
      readonly outcome: "satisfied" | "unsatisfied";
      readonly state: StateSummary;
      readonly taskId: string;
    }>
  | Readonly<{
      readonly atMs: number;
      readonly boundaryIndex: number;
      readonly causedByTaskId: string;
      readonly effect: "blocked";
      readonly kind: "forced-effect";
      readonly taskId: string;
    }>
  | Readonly<{
      readonly atMs: number;
      readonly boundaryIndex: number;
      readonly kind: "policy-wait";
      readonly state: StateSummary;
    }>
  | Readonly<{
      readonly atMs: number;
      readonly boundaryIndex: number;
      readonly kind: "policy-rejection";
      readonly message: string;
      readonly taskId: string | null;
    }>;

export interface SampledWork {
  readonly multiplier: number;
  readonly multiplierIndex: number;
  readonly profileId: string;
  readonly taskId: string;
  readonly workMs: number;
}

export interface SimulationResult {
  readonly actionObservations: readonly SchedulerMeasurementActionObservation[];
  readonly assumptions: Readonly<{
    readonly ids: readonly string[];
    readonly resourceContention: Readonly<{
      readonly alpha: 0 | 0.25 | 1;
      readonly preset: Scenario["contention"];
      readonly source: "synthetic-sensitivity";
    }>;
    readonly virtualTimeIsGateTiming: false;
  }>;
  readonly candidateIdentity: CandidateIdentity;
  readonly makespanMs: number;
  readonly policyContextId: typeof POLICY_CONTEXT_ID;
  readonly policyIdentity: PolicyIdentity;
  readonly profileSetIdentity: string;
  readonly replicate: number;
  readonly resourceUnitTimeMs: Readonly<Record<string, number>>;
  readonly sampledWork: readonly SampledWork[];
  readonly sampledWorkCommitment: string;
  readonly scenarioIdentity: ScenarioEvidenceIdentity;
  readonly schemaVersion: typeof EVIDENCE_SCHEMA_VERSION;
  readonly seed: number;
  readonly seedDerivationId: typeof SEED_DERIVATION_ID;
  readonly slotTimeMs: number;
  readonly source: "virtual";
  readonly status: "success";
  readonly trace: readonly TraceEvent[];
  readonly traceVocabularyId: typeof TRACE_VOCABULARY_ID;
}

export interface SimulationError {
  readonly actionObservations: readonly SchedulerMeasurementActionObservation[];
  readonly boundaryIndex: number;
  readonly candidateIdentity: CandidateIdentity | null;
  readonly error: Readonly<{ readonly code: ErrorCode; readonly message: string }>;
  readonly policyIdentity: PolicyIdentity | null;
  readonly profileSetIdentity: string | null;
  readonly replicate: number | null;
  readonly scenarioIdentity: ScenarioEvidenceIdentity | null;
  readonly schemaVersion: typeof EVIDENCE_SCHEMA_VERSION;
  readonly seed: number | null;
  readonly source: "virtual";
  readonly status: "error";
  readonly trace: readonly TraceEvent[];
  readonly traceVocabularyId: typeof TRACE_VOCABULARY_ID;
  readonly virtualTimeMs: number;
}

export type SimulationEvidence = SimulationError | SimulationResult;

export interface MutableContribution {
  acceptedWaitMs: number;
  admissiblePendingTaskMs: number;
  capacityBlockedTaskMs: number;
  effectiveCapacitySlotMs: number;
  mutexBlockedTaskMs: number;
  rootCapacitySlotMs: number;
  taskSlotMs: number;
}

export interface MutableObservation {
  readonly effects: SchedulerMeasurementEffect[];
  readonly kind: "select" | "wait";
  readonly sequence: number;
  readonly taskId: string | null;
  contribution: MutableContribution;
}

export interface Run {
  acceptedWaitCount: number;
  admittedCount: number;
  boundaryIndex: number;
  coreEventCount: number;
  readonly declarativeFingerprint: string;
  effectiveCapacitySlotMs: number;
  readonly eventLimit: number;
  maxRunning: number;
  readonly observations: SchedulerMeasurementActionObservation[];
  readonly peaks: {
    admissionViablePendingTaskCount: number;
    admissiblePendingTaskCount: number;
    capacityBlockedTaskCount: number;
    mutexBlockedTaskCount: number;
  };
  pendingObservation: MutableObservation | null;
  readonly rates: Map<string, number>;
  readonly remainingWork: Map<string, number>;
  rootCapacitySlotMs: number;
  readonly sampledWork: readonly SampledWork[];
  readonly scenario: Scenario;
  slotTimeMs: number;
  state: AdmissionState;
  readonly trace: TraceEvent[];
  readonly unitTimeMs: Record<string, number>;
  virtualTimeMs: number;
}

export class SimulationFault extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function freezeValue<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeValue(child);
    Object.freeze(value);
  }
  return value;
}

export function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.length > 0
    ? `${fallback}: ${error.message}`
    : fallback;
}

export function normalizeFault(error: unknown): SimulationFault {
  if (error instanceof SimulationFault) return error;
  if (error instanceof Error) return new SimulationFault("invalid-input", error.message);
  return new SimulationFault("invalid-input", "unknown simulation failure");
}

export function required<T>(map: ReadonlyMap<string, T>, key: string, label: string): T {
  const value = map.get(key);
  if (value === undefined) throw new SimulationFault("invalid-input", `missing ${label}: ${key}`);
  return value;
}

export function recordCoreEvent(run: Run): void {
  if (run.coreEventCount >= run.eventLimit) {
    throw new SimulationFault("event-limit", `core event limit ${run.eventLimit} reached`);
  }
  run.coreEventCount += 1;
}
