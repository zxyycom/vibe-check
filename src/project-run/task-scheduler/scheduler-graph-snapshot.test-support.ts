import type { SchedulerGraphSnapshot } from "../../project-definition/project-definition.ts";

type SchedulerGraphScope = SchedulerGraphSnapshot["scopes"][number];
type SchedulerGraphTask = SchedulerGraphSnapshot["tasks"][number];

/** Creates a fresh deep-frozen public graph DTO without invoking private graph preparation. */
export function schedulerGraphSnapshot(
  tasks: readonly SchedulerGraphTask[],
  scopes: readonly SchedulerGraphScope[] = []
): SchedulerGraphSnapshot {
  return Object.freeze({
    scopes: Object.freeze(scopes.map(frozenScope)),
    tasks: Object.freeze(tasks.map(frozenTask))
  });
}

/** Supplies one explicit public task DTO with stable defaults for focused scheduler tests. */
export function schedulerGraphTask(
  taskId: string,
  overrides: Readonly<Partial<Omit<SchedulerGraphTask, "taskId">>> = {}
): SchedulerGraphTask {
  return frozenTask({
    admissionPriority: 0,
    dependsOn: [],
    mutex: [],
    observes: [],
    scopeId: null,
    taskId,
    ...overrides
  });
}

function frozenScope(scope: SchedulerGraphScope): SchedulerGraphScope {
  return Object.freeze({
    activationTaskIds: Object.freeze([...scope.activationTaskIds]),
    id: scope.id,
    maxParallel: scope.maxParallel,
    terminalTaskId: scope.terminalTaskId
  });
}

function frozenTask(task: SchedulerGraphTask): SchedulerGraphTask {
  return Object.freeze({
    admissionPriority: task.admissionPriority,
    dependsOn: Object.freeze([...task.dependsOn]),
    mutex: Object.freeze([...task.mutex]),
    observes: Object.freeze([...task.observes]),
    scopeId: task.scopeId,
    taskId: task.taskId
  });
}
