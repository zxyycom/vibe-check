import type { PlannedTask, PlannedTaskGraph } from "./graph.ts";

export type SchedulerSettlementKind = "completed" | "failed" | "blocked" | "cancelled-before-start";

export type SchedulerTrigger =
  | Readonly<{ readonly kind: "execution-started" }>
  | Readonly<{ readonly kind: "admission-continued" }>
  | Readonly<{ readonly kind: "blocked-settled"; readonly taskId: string }>
  | Readonly<{
      readonly kind: "task-settled";
      readonly settlementKind: SchedulerSettlementKind;
      readonly taskId: string;
    }>
  | Readonly<{ readonly kind: "cancellation-observed" }>
  | Readonly<{ readonly kind: "cancellation-applied" }>;

export interface SchedulerSnapshot {
  readonly graph: PlannedTaskGraph;
  readonly isAbortRequested: boolean;
  readonly isCancelled: boolean;
  readonly pendingTaskIds: readonly string[];
  readonly reservationTaskId: string | undefined;
  readonly runningMutexes: readonly string[];
  readonly runningTaskIds: readonly string[];
  readonly settledTasks: readonly Readonly<{
    readonly kind: SchedulerSettlementKind;
    readonly taskId: string;
  }>[];
  readonly activeScopeIds: readonly string[];
  readonly maxParallel: number;
}

interface SchedulerCapacity {
  readonly effectiveMaxParallel: number;
  readonly maxParallel: number;
  readonly running: number;
}

interface SchedulerBlockerSummary {
  readonly dependency: number;
  readonly mutex: number;
  readonly rootCapacity: boolean;
  readonly scopeCapacity: boolean;
}

interface SchedulerReservationContext {
  readonly taskId: string | null;
}

interface SchedulerDecisionContext {
  readonly blockers: SchedulerBlockerSummary;
  readonly capacity: SchedulerCapacity;
  readonly reservation: SchedulerReservationContext;
}

type ReservationUpdate =
  | Readonly<{ readonly kind: "unchanged" }>
  | Readonly<{ readonly kind: "set"; readonly taskId: string }>
  | Readonly<{ readonly kind: "clear" }>;

export type SchedulerDecision = SchedulerDecisionContext &
  (
    | Readonly<{
        readonly eligibleCount: number;
        readonly kind: "admit";
        readonly reason:
          | "reservation"
          | "tightening-scope"
          | "constrained-continuation"
          | "canonical-order";
        readonly reservationUpdate: ReservationUpdate;
        readonly scopeToActivate: string | null;
        readonly taskId: string;
        readonly trigger: SchedulerTrigger;
      }>
    | Readonly<{
        readonly dependencyIds: readonly string[];
        readonly kind: "settle-blocked";
        readonly taskId: string;
        readonly trigger: SchedulerTrigger;
      }>
    | Readonly<{
        readonly eligibleCount: number;
        readonly kind: "await-running";
        readonly reason:
          | "cancellation-drain"
          | "dependency-or-mutex"
          | "running-drain"
          | "root-capacity"
          | "active-scope-capacity"
          | "reserved-tightening-scope";
        readonly reservationUpdate: ReservationUpdate;
        readonly trigger: SchedulerTrigger;
      }>
    | Readonly<{
        readonly kind: "cancel-pending";
        readonly taskIds: readonly string[];
        readonly trigger: SchedulerTrigger;
      }>
    | Readonly<{
        readonly cancelled: boolean;
        readonly kind: "complete";
        readonly trigger: SchedulerTrigger;
      }>
  );

/**
 * Computes the next generic task-engine action from an immutable state projection.
 * Starting work, awaiting promises, cancellation, and diagnostic output remain in
 * the imperative scheduler shell.
 */
export function decideScheduler(
  snapshot: SchedulerSnapshot,
  trigger: SchedulerTrigger
): SchedulerDecision {
  const state = inspectSnapshot(snapshot);
  const context = decisionContext(state);
  if (state.pendingTasks.length === 0 && state.runningTaskIds.size === 0) {
    return freezeDecision({
      ...context,
      cancelled: snapshot.isCancelled,
      kind: "complete",
      trigger
    });
  }
  if (snapshot.isAbortRequested && !snapshot.isCancelled) {
    return freezeDecision({
      ...context,
      kind: "cancel-pending",
      taskIds: snapshot.pendingTaskIds,
      trigger: Object.freeze({ kind: "cancellation-observed" })
    });
  }
  if (snapshot.isCancelled) {
    if (state.pendingTasks.length > 0) {
      throw new Error("cancelled scheduler state retains pending tasks");
    }
    return awaitDecision(state, context, trigger, [], "cancellation-drain", reservationUnchanged());
  }
  if (state.pendingTasks.length === 0) {
    return awaitDecision(state, context, trigger, [], "running-drain", reservationUnchanged());
  }

  const blocked = selectBlockedTask(state);
  if (blocked !== undefined) {
    return freezeDecision({
      ...context,
      dependencyIds: blocked.dependencyIds,
      kind: "settle-blocked",
      taskId: blocked.task.id,
      trigger
    });
  }

  return decideAdmission(state, context, trigger);
}

interface SchedulerInspection {
  readonly activeScopeIds: ReadonlySet<string>;
  readonly graph: PlannedTaskGraph;
  readonly maxParallel: number;
  readonly pendingTasks: readonly PlannedTask[];
  readonly reservationTaskId: string | undefined;
  readonly runningMutexes: ReadonlySet<string>;
  readonly runningTaskIds: ReadonlySet<string>;
  readonly settlementKindByTaskId: ReadonlyMap<string, SchedulerSettlementKind>;
}

function inspectSnapshot(snapshot: SchedulerSnapshot): SchedulerInspection {
  const tasksById = new Map(snapshot.graph.tasks.map((task) => [task.id, task] as const));
  const pendingTasks = snapshot.pendingTaskIds.map((taskId) => {
    const task = tasksById.get(taskId);
    if (task === undefined)
      throw new Error(`scheduler snapshot has unknown pending task ${taskId}`);
    return task;
  });
  return Object.freeze({
    activeScopeIds: new Set(snapshot.activeScopeIds),
    graph: snapshot.graph,
    maxParallel: snapshot.maxParallel,
    pendingTasks: Object.freeze(pendingTasks),
    reservationTaskId: snapshot.reservationTaskId,
    runningMutexes: new Set(snapshot.runningMutexes),
    runningTaskIds: new Set(snapshot.runningTaskIds),
    settlementKindByTaskId: new Map(
      snapshot.settledTasks.map(({ taskId, kind }) => [taskId, kind] as const)
    )
  });
}

function decisionContext(state: SchedulerInspection): SchedulerDecisionContext {
  const capacity = capacityFor(state);
  return Object.freeze({
    blockers: blockerSummary(state, capacity),
    capacity,
    reservation: Object.freeze({ taskId: state.reservationTaskId ?? null })
  });
}

function selectBlockedTask(
  state: SchedulerInspection
): Readonly<{ readonly dependencyIds: readonly string[]; readonly task: PlannedTask }> | undefined {
  for (let index = state.pendingTasks.length - 1; index >= 0; index -= 1) {
    const task = state.pendingTasks[index];
    const dependencyIds = blockingDependencyIds(task, state.settlementKindByTaskId);
    if (dependencyIds === undefined) continue;
    return Object.freeze({ dependencyIds: Object.freeze(dependencyIds), task });
  }
  return undefined;
}

function blockingDependencyIds(
  task: PlannedTask,
  settlementKindByTaskId: ReadonlyMap<string, SchedulerSettlementKind>
): string[] | undefined {
  const settlementKinds = task.dependsOn.map(
    (dependencyId) => [dependencyId, settlementKindByTaskId.get(dependencyId)] as const
  );
  if (settlementKinds.some(([, kind]) => kind === undefined)) return undefined;
  const dependencyIds = settlementKinds.flatMap(([dependencyId, kind]) =>
    kind === "completed" ? [] : [dependencyId]
  );
  return dependencyIds.length === 0 ? undefined : dependencyIds;
}

function decideAdmission(
  state: SchedulerInspection,
  context: SchedulerDecisionContext,
  trigger: SchedulerTrigger
): SchedulerDecision {
  const eligibleTasks = state.pendingTasks.filter((task) => isDependencyMutexEligible(task, state));
  if (eligibleTasks.length === 0) {
    return freezeDecision({
      ...context,
      eligibleCount: 0,
      kind: "await-running",
      reason: "dependency-or-mutex",
      reservationUpdate: reservationUnchanged(),
      trigger
    });
  }

  const reservedTask = taskById(state.reservationTaskId, eligibleTasks);
  if (reservedTask !== undefined) {
    return canAdmit(state, reservedTask)
      ? admitDecision(state, context, trigger, reservedTask, "reservation", reservationClear())
      : awaitDecision(
          state,
          context,
          trigger,
          eligibleTasks,
          "reserved-tightening-scope",
          reservationUnchanged()
        );
  }

  const reservationUpdate =
    state.reservationTaskId === undefined ? reservationUnchanged() : reservationClear();
  const tighteningTask = selectTighteningTask(
    state,
    eligibleTasks,
    context.capacity.effectiveMaxParallel
  );
  if (tighteningTask !== undefined) {
    return canAdmit(state, tighteningTask)
      ? admitDecision(
          state,
          context,
          trigger,
          tighteningTask,
          "tightening-scope",
          reservationUpdate
        )
      : awaitDecision(
          state,
          context,
          trigger,
          eligibleTasks,
          "reserved-tightening-scope",
          reservationSet(tighteningTask.id)
        );
  }

  const continuation = selectConstrainedContinuation(
    state,
    eligibleTasks,
    context.capacity.effectiveMaxParallel
  );
  if (continuation !== undefined) {
    return canAdmit(state, continuation)
      ? admitDecision(
          state,
          context,
          trigger,
          continuation,
          "constrained-continuation",
          reservationUpdate
        )
      : awaitDecision(
          state,
          context,
          trigger,
          eligibleTasks,
          capacityWaitReason(state),
          reservationUpdate
        );
  }

  const task = eligibleTasks[0];
  return canAdmit(state, task)
    ? admitDecision(state, context, trigger, task, "canonical-order", reservationUpdate)
    : awaitDecision(
        state,
        context,
        trigger,
        eligibleTasks,
        capacityWaitReason(state),
        reservationUpdate
      );
}

function taskById(
  taskId: string | undefined,
  tasks: readonly PlannedTask[]
): PlannedTask | undefined {
  return taskId === undefined ? undefined : tasks.find((task) => task.id === taskId);
}

function isDependencyMutexEligible(task: PlannedTask, state: SchedulerInspection): boolean {
  return (
    task.dependsOn.every(
      (dependencyId) => state.settlementKindByTaskId.get(dependencyId) === "completed"
    ) && task.mutex.every((mutex) => !state.runningMutexes.has(mutex))
  );
}

function admitDecision(
  state: SchedulerInspection,
  context: SchedulerDecisionContext,
  trigger: SchedulerTrigger,
  task: PlannedTask,
  reason: Extract<SchedulerDecision, { readonly kind: "admit" }>["reason"],
  reservationUpdate: ReservationUpdate
): SchedulerDecision {
  return freezeDecision({
    ...context,
    eligibleCount: state.pendingTasks.filter((candidate) =>
      isDependencyMutexEligible(candidate, state)
    ).length,
    kind: "admit",
    reason,
    reservationUpdate,
    scopeToActivate: activationScopeFor(state, task)?.id ?? null,
    taskId: task.id,
    trigger
  });
}

function awaitDecision(
  state: SchedulerInspection,
  context: SchedulerDecisionContext,
  trigger: SchedulerTrigger,
  eligibleTasks: readonly PlannedTask[],
  reason: Extract<SchedulerDecision, { readonly kind: "await-running" }>["reason"],
  reservationUpdate: ReservationUpdate
): SchedulerDecision {
  if (state.runningTaskIds.size === 0) {
    throw new Error("scheduler has pending tasks but no runnable or running task");
  }
  return freezeDecision({
    ...context,
    eligibleCount: eligibleTasks.length,
    kind: "await-running",
    reason,
    reservationUpdate,
    trigger
  });
}

function capacityWaitReason(
  state: SchedulerInspection
): Extract<SchedulerDecision, { readonly kind: "await-running" }>["reason"] {
  return state.runningTaskIds.size >= state.maxParallel ? "root-capacity" : "active-scope-capacity";
}

function capacityFor(state: SchedulerInspection): SchedulerCapacity {
  return Object.freeze({
    effectiveMaxParallel: effectiveMaxParallelFor(state),
    maxParallel: state.maxParallel,
    running: state.runningTaskIds.size
  });
}

function effectiveMaxParallelFor(state: SchedulerInspection): number {
  let effective = state.maxParallel;
  for (const scope of state.graph.scopes) {
    if (state.activeScopeIds.has(scope.id)) effective = Math.min(effective, scope.maxParallel);
  }
  return effective;
}

function prospectiveMaxParallel(state: SchedulerInspection, task: PlannedTask): number {
  const scope = activationScopeFor(state, task);
  return scope !== undefined
    ? Math.min(effectiveMaxParallelFor(state), scope.maxParallel)
    : effectiveMaxParallelFor(state);
}

function canAdmit(state: SchedulerInspection, task: PlannedTask): boolean {
  return state.runningTaskIds.size < prospectiveMaxParallel(state, task);
}

function selectTighteningTask(
  state: SchedulerInspection,
  eligibleTasks: readonly PlannedTask[],
  effectiveMaxParallel: number
): PlannedTask | undefined {
  return eligibleTasks
    .filter((task) => activatesTighteningScope(state, task, effectiveMaxParallel))
    .sort((left, right) => compareConstrainedTasks(state, left, right))[0];
}

function activatesTighteningScope(
  state: SchedulerInspection,
  task: PlannedTask,
  effectiveMaxParallel: number
): boolean {
  const scope = activationScopeFor(state, task);
  return scope !== undefined && scope.maxParallel < effectiveMaxParallel;
}

function activationScopeFor(
  state: SchedulerInspection,
  task: PlannedTask
): PlannedTaskGraph["scopes"][number] | undefined {
  const scope = scopeForTask(state, task);
  return scope?.activationTaskIds.includes(task.id) === true && !state.activeScopeIds.has(scope.id)
    ? scope
    : undefined;
}

function selectConstrainedContinuation(
  state: SchedulerInspection,
  eligibleTasks: readonly PlannedTask[],
  effectiveMaxParallel: number
): PlannedTask | undefined {
  return eligibleTasks
    .filter((task) => isConstrainedContinuation(state, task, effectiveMaxParallel))
    .sort((left, right) => compareConstrainedTasks(state, left, right))[0];
}

function isConstrainedContinuation(
  state: SchedulerInspection,
  task: PlannedTask,
  effectiveMaxParallel: number
): boolean {
  const scope = scopeForTask(state, task);
  return (
    scope !== undefined &&
    state.activeScopeIds.has(scope.id) &&
    scope.maxParallel < state.maxParallel &&
    scope.maxParallel === effectiveMaxParallel
  );
}

function compareConstrainedTasks(
  state: SchedulerInspection,
  left: PlannedTask,
  right: PlannedTask
): number {
  const leftScope = scopeForTask(state, left);
  const rightScope = scopeForTask(state, right);
  if (leftScope === undefined || rightScope === undefined) {
    throw new Error("constrained task is missing a scope");
  }
  return (
    leftScope.maxParallel - rightScope.maxParallel ||
    compareText(leftScope.id, rightScope.id) ||
    compareText(left.id, right.id)
  );
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function scopeForTask(
  state: SchedulerInspection,
  task: PlannedTask
): PlannedTaskGraph["scopes"][number] | undefined {
  return task.scopeId === undefined
    ? undefined
    : state.graph.scopes.find((scope) => scope.id === task.scopeId);
}

function blockerSummary(
  state: SchedulerInspection,
  capacity: SchedulerCapacity
): SchedulerBlockerSummary {
  let dependency = 0;
  let mutex = 0;
  for (const task of state.pendingTasks) {
    if (
      task.dependsOn.some(
        (dependencyId) => state.settlementKindByTaskId.get(dependencyId) !== "completed"
      )
    ) {
      dependency += 1;
      continue;
    }
    if (task.mutex.some((mutexName) => state.runningMutexes.has(mutexName))) mutex += 1;
  }
  return Object.freeze({
    dependency,
    mutex,
    rootCapacity: state.runningTaskIds.size >= state.maxParallel,
    scopeCapacity:
      capacity.effectiveMaxParallel < state.maxParallel &&
      state.runningTaskIds.size >= capacity.effectiveMaxParallel
  });
}

function reservationUnchanged(): ReservationUpdate {
  return Object.freeze({ kind: "unchanged" });
}

function reservationSet(taskId: string): ReservationUpdate {
  return Object.freeze({ kind: "set", taskId });
}

function reservationClear(): ReservationUpdate {
  return Object.freeze({ kind: "clear" });
}

function freezeDecision(decision: SchedulerDecision): SchedulerDecision {
  const trigger = freezeTrigger(decision.trigger);
  switch (decision.kind) {
    case "admit":
    case "await-running":
      return Object.freeze({ ...decision, trigger });
    case "settle-blocked":
      return Object.freeze({
        ...decision,
        dependencyIds: Object.freeze([...decision.dependencyIds]),
        trigger
      });
    case "cancel-pending":
      return Object.freeze({
        ...decision,
        taskIds: Object.freeze([...decision.taskIds]),
        trigger
      });
    case "complete":
      return Object.freeze({ ...decision, trigger });
  }
}

function freezeTrigger(trigger: SchedulerTrigger): SchedulerTrigger {
  switch (trigger.kind) {
    case "execution-started":
    case "admission-continued":
    case "cancellation-observed":
    case "cancellation-applied":
      return Object.freeze({ kind: trigger.kind });
    case "blocked-settled":
      return Object.freeze({ kind: trigger.kind, taskId: trigger.taskId });
    case "task-settled":
      return Object.freeze({
        kind: trigger.kind,
        settlementKind: trigger.settlementKind,
        taskId: trigger.taskId
      });
  }
}
