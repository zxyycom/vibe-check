import type {
  AdmissionCatalog,
  AdmissionGraph,
  AdmissionGraphInput,
  AdmissionInspection,
  AdmissionRejectionReason,
  AdmissionSelectionRejectionReason,
  AdmissionSelectionValidation,
  AdmissionSelectionValidationRejectionReason,
  AdmissionSettlementOutcome,
  AdmissionState,
  AdmissionTransitionResult
} from "../../project-definition/scheduler-policy.ts";
import {
  prepareTaskGraph,
  type PlannedTask,
  type PlannedTaskGraph,
  type TaskGraph
} from "./graph.ts";
import type { SchedulerSettlementKind, SchedulerSnapshot } from "./scheduler-decision-model.ts";

type CoreTaskStatus =
  | Readonly<{ readonly kind: "pending" }>
  /** Only used while adapting private partial SchedulerSnapshot test inputs. */
  | Readonly<{ readonly kind: "absent" }>
  | Readonly<{ readonly kind: "running" }>
  | Readonly<{ readonly kind: "settled"; readonly settlementKind: SchedulerSettlementKind }>;

export type AdmissionCoreEffect =
  | Readonly<{ readonly kind: "admitted"; readonly taskId: string }>
  | Readonly<{
      readonly dependencyIds?: readonly string[];
      readonly kind: "settled";
      readonly settlementKind: SchedulerSettlementKind;
      readonly taskId: string;
    }>;

/** One immutable parent+delta node. Only the changed Task state belongs to a successor. */
interface AdmissionCoreNode {
  readonly activatedScopeId: string | undefined;
  readonly changedStatus: CoreTaskStatus | undefined;
  readonly changedTaskId: string | undefined;
  readonly parent: AdmissionCoreNode | undefined;
}

/** The private static index and immutable dynamic node shared by public and shell paths. */
export interface AdmissionCoreState {
  readonly compiled: CompiledAdmissionGraph;
  readonly legacyActiveScopeIds: readonly string[] | undefined;
  readonly legacyRunningMutexes: readonly string[] | undefined;
  readonly node: AdmissionCoreNode;
}

export interface CompiledAdmissionGraph {
  readonly graph: PlannedTaskGraph;
  readonly maxParallel: number;
  readonly scopesById: ReadonlyMap<string, PlannedTaskGraph["scopes"][number]>;
  readonly taskById: ReadonlyMap<string, PlannedTask>;
  readonly taskIdsInPublicOrder: readonly string[];
}

export interface AdmissionCoreTransition {
  /** The immutable post-state for each corresponding canonical effect. */
  readonly effectStates: readonly AdmissionCoreState[];
  readonly effects: readonly AdmissionCoreEffect[];
  readonly state: AdmissionCoreState;
}

export interface AdmissionCoreSelection {
  readonly canAdmit: boolean;
  readonly task: PlannedTask;
}

const PENDING: CoreTaskStatus = Object.freeze({ kind: "pending" });
const ABSENT: CoreTaskStatus = Object.freeze({ kind: "absent" });
const ACCEPTED_SELECTION: AdmissionSelectionValidation = Object.freeze({ accepted: true });

/** Compiles a Scheduler-owned normalized graph once for an actual scheduler invocation. */
export function compilePreparedAdmissionGraph(
  graph: PlannedTaskGraph,
  maxParallel: number
): CompiledAdmissionGraph {
  if (!Number.isSafeInteger(maxParallel) || maxParallel <= 0) {
    throw new TypeError("task engine maxParallel must be a positive safe integer");
  }
  return Object.freeze({
    graph,
    maxParallel,
    scopesById: new Map(graph.scopes.map((scope) => [scope.id, scope] as const)),
    taskById: new Map(graph.tasks.map((task) => [task.id, task] as const)),
    taskIdsInPublicOrder: Object.freeze(graph.tasks.map((task) => task.id).sort(compareText))
  });
}

/** 在 exact boundary validation 和一次 static compile 后创建 standalone public factory。 */
export function createAdmissionGraph(input: AdmissionGraphInput): AdmissionGraph {
  const compiled = compileAdmissionGraphInput(input);
  return Object.freeze({
    initialState: Object.freeze(function initialState(this: void): AdmissionState {
      return admissionStateForCore(createInitialAdmissionCoreState(compiled));
    })
  });
}

export function createInitialAdmissionCoreState(
  compiled: CompiledAdmissionGraph
): AdmissionCoreState {
  return freezeCoreState(compiled, createNode(undefined, undefined, undefined, undefined));
}

/** Seeds the private core from a shell snapshot without exposing a mutable shell view. */
export function createAdmissionCoreFromSchedulerSnapshot(
  compiled: CompiledAdmissionGraph,
  snapshot: SchedulerSnapshot
): AdmissionCoreState {
  let node = createNode(undefined, undefined, undefined, undefined);
  const presentTaskIds = new Set([
    ...snapshot.pendingTaskIds,
    ...snapshot.runningTaskIds,
    ...snapshot.settledTasks.map((task) => task.taskId)
  ]);
  for (const task of compiled.graph.tasks) {
    if (!presentTaskIds.has(task.id)) node = createNode(node, task.id, ABSENT, undefined);
  }
  for (const taskId of snapshot.runningTaskIds) {
    node = createNode(node, taskId, Object.freeze({ kind: "running" }), undefined);
  }
  for (const settled of snapshot.settledTasks) {
    node = createNode(
      node,
      settled.taskId,
      Object.freeze({ kind: "settled", settlementKind: settled.kind }),
      undefined
    );
  }
  return freezeCoreState(compiled, node, snapshot.activeScopeIds, snapshot.runningMutexes);
}

/** The canonical select action used by both the public opaque handle and the real shell. */
export function selectAdmissionCore(
  state: AdmissionCoreState,
  taskId: string
): Readonly<
  | { readonly accepted: true; readonly transition: AdmissionCoreTransition }
  | { readonly accepted: false; readonly reason: AdmissionSelectionValidationRejectionReason }
> {
  const validation = validateAdmissionCoreSelection(state, taskId);
  if (!validation.accepted) return Object.freeze({ accepted: false, reason: validation.reason });
  const next = withSelectedTaskStatus(state, taskId, Object.freeze({ kind: "running" }));
  return Object.freeze({
    accepted: true,
    transition: freezeTransition(next, [Object.freeze({ kind: "admitted", taskId })], [next])
  });
}

/** The public binary settlement action. Runtime outcome validation intentionally precedes ID checks. */
export function settleAdmissionCore(
  state: AdmissionCoreState,
  taskId: string,
  outcome: unknown
): Readonly<
  | { readonly accepted: true; readonly transition: AdmissionCoreTransition }
  | { readonly accepted: false; readonly reason: AdmissionRejectionReason }
> {
  if (outcome !== "satisfied" && outcome !== "unsatisfied") {
    return Object.freeze({
      accepted: false,
      reason: Object.freeze({ kind: "invalid-settlement-outcome" })
    });
  }
  return settleRunningAdmissionCore(
    state,
    taskId,
    outcome === "satisfied" ? "completed" : "prerequisite-unsatisfied"
  );
}

/** Applies a real running Task settlement through the same reducer, retaining private exact kinds. */
export function settleRunningAdmissionCore(
  state: AdmissionCoreState,
  taskId: string,
  settlementKind: Extract<
    SchedulerSettlementKind,
    "completed" | "prerequisite-unsatisfied" | "failed"
  >
): Readonly<
  | { readonly accepted: true; readonly transition: AdmissionCoreTransition }
  | { readonly accepted: false; readonly reason: AdmissionRejectionReason }
> {
  if (isCoreComplete(state)) {
    return Object.freeze({ accepted: false, reason: Object.freeze({ kind: "state-complete" }) });
  }
  const task = state.compiled.taskById.get(taskId);
  if (task === undefined) {
    return Object.freeze({ accepted: false, reason: Object.freeze({ kind: "unknown-task" }) });
  }
  const status = taskStatusFor(state, taskId);
  if (status.kind !== "running") {
    return Object.freeze({
      accepted: false,
      reason: Object.freeze({
        kind: "not-running",
        status: status.kind === "pending" ? "pending" : "settled"
      })
    });
  }
  const settled = withTaskStatus(state, taskId, Object.freeze({ kind: "settled", settlementKind }));
  const directEffect = Object.freeze({ kind: "settled" as const, settlementKind, taskId });
  return Object.freeze({
    accepted: true,
    transition: reconcileForcedBlocks(settled, [directEffect], [settled])
  });
}

/** Private cancellation stays in the reducer/effect owner but has no public AdmissionState action. */
export function cancelPendingAdmissionCore(state: AdmissionCoreState): AdmissionCoreTransition {
  let next = state;
  const effects: AdmissionCoreEffect[] = [];
  const effectStates: AdmissionCoreState[] = [];
  for (const task of state.compiled.graph.tasks) {
    if (taskStatusFor(next, task.id).kind !== "pending") continue;
    next = withTaskStatus(
      next,
      task.id,
      Object.freeze({ kind: "settled", settlementKind: "cancelled-before-start" })
    );
    effects.push(
      Object.freeze({ kind: "settled", settlementKind: "cancelled-before-start", taskId: task.id })
    );
    effectStates.push(next);
  }
  return freezeTransition(next, effects, effectStates);
}

/** Reconciles forced dependency blocks before the real shell publishes its next decision boundary. */
export function reconcileAdmissionCore(state: AdmissionCoreState): AdmissionCoreTransition {
  return reconcileForcedBlocks(state, [], []);
}

export function validateAdmissionCoreSelection(
  state: AdmissionCoreState,
  taskId: string
): AdmissionSelectionValidation {
  if (isCoreComplete(state)) {
    return rejectedValidation(Object.freeze({ kind: "state-complete" }));
  }
  const task = state.compiled.taskById.get(taskId);
  if (task === undefined) return rejectedValidation(Object.freeze({ kind: "unknown-task" }));
  const status = taskStatusFor(state, taskId);
  if (status.kind !== "pending") {
    return rejectedValidation(
      Object.freeze({
        kind: "not-pending",
        status: status.kind === "running" ? "running" : "settled"
      })
    );
  }
  const reason = selectionRejectionForPendingTask(state, task);
  return reason === undefined ? ACCEPTED_SELECTION : rejectedValidation(reason);
}

/** Uses the compiled core for existing policy candidates without constructing public catalog DTOs. */
export function admissionCandidatesForCore(
  state: AdmissionCoreState
): readonly AdmissionCoreSelection[] {
  const candidates: AdmissionCoreSelection[] = [];
  for (const task of state.compiled.graph.tasks) {
    if (taskStatusFor(state, task.id).kind !== "pending") continue;
    const reason = relationOrMutexRejectionFor(state, task);
    if (reason !== undefined) continue;
    candidates.push(
      Object.freeze({
        canAdmit: capacityRejectionFor(state, task) === undefined,
        task
      })
    );
  }
  return Object.freeze(candidates);
}

/** Scheduler-only projection retained for policy choice and diagnostics, not a second transition model. */
export function schedulerInspectionForCore(state: AdmissionCoreState): Readonly<{
  readonly activeScopeIds: readonly string[];
  readonly effectiveMaxParallel: number;
  readonly graph: PlannedTaskGraph;
  readonly maxParallel: number;
  readonly pendingTasks: readonly PlannedTask[];
  readonly runningMutexes: readonly string[];
  readonly runningTaskIds: readonly string[];
  readonly settledTasks: readonly Readonly<{
    readonly kind: SchedulerSettlementKind;
    readonly taskId: string;
  }>[];
}> {
  const pendingTasks: PlannedTask[] = [];
  const runningTaskIds: string[] = [];
  const runningMutexes = new Set<string>();
  const settledTasks: { kind: SchedulerSettlementKind; taskId: string }[] = [];
  for (const task of state.compiled.graph.tasks) {
    const status = taskStatusFor(state, task.id);
    if (status.kind === "pending") pendingTasks.push(task);
    if (status.kind === "running") {
      runningTaskIds.push(task.id);
      for (const mutexId of task.mutex) runningMutexes.add(mutexId);
    }
    if (status.kind === "settled")
      settledTasks.push({ kind: status.settlementKind, taskId: task.id });
  }
  return Object.freeze({
    activeScopeIds: Object.freeze(activeScopesFor(state).map((scope) => scope.id)),
    effectiveMaxParallel: effectiveMaxParallelFor(state),
    graph: state.compiled.graph,
    maxParallel: state.compiled.maxParallel,
    pendingTasks: Object.freeze(pendingTasks),
    runningMutexes: Object.freeze([...runningMutexes]),
    runningTaskIds: Object.freeze(runningTaskIds),
    settledTasks: Object.freeze(settledTasks.map((task) => Object.freeze(task)))
  });
}

export function scopeToActivateForCore(state: AdmissionCoreState, taskId: string): string | null {
  const task = state.compiled.taskById.get(taskId);
  if (task?.scopeId === undefined) return null;
  const scope = state.compiled.scopesById.get(task.scopeId);
  return scope !== undefined &&
    isScopeInactive(state, scope.id) &&
    scope.activationTaskIds.includes(taskId)
    ? scope.id
    : null;
}

/** Constructs the frozen opaque public wrapper. Projection work remains lazy until its getter is read. */
export function admissionStateForCore(core: AdmissionCoreState): AdmissionState {
  const select = Object.freeze(function select(
    this: void,
    taskId: string
  ): AdmissionTransitionResult {
    const selection = selectAdmissionCore(core, taskId);
    return selection.accepted
      ? Object.freeze({
          accepted: true,
          state: admissionStateForCore(selection.transition.state)
        })
      : Object.freeze({ accepted: false, reason: selection.reason });
  });
  const settle = Object.freeze(function settle(
    this: void,
    taskId: string,
    outcome: AdmissionSettlementOutcome
  ): AdmissionTransitionResult {
    const settlement = settleAdmissionCore(core, taskId, outcome);
    return settlement.accepted
      ? Object.freeze({
          accepted: true,
          state: admissionStateForCore(settlement.transition.state)
        })
      : Object.freeze({ accepted: false, reason: settlement.reason });
  });
  const validateSelection = Object.freeze(function validateSelection(
    this: void,
    taskId: string
  ): AdmissionSelectionValidation {
    return validateAdmissionCoreSelection(core, taskId);
  });
  return Object.freeze({
    get catalog(): AdmissionCatalog {
      return catalogForCore(core);
    },
    get inspection(): AdmissionInspection {
      return inspectionForCore(core);
    },
    select,
    settle,
    validateSelection
  } satisfies AdmissionState);
}

function compileAdmissionGraphInput(input: AdmissionGraphInput): CompiledAdmissionGraph {
  const data = exactRecord(input, "admission graph input", ["graph", "maxParallel"]);
  const maxParallel = data.maxParallel;
  if (typeof maxParallel !== "number" || !Number.isSafeInteger(maxParallel) || maxParallel <= 0) {
    throw new TypeError("admission graph maxParallel must be a positive safe integer");
  }
  const graph = taskGraphFromSchedulerSnapshot(data.graph);
  return compilePreparedAdmissionGraph(prepareTaskGraph(graph, maxParallel), maxParallel);
}

function taskGraphFromSchedulerSnapshot(value: unknown): TaskGraph {
  const graph = exactRecord(value, "admission graph", ["scopes", "tasks"]);
  const rawTasks = requiredArray(graph.tasks, "admission graph tasks");
  const rawScopes = requiredArray(graph.scopes, "admission graph scopes");
  const tasks = rawTasks.map((candidate, index) => {
    const task = exactRecord(candidate, `admission graph tasks[${index}]`, [
      "admissionPriority",
      "dependsOn",
      "mutex",
      "observes",
      "scopeId",
      "taskId"
    ]);
    if (task.scopeId !== null && typeof task.scopeId !== "string") {
      throw new TypeError(`admission graph tasks[${index}].scopeId must be a string or null`);
    }
    return Object.freeze({
      admissionPriority: requiredNumber(
        task.admissionPriority,
        `admission graph tasks[${index}].admissionPriority`
      ),
      dependsOn: stringArray(task.dependsOn, `admission graph tasks[${index}].dependsOn`),
      id: requiredString(task.taskId, `admission graph tasks[${index}].taskId`),
      mutex: stringArray(task.mutex, `admission graph tasks[${index}].mutex`),
      observes: stringArray(task.observes, `admission graph tasks[${index}].observes`),
      ...(task.scopeId === null
        ? {}
        : { scopeId: requiredString(task.scopeId, `admission graph tasks[${index}].scopeId`) })
    });
  });
  const scopes = rawScopes.map((candidate, index) => {
    const scope = exactRecord(candidate, `admission graph scopes[${index}]`, [
      "activationTaskIds",
      "id",
      "maxParallel",
      "terminalTaskId"
    ]);
    return Object.freeze({
      activationTaskIds: stringArray(
        scope.activationTaskIds,
        `admission graph scopes[${index}].activationTaskIds`
      ),
      id: requiredString(scope.id, `admission graph scopes[${index}].id`),
      maxParallel: requiredNumber(
        scope.maxParallel,
        `admission graph scopes[${index}].maxParallel`
      ),
      terminalTaskId: requiredString(
        scope.terminalTaskId,
        `admission graph scopes[${index}].terminalTaskId`
      )
    });
  });
  return Object.freeze({ scopes: Object.freeze(scopes), tasks: Object.freeze(tasks) });
}

function exactRecord(
  value: unknown,
  label: string,
  expectedKeys: readonly string[]
): Readonly<Record<string, unknown>> {
  if (!isPlainRecord(value)) {
    throw new TypeError(`${label} must be a plain object`);
  }
  if (
    Reflect.getPrototypeOf(value) !== Object.prototype &&
    Reflect.getPrototypeOf(value) !== null
  ) {
    throw new TypeError(`${label} must be a plain object`);
  }
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key) => typeof key !== "string" || !expectedKeys.includes(key))
  ) {
    throw new TypeError(`${label} must have exactly: ${expectedKeys.join(", ")}`);
  }
  return value;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requiredArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
  return value;
}

function requiredNumber(value: unknown, label: string): number {
  if (typeof value !== "number") throw new TypeError(`${label} must be a number`);
  return value;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string`);
  return value;
}

function stringArray(value: unknown, label: string): readonly string[] {
  const values = requiredArray(value, label);
  const strings: string[] = [];
  for (const item of values) {
    if (typeof item !== "string") throw new TypeError(`${label} must contain only strings`);
    strings.push(item);
  }
  return Object.freeze(strings);
}

function catalogForCore(state: AdmissionCoreState): AdmissionCatalog {
  const selectableTaskIds: string[] = [];
  const nonSelectableTasks: { reason: AdmissionSelectionRejectionReason; taskId: string }[] = [];
  for (const taskId of state.compiled.taskIdsInPublicOrder) {
    if (taskStatusFor(state, taskId).kind !== "pending") continue;
    const task = requiredTask(state, taskId);
    const reason = selectionRejectionForPendingTask(state, task);
    if (reason === undefined) selectableTaskIds.push(taskId);
    else nonSelectableTasks.push(Object.freeze({ reason, taskId }));
  }
  return Object.freeze({
    nonSelectableTasks: Object.freeze(nonSelectableTasks),
    selectableTaskIds: Object.freeze(selectableTaskIds)
  });
}

function inspectionForCore(state: AdmissionCoreState): AdmissionInspection {
  const runningTaskIds: string[] = [];
  const settledTasks: { outcome: AdmissionSettlementOutcome; taskId: string }[] = [];
  for (const taskId of state.compiled.taskIdsInPublicOrder) {
    const status = taskStatusFor(state, taskId);
    if (status.kind === "running") runningTaskIds.push(taskId);
    if (status.kind === "settled") {
      const outcome = publicOutcomeForSettlement(status.settlementKind);
      if (outcome !== undefined) settledTasks.push(Object.freeze({ outcome, taskId }));
    }
  }
  const capacity = Object.freeze({
    effectiveMaxParallel: effectiveMaxParallelFor(state),
    maxParallel: state.compiled.maxParallel,
    running: runningTaskIds.length
  });
  const hasSelectablePending = state.compiled.graph.tasks.some(
    (task) =>
      taskStatusFor(state, task.id).kind === "pending" &&
      selectionRejectionForPendingTask(state, task) === undefined
  );
  return Object.freeze({
    capacity,
    nextBoundary: nextBoundaryFor(hasSelectablePending, runningTaskIds.length),
    runningTaskIds: Object.freeze(runningTaskIds),
    scopes: Object.freeze(
      [...state.compiled.graph.scopes]
        .sort((left, right) => compareText(left.id, right.id))
        .map((scope) =>
          Object.freeze({ lifecycle: scopeLifecycleFor(state, scope.id), scopeId: scope.id })
        )
    ),
    settledTasks: Object.freeze(settledTasks)
  });
}

function nextBoundaryFor(
  hasSelectablePending: boolean,
  runningTaskCount: number
): "select" | "wait" | "complete" {
  if (hasSelectablePending) return "select";
  if (runningTaskCount > 0) return "wait";
  return "complete";
}

function selectionRejectionForPendingTask(
  state: AdmissionCoreState,
  task: PlannedTask
): AdmissionSelectionRejectionReason | undefined {
  return relationOrMutexRejectionFor(state, task) ?? capacityRejectionFor(state, task);
}

function relationOrMutexRejectionFor(
  state: AdmissionCoreState,
  task: PlannedTask
): AdmissionSelectionRejectionReason | undefined {
  const pendingDependencies = task.dependsOn.filter(
    (taskId) => taskStatusFor(state, taskId).kind !== "settled"
  );
  if (pendingDependencies.length > 0) {
    return Object.freeze({ kind: "depends-on-pending", taskIds: sorted(pendingDependencies) });
  }
  const pendingObservations = task.observes.filter(
    (taskId) => taskStatusFor(state, taskId).kind !== "settled"
  );
  if (pendingObservations.length > 0) {
    return Object.freeze({ kind: "observes-pending", taskIds: sorted(pendingObservations) });
  }
  const heldMutexes = task.mutex.filter((mutexId) => isMutexHeld(state, mutexId));
  return heldMutexes.length === 0
    ? undefined
    : Object.freeze({ kind: "mutex-held", mutexIds: sorted(heldMutexes) });
}

function capacityRejectionFor(
  state: AdmissionCoreState,
  task: PlannedTask
): AdmissionSelectionRejectionReason | undefined {
  const running = runningCount(state);
  const scope = scopeCapacityBlockerFor(state, task, running);
  if (scope !== undefined) {
    return Object.freeze({
      kind: "scope-capacity-reached",
      maxParallel: scope.maxParallel,
      running,
      scopeId: scope.id
    });
  }
  return running >= state.compiled.maxParallel
    ? Object.freeze({
        kind: "root-capacity-reached",
        maxParallel: state.compiled.maxParallel,
        running
      })
    : undefined;
}

function scopeCapacityBlockerFor(
  state: AdmissionCoreState,
  task: PlannedTask,
  running: number
): PlannedTaskGraph["scopes"][number] | undefined {
  const scopes = activeScopesFor(state);
  const taskScope =
    task.scopeId === undefined ? undefined : state.compiled.scopesById.get(task.scopeId);
  if (
    taskScope !== undefined &&
    isScopeInactive(state, taskScope.id) &&
    taskScope.activationTaskIds.includes(task.id)
  ) {
    scopes.push(taskScope);
  }
  return scopes
    .filter((scope) => running >= scope.maxParallel)
    .sort(
      (left, right) => left.maxParallel - right.maxParallel || compareText(left.id, right.id)
    )[0];
}

function reconcileForcedBlocks(
  state: AdmissionCoreState,
  initialEffects: readonly AdmissionCoreEffect[],
  initialEffectStates: readonly AdmissionCoreState[]
): AdmissionCoreTransition {
  let next = state;
  const effects = [...initialEffects];
  const effectStates = [...initialEffectStates];
  while (true) {
    const blocked = forcedBlockedTaskFor(next);
    if (blocked === undefined) return freezeTransition(next, effects, effectStates);
    next = withTaskStatus(
      next,
      blocked.task.id,
      Object.freeze({ kind: "settled", settlementKind: "blocked" })
    );
    effects.push(
      Object.freeze({
        dependencyIds: Object.freeze([...blocked.dependencyIds]),
        kind: "settled",
        settlementKind: "blocked",
        taskId: blocked.task.id
      })
    );
    effectStates.push(next);
  }
}

function forcedBlockedTaskFor(
  state: AdmissionCoreState
): Readonly<{ readonly dependencyIds: readonly string[]; readonly task: PlannedTask }> | undefined {
  for (let index = state.compiled.graph.tasks.length - 1; index >= 0; index -= 1) {
    const task = state.compiled.graph.tasks[index];
    if (task === undefined || taskStatusFor(state, task.id).kind !== "pending") continue;
    const settlements = task.dependsOn.map(
      (taskId) => [taskId, taskStatusFor(state, taskId)] as const
    );
    if (settlements.some(([, status]) => status.kind !== "settled")) continue;
    const dependencyIds = settlements.flatMap(([taskId, status]) =>
      status.kind === "settled" && status.settlementKind !== "completed" ? [taskId] : []
    );
    if (dependencyIds.length > 0)
      return Object.freeze({ dependencyIds: Object.freeze(dependencyIds), task });
  }
  return undefined;
}

function activeScopesFor(state: AdmissionCoreState): PlannedTaskGraph["scopes"][number][] {
  return state.compiled.graph.scopes.filter(
    (scope) => scopeLifecycleFor(state, scope.id) === "active"
  );
}

function scopeLifecycleFor(
  state: AdmissionCoreState,
  scopeId: string
): "inactive" | "active" | "closed" {
  const scope = state.compiled.scopesById.get(scopeId);
  if (scope === undefined) throw new Error(`admission core scope is unknown: ${scopeId}`);
  if (taskStatusFor(state, scope.terminalTaskId).kind === "settled") return "closed";
  return scopeWasActivated(state, scope.id) ? "active" : "inactive";
}

function scopeWasActivated(state: AdmissionCoreState, scopeId: string): boolean {
  if (state.legacyActiveScopeIds?.includes(scopeId) === true) return true;
  for (
    let node: AdmissionCoreNode | undefined = state.node;
    node !== undefined;
    node = node.parent
  ) {
    if (node.activatedScopeId === scopeId) return true;
  }
  return false;
}

function isScopeInactive(state: AdmissionCoreState, scopeId: string): boolean {
  return scopeLifecycleFor(state, scopeId) === "inactive";
}

function effectiveMaxParallelFor(state: AdmissionCoreState): number {
  return activeScopesFor(state).reduce(
    (effective, scope) => Math.min(effective, scope.maxParallel),
    state.compiled.maxParallel
  );
}

function isMutexHeld(state: AdmissionCoreState, mutexId: string): boolean {
  if (state.legacyRunningMutexes?.includes(mutexId) === true) return true;
  return state.compiled.graph.tasks.some(
    (task) => task.mutex.includes(mutexId) && taskStatusFor(state, task.id).kind === "running"
  );
}

function runningCount(state: AdmissionCoreState): number {
  return state.compiled.graph.tasks.filter(
    (task) => taskStatusFor(state, task.id).kind === "running"
  ).length;
}

function isCoreComplete(state: AdmissionCoreState): boolean {
  return state.compiled.graph.tasks.every((task) => {
    const status = taskStatusFor(state, task.id);
    return status.kind !== "pending" && status.kind !== "running";
  });
}

function taskStatusFor(state: AdmissionCoreState, taskId: string): CoreTaskStatus {
  for (
    let node: AdmissionCoreNode | undefined = state.node;
    node !== undefined;
    node = node.parent
  ) {
    if (node.changedTaskId === taskId && node.changedStatus !== undefined)
      return node.changedStatus;
  }
  return PENDING;
}

function withTaskStatus(
  state: AdmissionCoreState,
  taskId: string,
  status: CoreTaskStatus
): AdmissionCoreState {
  return freezeCoreState(
    state.compiled,
    createNode(state.node, taskId, status, undefined),
    state.legacyActiveScopeIds,
    state.legacyRunningMutexes
  );
}

function withSelectedTaskStatus(
  state: AdmissionCoreState,
  taskId: string,
  status: CoreTaskStatus
): AdmissionCoreState {
  return freezeCoreState(
    state.compiled,
    createNode(state.node, taskId, status, scopeToActivateForCore(state, taskId) ?? undefined),
    state.legacyActiveScopeIds,
    state.legacyRunningMutexes
  );
}

function createNode(
  parent: AdmissionCoreNode | undefined,
  changedTaskId: string | undefined,
  changedStatus: CoreTaskStatus | undefined,
  activatedScopeId: string | undefined
): AdmissionCoreNode {
  return Object.freeze({ activatedScopeId, changedStatus, changedTaskId, parent });
}

function freezeCoreState(
  compiled: CompiledAdmissionGraph,
  node: AdmissionCoreNode,
  legacyActiveScopeIds?: readonly string[],
  legacyRunningMutexes?: readonly string[]
): AdmissionCoreState {
  return Object.freeze({
    compiled,
    legacyActiveScopeIds:
      legacyActiveScopeIds === undefined ? undefined : Object.freeze([...legacyActiveScopeIds]),
    legacyRunningMutexes:
      legacyRunningMutexes === undefined ? undefined : Object.freeze([...legacyRunningMutexes]),
    node
  });
}

function freezeTransition(
  state: AdmissionCoreState,
  effects: readonly AdmissionCoreEffect[],
  effectStates: readonly AdmissionCoreState[]
): AdmissionCoreTransition {
  if (effects.length !== effectStates.length) {
    throw new Error("admission core transition effects must have matching immutable post-states");
  }
  return Object.freeze({
    effectStates: Object.freeze([...effectStates]),
    effects: Object.freeze([...effects]),
    state
  });
}

function rejectedValidation(
  reason: AdmissionSelectionValidationRejectionReason
): AdmissionSelectionValidation {
  return Object.freeze({ accepted: false, reason });
}

function publicOutcomeForSettlement(
  settlementKind: SchedulerSettlementKind
): AdmissionSettlementOutcome | undefined {
  switch (settlementKind) {
    case "completed":
      return "satisfied";
    case "prerequisite-unsatisfied":
    case "failed":
      return "unsatisfied";
    case "blocked":
    case "cancelled-before-start":
      return undefined;
  }
}

function requiredTask(state: AdmissionCoreState, taskId: string): PlannedTask {
  const task = state.compiled.taskById.get(taskId);
  if (task === undefined) throw new Error(`admission core task is unknown: ${taskId}`);
  return task;
}

function sorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...values].sort(compareText));
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
