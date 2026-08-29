import type {
  CheckDependencies,
  CheckExecutionContext,
  CheckOutcome,
  CheckProjectContext
} from "../../check/check.ts";
import type { NormalizedCheck } from "../../project-definition/project-definition.ts";
import { CoreInvariantFailure, type TrustedCheckScope } from "../../check-settlement/session.ts";
import type { DiagnosticLogger } from "../diagnostic-logging/logger.ts";

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
  readonly diagnosticLogger?: DiagnosticLogger;
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
  const checkId = input.check.definition.checkId;
  const diagnosticScope = `CHECK ${checkId} / execution`;
  const reporter = createCheckReporter(input.scope, input.diagnosticLogger, diagnosticScope);
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
    if (input.signal.aborted) {
      input.diagnosticLogger?.observe({
        scope: diagnosticScope,
        event: "callback.cancelled",
        summary: "Check callback result was replaced after cancellation",
        details: { result: callbackResult }
      });
    }
    result = input.signal.aborted
      ? productResult("execution-cancelled")
      : Object.freeze({ source: "author", result: callbackResult });
  } catch (error) {
    if (error instanceof CoreInvariantFailure) throw error;
    input.diagnosticLogger?.observe({
      scope: diagnosticScope,
      event: input.signal.aborted ? "callback.cancelled" : "callback.threw",
      summary: input.signal.aborted
        ? "Check callback was cancelled after throwing"
        : "Check callback threw",
      details: { error }
    });
    result = productResult(input.signal.aborted ? "execution-cancelled" : "execution-threw");
  } finally {
    reporter.close();
  }
  return result;
}

function createCheckReporter(
  scope: TrustedCheckScope,
  diagnosticLogger: DiagnosticLogger | undefined,
  diagnosticScope: string
): CheckReporterLifecycle {
  let isOpen = true;
  return Object.freeze({
    close: (): void => {
      isOpen = false;
    },
    records: Object.freeze({
      report: (identity: unknown, data: unknown): void => {
        if (!isOpen) throw new Error("Check record reporter is closed");
        const result = scope.records.report(identity, data);
        diagnosticLogger?.observe({
          scope: diagnosticScope,
          event: "record.reported",
          summary:
            result === "committed"
              ? "Supplemental Record was committed"
              : "Supplemental Record was rejected",
          details: { data, identity, result }
        });
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
