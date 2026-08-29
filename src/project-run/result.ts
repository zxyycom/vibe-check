import type {
  DefinitionWarning,
  ProjectDefinitionDiagnostic
} from "../project-definition/project-definition.ts";
import type { RunControlDiagnostic } from "./controls/validation-result.ts";
import type { CheckAggregate, RunControls } from "./controls/contract.ts";
import type { CheckMessageLevel } from "../check/check.ts";
import type { CoreSnapshot } from "../check-settlement/facts.ts";
import type { RunOutputStatuses } from "./output-status.ts";
export type RunDiagnostic = Readonly<{
  readonly code: "task-graph-invalid" | "task-engine-failed" | "publication-model-failed";
}>;
export type CheckDuration = Readonly<{
  readonly checkId: string;
  readonly durationMs: number | null;
}>;
export interface CheckRunMessage {
  readonly checkId: string;
  readonly level: CheckMessageLevel;
  readonly code: string;
  readonly message: string;
}
export interface RunResultFacts {
  readonly aggregate: CheckAggregate | null;
  readonly checkDurations: readonly CheckDuration[];
  readonly checkMessages: readonly CheckRunMessage[];
  readonly snapshot: CoreSnapshot;
}
/** 一次 Project Run 的可判别结果；output failure 保留已结算 facts。 */
export type RunResult = Readonly<
  | {
      readonly kind: "configuration";
      readonly definitionWarnings: readonly DefinitionWarning[];
      readonly diagnostic: ProjectDefinitionDiagnostic | RunControlDiagnostic;
    }
  | {
      readonly kind: "planning";
      readonly declarativeFingerprint: string;
      readonly definitionWarnings: readonly DefinitionWarning[];
      readonly diagnostic: RunDiagnostic;
      readonly outputs: RunOutputStatuses;
    }
  | {
      readonly kind: "cancelled";
      readonly declarativeFingerprint: string;
      readonly definitionWarnings: readonly DefinitionWarning[];
      readonly outputs: RunOutputStatuses;
      readonly phase: "pre-work" | "planning";
    }
  | {
      readonly kind: "cancelled";
      readonly declarativeFingerprint: string;
      readonly definitionWarnings: readonly DefinitionWarning[];
      readonly outputs: RunOutputStatuses;
      readonly phase: "execution";
      readonly checkDurations: readonly CheckDuration[];
      readonly checkMessages: readonly CheckRunMessage[];
      readonly snapshot: CoreSnapshot;
    }
  | ({
      readonly kind: "completed";
      readonly declarativeFingerprint: string;
      readonly definitionWarnings: readonly DefinitionWarning[];
      readonly outputs: RunOutputStatuses;
    } & RunResultFacts)
  | {
      readonly kind: "execution";
      readonly declarativeFingerprint: string;
      readonly definitionWarnings: readonly DefinitionWarning[];
      readonly diagnostic: RunDiagnostic;
      readonly outputs: RunOutputStatuses;
    }
  | ({
      readonly kind: "output";
      readonly declarativeFingerprint: string;
      readonly definitionWarnings: readonly DefinitionWarning[];
      readonly diagnostic: Readonly<{
        readonly code:
          | "machine-publication-failed"
          | "progress-rendering-failed"
          | "diagnostic-logging-failed";
      }>;
      readonly outputs: RunOutputStatuses;
    } & RunResultFacts)
>;

/** Any Run result produced after controls and Definition validation have completed. */
export type NonConfigurationRunResult = Exclude<RunResult, { readonly kind: "configuration" }>;

type OutputRunResult = Extract<RunResult, { readonly kind: "output" }>;

export function outputFailure(
  declarativeFingerprint: string,
  definitionWarnings: readonly DefinitionWarning[],
  outputs: RunOutputStatuses,
  output: keyof RunOutputStatuses,
  facts: RunResultFacts
): OutputRunResult {
  return Object.freeze({
    kind: "output",
    declarativeFingerprint,
    definitionWarnings,
    diagnostic: Object.freeze({ code: outputDiagnosticCode(output) }),
    outputs,
    ...facts
  });
}
function outputDiagnosticCode(
  output: keyof RunOutputStatuses
): Extract<RunResult, { readonly kind: "output" }>["diagnostic"]["code"] {
  switch (output) {
    case "machinePublication":
      return "machine-publication-failed";
    case "progressRendering":
      return "progress-rendering-failed";
    case "diagnosticLogging":
      return "diagnostic-logging-failed";
  }
}

export function isCancelled(controls: RunControls): boolean {
  return controls.signal?.aborted === true;
}
export function planning(
  declarativeFingerprint: string,
  definitionWarnings: readonly DefinitionWarning[],
  outputs: RunOutputStatuses,
  code: Extract<RunDiagnostic["code"], "task-graph-invalid">
): Extract<NonConfigurationRunResult, { readonly kind: "planning" }> {
  return Object.freeze({
    kind: "planning",
    declarativeFingerprint,
    definitionWarnings,
    diagnostic: Object.freeze({ code }),
    outputs
  });
}
export function preExecutionCancellation(
  declarativeFingerprint: string,
  definitionWarnings: readonly DefinitionWarning[],
  outputs: RunOutputStatuses,
  phase: "pre-work" | "planning"
): Extract<
  NonConfigurationRunResult,
  { readonly kind: "cancelled"; readonly phase: "pre-work" | "planning" }
> {
  return Object.freeze({
    kind: "cancelled",
    declarativeFingerprint,
    definitionWarnings,
    outputs,
    phase
  });
}
export function executionCancellation(
  declarativeFingerprint: string,
  definitionWarnings: readonly DefinitionWarning[],
  outputs: RunOutputStatuses,
  snapshot: CoreSnapshot,
  checkDurations: readonly CheckDuration[],
  checkMessages: readonly CheckRunMessage[]
): Extract<NonConfigurationRunResult, { readonly kind: "cancelled"; readonly phase: "execution" }> {
  return Object.freeze({
    kind: "cancelled",
    declarativeFingerprint,
    definitionWarnings,
    outputs,
    phase: "execution",
    checkDurations,
    checkMessages,
    snapshot
  });
}
