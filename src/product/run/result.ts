import type {
  ProjectDefinitionDiagnostic,
  RunControls
} from "../definition/project.ts";
import type { CoreSnapshot } from "../quality-core/check-record/model.ts";
import type {
  DecisionEvidence,
  ReferenceFacts
} from "../quality-core/check-record/policy-model.ts";
import type { RunEffectStatuses } from "./effects.ts";

export type RunDiagnostic = Readonly<{
  readonly code: "builtin-preparation-failed" | "progress-failed" | "publication-model-failed"
    | "policy-validation-failed" | "resolved-check-planning-failed" | "task-execution-failed";
}>;

/** Facts shared by completed and post-model effect results. */
export interface RunResultFacts {
  readonly decision: DecisionEvidence;
  readonly referenceFacts: ReferenceFacts;
  readonly snapshot: CoreSnapshot;
}

export type RunResult = Readonly<
  | { readonly kind: "configuration"; readonly diagnostic: ProjectDefinitionDiagnostic }
  | {
    readonly kind: "planning";
    readonly declarativeFingerprint: string;
    readonly diagnostic: RunDiagnostic;
    readonly effects: RunEffectStatuses;
  }
  | {
    readonly kind: "cancelled";
    readonly declarativeFingerprint: string;
    readonly effects: RunEffectStatuses;
    readonly phase: "pre-work" | "planning";
  }
  | {
    readonly kind: "cancelled";
    readonly declarativeFingerprint: string;
    readonly effects: RunEffectStatuses;
    readonly phase: "execution";
    readonly snapshot: CoreSnapshot;
  }
  | ({
    readonly kind: "completed";
    readonly declarativeFingerprint: string;
    readonly effects: RunEffectStatuses;
  } & RunResultFacts)
  | {
    readonly kind: "execution";
    readonly declarativeFingerprint: string;
    readonly diagnostic: RunDiagnostic;
    readonly effects: RunEffectStatuses;
  }
  | ({
    readonly kind: "effect";
    readonly declarativeFingerprint: string;
    readonly diagnostic: Readonly<{
      readonly effect: keyof RunEffectStatuses;
      readonly code: "effect-failed";
    }>;
    readonly effects: RunEffectStatuses;
  } & RunResultFacts)
>;

export function effectFailure(
  declarativeFingerprint: string,
  effects: RunEffectStatuses,
  effect: keyof RunEffectStatuses,
  facts: RunResultFacts
): RunResult {
  return Object.freeze({
    kind: "effect",
    declarativeFingerprint,
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
  effects: RunEffectStatuses,
  code: Extract<RunDiagnostic["code"],
    "builtin-preparation-failed" | "policy-validation-failed" | "resolved-check-planning-failed">
): RunResult {
  return Object.freeze({
    kind: "planning",
    declarativeFingerprint,
    diagnostic: Object.freeze({ code }),
    effects
  });
}

export function preExecutionCancellation(
  declarativeFingerprint: string,
  effects: RunEffectStatuses,
  phase: "pre-work" | "planning"
): RunResult {
  return Object.freeze({ kind: "cancelled", declarativeFingerprint, effects, phase });
}

export function executionCancellation(
  declarativeFingerprint: string,
  effects: RunEffectStatuses,
  snapshot: CoreSnapshot
): RunResult {
  return Object.freeze({
    kind: "cancelled",
    declarativeFingerprint,
    effects,
    phase: "execution",
    snapshot
  });
}
