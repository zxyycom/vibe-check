import type { CheckProjectContextSource } from "../project-context.ts";
import { normalizeCheckExecution } from "../../check/context-callback.ts";
import type {
  CheckDependencies,
  CheckExecutionContext,
  CheckMessage,
  CheckOutcome
} from "../../check/check.ts";
import type { NormalizedCheck } from "../../project-definition/project-definition.ts";
import { CoreInvariantFailure, type TrustedCheckScope } from "../../check-settlement/session.ts";
import { diagnosticTags, type DiagnosticLogger } from "../diagnostic-logging/logger.ts";
import { snapshotClosedRecord } from "../../data-boundary/closed-values.ts";
import { invokeWithCapturedConsole } from "./console-capture.ts";
import { diagnosticCallbackResult } from "./terminal-result.ts";

const EMPTY_MESSAGES: readonly CheckMessage[] = Object.freeze([]);

export type CallbackExecution = Readonly<
  | {
      /** Raw author result; Core owns its sole validation and canonicalization. */
      readonly source: "author";
      readonly result: unknown;
      readonly consoleMessages: readonly CheckMessage[];
    }
  | {
      /** Only callback containment may create a Product-controlled outcome. */
      readonly source: "product";
      readonly result: CheckOutcome;
      readonly consoleMessages: readonly CheckMessage[];
    }
>;

interface CheckCallbackInput {
  readonly artifactDirectory: string | null;
  readonly check: NormalizedCheck;
  readonly dependencies: CheckDependencies;
  readonly diagnosticLogger?: DiagnosticLogger;
  readonly invocationId: string;
  readonly project: CheckProjectContextSource;
  readonly scope: TrustedCheckScope;
  readonly signal: AbortSignal;
}

interface CheckReporterLifecycle {
  readonly records: CheckExecutionContext["records"];
  close(): void;
}

/** Runs one trusted callback and closes its Check-owned reporter before return. */
export async function executeCheckCallback(input: CheckCallbackInput): Promise<CallbackExecution> {
  const checkId = input.check.definition.checkId;
  const checkTags = diagnosticTags(`CHECK:${checkId}`, "EXECUTION");
  const execution = normalizeCheckExecution(input.check.execute)!;
  const reporter = execution.contextNeeds.includes("records")
    ? createCheckReporter(input.scope, input.diagnosticLogger, checkTags, checkId)
    : undefined;
  let result: CallbackExecution;
  let consoleMessages = EMPTY_MESSAGES;
  try {
    const context = createCheckExecutionContextSource(input, reporter?.records);
    const invocation = await invokeWithCapturedConsole(() =>
      execution.invoke(context, input.check.options)
    );
    consoleMessages = invocation.messages;
    if (invocation.kind === "threw") throw invocation.error;
    const callbackResult = invocation.output;
    if (input.signal.aborted) {
      input.diagnosticLogger?.observe({
        event: "callback.cancelled",
        tags: diagnosticTags(...checkTags, "CANCELLED"),
        details: { result: diagnosticCallbackResult(callbackResult, input.check.handoff) }
      });
    }
    result = input.signal.aborted
      ? productResult("execution-cancelled", consoleMessages)
      : Object.freeze({
          source: "author",
          result: callbackResult,
          consoleMessages
        });
  } catch (error) {
    if (error instanceof CoreInvariantFailure) throw error;
    input.diagnosticLogger?.observe({
      event: input.signal.aborted ? "callback.cancelled" : "callback.threw",
      tags: diagnosticTags(...checkTags, input.signal.aborted ? "CANCELLED" : "THREW"),
      details: { error }
    });
    result = productResult(
      input.signal.aborted ? "execution-cancelled" : "execution-threw",
      consoleMessages
    );
  } finally {
    reporter?.close();
  }
  return result;
}

function createCheckExecutionContextSource(
  input: CheckCallbackInput,
  records: CheckExecutionContext["records"] | undefined
): Readonly<Partial<CheckExecutionContext>> {
  return Object.freeze({
    get artifactDirectory() {
      return input.artifactDirectory;
    },
    get dependencies() {
      return input.dependencies;
    },
    invocationId: input.invocationId,
    get project() {
      return input.project.getContext();
    },
    ...(records === undefined ? {} : { records }),
    signal: input.signal
  });
}

function createCheckReporter(
  scope: TrustedCheckScope,
  diagnosticLogger: DiagnosticLogger | undefined,
  checkTags: readonly string[],
  checkId: string
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
          details: recordDiagnosticDetails(checkId, identity, result)
        });
      }
    })
  });
}

function productResult(code: string, consoleMessages: readonly CheckMessage[]): CallbackExecution {
  return Object.freeze({
    consoleMessages,
    source: "product",
    result: Object.freeze({ status: "unavailable", reason: Object.freeze({ code }) })
  });
}

function recordDiagnosticDetails(
  checkId: string,
  identity: unknown,
  result: "committed" | "rejected"
): Readonly<Record<string, unknown>> {
  const record = snapshotClosedRecord(identity);
  const recordId =
    record !== undefined &&
    Object.keys(record).length === 1 &&
    Object.hasOwn(record, "id") &&
    typeof record.id === "string"
      ? record.id
      : null;
  return result === "committed"
    ? Object.freeze({ checkId, recordId, result })
    : Object.freeze({ checkId, rejectionCategory: "record-invalid-or-conflict", result });
}
