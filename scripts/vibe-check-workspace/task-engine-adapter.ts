import type { TaskGraph, TaskNode } from "../../src/product/task-scheduler/index.ts";

import type { CheckTask } from "./checks/index.ts";

export interface WorkspaceTaskGraph {
  readonly graph: TaskGraph;
  readonly checkByTaskId: ReadonlyMap<string, CheckTask>;
}

/** Projects scripts-owned command fields into the shared engine's graph-only contract. */
export function createWorkspaceTaskGraph(checks: readonly CheckTask[]): WorkspaceTaskGraph {
  const checkByTaskId = new Map<string, CheckTask>();
  const tasks: TaskNode[] = [];
  for (const check of checks) {
    if (checkByTaskId.has(check.id)) {
      throw new Error(`workspace verification check is duplicated: ${check.id}`);
    }
    checkByTaskId.set(check.id, check);
    tasks.push(Object.freeze({
      id: check.id,
      dependsOn: Object.freeze([...check.dependsOn]),
      mutex: Object.freeze([...check.mutex])
    }));
  }
  return Object.freeze({
    graph: Object.freeze({ tasks: Object.freeze(tasks) }),
    checkByTaskId
  });
}
