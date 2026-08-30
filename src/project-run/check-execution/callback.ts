import type {
  CheckDependencies,
  CheckExecutionContext,
  CheckOutcome,
  CheckProjectContext
} from "../../check/check.ts";
import type { NormalizedCheck } from "../../project-definition/project-definition.ts";
import { CoreInvariantFailure, type TrustedCheckScope } from "../../check-settlement/session.ts";
import { diagnosticTags, type DiagnosticLogger } from "../diagnostic-logging/logger.ts";

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
  const checkTags = diagnosticTags(`CHECK:${checkId}`, "EXECUTION");
  const reporter = createCheckReporter(input.scope, input.diagnosticLogger, checkTags);
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
        event: "callback.cancelled",
        tags: diagnosticTags(...checkTags, "CANCELLED"),
        details: { result: callbackResult }
      });
    }
    result = input.signal.aborted
      ? productResult("execution-cancelled")
      : Object.freeze({ source: "author", result: callbackResult });
  } catch (error) {
    if (error instanceof CoreInvariantFailure) throw error;
    input.diagnosticLogger?.observe({
      event: input.signal.aborted ? "callback.cancelled" : "callback.threw",
      tags: diagnosticTags(...checkTags, input.signal.aborted ? "CANCELLED" : "THREW"),
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
  checkTags: readonly string[]
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
          event: "record.reported",
          tags: diagnosticTags(...checkTags, "RECORD", result.toUpperCase()),
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
