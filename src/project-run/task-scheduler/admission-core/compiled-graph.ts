import type { PlannedTask, PlannedTaskGraph } from "../graph.ts";

interface RelationStaticIndexes {
  readonly reverseDependencies: readonly (readonly number[])[];
  readonly reverseMutexOccurrences: readonly (readonly number[])[];
  readonly reverseObservations: readonly (readonly number[])[];
}

interface ReverseRelationIndexes {
  readonly reverseDependencies: readonly (readonly number[])[];
  readonly reverseObservations: readonly (readonly number[])[];
}

export interface CompiledAdmissionGraph {
  readonly graph: PlannedTaskGraph;
  readonly maxParallel: number;
  readonly mutexSlotById: ReadonlyMap<string, number>;
  readonly resourceCapacityBySlot: readonly number[];
  readonly resourceSlotById: ReadonlyMap<string, number>;
  readonly scopesById: ReadonlyMap<string, PlannedTaskGraph["scopes"][number]>;
  readonly scopeSlotById: ReadonlyMap<string, number>;
  readonly scopeSlotsByTerminalTaskSlot: readonly (readonly number[])[];
  readonly taskById: ReadonlyMap<string, PlannedTask>;
  readonly taskMutexSlots: readonly (readonly number[])[];
  readonly taskResourceClaims: readonly (readonly Readonly<{
    readonly resourceSlot: number;
    readonly units: number;
  }>[])[];
  readonly taskActivatesScope: readonly boolean[];
  readonly taskScopeSlots: readonly (number | undefined)[];
  readonly taskSlotsById: ReadonlyMap<string, number>;
  readonly taskIdsInPublicOrder: readonly string[];
  readonly taskSlotsInPublicOrder: readonly number[];
  readonly relationIndexes: RelationStaticIndexes;
}

interface GraphSlotCatalog {
  readonly scopesById: ReadonlyMap<string, PlannedTaskGraph["scopes"][number]>;
  readonly scopeSlotById: ReadonlyMap<string, number>;
  readonly taskById: ReadonlyMap<string, PlannedTask>;
  readonly taskSlotsById: ReadonlyMap<string, number>;
}

interface MutexStaticIndexes {
  readonly mutexSlotById: ReadonlyMap<string, number>;
  readonly reverseMutexOccurrences: readonly (readonly number[])[];
  readonly taskMutexSlots: readonly (readonly number[])[];
}

interface ResourceStaticIndexes {
  readonly resourceCapacityBySlot: readonly number[];
  readonly resourceSlotById: ReadonlyMap<string, number>;
  readonly taskResourceClaims: CompiledAdmissionGraph["taskResourceClaims"];
}

interface ScopeStaticIndexes {
  readonly scopeSlotsByTerminalTaskSlot: readonly (readonly number[])[];
  readonly taskActivatesScope: readonly boolean[];
  readonly taskScopeSlots: readonly (number | undefined)[];
}

interface PublicTaskOrder {
  readonly taskIdsInPublicOrder: readonly string[];
  readonly taskSlotsInPublicOrder: readonly number[];
}

interface CompiledAdmissionGraphParts {
  readonly catalog: GraphSlotCatalog;
  readonly graph: PlannedTaskGraph;
  readonly maxParallel: number;
  readonly mutexIndexes: MutexStaticIndexes;
  readonly publicTaskOrder: PublicTaskOrder;
  readonly relationIndexes: ReverseRelationIndexes;
  readonly resourceIndexes: ResourceStaticIndexes;
  readonly scopeIndexes: ScopeStaticIndexes;
}

/** Compiles a Scheduler-owned normalized graph once for an actual scheduler invocation. */
export function compilePreparedAdmissionGraph(
  graph: PlannedTaskGraph,
  maxParallel: number
): CompiledAdmissionGraph {
  assertMaxParallel(maxParallel);
  const catalog = compileGraphSlotCatalog(graph);
  const mutexIndexes = compileMutexStaticIndexes(graph);
  const relationIndexes = compileRelationStaticIndexes(graph, catalog.taskSlotsById);
  const resourceIndexes = compileResourceStaticIndexes(graph);
  const scopeIndexes = compileScopeStaticIndexes(graph, catalog);
  const publicTaskOrder = compilePublicTaskOrder(graph, catalog.taskSlotsById);

  return assembleCompiledAdmissionGraph({
    catalog,
    graph,
    maxParallel,
    mutexIndexes,
    publicTaskOrder,
    relationIndexes,
    resourceIndexes,
    scopeIndexes
  });
}

function compileResourceStaticIndexes(graph: PlannedTaskGraph): ResourceStaticIndexes {
  const resourceSlotById = new Map(
    graph.resourceCapacities.map(({ resourceId }, slot) => [resourceId, slot] as const)
  );
  const resourceCapacityBySlot = Object.freeze(graph.resourceCapacities.map(({ units }) => units));
  const taskResourceClaims = Object.freeze(
    graph.tasks.map((task) =>
      Object.freeze(
        task.resourceClaims.map(({ resourceId, units }) => {
          const resourceSlot = resourceSlotById.get(resourceId);
          if (resourceSlot === undefined) {
            throw new Error(`admission core resource is unknown: ${resourceId}`);
          }
          return Object.freeze({ resourceSlot, units });
        })
      )
    )
  );
  return { resourceCapacityBySlot, resourceSlotById, taskResourceClaims };
}

function assertMaxParallel(maxParallel: number): void {
  if (!Number.isSafeInteger(maxParallel) || maxParallel <= 0) {
    throw new TypeError("task engine maxParallel must be a positive safe integer");
  }
}

/** Creates declaration-slot catalogs without materializing another prepared graph. */
function compileGraphSlotCatalog(graph: PlannedTaskGraph): GraphSlotCatalog {
  return {
    taskSlotsById: new Map(graph.tasks.map((task, slot) => [task.id, slot] as const)),
    taskById: new Map(graph.tasks.map((task) => [task.id, task] as const)),
    scopeSlotById: new Map(graph.scopes.map((scope, slot) => [scope.id, slot] as const)),
    scopesById: new Map(graph.scopes.map((scope) => [scope.id, scope] as const))
  };
}

/** Allocates mutex slots by first declaration occurrence, then records every task occurrence. */
function compileMutexStaticIndexes(graph: PlannedTaskGraph): MutexStaticIndexes {
  const mutexSlotById = new Map<string, number>();
  const taskMutexSlots = graph.tasks.map((task) => mutexSlotsForTask(task, mutexSlotById));
  const reverseMutexOccurrences = Array.from({ length: mutexSlotById.size }, () => [] as number[]);

  for (const [taskSlot, mutexSlots] of taskMutexSlots.entries()) {
    for (const mutexSlot of mutexSlots) reverseMutexOccurrences[mutexSlot]?.push(taskSlot);
  }

  return {
    mutexSlotById,
    reverseMutexOccurrences: freezeSlotLists(reverseMutexOccurrences),
    taskMutexSlots: freezeSlotLists(taskMutexSlots)
  };
}

function mutexSlotsForTask(task: PlannedTask, mutexSlotById: Map<string, number>): number[] {
  return task.mutex.map((mutexId) => mutexSlotFor(mutexSlotById, mutexId));
}

function mutexSlotFor(mutexSlotById: Map<string, number>, mutexId: string): number {
  const existingSlot = mutexSlotById.get(mutexId);
  if (existingSlot !== undefined) return existingSlot;

  const nextSlot = mutexSlotById.size;
  mutexSlotById.set(mutexId, nextSlot);
  return nextSlot;
}

/** Reverses relation occurrences while retaining the declared occurrence order for core transitions. */
function compileRelationStaticIndexes(
  graph: PlannedTaskGraph,
  taskSlotsById: ReadonlyMap<string, number>
): ReverseRelationIndexes {
  const reverseDependencies = emptyTaskSlotLists(graph);
  const reverseObservations = emptyTaskSlotLists(graph);

  for (const [taskSlot, task] of graph.tasks.entries()) {
    appendReverseRelationOccurrences(
      task.dependsOn,
      taskSlot,
      taskSlotsById,
      reverseDependencies,
      "dependency"
    );
    appendReverseRelationOccurrences(
      task.observes,
      taskSlot,
      taskSlotsById,
      reverseObservations,
      "observation"
    );
  }

  return {
    reverseDependencies: freezeSlotLists(reverseDependencies),
    reverseObservations: freezeSlotLists(reverseObservations)
  };
}

function appendReverseRelationOccurrences(
  sourceTaskIds: readonly string[],
  targetTaskSlot: number,
  taskSlotsById: ReadonlyMap<string, number>,
  reverseSlotsBySourceTask: number[][],
  relationName: "dependency" | "observation"
): void {
  for (const sourceTaskId of sourceTaskIds) {
    const sourceTaskSlot = taskSlotsById.get(sourceTaskId);
    if (sourceTaskSlot === undefined) {
      throw new Error(`admission core ${relationName} is unknown: ${sourceTaskId}`);
    }
    reverseSlotsBySourceTask[sourceTaskSlot]?.push(targetTaskSlot);
  }
}

/** Associates scope terminals and activation candidates with the existing task slots. */
function compileScopeStaticIndexes(
  graph: PlannedTaskGraph,
  catalog: GraphSlotCatalog
): ScopeStaticIndexes {
  const scopeSlotsByTerminalTaskSlot = emptyTaskSlotLists(graph);

  for (const [scopeSlot, scope] of graph.scopes.entries()) {
    const terminalTaskSlot = catalog.taskSlotsById.get(scope.terminalTaskId);
    if (terminalTaskSlot === undefined) {
      throw new Error(`admission core scope terminal is unknown: ${scope.terminalTaskId}`);
    }
    scopeSlotsByTerminalTaskSlot[terminalTaskSlot]?.push(scopeSlot);
  }
  const taskActivatesScope = graph.tasks.map((task) => {
    const scopeSlot =
      task.scopeId === undefined ? undefined : catalog.scopeSlotById.get(task.scopeId);
    return (
      scopeSlot !== undefined &&
      graph.scopes[scopeSlot]?.activationTaskIds.includes(task.id) === true
    );
  });
  const taskScopeSlots = graph.tasks.map((task) =>
    task.scopeId === undefined ? undefined : catalog.scopeSlotById.get(task.scopeId)
  );

  return {
    scopeSlotsByTerminalTaskSlot: freezeSlotLists(scopeSlotsByTerminalTaskSlot),
    taskActivatesScope: Object.freeze(taskActivatesScope),
    taskScopeSlots: Object.freeze(taskScopeSlots)
  };
}

/** Materializes only the lexical catalog projection; declaration slots remain unchanged. */
function compilePublicTaskOrder(
  graph: PlannedTaskGraph,
  taskSlotsById: ReadonlyMap<string, number>
): PublicTaskOrder {
  const taskIdsInPublicOrder = Object.freeze(graph.tasks.map((task) => task.id).sort(compareText));
  return {
    taskIdsInPublicOrder,
    taskSlotsInPublicOrder: Object.freeze(
      taskIdsInPublicOrder.map((taskId) => {
        const taskSlot = taskSlotsById.get(taskId);
        if (taskSlot === undefined) {
          throw new Error(`admission core task is missing from public order: ${taskId}`);
        }
        return taskSlot;
      })
    )
  };
}

/** Freezes the one compiled graph object after every static compiler stage has completed. */
function assembleCompiledAdmissionGraph(
  parts: CompiledAdmissionGraphParts
): CompiledAdmissionGraph {
  const {
    catalog,
    graph,
    maxParallel,
    mutexIndexes,
    publicTaskOrder,
    relationIndexes,
    resourceIndexes,
    scopeIndexes
  } = parts;
  return Object.freeze({
    graph,
    maxParallel,
    mutexSlotById: mutexIndexes.mutexSlotById,
    resourceCapacityBySlot: resourceIndexes.resourceCapacityBySlot,
    resourceSlotById: resourceIndexes.resourceSlotById,
    relationIndexes: Object.freeze({
      reverseDependencies: relationIndexes.reverseDependencies,
      reverseMutexOccurrences: mutexIndexes.reverseMutexOccurrences,
      reverseObservations: relationIndexes.reverseObservations
    }),
    scopesById: catalog.scopesById,
    scopeSlotById: catalog.scopeSlotById,
    scopeSlotsByTerminalTaskSlot: scopeIndexes.scopeSlotsByTerminalTaskSlot,
    taskById: catalog.taskById,
    taskIdsInPublicOrder: publicTaskOrder.taskIdsInPublicOrder,
    taskMutexSlots: mutexIndexes.taskMutexSlots,
    taskResourceClaims: resourceIndexes.taskResourceClaims,
    taskActivatesScope: scopeIndexes.taskActivatesScope,
    taskScopeSlots: scopeIndexes.taskScopeSlots,
    taskSlotsById: catalog.taskSlotsById,
    taskSlotsInPublicOrder: publicTaskOrder.taskSlotsInPublicOrder
  });
}

function emptyTaskSlotLists(graph: PlannedTaskGraph): number[][] {
  return graph.tasks.map(() => []);
}

function freezeSlotLists(slotLists: number[][]): readonly (readonly number[])[] {
  return Object.freeze(slotLists.map((slots) => Object.freeze(slots)));
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
