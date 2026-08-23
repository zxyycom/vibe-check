import type {
  CheckDependencies,
  CheckExecutionContext,
  CheckOutcome,
  CheckProjectContext
} from "../definition/custom-check.ts";
import type { NormalizedCheck } from "../definition/project.ts";
import {
  CoreInvariantFailure,
  type TrustedCheckScope
} from "../quality-core/check-record/core-session.ts";

export type CallbackExecution = Readonly<
  | {
      /** Raw author result; Core owns its sole validation and canonicalization. */
      readonly source: "author";
      readonly result: unknown;
    }
  | {
      /** Only callback containment may create a Product-controlled outcome. */
      readonly source: "product";
      readonly result: CheckOutcome;
    }
>;

interface CheckCallbackInput {
  readonly check: NormalizedCheck;
  readonly dependencies: CheckDependencies;
  readonly project: CheckProjectContext;
  readonly scope: TrustedCheckScope;
  readonly signal: AbortSignal;
}

interface CheckReporterLifecycle {
  readonly records: CheckExecutionContext<object>["records"];
  close(): void;
}

/** Runs one trusted callback and closes its Check-owned reporter before return. */
export async function executeCheckCallback(input: CheckCallbackInput): Promise<CallbackExecution> {
  const reporter = createCheckReporter(input.scope);
  let result: CallbackExecution;
  try {
    const context = Object.freeze({
      dependencies: input.dependencies,
      options: input.check.options,
      project: input.project,
      records: reporter.records,
      signal: input.signal
    });
    const callbackResult = await input.check.execution(context);
    result = input.signal.aborted
      ? productResult("execution-cancelled")
      : Object.freeze({ source: "author", result: callbackResult });
  } catch (error) {
    if (error instanceof CoreInvariantFailure) throw error;
    result = productResult(input.signal.aborted ? "execution-cancelled" : "execution-threw");
  } finally {
    reporter.close();
  }
  return result;
}

function createCheckReporter(scope: TrustedCheckScope): CheckReporterLifecycle {
  let isOpen = true;
  return Object.freeze({
    close: (): void => {
      isOpen = false;
    },
    records: Object.freeze({
      report: (identity: unknown, data: unknown): void => {
        if (!isOpen) throw new Error("Check record reporter is closed");
        scope.records.report(identity, data);
      }
    })
  });
}

function productResult(code: string): CallbackExecution {
  return Object.freeze({
    source: "product",
    result: Object.freeze({ status: "unavailable", reason: Object.freeze({ code }) })
  });
}
