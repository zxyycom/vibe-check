import type { NormalizedCheck } from "../../project-definition/project-definition.ts";
import type { ResourceUnitMapping } from "../../project-definition/resource-unit-mapping.ts";
import { prepareExecutableTaskGraph, type ExecutableTaskGraph } from "../task-scheduler/graph.ts";
import { planStaticCheckGraph } from "./plan.ts";

const PREPARED_CHECK_EXECUTION = Symbol("prepared-check-execution");

/** One preparation binds the Check collection to its validated static graph and root cap. */
export interface PreparedCheckExecution {
  readonly [PREPARED_CHECK_EXECUTION]: true;
  readonly checks: readonly NormalizedCheck[];
  readonly taskGraph: ExecutableTaskGraph;
}

export function prepareCheckExecution(
  input: Readonly<{
    readonly checks: readonly NormalizedCheck[];
    readonly maxParallel: number;
    readonly resourceCapacities?: ResourceUnitMapping;
  }>
): PreparedCheckExecution {
  const checks = Object.freeze([...input.checks]);
  return Object.freeze({
    [PREPARED_CHECK_EXECUTION]: true as const,
    checks,
    taskGraph: prepareExecutableTaskGraph(
      planStaticCheckGraph(checks, input.resourceCapacities),
      input.maxParallel
    )
  });
}
