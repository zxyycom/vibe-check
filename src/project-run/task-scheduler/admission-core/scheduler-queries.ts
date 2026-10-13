import type { AdmissionPolicyContext } from "../../../project-definition/scheduler-policy.ts";
import type { AdmissionCoreState } from "./selection.ts";
import {
  activeScopesForCore,
  effectiveMaxParallelForCore,
  statusForCore
} from "./selection-query.ts";

/** Thin authoritative queries; none constructs a Scheduler inspection or another state index. */
export function capacityForCore(core: AdmissionCoreState): AdmissionPolicyContext["capacity"] {
  return Object.freeze({
    effectiveMaxParallel: effectiveMaxParallelForCore(core),
    maxParallel: core.compiled.maxParallel,
    running: core.selection.runningTotal
  });
}

export function activeScopeIdsForCore(core: AdmissionCoreState): readonly string[] {
  return Object.freeze(activeScopesForCore(core).map((scope) => scope.id));
}

export function taskIdsForCore(
  core: AdmissionCoreState,
  kind: "pending" | "running" | "settled"
): readonly string[] {
  return Object.freeze(
    core.compiled.graph.tasks.flatMap((task, slot) =>
      statusForCore(core, slot).kind === kind ? [task.id] : []
    )
  );
}
