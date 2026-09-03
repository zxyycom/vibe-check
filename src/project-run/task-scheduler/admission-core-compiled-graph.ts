import type { PlannedTask, PlannedTaskGraph } from "./graph.ts";

interface RelationStaticIndexes {
  readonly reverseDependencies: readonly (readonly number[])[];
  readonly reverseMutexOccurrences: readonly (readonly number[])[];
  readonly reverseObservations: readonly (readonly number[])[];
}

export interface CompiledAdmissionGraph {
  readonly graph: PlannedTaskGraph;
  readonly maxParallel: number;
  readonly mutexSlotById: ReadonlyMap<string, number>;
  readonly scopesById: ReadonlyMap<string, PlannedTaskGraph["scopes"][number]>;
  readonly scopeSlotById: ReadonlyMap<string, number>;
  readonly scopeSlotsByTerminalTaskSlot: readonly (readonly number[])[];
  readonly taskById: ReadonlyMap<string, PlannedTask>;
  readonly taskMutexSlots: readonly (readonly number[])[];
  readonly taskActivatesScope: readonly boolean[];
  readonly taskScopeSlots: readonly (number | undefined)[];
  readonly taskSlotsById: ReadonlyMap<string, number>;
  readonly taskIdsInPublicOrder: readonly string[];
  readonly taskSlotsInPublicOrder: readonly number[];
  readonly relationIndexes: RelationStaticIndexes;
}

/** Compiles a Scheduler-owned normalized graph once for an actual scheduler invocation. */
export function compilePreparedAdmissionGraph(
  graph: PlannedTaskGraph,
  maxParallel: number
): CompiledAdmissionGraph {
  if (!Number.isSafeInteger(maxParallel) || maxParallel <= 0) {
    throw new TypeError("task engine maxParallel must be a positive safe integer");
  }
  const taskSlotsById = new Map(graph.tasks.map((task, slot) => [task.id, slot] as const));
  const taskById = new Map(graph.tasks.map((task) => [task.id, task] as const));
  const scopeSlotsById = new Map(graph.scopes.map((scope, slot) => [scope.id, slot] as const));
  const scopesById = new Map(graph.scopes.map((scope) => [scope.id, scope] as const));
  const mutexSlotById = new Map<string, number>();
  const taskMutexSlots: (readonly number[])[] = [];
  for (const task of graph.tasks) {
    const slots: number[] = [];
    for (const mutexId of task.mutex) {
      let slot = mutexSlotById.get(mutexId);
      if (slot === undefined) {
        slot = mutexSlotById.size;
        mutexSlotById.set(mutexId, slot);
      }
      slots.push(slot);
    }
    taskMutexSlots.push(Object.freeze(slots));
  }
  const reverseMutexOccurrences: number[][] = Array.from({ length: mutexSlotById.size }, () => []);
  for (const [taskSlot, mutexSlots] of taskMutexSlots.entries()) {
    for (const mutexSlot of mutexSlots) reverseMutexOccurrences[mutexSlot]?.push(taskSlot);
  }
  const reverseDependencies: number[][] = graph.tasks.map(() => []);
  const reverseObservations: number[][] = graph.tasks.map(() => []);
  for (const [slot, task] of graph.tasks.entries()) {
    for (const taskId of task.dependsOn) {
      const dependencySlot = taskSlotsById.get(taskId);
      if (dependencySlot === undefined)
        throw new Error(`admission core dependency is unknown: ${taskId}`);
      reverseDependencies[dependencySlot]?.push(slot);
    }
    for (const taskId of task.observes) {
      const observationSlot = taskSlotsById.get(taskId);
      if (observationSlot === undefined)
        throw new Error(`admission core observation is unknown: ${taskId}`);
      reverseObservations[observationSlot]?.push(slot);
    }
  }
  const scopeSlotsByTerminalTaskSlot: number[][] = graph.tasks.map(() => []);
  for (const [scopeSlot, scope] of graph.scopes.entries()) {
    const terminalSlot = taskSlotsById.get(scope.terminalTaskId);
    if (terminalSlot === undefined)
      throw new Error(`admission core scope terminal is unknown: ${scope.terminalTaskId}`);
    scopeSlotsByTerminalTaskSlot[terminalSlot]?.push(scopeSlot);
  }
  return Object.freeze({
    graph,
    maxParallel,
    mutexSlotById,
    relationIndexes: Object.freeze({
      reverseDependencies: Object.freeze(reverseDependencies.map((slots) => Object.freeze(slots))),
      reverseMutexOccurrences: Object.freeze(
        reverseMutexOccurrences.map((slots) => Object.freeze(slots))
      ),
      reverseObservations: Object.freeze(reverseObservations.map((slots) => Object.freeze(slots)))
    }),
    scopesById,
    scopeSlotById: scopeSlotsById,
    scopeSlotsByTerminalTaskSlot: Object.freeze(
      scopeSlotsByTerminalTaskSlot.map((slots) => Object.freeze(slots))
    ),
    taskById,
    taskIdsInPublicOrder: Object.freeze(graph.tasks.map((task) => task.id).sort(compareText)),
    taskMutexSlots: Object.freeze(taskMutexSlots),
    taskActivatesScope: Object.freeze(
      graph.tasks.map((task) => {
        const scopeSlot = task.scopeId === undefined ? undefined : scopeSlotsById.get(task.scopeId);
        return (
          scopeSlot !== undefined &&
          graph.scopes[scopeSlot]?.activationTaskIds.includes(task.id) === true
        );
      })
    ),
    taskScopeSlots: Object.freeze(
      graph.tasks.map((task) =>
        task.scopeId === undefined ? undefined : scopeSlotsById.get(task.scopeId)
      )
    ),
    taskSlotsById,
    taskSlotsInPublicOrder: Object.freeze(
      graph.tasks
        .map((task) => taskSlotsById.get(task.id)!)
        .sort((left, right) => compareText(graph.tasks[left].id, graph.tasks[right].id))
    )
  });
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
