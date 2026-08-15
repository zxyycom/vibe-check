import type {
  ProjectDefinitionDiagnostic,
  RunControls
} from "../definition/project.ts";
import type { RunEffectStatuses } from "./effects.ts";
import type { FinalCoreSnapshot } from "../quality-core/check-record/model.ts";
import type {
  DecisionEvidence,
  ReferenceFacts
} from "../quality-core/check-record/policy-model.ts";
import type { ValidatedPublicationModelV2 } from "../quality-core/output/publication-v2/index.ts";

export type RunDiagnostic = Readonly<{
  readonly code: "catalog-resolution-failed" | "builtin-preparation-failed"
    | "progress-failed" | "publication-model-failed" | "policy-validation-failed"
    | "task-execution-failed";
}>;

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
    readonly kind: "completed";
    readonly declarativeFingerprint: string;
    readonly decision: DecisionEvidence;
    readonly effects: RunEffectStatuses;
    readonly model: ValidatedPublicationModelV2;
    readonly referenceFacts: ReferenceFacts;
    readonly snapshot: FinalCoreSnapshot;
  }
  | {
    readonly kind: "execution";
    readonly declarativeFingerprint: string;
    readonly diagnostic: RunDiagnostic;
    readonly effects: RunEffectStatuses;
  }
  | {
    readonly kind: "effect";
    readonly declarativeFingerprint: string;
    readonly diagnostic: Readonly<{
      readonly effect: keyof RunEffectStatuses;
      readonly code: "effect-failed";
    }>;
    readonly effects: RunEffectStatuses;
    readonly model: ValidatedPublicationModelV2;
  }
>;

export function effectFailure(
  declarativeFingerprint: string,
  effects: RunEffectStatuses,
  effect: keyof RunEffectStatuses,
  model: ValidatedPublicationModelV2
): RunResult {
  return Object.freeze({
    kind: "effect",
    declarativeFingerprint,
    diagnostic: Object.freeze({ effect, code: "effect-failed" }),
    effects,
    model
  });
}

export function isCancelled(controls: RunControls): boolean {
  return controls.signal?.aborted === true;
}

export function planning(
  declarativeFingerprint: string,
  effects: RunEffectStatuses,
  code: Exclude<RunDiagnostic["code"], "task-execution-failed">
): RunResult {
  return Object.freeze({
    kind: "planning",
    declarativeFingerprint,
    diagnostic: Object.freeze({ code }),
    effects
  });
}

export function cancelled(
  declarativeFingerprint: string,
  effects: RunEffectStatuses,
  phase: "pre-work" | "planning"
): RunResult {
  return Object.freeze({ kind: "cancelled", declarativeFingerprint, effects, phase });
}
