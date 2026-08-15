import type { CheckDefinition } from "./check-definition.ts";

/** A custom Check's invocation-time applicability result. */
export type CheckApplicability = Readonly<
  | { readonly status: "applicable" }
  | { readonly status: "not-applicable" }
>;

/** The only successful quality verdict a custom Check may report. */
export type CheckVerdict = "passed" | "failed";

export interface CheckResult {
  readonly verdict: CheckVerdict;
}

export type RecordLevel = "info" | "warning" | "error";
export type RecordFieldValue = boolean | number | string;

/**
 * A Check-owned candidate. Product binds its `checkId` and assigns its stable
 * identity; project code never provides either value.
 */
export interface QualityRecordCandidate {
  readonly recordTypeId: string;
  readonly level: RecordLevel;
  readonly semanticSubject: string;
  readonly message: string;
  readonly fields: Readonly<Record<string, RecordFieldValue>>;
  readonly location: Readonly<{
    readonly path: string;
    readonly line: number;
    readonly column: number;
  }> | null;
}

/**
 * Contextual information available while Package Run is planning a custom
 * Check. It intentionally does not expose Task, worker, scheduler, or Core
 * capability implementation details.
 */
export interface CheckPlanningContext {
  readonly definition: CheckDefinition;
}

/** The result-facing operation available to trusted project functions. */
export interface CheckResultReporter {
  report(candidate: QualityRecordCandidate): void;
}

export interface CheckExecutionContext {
  readonly signal: AbortSignal;
  readonly results: CheckResultReporter;
}

export interface TaskPlanHeader {
  readonly id: string;
  readonly dependsOn?: readonly string[];
  readonly mutex?: readonly string[];
}

export interface TaskPlanTask extends TaskPlanHeader {
  readonly run: (context: CheckExecutionContext) => unknown | Promise<unknown>;
}

export interface TaskPlanGroup extends TaskPlanHeader {
  readonly tasks: readonly TaskPlanNode[];
}

export type TaskPlanNode = TaskPlanGroup | TaskPlanTask;

/**
 * A static authoring plan. Product validates and projects it into private Task
 * engine units; the plan itself is not a scheduler Task definition.
 */
export interface TaskPlan {
  readonly tasks: readonly TaskPlanNode[];
  readonly complete: (
    outcomes: Readonly<Record<string, unknown>>,
    context: CheckExecutionContext
  ) => CheckResult | Promise<CheckResult>;
}

export type CheckApplicabilityBinding = (
  context: CheckPlanningContext
) => CheckApplicability;

export type CustomCheckBinding = Readonly<
  | {
    readonly kind: "direct";
    readonly execute: (context: CheckExecutionContext) => CheckResult | Promise<CheckResult>;
  }
  | {
    readonly kind: "task-plan";
    readonly createTaskPlan: (context: CheckPlanningContext) => TaskPlan;
  }
>;

/** Project-authored custom leaf with contextual function typing. */
export interface CustomCheck extends CheckDefinition {
  readonly kind: "custom";
  readonly applicability: CheckApplicabilityBinding;
  readonly binding: CustomCheckBinding;
  readonly dependsOn?: string | readonly string[];
  readonly maxParallel?: number;
  readonly mutex?: string | readonly string[];
}
