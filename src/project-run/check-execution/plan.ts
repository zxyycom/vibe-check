import type { TaskGraph, TaskNode, TaskScope } from "../task-scheduler/graph.ts";
import type { NormalizedCheck } from "../../project-definition/project-definition.ts";

/**
 * Pure executable-Check projection. Check ids are the only scheduler Task
 * identities: containment has already been resolved by Definition and has no
 * runtime alias or completion semantics here.
 */
export function planStaticCheckGraph(
  checks: readonly NormalizedCheck[],
  options: Readonly<{ readonly alreadySettledCheckIds?: ReadonlySet<string> }> = {}
): TaskGraph {
  const alreadySettledCheckIds = options.alreadySettledCheckIds ?? new Set<string>();
  const tasks = checks.map((check) => taskForCheck(check, alreadySettledCheckIds));
  const scopes = checks.map(scopeForCheck);
  return Object.freeze({
    tasks: Object.freeze(tasks),
    scopes: Object.freeze(scopes)
  });
}

function taskForCheck(
  check: NormalizedCheck,
  alreadySettledCheckIds: ReadonlySet<string>
): TaskNode {
  return Object.freeze({
    admissionPriority: check.admissionPriority,
    dependsOn: check.dependsOn.filter((checkId) => !alreadySettledCheckIds.has(checkId)),
    id: check.definition.checkId,
    mutex: check.mutex,
    scopeId: scopeIdFor(check)
  });
}

function scopeForCheck(check: NormalizedCheck): TaskScope {
  const taskId = check.definition.checkId;
  return Object.freeze({
    activationTaskIds: Object.freeze([taskId]),
    id: scopeIdFor(check),
    maxParallel: check.maxParallel,
    terminalTaskId: taskId
  });
}

function scopeIdFor(check: NormalizedCheck): string {
  return `check/${check.definition.checkId}`;
}
