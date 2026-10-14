import type { PlannedTaskGraph } from "../graph.ts";

export interface AdmissionConstraintGroups {
  readonly taskGroupSlots: readonly number[];
  /** Static derived orders, not priority facts; priority remains graph metadata. */
  readonly ordinaryPreferenceRanks: readonly number[];
  readonly constrainedPreferenceRanks: readonly number[];
  readonly groupScopeSlots: readonly (number | undefined)[];
  readonly groupActivatesScope: readonly boolean[];
  readonly scopeGroupSlots: readonly (readonly number[])[];
}

/** Members have identical dynamic mutex/resource fit and static scope-selection layer. */
export function compileAdmissionConstraintGroups(
  input: Readonly<{
    graph: PlannedTaskGraph;
    maxParallel: number;
    taskScopeSlots: readonly (number | undefined)[];
    taskActivatesScope: readonly boolean[];
  }>
): AdmissionConstraintGroups {
  const { graph, maxParallel, taskScopeSlots, taskActivatesScope } = input;
  const groupSlotsByKey = new Map<string, number>();
  const taskGroupSlots: number[] = [];
  const groupScopeSlots: (number | undefined)[] = [];
  const groupActivatesScope: boolean[] = [];
  const scopeGroupSlots = graph.scopes.map(() => [] as number[]);
  for (const [taskSlot, task] of graph.tasks.entries()) {
    const scopeSlot = taskScopeSlots[taskSlot];
    const scope = scopeSlot === undefined ? undefined : graph.scopes[scopeSlot];
    const constrainedScope =
      scope !== undefined && scope.maxParallel < maxParallel ? scope : undefined;
    const key = JSON.stringify([
      constrainedScope?.id ?? null,
      constrainedScope === undefined ? false : taskActivatesScope[taskSlot] === true,
      [...new Set(task.mutex)].sort(),
      task.resourceClaims
    ]);
    let groupSlot = groupSlotsByKey.get(key);
    if (groupSlot === undefined) {
      groupSlot = groupSlotsByKey.size;
      groupSlotsByKey.set(key, groupSlot);
      const constrainedScopeSlot = constrainedScope === undefined ? undefined : scopeSlot;
      groupScopeSlots.push(constrainedScopeSlot);
      groupActivatesScope.push(taskActivatesScope[taskSlot] === true);
      if (constrainedScopeSlot !== undefined)
        scopeGroupSlots[constrainedScopeSlot]?.push(groupSlot);
    }
    taskGroupSlots.push(groupSlot);
  }
  return Object.freeze({
    taskGroupSlots: Object.freeze(taskGroupSlots),
    ...compileGlobalPreferenceRanks(graph, maxParallel, taskScopeSlots),
    groupScopeSlots: Object.freeze(groupScopeSlots),
    groupActivatesScope: Object.freeze(groupActivatesScope),
    scopeGroupSlots: Object.freeze(scopeGroupSlots.map((slots) => Object.freeze(slots)))
  });
}

/** Global head ranks preserve ordinary declaration ties and constrained scope/task ties. */
function compileGlobalPreferenceRanks(
  graph: PlannedTaskGraph,
  maxParallel: number,
  taskScopeSlots: readonly (number | undefined)[]
): Pick<AdmissionConstraintGroups, "ordinaryPreferenceRanks" | "constrainedPreferenceRanks"> {
  const ordinarySlots = graph.tasks.map((_, slot) => slot);
  ordinarySlots.sort((left, right) => {
    const leftTask = graph.tasks[left];
    const rightTask = graph.tasks[right];
    if (leftTask === undefined || rightTask === undefined) throw new Error("unknown ranked Task");
    return rightTask.admissionPriority - leftTask.admissionPriority || left - right;
  });
  const ordinaryPreferenceRanks = graph.tasks.map(() => 0);
  for (const [rank, slot] of ordinarySlots.entries()) ordinaryPreferenceRanks[slot] = rank;
  const constrainedSlots = ordinarySlots.filter((slot) => {
    const scopeSlot = taskScopeSlots[slot];
    return (
      scopeSlot !== undefined && (graph.scopes[scopeSlot]?.maxParallel ?? maxParallel) < maxParallel
    );
  });
  constrainedSlots.sort((left, right) => {
    const leftTask = graph.tasks[left];
    const rightTask = graph.tasks[right];
    const leftScopeSlot = taskScopeSlots[left];
    const rightScopeSlot = taskScopeSlots[right];
    const leftScope = leftScopeSlot === undefined ? undefined : graph.scopes[leftScopeSlot];
    const rightScope = rightScopeSlot === undefined ? undefined : graph.scopes[rightScopeSlot];
    if (
      leftTask === undefined ||
      rightTask === undefined ||
      leftScope === undefined ||
      rightScope === undefined
    )
      throw new Error("constrained rank is missing its Task or scope");
    return (
      leftScope.maxParallel - rightScope.maxParallel ||
      rightTask.admissionPriority - leftTask.admissionPriority ||
      compareText(leftScope.id, rightScope.id) ||
      compareText(leftTask.id, rightTask.id)
    );
  });
  const constrainedPreferenceRanks = [...ordinaryPreferenceRanks];
  for (const [rank, slot] of constrainedSlots.entries()) constrainedPreferenceRanks[slot] = rank;
  return {
    ordinaryPreferenceRanks: Object.freeze(ordinaryPreferenceRanks),
    constrainedPreferenceRanks: Object.freeze(constrainedPreferenceRanks)
  };
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
