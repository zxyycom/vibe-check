import type { PlannedTaskGraph } from "../graph.ts";

export interface AdmissionConstraintGroups {
  readonly taskGroupSlots: readonly number[];
  /** Group-local derived order, not a second priority fact; priority remains graph metadata. */
  readonly ordinaryPreferenceRanks: readonly number[];
  readonly constrainedPreferenceRanks: readonly number[];
}

interface ConstraintGroupMembers {
  readonly taskSlots: number[];
  readonly usesConstrainedOrder: boolean;
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
  const members: ConstraintGroupMembers[] = [];
  const taskGroupSlots: number[] = [];
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
      members.push({ taskSlots: [], usesConstrainedOrder: constrainedScope !== undefined });
    }
    const groupMembers = members[groupSlot];
    if (groupMembers === undefined)
      throw new Error(`admission core constraint group is unknown: ${groupSlot}`);
    groupMembers.taskSlots.push(taskSlot);
    taskGroupSlots.push(groupSlot);
  }
  const ordinaryPreferenceRanks = graph.tasks.map(() => 0);
  const constrainedPreferenceRanks = graph.tasks.map(() => 0);
  for (const groupMembers of members) {
    for (const order of ["ordinary", "constrained"] as const) {
      const shouldUseLexicalTaskOrder =
        order === "constrained" && groupMembers.usesConstrainedOrder;
      groupMembers.taskSlots.sort((left, right) => {
        const leftTask = graph.tasks[left];
        const rightTask = graph.tasks[right];
        if (leftTask === undefined || rightTask === undefined)
          throw new Error("admission core group contains an unknown Task");
        return (
          rightTask.admissionPriority - leftTask.admissionPriority ||
          (shouldUseLexicalTaskOrder ? compareText(leftTask.id, rightTask.id) : left - right)
        );
      });
      const ranks = order === "ordinary" ? ordinaryPreferenceRanks : constrainedPreferenceRanks;
      for (const [rank, taskSlot] of groupMembers.taskSlots.entries()) ranks[taskSlot] = rank;
    }
  }
  return Object.freeze({
    taskGroupSlots: Object.freeze(taskGroupSlots),
    ordinaryPreferenceRanks: Object.freeze(ordinaryPreferenceRanks),
    constrainedPreferenceRanks: Object.freeze(constrainedPreferenceRanks)
  });
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
