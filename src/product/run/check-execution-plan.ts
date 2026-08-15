import type {
  TaskGraph,
  TaskNode,
  TaskScope
} from "../task-scheduler/index.ts";
import {
  ResolvedCheckPlanningError,
  type ApplicableResolvedCheck,
  type ResolvedCheck
} from "./resolved-check.ts";
import type { ResolvedTaskPlan, ResolvedTaskPlanTask } from "./task-plan.ts";

/**
 * Package Run's pure translation from applicable Checks to scheduler-owned
 * Tasks and scopes. It deliberately opens no Core capabilities or user work.
 */
export interface DirectCheckLayout extends ApplicableCheckLayoutBase {
  readonly kind: "direct";
}

export interface TaskPlanCheckLayout extends ApplicableCheckLayoutBase {
  readonly kind: "task-plan";
  readonly leaves: readonly TaskPlanLeafLayout[];
  readonly plan: ResolvedTaskPlan;
}

export interface ApplicableCheckLayoutBase {
  readonly check: ApplicableResolvedCheck;
  readonly scopeId: string;
  readonly terminalTaskId: string;
}

export type ApplicableCheckLayout = DirectCheckLayout | TaskPlanCheckLayout;

export interface TaskPlanLeafLayout {
  readonly task: ResolvedTaskPlanTask;
  readonly taskId: string;
}

export interface StaticCheckExecutionPlan {
  readonly graph: TaskGraph;
  readonly layouts: readonly ApplicableCheckLayout[];
}

export function planStaticCheckGraph(checks: readonly ResolvedCheck[]): StaticCheckExecutionPlan {
  const layouts: ApplicableCheckLayout[] = [];
  for (const check of checks) {
    if (check.applicability === "applicable") {
      layouts.push(createCheckLayout(check));
    }
  }
  const tasks = layouts.flatMap((layout) => taskNodesFor(layout, layouts, checks));
  const scopes = layouts.map(scopeForLayout);
  return Object.freeze({
    graph: Object.freeze({ tasks: Object.freeze(tasks), scopes: Object.freeze(scopes) }),
    layouts: Object.freeze(layouts)
  });
}

function createCheckLayout(check: ApplicableResolvedCheck): ApplicableCheckLayout {
  const checkId = check.definition.checkId;
  const scopeId = `check/${checkId}`;
  if (check.binding.kind === "direct") {
    const terminalTaskId = `${scopeId}/direct`;
    return Object.freeze({ kind: "direct", check, scopeId, terminalTaskId });
  }
  const leaves = check.binding.plan.tasks.map((task) => Object.freeze({
    task,
    taskId: `${scopeId}/task/${task.id}`
  }));
  return Object.freeze({
    kind: "task-plan",
    check,
    leaves: Object.freeze(leaves),
    plan: check.binding.plan,
    scopeId,
    terminalTaskId: `${scopeId}/complete`
  });
}

function taskNodesFor(
  layout: ApplicableCheckLayout,
  layouts: readonly ApplicableCheckLayout[],
  checks: readonly ResolvedCheck[]
): readonly TaskNode[] {
  const prerequisiteTaskIds = prerequisiteTerminalTaskIds(layout.check, layouts, checks);
  if (layout.kind === "direct") {
    return [Object.freeze({
      dependsOn: prerequisiteTaskIds,
      id: layout.terminalTaskId,
      mutex: layout.check.mutex,
      scopeId: layout.scopeId
    })];
  }
  const leaves = layout.leaves.map((leaf) => Object.freeze({
    dependsOn: unique([
      ...prerequisiteTaskIds,
      ...leaf.task.dependsOn.map((dependency) => taskIdForLocalDependency(layout, dependency))
    ]),
    id: leaf.taskId,
    mutex: unique([...layout.check.mutex, ...leaf.task.mutex]),
    scopeId: layout.scopeId
  }));
  return Object.freeze([
    ...leaves,
    Object.freeze({
      dependsOn: unique([...prerequisiteTaskIds, ...layout.leaves.map((leaf) => leaf.taskId)]),
      id: layout.terminalTaskId,
      mutex: layout.check.mutex,
      scopeId: layout.scopeId
    })
  ]);
}

function prerequisiteTerminalTaskIds(
  check: ResolvedCheck,
  layouts: readonly ApplicableCheckLayout[],
  checks: readonly ResolvedCheck[]
): readonly string[] {
  const terminalTaskIds: string[] = [];
  for (const dependencyId of check.dependsOn) {
    const dependency = checks.find((candidate) => candidate.definition.checkId === dependencyId);
    if (dependency === undefined) {
      throw new ResolvedCheckPlanningError("Resolved Check dependency is not canonical");
    }
    if (dependency.applicability === "not-applicable") continue;
    const layout = layouts.find((candidate) => candidate.check.definition.checkId === dependencyId);
    if (layout === undefined) {
      throw new ResolvedCheckPlanningError("Applicable Check has no task graph scope");
    }
    terminalTaskIds.push(layout.terminalTaskId);
  }
  return Object.freeze(unique(terminalTaskIds));
}

function taskIdForLocalDependency(layout: TaskPlanCheckLayout, dependencyId: string): string {
  const leaf = layout.leaves.find((candidate) => candidate.task.id === dependencyId);
  if (leaf === undefined) {
    throw new ResolvedCheckPlanningError("Prepared TaskPlan has an unknown local dependency");
  }
  return leaf.taskId;
}

function scopeForLayout(layout: ApplicableCheckLayout): TaskScope {
  return Object.freeze({
    activationTaskIds: layout.kind === "direct"
      ? Object.freeze([layout.terminalTaskId])
      : Object.freeze(layout.leaves.map((leaf) => leaf.taskId)),
    id: layout.scopeId,
    maxParallel: layout.check.maxParallel,
    terminalTaskId: layout.terminalTaskId
  });
}

function unique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)]);
}
