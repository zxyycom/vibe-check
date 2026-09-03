import { List } from "immutable";
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
import {
  compilePreparedAdmissionGraph,
  type CompiledAdmissionGraph
} from "./admission-core-compiled-graph.ts";

export { compilePreparedAdmissionGraph } from "./admission-core-compiled-graph.ts";
export type { CompiledAdmissionGraph } from "./admission-core-compiled-graph.ts";

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

export interface AdmissionCoreState {
  readonly compiled: CompiledAdmissionGraph;
  /** One private index drives every selection projection and transition. */
  readonly selection: AdmissionSelectionIndex;
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
/** Immutable.List is the persistent indexed backing for every dense selection counter. */
type PersistentIndexedStore<T> = Readonly<{
  readonly values: List<T>;
}>;

type NumberStore = PersistentIndexedStore<number>;
type StatusStore = PersistentIndexedStore<CoreTaskStatus>;

/** Persistent leftist max-heap: task slots are the canonical forced-effect priority. */
type ForcedTaskQueue =
  | undefined
  | Readonly<{
      readonly left: ForcedTaskQueue;
      readonly rank: number;
      readonly right: ForcedTaskQueue;
      readonly taskSlot: number;
    }>;

interface AdmissionSelectionIndex {
  readonly activeScopeSlots: readonly number[];
  readonly activeScopes: NumberStore;
  readonly forcedQueue: ForcedTaskQueue;
  readonly legacyRunningMutexes: readonly string[] | undefined;
  readonly mutexHolders: NumberStore;
  /** Per-task reverse-mutex occurrence count; candidate sieving never builds mutex payloads. */
  readonly heldMutexBlockers: NumberStore;
  readonly nonCompletedDependencies: NumberStore;
  readonly pendingObservations: NumberStore;
  readonly pendingDependencies: NumberStore;
  readonly remainingTaskCount: number;
  readonly runningTotal: number;
  readonly statuses: StatusStore;
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
  return freezeCoreState(compiled, initialSelectionFor(compiled));
}

/** Seeds the private core from a shell snapshot without exposing a mutable shell view. */
export function createAdmissionCoreFromSchedulerSnapshot(
  compiled: CompiledAdmissionGraph,
  snapshot: SchedulerSnapshot
): AdmissionCoreState {
  const statuses = compiled.graph.tasks.map(() => PENDING);
  const presentTaskIds = new Set([
    ...snapshot.pendingTaskIds,
    ...snapshot.runningTaskIds,
    ...snapshot.settledTasks.map((task) => task.taskId)
  ]);
  for (const [slot, task] of compiled.graph.tasks.entries()) {
    if (!presentTaskIds.has(task.id)) statuses[slot] = ABSENT;
  }
  for (const taskId of snapshot.runningTaskIds) {
    const slot = compiled.taskSlotsById.get(taskId);
    if (slot !== undefined) statuses[slot] = Object.freeze({ kind: "running" });
  }
  for (const settled of snapshot.settledTasks) {
    const slot = compiled.taskSlotsById.get(settled.taskId);
    if (slot !== undefined) {
      statuses[slot] = Object.freeze({ kind: "settled", settlementKind: settled.kind });
    }
  }
  return freezeCoreState(
    compiled,
    selectionForSeed(compiled, statuses, snapshot.activeScopeIds, snapshot.runningMutexes)
  );
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
  const taskSlot = requiredTaskSlot(state, taskId);
  const next = withSelectedTaskStatus(state, taskSlot, Object.freeze({ kind: "running" }));
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
  const taskSlot = state.compiled.taskSlotsById.get(taskId);
  if (taskSlot === undefined) {
    return Object.freeze({ accepted: false, reason: Object.freeze({ kind: "unknown-task" }) });
  }
  const status = statusFor(state, taskSlot);
  if (status.kind !== "running") {
    return Object.freeze({
      accepted: false,
      reason: Object.freeze({
        kind: "not-running",
        status: status.kind === "pending" ? "pending" : "settled"
      })
    });
  }
  const settled = withTaskStatus(
    state,
    taskSlot,
    Object.freeze({ kind: "settled", settlementKind })
  );
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
  for (const [slot, task] of state.compiled.graph.tasks.entries()) {
    if (statusFor(next, slot).kind !== "pending") continue;
    next = withTaskStatus(
      next,
      slot,
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
  const taskSlot = state.compiled.taskSlotsById.get(taskId);
  if (taskSlot === undefined) return rejectedValidation(Object.freeze({ kind: "unknown-task" }));
  const status = statusFor(state, taskSlot);
  if (status.kind !== "pending") {
    return rejectedValidation(
      Object.freeze({
        kind: "not-pending",
        status: status.kind === "running" ? "running" : "settled"
      })
    );
  }
  const reason = selectionRejectionForPendingTask(state, taskSlot);
  return reason === undefined ? ACCEPTED_SELECTION : rejectedValidation(reason);
}

/** Uses the compiled core for existing policy candidates without constructing public catalog DTOs. */
export function admissionCandidatesForCore(
  state: AdmissionCoreState
): readonly AdmissionCoreSelection[] {
  const candidates: AdmissionCoreSelection[] = [];
  for (const [taskSlot, task] of state.compiled.graph.tasks.entries()) {
    if (statusFor(state, taskSlot).kind !== "pending") continue;
    if (blockerStageFor(state, taskSlot) !== undefined) continue;
    candidates.push(Object.freeze({ canAdmit: hasCapacityForPendingTask(state, taskSlot), task }));
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
  for (const [taskSlot, task] of state.compiled.graph.tasks.entries()) {
    const status = statusFor(state, taskSlot);
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
  const taskSlot = state.compiled.taskSlotsById.get(taskId);
  if (taskSlot === undefined) return null;
  const scopeSlot = state.compiled.taskScopeSlots[taskSlot];
  if (scopeSlot === undefined || !isScopeInactive(state, scopeSlot)) return null;
  const scope = requiredScope(state, scopeSlot);
  return state.compiled.taskActivatesScope[taskSlot] === true ? scope.id : null;
}

/** Constructs the frozen opaque public wrapper. Projection work remains lazy until its getter is read. */
export function admissionStateForCore(core: AdmissionCoreState): AdmissionState {
  const select = Object.freeze(function select(
    this: void,
    taskId: string
  ): AdmissionTransitionResult {
    const selection = selectAdmissionCore(core, taskId);
    return selection.accepted
      ? Object.freeze({ accepted: true, state: admissionStateForCore(selection.transition.state) })
      : Object.freeze({ accepted: false, reason: selection.reason });
  });
  const settle = Object.freeze(function settle(
    this: void,
    taskId: string,
    outcome: AdmissionSettlementOutcome
  ): AdmissionTransitionResult {
    const settlement = settleAdmissionCore(core, taskId, outcome);
    return settlement.accepted
      ? Object.freeze({ accepted: true, state: admissionStateForCore(settlement.transition.state) })
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
  for (const taskSlot of state.compiled.taskSlotsInPublicOrder) {
    if (statusFor(state, taskSlot).kind !== "pending") continue;
    const reason = selectionRejectionForPendingTask(state, taskSlot);
    const taskId = requiredTask(state, taskSlot).id;
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
  for (const taskSlot of state.compiled.taskSlotsInPublicOrder) {
    const task = requiredTask(state, taskSlot);
    const status = statusFor(state, taskSlot);
    if (status.kind === "running") runningTaskIds.push(task.id);
    if (status.kind === "settled") {
      const outcome = publicOutcomeForSettlement(status.settlementKind);
      if (outcome !== undefined) settledTasks.push(Object.freeze({ outcome, taskId: task.id }));
    }
  }
  const selection = state.selection;
  const hasSelectablePending = state.compiled.graph.tasks.some(
    (_, taskSlot) =>
      statusFor(state, taskSlot).kind === "pending" &&
      isAdmissionEligibleForPendingTask(state, taskSlot)
  );
  return Object.freeze({
    capacity: Object.freeze({
      effectiveMaxParallel: effectiveMaxParallelFor(state),
      maxParallel: state.compiled.maxParallel,
      running: selection.runningTotal
    }),
    nextBoundary: nextBoundaryFor(hasSelectablePending, selection.runningTotal),
    runningTaskIds: Object.freeze(runningTaskIds),
    scopes: Object.freeze(
      [...state.compiled.graph.scopes]
        .sort((left, right) => compareText(left.id, right.id))
        .map((scope) =>
          Object.freeze({
            lifecycle: scopeLifecycleFor(state, requiredScopeSlot(state, scope.id)),
            scopeId: scope.id
          })
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
  taskSlot: number
): AdmissionSelectionRejectionReason | undefined {
  const stage = blockerStageFor(state, taskSlot);
  return stage === undefined
    ? capacityRejectionFor(state, taskSlot)
    : blockerPayloadFor(state, taskSlot, stage);
}

type PendingBlockerStage = "depends-on-pending" | "mutex-held" | "observes-pending";

/**
 * Candidate scheduling uses only compiled, state-local counts. It intentionally
 * does not build public rejection arrays for every pending task.
 */
function blockerStageFor(
  state: AdmissionCoreState,
  taskSlot: number
): PendingBlockerStage | undefined {
  const selection = state.selection;
  if (numberFor(selection.pendingDependencies, taskSlot) > 0) return "depends-on-pending";
  if (numberFor(selection.pendingObservations, taskSlot) > 0) return "observes-pending";
  return numberFor(selection.heldMutexBlockers, taskSlot) > 0 ? "mutex-held" : undefined;
}

/** Public catalog/validation/select rejection payloads retain declared duplicates and lexical order. */
function blockerPayloadFor(
  state: AdmissionCoreState,
  taskSlot: number,
  stage: PendingBlockerStage
): AdmissionSelectionRejectionReason {
  const task = requiredTask(state, taskSlot);
  if (stage === "depends-on-pending") {
    const pendingDependencies = task.dependsOn.filter((taskId) => {
      const dependencySlot = requiredTaskSlot(state, taskId);
      return statusFor(state, dependencySlot).kind !== "settled";
    });
    return Object.freeze({ kind: stage, taskIds: sorted(pendingDependencies) });
  }
  if (stage === "observes-pending") {
    const pendingObservations = task.observes.filter((taskId) => {
      const observationSlot = requiredTaskSlot(state, taskId);
      return statusFor(state, observationSlot).kind !== "settled";
    });
    return Object.freeze({ kind: stage, taskIds: sorted(pendingObservations) });
  }
  const heldMutexes = task.mutex.filter((mutexId) => isMutexHeld(state, mutexId));
  return Object.freeze({ kind: stage, mutexIds: sorted(heldMutexes) });
}

/** Shared payload-free selection predicate for candidates and inspection next-boundary. */
function isAdmissionEligibleForPendingTask(state: AdmissionCoreState, taskSlot: number): boolean {
  return (
    blockerStageFor(state, taskSlot) === undefined && hasCapacityForPendingTask(state, taskSlot)
  );
}

function hasCapacityForPendingTask(state: AdmissionCoreState, taskSlot: number): boolean {
  const selection = state.selection;
  return (
    scopeCapacityBlockerFor(state, taskSlot, selection.runningTotal) === undefined &&
    selection.runningTotal < state.compiled.maxParallel
  );
}

function capacityRejectionFor(
  state: AdmissionCoreState,
  taskSlot: number
): AdmissionSelectionRejectionReason | undefined {
  const selection = state.selection;
  const running = selection.runningTotal;
  const scope = scopeCapacityBlockerFor(state, taskSlot, running);
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

/**
 * Scope capacity deliberately compares every candidate with global runningTotal.
 * The sorted active-scope root makes the steady-state query O(1), while an
 * activating candidate participates as one additional exact scope fact.
 */
function scopeCapacityBlockerFor(
  state: AdmissionCoreState,
  taskSlot: number,
  running: number
): PlannedTaskGraph["scopes"][number] | undefined {
  const selection = state.selection;
  let selectedScopeSlot: number | undefined = selection.activeScopeSlots[0];
  if (
    selectedScopeSlot !== undefined &&
    requiredScope(state, selectedScopeSlot).maxParallel > running
  ) {
    selectedScopeSlot = undefined;
  }
  const taskScopeSlot = state.compiled.taskScopeSlots[taskSlot];
  if (
    taskScopeSlot !== undefined &&
    isScopeInactive(state, taskScopeSlot) &&
    state.compiled.taskActivatesScope[taskSlot] === true &&
    requiredScope(state, taskScopeSlot).maxParallel <= running
  ) {
    if (
      selectedScopeSlot === undefined ||
      compareScopeCapacity(state, taskScopeSlot, selectedScopeSlot) < 0
    ) {
      selectedScopeSlot = taskScopeSlot;
    }
  }
  return selectedScopeSlot === undefined ? undefined : requiredScope(state, selectedScopeSlot);
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
    const forcedTaskSlot = nextForcedTask(next);
    if (forcedTaskSlot === undefined) return freezeTransition(next, effects, effectStates);
    const task = requiredTask(next, forcedTaskSlot);
    const dependencyIds = task.dependsOn.filter((taskId) => {
      const status = statusFor(next, requiredTaskSlot(next, taskId));
      return status.kind === "settled" && status.settlementKind !== "completed";
    });
    next = withTaskStatus(
      withoutForcedTask(next),
      forcedTaskSlot,
      Object.freeze({ kind: "settled", settlementKind: "blocked" })
    );
    effects.push(
      Object.freeze({
        dependencyIds: Object.freeze(dependencyIds),
        kind: "settled",
        settlementKind: "blocked",
        taskId: task.id
      })
    );
    effectStates.push(next);
  }
}

/** The leftist root is always the greatest declared task slot, without re-sorting a frontier. */
function nextForcedTask(state: AdmissionCoreState): number | undefined {
  return state.selection.forcedQueue?.taskSlot;
}

function withoutForcedTask(state: AdmissionCoreState): AdmissionCoreState {
  const selection = state.selection;
  const root = selection.forcedQueue;
  if (root === undefined) return state;
  return freezeCoreState(
    state.compiled,
    freezeSelectionIndex({
      ...selection,
      forcedQueue: mergeForcedTaskQueues(root.left, root.right)
    })
  );
}

function activeScopesFor(state: AdmissionCoreState): PlannedTaskGraph["scopes"][number][] {
  return state.selection.activeScopeSlots.map((slot) => requiredScope(state, slot));
}

function scopeLifecycleFor(
  state: AdmissionCoreState,
  scopeSlot: number
): "inactive" | "active" | "closed" {
  const scope = requiredScope(state, scopeSlot);
  if (statusFor(state, requiredTaskSlot(state, scope.terminalTaskId)).kind === "settled")
    return "closed";
  return numberFor(state.selection.activeScopes, scopeSlot) > 0 ? "active" : "inactive";
}

function isScopeInactive(state: AdmissionCoreState, scopeSlot: number): boolean {
  return scopeLifecycleFor(state, scopeSlot) === "inactive";
}

function effectiveMaxParallelFor(state: AdmissionCoreState): number {
  const selection = state.selection;
  const constrainedScope = selection.activeScopeSlots[0];
  return constrainedScope === undefined
    ? state.compiled.maxParallel
    : Math.min(state.compiled.maxParallel, requiredScope(state, constrainedScope).maxParallel);
}

function isMutexHeld(state: AdmissionCoreState, mutexId: string): boolean {
  const selection = state.selection;
  if (selection.legacyRunningMutexes?.includes(mutexId) === true) return true;
  const mutexSlot = state.compiled.mutexSlotById.get(mutexId);
  return mutexSlot !== undefined && numberFor(selection.mutexHolders, mutexSlot) > 0;
}

function isCoreComplete(state: AdmissionCoreState): boolean {
  return state.selection.remainingTaskCount === 0;
}

function statusFor(state: AdmissionCoreState, taskSlot: number): CoreTaskStatus {
  return statusForSelection(state.selection, taskSlot);
}

function withTaskStatus(
  state: AdmissionCoreState,
  taskSlot: number,
  status: CoreTaskStatus
): AdmissionCoreState {
  return freezeCoreState(
    state.compiled,
    transitionSelection(state.compiled, state.selection, taskSlot, status, undefined)
  );
}

function withSelectedTaskStatus(
  state: AdmissionCoreState,
  taskSlot: number,
  status: CoreTaskStatus
): AdmissionCoreState {
  const scopeSlot = state.compiled.taskScopeSlots[taskSlot];
  const activatedScopeSlot =
    scopeSlot !== undefined &&
    isScopeInactive(state, scopeSlot) &&
    state.compiled.taskActivatesScope[taskSlot] === true
      ? scopeSlot
      : undefined;
  return freezeCoreState(
    state.compiled,
    transitionSelection(state.compiled, state.selection, taskSlot, status, activatedScopeSlot)
  );
}

function initialSelectionFor(compiled: CompiledAdmissionGraph): AdmissionSelectionIndex {
  return selectionForSeed(
    compiled,
    compiled.graph.tasks.map(() => PENDING),
    undefined,
    undefined
  );
}

function selectionForSeed(
  compiled: CompiledAdmissionGraph,
  statuses: readonly CoreTaskStatus[],
  activeScopeIds: readonly string[] | undefined,
  legacyRunningMutexes: readonly string[] | undefined
): AdmissionSelectionIndex {
  const activeScopeSlots = activeScopeIds
    ?.map((scopeId) => compiled.scopeSlotById.get(scopeId))
    .filter((slot): slot is number => slot !== undefined);
  return buildSemanticSelection(
    compiled,
    persistentStatuses(statuses),
    activeScopeSlots,
    legacyRunningMutexes
  );
}

function transitionSelection(
  compiled: CompiledAdmissionGraph,
  selection: AdmissionSelectionIndex,
  taskSlot: number,
  status: CoreTaskStatus,
  activatedScopeSlot: number | undefined
): AdmissionSelectionIndex {
  return transitionIndexedSelection(compiled, selection, taskSlot, status, activatedScopeSlot);
}

/** Dense task IDs, persistent indexed updates, and reverse-neighbor counter deltas. */
function transitionIndexedSelection(
  compiled: CompiledAdmissionGraph,
  selection: AdmissionSelectionIndex,
  taskSlot: number,
  status: CoreTaskStatus,
  activatedScopeSlot: number | undefined
): AdmissionSelectionIndex {
  const previous = statusForSelection(selection, taskSlot);
  const statuses = withStatusAt(selection.statuses, taskSlot, status);
  let runningTotal = selection.runningTotal;
  let remainingTaskCount = selection.remainingTaskCount;
  let mutexHolders = selection.mutexHolders;
  let heldMutexBlockers = selection.heldMutexBlockers;
  if (previous.kind === "pending" && status.kind === "running") {
    runningTotal += 1;
    mutexHolders = withNumberDeltas(
      mutexHolders,
      compiled.taskMutexSlots[taskSlot].map((mutexSlot) => [mutexSlot, 1] as const)
    );
    heldMutexBlockers = withNumberDeltas(
      heldMutexBlockers,
      mutexBlockerDeltasFor(compiled, taskSlot, 1)
    );
  }
  if (previous.kind === "running" && status.kind === "settled") {
    runningTotal -= 1;
    remainingTaskCount -= 1;
    mutexHolders = withNumberDeltas(
      mutexHolders,
      compiled.taskMutexSlots[taskSlot].map((mutexSlot) => [mutexSlot, -1] as const)
    );
    heldMutexBlockers = withNumberDeltas(
      heldMutexBlockers,
      mutexBlockerDeltasFor(compiled, taskSlot, -1)
    );
  }
  if (previous.kind === "pending" && status.kind === "settled") remainingTaskCount -= 1;

  let pendingDependencies = selection.pendingDependencies;
  let nonCompletedDependencies = selection.nonCompletedDependencies;
  let pendingObservations = selection.pendingObservations;
  let forcedQueue = selection.forcedQueue;
  if (previous.kind !== "settled" && status.kind === "settled") {
    const dependencyDeltas = compiled.relationIndexes.reverseDependencies[taskSlot].map(
      (dependentSlot) => [dependentSlot, -1] as const
    );
    pendingDependencies = withNumberDeltas(pendingDependencies, dependencyDeltas);
    if (status.settlementKind !== "completed") {
      nonCompletedDependencies = withNumberDeltas(
        nonCompletedDependencies,
        compiled.relationIndexes.reverseDependencies[taskSlot].map(
          (dependentSlot) => [dependentSlot, 1] as const
        )
      );
    }
    pendingObservations = withNumberDeltas(
      pendingObservations,
      compiled.relationIndexes.reverseObservations[taskSlot].map(
        (observerSlot) => [observerSlot, -1] as const
      )
    );
    const readyForced = new Set<number>();
    for (const dependentSlot of compiled.relationIndexes.reverseDependencies[taskSlot]) {
      if (
        statusForStore(statuses, dependentSlot).kind === "pending" &&
        numberFor(pendingDependencies, dependentSlot) === 0 &&
        numberFor(nonCompletedDependencies, dependentSlot) > 0
      ) {
        readyForced.add(dependentSlot);
      }
    }
    forcedQueue = enqueueForcedTaskSlots(forcedQueue, readyForced);
  }
  let activeScopes = selection.activeScopes;
  let activeScopeSlots = selection.activeScopeSlots;
  if (activatedScopeSlot !== undefined && numberFor(activeScopes, activatedScopeSlot) === 0) {
    activeScopes = withNumberDeltas(activeScopes, [[activatedScopeSlot, 1]]);
    activeScopeSlots = insertActiveScopeSlot(compiled, activeScopeSlots, activatedScopeSlot);
  }
  if (previous.kind !== "settled" && status.kind === "settled") {
    for (const scopeSlot of compiled.scopeSlotsByTerminalTaskSlot[taskSlot]) {
      activeScopeSlots = Object.freeze(
        activeScopeSlots.filter((candidate) => candidate !== scopeSlot)
      );
    }
  }
  return freezeSelectionIndex({
    activeScopeSlots,
    activeScopes,
    forcedQueue,
    legacyRunningMutexes: selection.legacyRunningMutexes,
    mutexHolders,
    heldMutexBlockers,
    nonCompletedDependencies,
    pendingDependencies,
    pendingObservations,
    remainingTaskCount,
    runningTotal,
    statuses
  });
}

function buildSemanticSelection(
  compiled: CompiledAdmissionGraph,
  statuses: StatusStore,
  initialActiveScopeSlots: readonly number[] | undefined,
  legacyRunningMutexes: readonly string[] | undefined
): AdmissionSelectionIndex {
  const pendingDependencies: number[] = [];
  const nonCompletedDependencies: number[] = [];
  const pendingObservations: number[] = [];
  const mutexHolders = Array.from({ length: compiled.mutexSlotById.size }, () => 0);
  const heldMutexBlockers = compiled.graph.tasks.map(() => 0);
  const activeScopes = Array.from({ length: compiled.graph.scopes.length }, () => 0);
  for (const scopeSlot of initialActiveScopeSlots ?? []) activeScopes[scopeSlot] = 1;
  let remainingTaskCount = 0;
  let runningTotal = 0;
  for (const [taskSlot, task] of compiled.graph.tasks.entries()) {
    const status = statusForStore(statuses, taskSlot);
    if (status.kind === "pending" || status.kind === "running") remainingTaskCount += 1;
    if (status.kind === "running") {
      runningTotal += 1;
      for (const mutexSlot of compiled.taskMutexSlots[taskSlot]) mutexHolders[mutexSlot] += 1;
    }
    let pendingDependencyCount = 0;
    let nonCompletedDependencyCount = 0;
    for (const dependencyId of task.dependsOn) {
      const dependency = statusForStore(
        statuses,
        requiredTaskSlotForCompiled(compiled, dependencyId)
      );
      if (dependency.kind !== "settled") pendingDependencyCount += 1;
      else if (dependency.settlementKind !== "completed") nonCompletedDependencyCount += 1;
    }
    pendingDependencies.push(pendingDependencyCount);
    nonCompletedDependencies.push(nonCompletedDependencyCount);
    let pendingObservationCount = 0;
    for (const observationId of task.observes) {
      if (
        statusForStore(statuses, requiredTaskSlotForCompiled(compiled, observationId)).kind !==
        "settled"
      ) {
        pendingObservationCount += 1;
      }
    }
    pendingObservations.push(pendingObservationCount);
  }
  const legacyHeldMutexes = new Set(legacyRunningMutexes);
  for (const [taskSlot, task] of compiled.graph.tasks.entries()) {
    for (const [mutexOccurrence, mutexSlot] of compiled.taskMutexSlots[taskSlot].entries()) {
      // Dynamic holder occurrences and legacy snapshot mutexes are separate additive sources.
      heldMutexBlockers[taskSlot] += mutexHolders[mutexSlot];
      if (legacyHeldMutexes.has(task.mutex[mutexOccurrence])) heldMutexBlockers[taskSlot] += 1;
    }
  }
  const activeScopeSlots = sortedActiveScopeSlots(
    compiled,
    activeScopes
      .map((active, scopeSlot) => (active > 0 ? scopeSlot : undefined))
      .filter((scopeSlot): scopeSlot is number => scopeSlot !== undefined)
      .filter(
        (scopeSlot) =>
          statusForStore(
            statuses,
            requiredTaskSlotForCompiled(
              compiled,
              requiredScopeForCompiled(compiled, scopeSlot).terminalTaskId
            )
          ).kind !== "settled"
      )
  );
  const forcedQueue = forcedQueueFromTaskSlots(
    compiled.graph.tasks
      .map((_, taskSlot) => taskSlot)
      .filter(
        (taskSlot) =>
          statusForStore(statuses, taskSlot).kind === "pending" &&
          pendingDependencies[taskSlot] === 0 &&
          (nonCompletedDependencies[taskSlot] ?? 0) > 0
      )
  );
  return freezeSelectionIndex({
    activeScopeSlots,
    activeScopes: persistentNumbersFor(activeScopes),
    forcedQueue,
    legacyRunningMutexes:
      legacyRunningMutexes === undefined ? undefined : Object.freeze([...legacyRunningMutexes]),
    mutexHolders: persistentNumbersFor(mutexHolders),
    heldMutexBlockers: persistentNumbersFor(heldMutexBlockers),
    nonCompletedDependencies: persistentNumbersFor(nonCompletedDependencies),
    pendingDependencies: persistentNumbersFor(pendingDependencies),
    pendingObservations: persistentNumbersFor(pendingObservations),
    remainingTaskCount,
    runningTotal,
    statuses
  });
}

function insertActiveScopeSlot(
  compiled: CompiledAdmissionGraph,
  slots: readonly number[],
  next: number
): readonly number[] {
  if (slots.includes(next)) return slots;
  return Object.freeze(sortedActiveScopeSlots(compiled, [...slots, next]));
}

function sortedActiveScopeSlots(
  compiled: CompiledAdmissionGraph,
  slots: readonly number[]
): readonly number[] {
  return Object.freeze(
    [...slots].sort((left, right) => compareScopeCapacityForCompiled(compiled, left, right))
  );
}

function compareScopeCapacity(state: AdmissionCoreState, left: number, right: number): number {
  return compareScopeCapacityForCompiled(state.compiled, left, right);
}

function compareScopeCapacityForCompiled(
  compiled: CompiledAdmissionGraph,
  left: number,
  right: number
): number {
  const leftScope = requiredScopeForCompiled(compiled, left);
  const rightScope = requiredScopeForCompiled(compiled, right);
  return leftScope.maxParallel - rightScope.maxParallel || compareText(leftScope.id, rightScope.id);
}

function forcedQueueRank(queue: ForcedTaskQueue): number {
  return queue?.rank ?? 0;
}

/** Merges by task slot; only the right spine is copied and retained branches stay shared. */
function mergeForcedTaskQueues(left: ForcedTaskQueue, right: ForcedTaskQueue): ForcedTaskQueue {
  if (left === undefined) return right;
  if (right === undefined) return left;
  if (left.taskSlot < right.taskSlot) return mergeForcedTaskQueues(right, left);
  const mergedRight = mergeForcedTaskQueues(left.right, right);
  const nextLeft =
    forcedQueueRank(left.left) >= forcedQueueRank(mergedRight) ? left.left : mergedRight;
  const nextRight = nextLeft === left.left ? mergedRight : left.left;
  return Object.freeze({
    left: nextLeft,
    rank: forcedQueueRank(nextRight) + 1,
    right: nextRight,
    taskSlot: left.taskSlot
  });
}

function forcedQueueWithTask(queue: ForcedTaskQueue, taskSlot: number): ForcedTaskQueue {
  return mergeForcedTaskQueues(
    queue,
    Object.freeze({ left: undefined, rank: 1, right: undefined, taskSlot })
  );
}

function forcedQueueFromTaskSlots(taskSlots: readonly number[]): ForcedTaskQueue {
  let queue: ForcedTaskQueue;
  for (const taskSlot of taskSlots) queue = forcedQueueWithTask(queue, taskSlot);
  return queue;
}

/** Additions are newly-ready reverse dependents, so no extant frontier is copied or sorted. */
function enqueueForcedTaskSlots(
  existing: ForcedTaskQueue,
  additions: ReadonlySet<number>
): ForcedTaskQueue {
  let queue = existing;
  for (const taskSlot of additions) queue = forcedQueueWithTask(queue, taskSlot);
  return queue;
}

function persistentStatuses(values: readonly CoreTaskStatus[]): StatusStore {
  return Object.freeze({ values: List(values) });
}

function persistentNumbersFor(values: readonly number[]): NumberStore {
  return Object.freeze({ values: List(values) });
}

function statusForSelection(selection: AdmissionSelectionIndex, taskSlot: number): CoreTaskStatus {
  return statusForStore(selection.statuses, taskSlot);
}

function statusForStore(store: StatusStore, taskSlot: number): CoreTaskStatus {
  const value = store.values.get(taskSlot);
  if (value === undefined) throw new Error(`admission core task slot is unknown: ${taskSlot}`);
  return value;
}

function withStatusAt(store: StatusStore, taskSlot: number, value: CoreTaskStatus): StatusStore {
  if (taskSlot < 0 || taskSlot >= store.values.size)
    throw new Error(`admission core task slot is unknown: ${taskSlot}`);
  return Object.freeze({ values: store.values.set(taskSlot, value) });
}

function numberFor(store: NumberStore, slot: number): number {
  const value = store.values.get(slot);
  if (value === undefined) throw new Error(`admission core index slot is unknown: ${slot}`);
  return value;
}

function withNumberDeltas(
  store: NumberStore,
  deltas: readonly (readonly [number, number])[]
): NumberStore {
  if (deltas.length === 0) return store;
  const aggregated = new Map<number, number>();
  for (const [slot, delta] of deltas) aggregated.set(slot, (aggregated.get(slot) ?? 0) + delta);
  let values = store.values;
  for (const [slot, delta] of aggregated) {
    const current = values.get(slot);
    if (current === undefined) throw new Error(`admission core index slot is unknown: ${slot}`);
    values = values.set(slot, current + delta);
  }
  return Object.freeze({ values });
}

function mutexBlockerDeltasFor(
  compiled: CompiledAdmissionGraph,
  taskSlot: number,
  delta: 1 | -1
): readonly (readonly [number, number])[] {
  const deltas: [number, number][] = [];
  for (const mutexSlot of compiled.taskMutexSlots[taskSlot]) {
    for (const blockedTaskSlot of compiled.relationIndexes.reverseMutexOccurrences[mutexSlot] ??
      []) {
      deltas.push([blockedTaskSlot, delta]);
    }
  }
  return deltas;
}

function freezeCoreState(
  compiled: CompiledAdmissionGraph,
  selection: AdmissionSelectionIndex
): AdmissionCoreState {
  return Object.freeze({ compiled, selection });
}

function freezeSelectionIndex(selection: AdmissionSelectionIndex): AdmissionSelectionIndex {
  return Object.freeze(selection);
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

function requiredTask(state: AdmissionCoreState, taskSlot: number): PlannedTask {
  return requiredTaskForCompiled(state.compiled, taskSlot);
}

function requiredTaskForCompiled(compiled: CompiledAdmissionGraph, taskSlot: number): PlannedTask {
  const task = compiled.graph.tasks[taskSlot];
  if (task === undefined) throw new Error(`admission core task slot is unknown: ${taskSlot}`);
  return task;
}

function requiredTaskSlot(state: AdmissionCoreState, taskId: string): number {
  return requiredTaskSlotForCompiled(state.compiled, taskId);
}

function requiredTaskSlotForCompiled(compiled: CompiledAdmissionGraph, taskId: string): number {
  const taskSlot = compiled.taskSlotsById.get(taskId);
  if (taskSlot === undefined) throw new Error(`admission core task is unknown: ${taskId}`);
  return taskSlot;
}

function requiredScope(
  state: AdmissionCoreState,
  scopeSlot: number
): PlannedTaskGraph["scopes"][number] {
  return requiredScopeForCompiled(state.compiled, scopeSlot);
}

function requiredScopeForCompiled(
  compiled: CompiledAdmissionGraph,
  scopeSlot: number
): PlannedTaskGraph["scopes"][number] {
  const scope = compiled.graph.scopes[scopeSlot];
  if (scope === undefined) throw new Error(`admission core scope slot is unknown: ${scopeSlot}`);
  return scope;
}

function requiredScopeSlot(state: AdmissionCoreState, scopeId: string): number {
  const scopeSlot = state.compiled.scopeSlotById.get(scopeId);
  if (scopeSlot === undefined) throw new Error(`admission core scope is unknown: ${scopeId}`);
  return scopeSlot;
}

function sorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...values].sort(compareText));
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
