import type {
  CheckAggregate,
  DefinitionWarning,
  ProjectDefinitionDiagnostic,
  RunControls
} from "../definition/project.ts";
import type { CheckMessageLevel } from "../definition/custom-check.ts";
import type { CoreSnapshot } from "../quality-core/check-record/model.ts";
import type { RunEffectStatuses } from "./effects.ts";

export type RunDiagnostic = Readonly<{
  readonly code: "task-graph-invalid" | "task-engine-failed" | "publication-model-failed";
}>;

/** One Product-measured execution duration per canonical Core Check. */
export type CheckDuration = Readonly<{
  readonly checkId: string;
  readonly durationMs: number | null;
}>;

/** A detached terminal message, ordered by canonical Check then author item order. */
export interface CheckRunMessage {
  readonly checkId: string;
  readonly level: CheckMessageLevel;
  readonly code: string;
  readonly message: string;
}

/** Facts shared by completed and post-model effect results. */
export interface RunResultFacts {
  readonly aggregate: CheckAggregate | null;
  readonly checkDurations: readonly CheckDuration[];
  readonly checkMessages: readonly CheckRunMessage[];
  readonly snapshot: CoreSnapshot;
}

export type RunResult = Readonly<
  | {
      readonly kind: "configuration";
      readonly definitionWarnings: readonly DefinitionWarning[];
      readonly diagnostic: ProjectDefinitionDiagnostic;
    }
  | {
      readonly kind: "planning";
      readonly declarativeFingerprint: string;
      readonly definitionWarnings: readonly DefinitionWarning[];
      readonly diagnostic: RunDiagnostic;
      readonly effects: RunEffectStatuses;
    }
  | {
      readonly kind: "cancelled";
      readonly declarativeFingerprint: string;
      readonly definitionWarnings: readonly DefinitionWarning[];
      readonly effects: RunEffectStatuses;
      readonly phase: "pre-work" | "planning";
    }
  | {
      readonly kind: "cancelled";
      readonly declarativeFingerprint: string;
      readonly definitionWarnings: readonly DefinitionWarning[];
      readonly effects: RunEffectStatuses;
      readonly phase: "execution";
      readonly checkDurations: readonly CheckDuration[];
      readonly checkMessages: readonly CheckRunMessage[];
      readonly snapshot: CoreSnapshot;
    }
  | ({
      readonly kind: "completed";
      readonly declarativeFingerprint: string;
      readonly definitionWarnings: readonly DefinitionWarning[];
      readonly effects: RunEffectStatuses;
    } & RunResultFacts)
  | {
      readonly kind: "execution";
      readonly declarativeFingerprint: string;
      readonly definitionWarnings: readonly DefinitionWarning[];
      readonly diagnostic: RunDiagnostic;
      readonly effects: RunEffectStatuses;
    }
  | ({
      readonly kind: "effect";
      readonly declarativeFingerprint: string;
      readonly definitionWarnings: readonly DefinitionWarning[];
      readonly diagnostic: Readonly<{
        readonly effect: keyof RunEffectStatuses;
        readonly code: "effect-failed";
      }>;
      readonly effects: RunEffectStatuses;
    } & RunResultFacts)
>;

export function effectFailure(
  declarativeFingerprint: string,
  definitionWarnings: readonly DefinitionWarning[],
  effects: RunEffectStatuses,
  effect: keyof RunEffectStatuses,
  facts: RunResultFacts
): RunResult {
  return Object.freeze({
    kind: "effect",
    declarativeFingerprint,
    definitionWarnings,
    diagnostic: Object.freeze({ effect, code: "effect-failed" }),
    effects,
    ...facts
  });
}

export function isCancelled(controls: RunControls): boolean {
  return controls.signal?.aborted === true;
}

export function planning(
  declarativeFingerprint: string,
  definitionWarnings: readonly DefinitionWarning[],
  effects: RunEffectStatuses,
  code: Extract<RunDiagnostic["code"], "task-graph-invalid">
): RunResult {
  return Object.freeze({
    kind: "planning",
    declarativeFingerprint,
    definitionWarnings,
    diagnostic: Object.freeze({ code }),
    effects
  });
}

export function preExecutionCancellation(
  declarativeFingerprint: string,
  definitionWarnings: readonly DefinitionWarning[],
  effects: RunEffectStatuses,
  phase: "pre-work" | "planning"
): RunResult {
  return Object.freeze({
    kind: "cancelled",
    declarativeFingerprint,
    definitionWarnings,
    effects,
    phase
  });
}

export function executionCancellation(
  declarativeFingerprint: string,
  definitionWarnings: readonly DefinitionWarning[],
  effects: RunEffectStatuses,
  snapshot: CoreSnapshot,
  checkDurations: readonly CheckDuration[],
  checkMessages: readonly CheckRunMessage[]
): RunResult {
  return Object.freeze({
    kind: "cancelled",
    declarativeFingerprint,
    definitionWarnings,
    effects,
    phase: "execution",
    checkDurations,
    checkMessages,
    snapshot
  });
}
