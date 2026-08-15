import type {
  CheckExecutionContext,
  QualityRecordCandidate
} from "../definition/custom-check.ts";
import {
  CoreInvariantFailure,
  createCoreCheckSession,
  type CheckAvailability,
  type CoreCheckSession,
  type CoreCheckTerminalOutcome,
  type TrustedApplicableCheckScope
} from "../quality-core/check-record/core-session.ts";
import type {
  CheckUnavailableDiagnosticCategory,
  CoreSnapshot
} from "../quality-core/check-record/model.ts";
import {
  snapshotClosedRecord
} from "../quality-core/check-record/plain-record-values.ts";
import {
  prepareTaskGraph,
  runTaskGraph,
  type SettledTask
} from "../task-scheduler/index.ts";
import {
  planStaticCheckGraph,
  type ApplicableCheckLayout,
  type TaskPlanLeafLayout
} from "./check-execution-plan.ts";
import type { ResolvedCheck } from "./resolved-check.ts";

const INERT_SIGNAL = new AbortController().signal;
const BUILT_IN_UNAVAILABLE_CATEGORIES = new Set([
  "dependency-unavailable",
  "invalid-result"
]);

export type ResolvedCheckExecution = Readonly<
  | { readonly kind: "completed"; readonly snapshot: CoreSnapshot }
  | { readonly kind: "cancelled"; readonly snapshot: CoreSnapshot }
>;

interface ActiveCheck {
  readonly layout: ApplicableCheckLayout;
  readonly leaves: ActiveTaskPlanLeaf[];
  readonly scope: TrustedApplicableCheckScope;
  availability: CheckAvailability | undefined;
  hasProtocolViolation: boolean;
}

interface ActiveTaskPlanLeaf {
  readonly layout: TaskPlanLeafLayout;
  outcome: LeafOutcome | undefined;
}

type LeafOutcome = Readonly<
  | { readonly kind: "returned"; readonly value: unknown }
  | { readonly kind: "failed" }
>;

interface TaskOperation {
  readonly taskId: string;
  readonly execute: (signal: AbortSignal) => unknown | Promise<unknown>;
}

/** Internal marker: engine failure blocks dependent Tasks after Core settled a normal unavailable Check. */
class CheckUnavailableSignal extends Error {
  public constructor() {
    super("Contained Check is unavailable");
    this.name = "CheckUnavailableSignal";
  }
}

/** A leaf failure is contained Check evidence, but must block local dependent Tasks. */
class ContainedLeafFailureSignal extends Error {
  public constructor() {
    super("Contained TaskPlan leaf failed");
    this.name = "ContainedLeafFailureSignal";
  }
}

/** Any escape from the Product adapter is a trusted Package Run execution failure. */
class CheckExecutionInvariantFailure extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CheckExecutionInvariantFailure";
  }
}

/**
 * Plans every applicable Check into one static engine graph, maps contained
 * outcomes through a Core scope, then freezes retained facts after any
 * cancellation drain.
 */
export async function executeResolvedChecks(input: Readonly<{
  readonly checks: readonly ResolvedCheck[];
  readonly maxParallel: number;
  readonly signal: AbortSignal | undefined;
}>): Promise<ResolvedCheckExecution> {
  const staticPlan = planStaticCheckGraph(input.checks);
  // Validate before Core capabilities are opened and before project work may start.
  prepareTaskGraph(staticPlan.graph, input.maxParallel);

  const session = createCoreCheckSession(input.checks.map((check) => Object.freeze({
    definition: check.definition,
    applicability: check.applicability
  })));
  closeNotApplicableChecks(session, input.checks);

  const activeChecks = openApplicableChecks(session, staticPlan.layouts);
  const operations = createTaskOperations(activeChecks);
  let graphRun: Awaited<ReturnType<typeof runTaskGraph<unknown>>>;
  try {
    graphRun = await runTaskGraph({
      graph: staticPlan.graph,
      maxParallel: input.maxParallel,
      signal: input.signal,
      execute: (task, context) => {
        const operation = operations.find((candidate) => candidate.taskId === task.id);
        if (operation === undefined) {
          throw new CheckExecutionInvariantFailure("Task graph has no Product execution operation");
        }
        return operation.execute(context.signal ?? INERT_SIGNAL);
      }
    });
  } catch (error) {
    throw trustedFailure(error);
  }

  assertNoUnexpectedTaskFailure(graphRun.settlements);
  if (graphRun.cancelled) {
    try {
      settleFailedTaskPlanScopes(activeChecks);
      settleProtocolViolationScopes(activeChecks);
      settleCancellationDependencyUnavailable(activeChecks);
      session.closeUnresolvedAsCancelled();
      markCancelledScopesClosed(activeChecks);
      return Object.freeze({ kind: "cancelled", snapshot: session.freeze() });
    } catch (error) {
      throw trustedFailure(error);
    }
  }

  try {
    settleBlockedTerminals(activeChecks, graphRun.settlements);
    assertAllApplicableChecksSettled(activeChecks);
    return Object.freeze({ kind: "completed", snapshot: session.freeze() });
  } catch (error) {
    throw trustedFailure(error);
  }
}

function closeNotApplicableChecks(session: CoreCheckSession, checks: readonly ResolvedCheck[]): void {
  for (const check of checks) {
    if (check.applicability === "not-applicable") {
      session.closeNotApplicable(check.definition.checkId);
    }
  }
}

function openApplicableChecks(
  session: CoreCheckSession,
  layouts: readonly ApplicableCheckLayout[]
): ActiveCheck[] {
  const activeChecks: ActiveCheck[] = [];
  for (const layout of layouts) {
    const leaves = layout.kind === "task-plan"
      ? layout.leaves.map((leaf) => ({ layout: leaf, outcome: undefined }))
      : [];
    activeChecks.push({
      availability: undefined,
      layout,
      leaves,
      hasProtocolViolation: false,
      scope: session.openApplicableScope(layout.check.definition.checkId)
    });
  }
  return activeChecks;
}

function createTaskOperations(activeChecks: readonly ActiveCheck[]): readonly TaskOperation[] {
  const operations: TaskOperation[] = [];
  for (const active of activeChecks) {
    if (active.layout.kind === "direct") {
      operations.push(Object.freeze({
        taskId: active.layout.terminalTaskId,
        execute: (signal: AbortSignal) => executeDirectCheck(active, signal)
      }));
      continue;
    }
    for (const leaf of active.leaves) {
      operations.push(Object.freeze({
        taskId: leaf.layout.taskId,
        execute: (signal: AbortSignal) => executeTaskPlanLeaf(active, leaf, signal)
      }));
    }
    operations.push(Object.freeze({
      taskId: active.layout.terminalTaskId,
      execute: (signal: AbortSignal) => executeTaskPlanTerminal(active, signal)
    }));
  }
  return Object.freeze(operations);
}

async function executeDirectCheck(active: ActiveCheck, signal: AbortSignal): Promise<void> {
  if (active.layout.kind !== "direct" || active.layout.check.binding.kind !== "direct") {
    throw new CheckExecutionInvariantFailure("Direct Task has no direct Check binding");
  }
  const context = scopedExecutionContext(active, signal);
  let outcome: CoreCheckTerminalOutcome;
  try {
    const value = await active.layout.check.binding.execute(context.value);
    outcome = terminalOutcomeForDirectValue(active.layout.check.binding.source, value);
  } catch {
    outcome = unavailable("execution-failed");
  } finally {
    context.close();
  }
  settleAndSignalUnavailable(active, outcome);
}

async function executeTaskPlanLeaf(
  active: ActiveCheck,
  leaf: ActiveTaskPlanLeaf,
  signal: AbortSignal
): Promise<void> {
  if (active.layout.kind !== "task-plan") {
    throw new CheckExecutionInvariantFailure("TaskPlan leaf belongs to a non-TaskPlan Check");
  }
  const context = scopedExecutionContext(active, signal);
  try {
    const value = await leaf.layout.task.run(context.value);
    leaf.outcome = Object.freeze({ kind: "returned", value });
  } catch {
    leaf.outcome = Object.freeze({ kind: "failed" });
    throw new ContainedLeafFailureSignal();
  } finally {
    context.close();
  }
}

async function executeTaskPlanTerminal(active: ActiveCheck, signal: AbortSignal): Promise<void> {
  if (active.layout.kind !== "task-plan") {
    throw new CheckExecutionInvariantFailure("TaskPlan terminal belongs to a non-TaskPlan Check");
  }
  if (active.leaves.some((leaf) => leaf.outcome?.kind !== "returned")) {
    settleAndSignalUnavailable(active, unavailable("execution-failed"));
    return;
  }

  const outcomes: Record<string, unknown> = {};
  for (const leaf of active.leaves) {
    if (leaf.outcome?.kind !== "returned") {
      throw new CheckExecutionInvariantFailure("TaskPlan terminal has no settled leaf outcome");
    }
    outcomes[leaf.layout.task.id] = leaf.outcome.value;
  }
  const context = scopedExecutionContext(active, signal);
  let terminal: CoreCheckTerminalOutcome;
  try {
    const value = await active.layout.plan.complete(Object.freeze(outcomes), context.value);
    terminal = terminalOutcomeForDirectValue("custom", value);
  } catch {
    terminal = unavailable("execution-failed");
  } finally {
    context.close();
  }
  settleAndSignalUnavailable(active, terminal);
}

function scopedExecutionContext(active: ActiveCheck, signal: AbortSignal): Readonly<{
  readonly close: () => void;
  readonly value: CheckExecutionContext;
}> {
  let isOpen = true;
  return Object.freeze({
    close: () => { isOpen = false; },
    value: Object.freeze({
      signal,
      results: Object.freeze({
        report: (candidate: QualityRecordCandidate) => {
          if (isOpen) {
            active.scope.records.report(candidate);
          } else if (active.availability === undefined) {
            active.hasProtocolViolation = true;
          }
        }
      })
    })
  });
}

function terminalOutcomeForDirectValue(
  source: "built-in" | "custom",
  value: unknown
): CoreCheckTerminalOutcome {
  const data = snapshotClosedRecord(value);
  if (data !== undefined && hasExactKeys(data, ["verdict"])
    && (data.verdict === "passed" || data.verdict === "failed")) {
    return Object.freeze({ kind: "completed", verdict: data.verdict });
  }
  if (source === "built-in" && data !== undefined && hasExactKeys(data, ["kind", "category"])
    && data.kind === "unavailable" && typeof data.category === "string"
    && isBuiltInUnavailableCategory(data.category)) {
    return unavailable(data.category);
  }
  return unavailable("invalid-result");
}

function unavailable(
  category: CheckUnavailableDiagnosticCategory
): CoreCheckTerminalOutcome {
  return Object.freeze({ kind: "unavailable", diagnostic: { category } });
}

function isBuiltInUnavailableCategory(
  value: string
): value is Extract<CheckUnavailableDiagnosticCategory, "dependency-unavailable" | "invalid-result"> {
  return BUILT_IN_UNAVAILABLE_CATEGORIES.has(value);
}

function settleAndSignalUnavailable(active: ActiveCheck, outcome: CoreCheckTerminalOutcome): void {
  const availability = settleActiveCheck(active, outcome);
  if (availability === "unavailable") throw new CheckUnavailableSignal();
}

function settleActiveCheck(
  active: ActiveCheck,
  outcome: CoreCheckTerminalOutcome
): CheckAvailability {
  if (active.availability !== undefined) {
    throw new CheckExecutionInvariantFailure("Applicable Check settled more than once in Run adapter");
  }
  const availability = active.scope.settle(
    active.hasProtocolViolation ? unavailable("capability-protocol") : outcome
  );
  active.availability = availability;
  return availability;
}

function assertNoUnexpectedTaskFailure(
  settlements: readonly SettledTask<unknown>[]
): void {
  const unexpected = settlements.find((entry) => (
    entry.settlement.kind === "failed"
      && !(entry.settlement.error instanceof CheckUnavailableSignal)
      && !(entry.settlement.error instanceof ContainedLeafFailureSignal)
  ));
  if (unexpected !== undefined) {
    throw new CheckExecutionInvariantFailure("Task graph escaped the contained Check adapter");
  }
}

function settleBlockedTerminals(
  activeChecks: readonly ActiveCheck[],
  settlements: readonly SettledTask<unknown>[]
): void {
  for (const active of activeChecks) {
    if (active.availability !== undefined) continue;
    const terminal = settlements.find((entry) => entry.task.id === active.layout.terminalTaskId);
    if (terminal === undefined) {
      throw new CheckExecutionInvariantFailure("Task graph omitted a Check terminal settlement");
    }
    if (terminal.settlement.kind !== "blocked") {
      throw new CheckExecutionInvariantFailure("Unsettled Check terminal was not dependency-blocked");
    }
    const availability = settleActiveCheck(active, unavailable(
      hasFailedLeaf(active) ? "execution-failed" : "dependency-unavailable"
    ));
    if (availability !== "unavailable") {
      throw new CheckExecutionInvariantFailure("Dependency-blocked Check unexpectedly became available");
    }
  }
}

/**
 * Cancellation closes the remaining fact stream only after an already-admitted
 * leaf failure receives its more specific contained terminal mapping.
 */
function settleFailedTaskPlanScopes(activeChecks: readonly ActiveCheck[]): void {
  for (const active of activeChecks) {
    if (active.availability !== undefined || !hasFailedLeaf(active)) continue;
    const availability = settleActiveCheck(active, unavailable("execution-failed"));
    if (availability !== "unavailable") {
      throw new CheckExecutionInvariantFailure("Failed TaskPlan leaf unexpectedly became available");
    }
  }
}

function settleProtocolViolationScopes(activeChecks: readonly ActiveCheck[]): void {
  for (const active of activeChecks) {
    if (active.availability !== undefined || !active.hasProtocolViolation) continue;
    const availability = settleActiveCheck(active, unavailable("capability-protocol"));
    if (availability !== "unavailable") {
      throw new CheckExecutionInvariantFailure("Capability protocol violation became available");
    }
  }
}

/**
 * The engine cancels pending Tasks without reclassifying their already-known
 * prerequisite availability. Propagate settled unavailable Checks to a fixed
 * point before the remaining open scopes close as cancelled.
 */
function settleCancellationDependencyUnavailable(activeChecks: readonly ActiveCheck[]): void {
  let didSettleDependencyUnavailable = true;
  while (didSettleDependencyUnavailable) {
    didSettleDependencyUnavailable = false;
    for (const active of activeChecks) {
      if (active.availability !== undefined || !hasUnavailablePrerequisite(active, activeChecks)) {
        continue;
      }
      const availability = settleActiveCheck(active, unavailable("dependency-unavailable"));
      if (availability !== "unavailable") {
        throw new CheckExecutionInvariantFailure("Unavailable cancellation dependency became available");
      }
      didSettleDependencyUnavailable = true;
    }
  }
}

function hasUnavailablePrerequisite(
  active: ActiveCheck,
  activeChecks: readonly ActiveCheck[]
): boolean {
  return active.layout.check.dependsOn.some((dependencyId) => (
    activeChecks.find((candidate) => (
      candidate.layout.check.definition.checkId === dependencyId
    ))?.availability === "unavailable"
  ));
}

function markCancelledScopesClosed(activeChecks: readonly ActiveCheck[]): void {
  for (const active of activeChecks) {
    active.availability ??= "unavailable";
  }
}

function hasFailedLeaf(active: ActiveCheck): boolean {
  return active.leaves.some((leaf) => leaf.outcome?.kind === "failed");
}

function assertAllApplicableChecksSettled(activeChecks: readonly ActiveCheck[]): void {
  if (activeChecks.some((active) => active.availability === undefined)) {
    throw new CheckExecutionInvariantFailure("Run adapter left an applicable Check scope open");
  }
}

function hasExactKeys(data: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const actual = Object.keys(data);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}

function trustedFailure(error: unknown): Error {
  if (error instanceof CoreInvariantFailure || error instanceof CheckExecutionInvariantFailure) {
    return error;
  }
  return new CheckExecutionInvariantFailure("Task/Core execution invariant failed");
}
