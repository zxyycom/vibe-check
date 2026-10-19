import type { NormalizedCheck } from "../../project-definition/project-definition.ts";
import type { ResourceUnitMapping } from "../../project-definition/resource-unit-mapping.ts";
import { prepareExecutableTaskGraph, type ExecutableTaskGraph } from "../task-scheduler/graph.ts";
import { planStaticCheckGraph } from "./plan.ts";

const STATIC_CHECK_EXECUTION_PLAN = Symbol("static-check-execution-plan");

/** Binds normalized Checks to their validated static graph and root cap; no Check prepare runs here. */
export interface StaticCheckExecutionPlan {
  readonly [STATIC_CHECK_EXECUTION_PLAN]: true;
  readonly checks: readonly NormalizedCheck[];
  readonly taskGraph: ExecutableTaskGraph;
}

export function createStaticCheckExecutionPlan(
  input: Readonly<{
    readonly checks: readonly NormalizedCheck[];
    readonly maxParallel: number;
    readonly resourceCapacities?: ResourceUnitMapping;
  }>
): StaticCheckExecutionPlan {
  const checks = Object.freeze([...input.checks]);
  return Object.freeze({
    [STATIC_CHECK_EXECUTION_PLAN]: true as const,
    checks,
    taskGraph: prepareExecutableTaskGraph(
      planStaticCheckGraph(checks, input.resourceCapacities),
      input.maxParallel
    )
  });
}
