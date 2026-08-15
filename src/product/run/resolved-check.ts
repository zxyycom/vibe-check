import type {
  CheckExecutionContext,
  CheckPlanningContext
} from "../definition/custom-check.ts";
import type {
  NormalizedCheck,
  NormalizedProjectDefinition
} from "../definition/project.ts";
import {
  snapshotClosedRecord
} from "../quality-core/check-record/plain-record-values.ts";
import type { CoreSnapshot } from "../quality-core/check-record/model.ts";
import type { ReferenceFacts } from "../quality-core/check-record/policy-model.ts";
import type { BuiltInRuntime } from "./built-ins.ts";
import { resolveTaskPlan, type ResolvedTaskPlan } from "./task-plan.ts";

/**
 * Invocation-scoped result of the one Normalized Check -> runtime binding
 * join. This is Package Run private data, never a Core or public entity.
 */
interface ResolvedCheckBase {
  readonly definition: NormalizedCheck["definition"];
  readonly dependsOn: readonly string[];
  readonly maxParallel: number;
  readonly mutex: readonly string[];
}

export type ResolvedCheckApplicability = "applicable" | "not-applicable";

export interface ResolvedDirectCheckBinding {
  readonly kind: "direct";
  readonly execute: (context: CheckExecutionContext) => unknown | Promise<unknown>;
  readonly referenceFacts?: (snapshot: CoreSnapshot) => ReferenceFacts;
  readonly source: "built-in" | "custom";
}

interface ApplicableTaskPlanCheckBinding {
  readonly kind: "task-plan";
  readonly plan: ResolvedTaskPlan;
}

interface NotApplicableTaskPlanCheckBinding {
  readonly kind: "task-plan";
  /** A not-applicable Check deliberately has no factory result. */
  readonly plan: null;
}

export type ApplicableResolvedCheck = Readonly<ResolvedCheckBase & {
  readonly applicability: "applicable";
  readonly binding: ResolvedDirectCheckBinding | ApplicableTaskPlanCheckBinding;
}>;

export type NotApplicableResolvedCheck = Readonly<ResolvedCheckBase & {
  readonly applicability: "not-applicable";
  readonly binding: ResolvedDirectCheckBinding | NotApplicableTaskPlanCheckBinding;
}>;

export type ResolvedCheck = ApplicableResolvedCheck | NotApplicableResolvedCheck;

type ResolvedCheckExecution = Pick<
  ApplicableResolvedCheck,
  "applicability" | "binding"
> | Pick<NotApplicableResolvedCheck, "applicability" | "binding">;

/** A pre-work failure never starts project execution. */
export class ResolvedCheckPlanningError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ResolvedCheckPlanningError";
  }
}

export function resolveChecks(input: Readonly<{
  readonly builtIns: BuiltInRuntime;
  readonly normalized: NormalizedProjectDefinition;
}>): readonly ResolvedCheck[] {
  const checkIds = new Set<string>();
  const checks: ResolvedCheck[] = [];
  for (const normalized of input.normalized.declarative.checks) {
    if (checkIds.has(normalized.definition.checkId)) {
      throw new ResolvedCheckPlanningError("Normalized Check collection has a duplicate identity");
    }
    checkIds.add(normalized.definition.checkId);
    checks.push(resolveCheck(normalized, input));
  }
  return Object.freeze(checks);
}

function resolveCheck(
  normalized: NormalizedCheck,
  input: Readonly<{ readonly builtIns: BuiltInRuntime; readonly normalized: NormalizedProjectDefinition }>
): ResolvedCheck {
  const execution = normalized.kind === "built-in"
    ? resolveBuiltInCheck(normalized, input.builtIns)
    : resolveCustomCheck(normalized, input.normalized);
  const base: ResolvedCheckBase = {
    definition: normalized.definition,
    dependsOn: Object.freeze([...normalized.dependsOn]),
    maxParallel: normalized.maxParallel,
    mutex: Object.freeze([...normalized.mutex])
  };
  return Object.freeze({ ...base, ...execution });
}

function resolveBuiltInCheck(
  normalized: Extract<NormalizedCheck, { readonly kind: "built-in" }>,
  builtIns: BuiltInRuntime
): ResolvedCheckExecution {
  const runtime = builtIns.resolve(normalized.definition.checkId);
  if (runtime === undefined) {
    throw new ResolvedCheckPlanningError("Built-in runtime binding is unavailable");
  }
  const binding: ResolvedDirectCheckBinding = Object.freeze({
    kind: "direct",
    execute: runtime.execute,
    referenceFacts: runtime.referenceFacts,
    source: "built-in"
  });
  if (runtime.applicability === "applicable") {
    return Object.freeze({ applicability: "applicable", binding });
  }
  return Object.freeze({ applicability: "not-applicable", binding });
}

function resolveCustomCheck(
  normalized: Extract<NormalizedCheck, { readonly kind: "custom" }>,
  definition: NormalizedProjectDefinition
): ResolvedCheckExecution {
  const custom = definition.bindings.customChecks.get(normalized.definition.checkId);
  if (custom === undefined) {
    throw new ResolvedCheckPlanningError("Custom Check binding is unavailable");
  }
  const context = planningContext(normalized.definition);
  const applicability = resolveApplicability(custom.applicability, context);
  if (applicability === undefined) {
    throw new ResolvedCheckPlanningError("Custom Check applicability is invalid");
  }
  if (custom.binding.kind === "direct") {
    const binding: ResolvedDirectCheckBinding = Object.freeze({
      kind: "direct",
      execute: custom.binding.execute,
      source: "custom"
    });
    if (applicability === "applicable") {
      return Object.freeze({ applicability: "applicable", binding });
    }
    return Object.freeze({ applicability: "not-applicable", binding });
  }
  if (applicability === "not-applicable") {
    return Object.freeze({
      applicability,
      binding: Object.freeze({ kind: "task-plan", plan: null })
    });
  }
  const plan = resolveCustomTaskPlan(custom.binding.createTaskPlan, context);
  return Object.freeze({
    applicability,
    binding: Object.freeze({ kind: "task-plan", plan })
  });
}

function planningContext(definition: NormalizedCheck["definition"]): CheckPlanningContext {
  return Object.freeze({ definition });
}

function resolveApplicability(
  binding: (context: CheckPlanningContext) => unknown,
  context: CheckPlanningContext
): ResolvedCheckApplicability | undefined {
  let value: unknown;
  try {
    value = binding(context);
  } catch {
    return undefined;
  }
  const data = snapshotClosedRecord(value);
  if (data === undefined || Object.keys(data).length !== 1 || !Object.hasOwn(data, "status")) {
    return undefined;
  }
  return data.status === "applicable" || data.status === "not-applicable" ? data.status : undefined;
}

function resolveCustomTaskPlan(
  factory: (context: CheckPlanningContext) => unknown,
  context: CheckPlanningContext
): ResolvedTaskPlan {
  let rawPlan: unknown;
  try {
    rawPlan = factory(context);
  } catch {
    throw new ResolvedCheckPlanningError("Custom Check TaskPlan factory failed");
  }
  const plan = resolveTaskPlan(rawPlan);
  if (plan === undefined) {
    throw new ResolvedCheckPlanningError("Custom Check TaskPlan is invalid");
  }
  return plan;
}
