import type { AdmissionSelectionRejectionReason } from "../../../project-definition/scheduler-policy.ts";
import type { SchedulerSettlementKind } from "../scheduler-decision-model.ts";
import type { PlannedTask, PlannedTaskGraph } from "../graph.ts";

/** Independent full-scan policy ordering; no Product frontier/rank/index implementation is reused. */
export function referenceStaticCandidate(
  input: Readonly<{
    graph: PlannedTaskGraph;
    maxParallel: number;
    candidates: readonly PlannedTask[];
    isActiveScope(scope: PlannedTaskGraph["scopes"][number]): boolean;
    canAdmit(task: PlannedTask): boolean;
  }>
): Readonly<{ taskId: string; canAdmit: boolean }> | undefined {
  const { graph, maxParallel, candidates, isActiveScope, canAdmit } = input;
  const layer = (task: PlannedTask) => {
    const scope = graph.scopes.find((candidate) => candidate.id === task.scopeId);
    if (scope === undefined || scope.maxParallel >= maxParallel) return "ordinary";
    if (isActiveScope(scope)) return "continuation";
    return scope.activationTaskIds.includes(task.id) ? "tightening" : "ordinary";
  };
  for (const kind of ["tightening", "continuation", "ordinary"]) {
    const choices = candidates.filter((task) => layer(task) === kind);
    choices.sort((left, right) => {
      if (kind === "ordinary") {
        const availableOrder = Number(!canAdmit(left)) - Number(!canAdmit(right));
        return (
          availableOrder ||
          right.admissionPriority - left.admissionPriority ||
          graph.tasks.indexOf(left) - graph.tasks.indexOf(right)
        );
      }
      const leftScope = graph.scopes.find((scope) => scope.id === left.scopeId)!;
      const rightScope = graph.scopes.find((scope) => scope.id === right.scopeId)!;
      return (
        leftScope.maxParallel - rightScope.maxParallel ||
        right.admissionPriority - left.admissionPriority ||
        referenceLexicalOrder(leftScope.id, rightScope.id) ||
        referenceLexicalOrder(left.id, right.id)
      );
    });
    const task = choices[0];
    if (task !== undefined) return { taskId: task.id, canAdmit: canAdmit(task) };
  }
  return undefined;
}

export function referenceLexicalOrder(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/** Raw-graph validation is independent of Product status/membership indexes and rejection helpers. */
export function referenceValidation(
  input: Readonly<{
    graph: PlannedTaskGraph;
    statuses: ReadonlyMap<string, "pending" | "running" | SchedulerSettlementKind>;
    isComplete: boolean;
    taskId: string;
    pendingRejection(task: PlannedTask): AdmissionSelectionRejectionReason | undefined;
  }>
) {
  const { graph, statuses, isComplete, taskId, pendingRejection } = input;
  if (isComplete) return { accepted: false as const, reason: { kind: "state-complete" as const } };
  const task = graph.tasks.find((candidate) => candidate.id === taskId);
  if (task === undefined)
    return { accepted: false as const, reason: { kind: "unknown-task" as const } };
  const status = statuses.get(taskId);
  if (status !== "pending")
    return {
      accepted: false as const,
      reason: {
        kind: "not-pending" as const,
        status: status === "running" ? ("running" as const) : ("settled" as const)
      }
    };
  const reason = pendingRejection(task);
  return reason !== undefined ? { accepted: false as const, reason } : { accepted: true as const };
}
