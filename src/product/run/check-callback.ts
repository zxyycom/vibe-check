import type {
  CheckExecutionContext,
  CheckOutcome,
  CheckProjectContext,
  CheckRecordReporter,
  CheckReferenceCandidate,
  CheckResult,
  QualityRecordCandidate
} from "../definition/custom-check.ts";
import type { NormalizedCheck } from "../definition/project.ts";
import type { TrustedCheckScope } from "../quality-core/check-record/core-session.ts";
import { snapshotClosedRecord } from "../quality-core/check-record/plain-record-values.ts";

export interface CallbackExecution {
  readonly reportedReferences: readonly unknown[];
  readonly result: CheckOutcome;
}

interface CheckCallbackInput {
  readonly check: NormalizedCheck;
  readonly project: CheckProjectContext;
  readonly scope: TrustedCheckScope;
  readonly signal: AbortSignal;
}

interface CheckReporterLifecycle {
  readonly records: CheckRecordReporter;
  readonly reportedReferences: unknown[];
  close(): void;
}

/** Runs one trusted callback and closes its Check-owned reporter before return. */
export async function executeCheckCallback(input: CheckCallbackInput): Promise<CallbackExecution> {
  const reporter = createCheckReporter(input.scope);
  let result: CheckOutcome;
  try {
    const context: CheckExecutionContext<object> = Object.freeze({
      options: input.check.options,
      project: input.project,
      records: reporter.records,
      signal: input.signal
    });
    const value = await input.check.execution(context);
    result = outcomeForResult(value);
  } catch {
    result = Object.freeze({
      status: "unavailable",
      reason: { code: input.signal.aborted ? "execution-cancelled" : "execution-threw" }
    });
  } finally {
    reporter.close();
  }
  return Object.freeze({ reportedReferences: reporter.reportedReferences, result });
}

function createCheckReporter(scope: TrustedCheckScope): CheckReporterLifecycle {
  const reportedReferences: unknown[] = [];
  let isOpen = true;
  const records: CheckRecordReporter = Object.freeze({
    report: (candidate: QualityRecordCandidate): void => {
      ensureReporterOpen(isOpen);
      scope.records.report(candidate);
    },
    reportReference: (candidate: CheckReferenceCandidate): void => {
      ensureReporterOpen(isOpen);
      reportedReferences.push(candidate);
    }
  });
  return {
    close: () => {
      isOpen = false;
    },
    records,
    reportedReferences
  };
}

function ensureReporterOpen(isReporterOpen: boolean): void {
  if (!isReporterOpen) throw new Error("Check record reporter is closed");
}

function outcomeForResult(value: unknown): CheckOutcome {
  const result = validateCheckResult(value);
  return result === undefined
    ? Object.freeze({ status: "unavailable", reason: { code: "invalid-execution-result" } })
    : result;
}

function validateCheckResult(value: unknown): CheckResult | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined || typeof data.status !== "string") return undefined;
  switch (data.status) {
    case "completed":
      return validateCompletedCheckResult(data);
    case "not-applicable":
      return validateNotApplicableCheckResult(data);
    case "unavailable":
      return validateUnavailableCheckResult(data);
    default:
      return undefined;
  }
}

function validateCompletedCheckResult(
  data: Readonly<Record<string, unknown>>
): CheckResult | undefined {
  if (!hasExactKeys(data, { required: ["status", "verdict"] })) return undefined;
  if (data.verdict !== "passed" && data.verdict !== "failed") return undefined;
  return Object.freeze({ status: "completed", verdict: data.verdict });
}

function validateNotApplicableCheckResult(
  data: Readonly<Record<string, unknown>>
): CheckResult | undefined {
  if (!hasExactKeys(data, { optional: ["reason"], required: ["status"] })) return undefined;
  if (!Object.hasOwn(data, "reason")) return Object.freeze({ status: "not-applicable" });
  const reason = validateReason(data.reason);
  return reason === undefined ? undefined : Object.freeze({ status: "not-applicable", reason });
}

function validateUnavailableCheckResult(
  data: Readonly<Record<string, unknown>>
): CheckResult | undefined {
  if (!hasExactKeys(data, { required: ["status", "reason"] })) return undefined;
  const reason = validateReason(data.reason);
  return reason === undefined ? undefined : Object.freeze({ status: "unavailable", reason });
}

function validateReason(value: unknown): Readonly<{ readonly code: string }> | undefined {
  const data = snapshotClosedRecord(value);
  return data !== undefined &&
    hasExactKeys(data, { required: ["code"] }) &&
    typeof data.code === "string" &&
    data.code.length > 0
    ? Object.freeze({ code: data.code })
    : undefined;
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  fields: Readonly<{ readonly optional?: readonly string[]; readonly required: readonly string[] }>
): boolean {
  const supported = new Set([...fields.required, ...(fields.optional ?? [])]);
  return (
    fields.required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => supported.has(key))
  );
}
