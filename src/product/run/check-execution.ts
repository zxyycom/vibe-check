import type { CheckOutcome, CheckProjectContext } from "../definition/custom-check.ts";
import type { NormalizedCheck } from "../definition/project.ts";
import {
  createCoreCheckSession,
  type CoreCheckSession,
  type TrustedCheckScope
} from "../quality-core/check-record/core-session.ts";
import type { CoreSnapshot } from "../quality-core/check-record/model.ts";
import { prepareTaskGraph, runTaskGraph, type SettledTask } from "../task-scheduler/index.ts";
import { executeCheckCallback, type CallbackExecution } from "./check-callback.ts";
import { planStaticCheckGraph } from "./check-execution-plan.ts";
import {
  canonicalizeReferenceSubmissions,
  validateCheckReferenceSubmission,
  type CheckReferenceSubmission
} from "./check-reference-submissions.ts";

const INERT_SIGNAL = new AbortController().signal;

export type ResolvedCheckExecution = Readonly<
  | {
      readonly kind: "completed";
      readonly references: readonly CheckReferenceSubmission[];
      readonly snapshot: CoreSnapshot;
    }
  | {
      readonly kind: "cancelled";
      readonly references: readonly CheckReferenceSubmission[];
      readonly snapshot: CoreSnapshot;
    }
>;

interface ExecuteCheckInput {
  readonly openedCheckIds: Set<string>;
  readonly check: NormalizedCheck;
  readonly project: CheckProjectContext;
  readonly references: CheckReferenceSubmission[];
  readonly session: CoreCheckSession;
  readonly signal: AbortSignal;
}

/** Internal marker: a settled unavailable Check must block scheduler dependents. */
class CheckUnavailableSignal extends Error {
  public constructor() {
    super("Contained Check is unavailable");
    this.name = "CheckUnavailableSignal";
  }
}

/** Any escape from the Product adapter is a Package Run task-engine failure. */
class CheckExecutionInvariantFailure extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CheckExecutionInvariantFailure";
  }
}

/**
 * Runs the already normalized executable Check collection through one generic
 * Task per Check. Graph validation happens before Core scopes or callbacks.
 */
export async function executeResolvedChecks(
  input: Readonly<{
    readonly checks: readonly NormalizedCheck[];
    readonly maxParallel: number;
    readonly project: CheckProjectContext;
    readonly signal: AbortSignal | undefined;
  }>
): Promise<ResolvedCheckExecution> {
  const graph = planStaticCheckGraph(input.checks);
  prepareTaskGraph(graph, input.maxParallel);

  const session = createCoreCheckSession(
    input.checks.map((check) =>
      Object.freeze({
        definition: check.definition
      })
    )
  );
  const openedCheckIds = new Set<string>();
  const references: CheckReferenceSubmission[] = [];
  let graphRun: Awaited<ReturnType<typeof runTaskGraph<void>>>;
  try {
    graphRun = await runTaskGraph({
      graph,
      maxParallel: input.maxParallel,
      signal: input.signal,
      execute: (task, context) => {
        const check = input.checks.find((candidate) => candidate.definition.checkId === task.id);
        if (check === undefined) {
          throw new CheckExecutionInvariantFailure("Task graph has no executable Check");
        }
        return executeCheck({
          openedCheckIds,
          check,
          project: input.project,
          references,
          session,
          signal: context.signal ?? INERT_SIGNAL
        });
      }
    });
  } catch (error) {
    throw trustedFailure(error);
  }

  try {
    assertContainedTaskFailures(graphRun.settlements);
    settleBlockedChecks(session, input.checks, graphRun.settlements, openedCheckIds);
    if (graphRun.cancelled) {
      session.closeUnresolvedAsCancelled();
      return Object.freeze({
        kind: "cancelled",
        references: canonicalizeReferenceSubmissions(references),
        snapshot: session.freeze()
      });
    }
    assertEveryCheckClosed(input.checks, graphRun.settlements);
    return Object.freeze({
      kind: "completed",
      references: canonicalizeReferenceSubmissions(references),
      snapshot: session.freeze()
    });
  } catch (error) {
    throw trustedFailure(error);
  }
}

async function executeCheck(input: ExecuteCheckInput): Promise<void> {
  const checkId = input.check.definition.checkId;
  const scope = input.session.openCheckScope(checkId);
  input.openedCheckIds.add(checkId);
  const callback = await executeCheckCallback({
    check: input.check,
    project: input.project,
    scope,
    signal: input.signal
  });
  const result = settleCheckReferences(input, scope, callback);
  const settled = scope.settle(result);
  if (settled.status === "unavailable") throw new CheckUnavailableSignal();
}

function settleCheckReferences(
  input: ExecuteCheckInput,
  scope: TrustedCheckScope,
  callback: CallbackExecution
): CheckOutcome {
  if (callback.result.status === "not-applicable" && callback.reportedReferences.length > 0) {
    return Object.freeze({ status: "unavailable", reason: { code: "record-invalid" } });
  }
  const referenceValidation = validateCheckReferenceSubmission({
    candidates: callback.reportedReferences,
    check: input.check,
    project: input.project,
    scope
  });
  if (referenceValidation.kind === "invalid") {
    return Object.freeze({ status: "unavailable", reason: { code: "reference-invalid" } });
  }
  if (referenceValidation.kind === "submitted")
    input.references.push(referenceValidation.submission);
  return callback.result;
}

function settleBlockedChecks(
  session: CoreCheckSession,
  checks: readonly NormalizedCheck[],
  settlements: readonly SettledTask<void>[],
  openedCheckIds: ReadonlySet<string>
): void {
  for (const settled of settlements) {
    if (settled.settlement.kind !== "blocked") continue;
    const check = checks.find((candidate) => candidate.definition.checkId === settled.task.id);
    if (check === undefined || openedCheckIds.has(check.definition.checkId)) {
      throw new CheckExecutionInvariantFailure("Blocked Task does not identify an unopened Check");
    }
    const scope = session.openCheckScope(check.definition.checkId);
    scope.settle(
      Object.freeze({
        status: "unavailable",
        reason: {
          code: "prerequisite-unavailable",
          checkIds: Object.freeze([...new Set(settled.settlement.dependencyIds)].sort(compareText))
        }
      })
    );
  }
}

function assertContainedTaskFailures(settlements: readonly SettledTask<void>[]): void {
  for (const settled of settlements) {
    if (
      settled.settlement.kind === "failed" &&
      !(settled.settlement.error instanceof CheckUnavailableSignal)
    ) {
      throw new CheckExecutionInvariantFailure(
        "Task engine received an unexpected execution failure"
      );
    }
  }
}

function assertEveryCheckClosed(
  checks: readonly NormalizedCheck[],
  settlements: readonly SettledTask<void>[]
): void {
  if (settlements.some((settled) => settled.settlement.kind === "cancelled-before-start")) {
    throw new CheckExecutionInvariantFailure("Non-cancelled Task graph left a Check unstarted");
  }
  if (checks.length !== settlements.length) {
    throw new CheckExecutionInvariantFailure(
      "Task graph does not have one Task per executable Check"
    );
  }
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function trustedFailure(error: unknown): CheckExecutionInvariantFailure {
  return error instanceof CheckExecutionInvariantFailure
    ? error
    : new CheckExecutionInvariantFailure(
        "Check execution adapter escaped its contained failure boundary"
      );
}
