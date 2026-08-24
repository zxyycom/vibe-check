import type { TaskGraph, TaskNode, TaskScope } from "../scheduler/graph.ts";
import type { NormalizedCheck } from "../definition/project-definition.ts";

/**
 * Pure executable-Check projection. Check ids are the only scheduler Task
 * identities: containment has already been resolved by Definition and has no
 * runtime alias or completion semantics here.
 */
export function planStaticCheckGraph(checks: readonly NormalizedCheck[]): TaskGraph {
  const tasks = checks.map(taskForCheck);
  const scopes = checks.map(scopeForCheck);
  return Object.freeze({
    tasks: Object.freeze(tasks),
    scopes: Object.freeze(scopes)
  });
}

function taskForCheck(check: NormalizedCheck): TaskNode {
  return Object.freeze({
    dependsOn: check.dependsOn,
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
