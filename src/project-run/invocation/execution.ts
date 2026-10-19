import { isFullTerminalContext } from "../task-scheduler/scheduler-terminal-context.ts";
import type { CheckProjectContextSource } from "../project-context.ts";
import type { CheckAggregation } from "../controls/contract.ts";
import { createAdmissionStrategyProvider } from "../admission-strategy-provider/provider.ts";
import { AdmissionStrategyPreparationFailure } from "../admission-strategy-provider/custom-strategy-preparation.ts";
import type { PreparedAdmissionStrategy } from "../admission-strategy-provider/prepared-admission-strategy.ts";
import type { StaticCheckExecutionPlan } from "../check-execution/static-execution-plan.ts";
import type { ResolvedCheckExecution } from "../check-execution/resolved-execution-result.ts";
import { prepareProjectChanges } from "../changes/git.ts";
import { createProjectContextSource } from "../project-context.ts";
import type { OutputStatuses } from "../outputs/status.ts";
import { isCancelled, type NonConfigurationRunResult } from "../result.ts";
import { mapResolvedExecutionToRunCandidate } from "./execution-result-mapping.ts";
import { cancelledBeforeExecution, executionResult } from "./early-return-results.ts";
import type { Invocation } from "./run.ts";
import { executeScheduler, type SchedulerExecution } from "./scheduler.ts";

const EMPTY_EFFECTIVE_FLAGS: readonly string[] = Object.freeze([]);

/** Executes the post-validation invocation phases, from change preparation through Scheduler completion. */
export async function executePlannedInvocation(
  invocation: Invocation,
  plan: StaticCheckExecutionPlan,
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
  const effectiveFlags =
    preparedChanges?.effectiveFlags ?? invocation.controls.flags ?? EMPTY_EFFECTIVE_FLAGS;
  return executeInvocationWithPlan(
    invocation,
    plan,
    aggregation,
    createProjectContextSource({
      ...(preparedChanges === undefined ? {} : { changes: preparedChanges.projectChanges }),
      flags: effectiveFlags,
      root: invocation.paths.projectRoot
    })
  );
}
async function executeInvocationWithPlan(
  invocation: Invocation,
  plan: StaticCheckExecutionPlan,
  aggregation: CheckAggregation | undefined,
  project: CheckProjectContextSource
): Promise<NonConfigurationRunResult> {
  if (isCancelled(invocation.controls)) return cancelledBeforeExecution(invocation, "planning");
  let preparedStrategy: PreparedAdmissionStrategy;
  try {
    preparedStrategy = await prepareAdmissionStrategy(invocation, plan);
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
  const executed = await executeScheduler({ invocation, plan, preparedStrategy, project });
  if (isExecutionRunResult(executed)) return executed;
  await completeAdmissionStrategyAfterTerminalDelivery(
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
  invocation: Invocation,
  plan: StaticCheckExecutionPlan
): Promise<PreparedAdmissionStrategy> {
  const admissionStrategyProviderFactory =
    invocation.admissionStrategyProviderFactory ?? createAdmissionStrategyProvider;
  const provider = admissionStrategyProviderFactory({
    admissionPolicy: invocation.normalized.scheduler.admissionPolicy,
    get graph() {
      return plan.taskGraph.graph.schedulerGraphSnapshot;
    }
  });
  return provider.prepare();
}

/** Scheduler 已排空且通用终态 effects 已交付后关闭 provider；终态 context 不要求包含 measurement。 */
async function completeAdmissionStrategyAfterTerminalDelivery(
  preparedStrategy: PreparedAdmissionStrategy,
  executed: ResolvedCheckExecution,
  outputs: OutputStatuses
): Promise<void> {
  const terminalContext = executed.terminalSchedulerContext;
  if (terminalContext === undefined) return;
  switch (preparedStrategy.completion.kind) {
    case "none":
      return;
    case "internal":
      try {
        if (!isFullTerminalContext(terminalContext))
          throw new Error("internal completion requires full terminal context");
        await preparedStrategy.completion.complete(
          Object.freeze({ terminalMeasurement: terminalContext })
        );
      } catch {
        // Private learned lifecycle cannot revise sealed execution or public output facts.
      }
      return;
    case "terminal-effect":
      try {
        await preparedStrategy.completion.terminalEffect.invoke(terminalContext);
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
