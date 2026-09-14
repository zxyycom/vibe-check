import type { CheckProjectContext } from "../../check/check.ts";
import type { CheckAggregation } from "../controls/contract.ts";
import { createAdmissionStrategyProvider } from "../admission-strategy-provider/provider.ts";
import { AdmissionStrategyPreparationFailure } from "../admission-strategy-provider/custom-strategy-preparation.ts";
import type { PreparedAdmissionStrategy } from "../admission-strategy-provider/prepared-admission-strategy.ts";
import { prepareTaskGraph } from "../task-scheduler/graph.ts";
import type { ResolvedCheckExecution } from "../check-execution/resolved-execution-result.ts";
import { planStaticCheckGraph } from "../check-execution/plan.ts";
import { prepareProjectChanges } from "../changes/git.ts";
import { createProjectContext } from "../project-context.ts";
import type { OutputStatuses } from "../outputs/status.ts";
import { isCancelled, type NonConfigurationRunResult } from "../result.ts";
import { mapResolvedExecutionToRunCandidate } from "./candidate.ts";
import { cancelledBeforeExecution, executionResult } from "./candidates.ts";
import type { Invocation } from "./run.ts";
import { executeScheduler, type SchedulerExecution } from "./scheduler.ts";

/** Executes the post-validation invocation phases, from change preparation through Scheduler completion. */
export async function executePlannedInvocation(
  invocation: Invocation,
  aggregation: CheckAggregation | undefined
): Promise<NonConfigurationRunResult> {
  if (isCancelled(invocation.controls)) return cancelledBeforeExecution(invocation, "pre-work");
  const preparedChanges =
    invocation.normalized.changes === undefined
      ? undefined
      : prepareProjectChanges({
          callerFlags: invocation.controls.flags ?? [],
          changes: invocation.normalized.changes,
          projectRoot: invocation.paths.projectRoot
        });
  return executePreparedInvocation(
    invocation,
    aggregation,
    createProjectContext({
      ...(preparedChanges === undefined ? {} : { changes: preparedChanges.projectChanges }),
      controls: invocation.controls,
      paths: invocation.paths
    }),
    preparedChanges?.effectiveFlags ?? invocation.controls.flags ?? []
  );
}
async function executePreparedInvocation(
  invocation: Invocation,
  aggregation: CheckAggregation | undefined,
  project: CheckProjectContext,
  effectiveFlags: readonly string[]
): Promise<NonConfigurationRunResult> {
  if (isCancelled(invocation.controls)) return cancelledBeforeExecution(invocation, "planning");
  let preparedStrategy: PreparedAdmissionStrategy;
  try {
    preparedStrategy = await prepareAdmissionStrategy(invocation);
  } catch (error) {
    if (error instanceof AdmissionStrategyPreparationFailure) {
      return executionResult(invocation, "admission-strategy-preparation-failed");
    }
    throw error;
  }
  if (preparedStrategy.completion.kind === "terminal-effect") {
    invocation.outputs.enableTerminalEffects();
  }
  invocation.progressRendering.prepared(
    invocation.normalized.checks.length,
    invocation.normalized.checks.filter((check) => check.omitQuietPassedRow).length
  );
  const executionStartedAt = invocation.clock.now();
  const executed = await executeScheduler({
    effectiveFlags,
    invocation,
    preparedStrategy,
    project
  });
  if (isExecutionRunResult(executed)) return executed;
  await completeAdmissionStrategyAfterTerminalMeasurement(
    preparedStrategy,
    executed,
    invocation.outputs
  );
  return mapResolvedExecutionToRunCandidate({
    aggregation,
    executed,
    executionStartedAt,
    invocation
  });
}

/** Composes one invocation-local strategy only after the static Task graph is valid. */
async function prepareAdmissionStrategy(
  invocation: Invocation
): Promise<PreparedAdmissionStrategy> {
  const graph = prepareTaskGraph(
    planStaticCheckGraph(
      invocation.normalized.checks,
      invocation.normalized.declarative.scheduler.resourceCapacities
    ),
    invocation.normalized.declarative.scheduler.maxParallel
  );
  const admissionStrategyProviderFactory =
    invocation.admissionStrategyProviderFactory ?? createAdmissionStrategyProvider;
  const provider = admissionStrategyProviderFactory({
    admissionPolicy: invocation.normalized.scheduler.admissionPolicy,
    graph: graph.schedulerGraphSnapshot
  });
  return provider.prepare();
}

/** The prepared provider closes only after Scheduler terminal measurement and Hooks have settled. */
async function completeAdmissionStrategyAfterTerminalMeasurement(
  preparedStrategy: PreparedAdmissionStrategy,
  executed: ResolvedCheckExecution,
  outputs: OutputStatuses
): Promise<void> {
  const terminalMeasurement = executed.terminalSchedulerMeasurement;
  if (terminalMeasurement === undefined) return;
  switch (preparedStrategy.completion.kind) {
    case "none":
      return;
    case "internal":
      try {
        await preparedStrategy.completion.complete(Object.freeze({ terminalMeasurement }));
      } catch {
        // Private learned lifecycle cannot revise sealed execution or public output facts.
      }
      return;
    case "terminal-effect":
      try {
        await preparedStrategy.completion.terminalEffect(terminalMeasurement);
        outputs.succeeded("terminalEffects");
      } catch {
        outputs.failed("terminalEffects");
      }
  }
}

function isExecutionRunResult(
  value: SchedulerExecution
): value is Extract<NonConfigurationRunResult, { readonly kind: "execution" }> {
  return "declarativeFingerprint" in value;
}
