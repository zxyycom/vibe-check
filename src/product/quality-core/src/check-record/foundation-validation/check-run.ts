import {
  CHECK_RESULT_VERDICTS,
  RUN_FAILURE_CATEGORIES,
  type CheckRun,
  type RunCoverage,
  type RunDiagnostic
} from "../model.ts";
import { isCheckRunId } from "../identity.ts";
import {
  accepted,
  acceptedDomain,
  isNonEmptyString,
  isNonNegativeSafeInteger,
  isRecord,
  isStableId,
  issue,
  INVALID_RECORD_EVIDENCE_ID_PATTERN,
  RECORD_ID_PATTERN,
  validateClosedRecord,
  type ValidationResult
} from "./common.ts";

const RUN_DIAGNOSTIC_ID_PATTERN = Object.freeze({
  "record-conflict": RECORD_ID_PATTERN,
  "invalid-record": INVALID_RECORD_EVIDENCE_ID_PATTERN,
  "ack-protocol": /^work-handle\/v1:[a-z0-9]+(?:-[a-z0-9]+)*$/,
  "terminal-report-set": /^terminal-report\/v1:[a-z0-9]+(?:-[a-z0-9]+)*$/,
  "invalid-result": /^result\/v1:[a-z0-9]+(?:-[a-z0-9]+)*$/,
  unavailable: /^dependency\/v1:[a-z0-9]+(?:-[a-z0-9]+)*$/,
  "execution-failed": /^execution\/v1:[a-z0-9]+(?:-[a-z0-9]+)*$/
});

function isRunFailureCategory(value: unknown): value is RunDiagnostic["category"] {
  return RUN_FAILURE_CATEGORIES.some((category) => category === value);
}

function isCompletedVerdict(value: unknown): value is "failed" | "passed" {
  return CHECK_RESULT_VERDICTS.some((verdict) => verdict === value)
    && value !== "not-applicable";
}

function validateCoverage(value: unknown, path: string): ValidationResult<RunCoverage> {
  const closed = validateClosedRecord(value, path, ["plannedWorkCount", "acknowledgedWorkCount"]);
  if (!closed.ok) {
    return closed;
  }
  const coverage = closed.value;
  if (!isNonNegativeSafeInteger(coverage.plannedWorkCount)) {
    return issue(`${path}.plannedWorkCount`, "invalid-value", "plannedWorkCount must be a non-negative safe integer");
  }
  if (!isNonNegativeSafeInteger(coverage.acknowledgedWorkCount)
    || coverage.acknowledgedWorkCount > coverage.plannedWorkCount) {
    return issue(`${path}.acknowledgedWorkCount`, "invalid-value", "acknowledgedWorkCount must be between zero and plannedWorkCount");
  }
  return accepted({
    plannedWorkCount: coverage.plannedWorkCount,
    acknowledgedWorkCount: coverage.acknowledgedWorkCount
  });
}

function validateDiagnostic(value: unknown, path: string): ValidationResult<RunDiagnostic> {
  const closed = validateClosedRecord(value, path, ["category", "tieBreakKey"]);
  if (!closed.ok) {
    return closed;
  }
  const diagnostic = closed.value;
  if (!isRunFailureCategory(diagnostic.category)) {
    return issue(`${path}.category`, "invalid-value", "Unknown run failure category");
  }
  if (!isNonEmptyString(diagnostic.tieBreakKey)) {
    return issue(`${path}.tieBreakKey`, "invalid-value", "tieBreakKey must be non-empty");
  }
  if (!RUN_DIAGNOSTIC_ID_PATTERN[diagnostic.category].test(diagnostic.tieBreakKey)) {
    return issue(`${path}.tieBreakKey`, "invalid-value", "Diagnostic identity does not match its category grammar");
  }
  return accepted({
    category: diagnostic.category,
    tieBreakKey: diagnostic.tieBreakKey
  });
}

function validateUnselectedRun(
  run: Readonly<Record<string, unknown>>
): ValidationResult<CheckRun> {
  if (run.applicability !== null || run.status !== "skipped" || run.result !== null
    || run.coverage !== null || run.diagnostic !== null) {
    return issue("$", "invalid-value", "Unselected runs must be skipped without applicability, result, coverage, or diagnostic");
  }
  return acceptedDomain({
    checkId: run.checkId,
    checkRunId: run.checkRunId,
    selection: "unselected",
    applicability: null,
    status: "skipped",
    result: null,
    coverage: null,
    diagnostic: null
  } as CheckRun);
}

function validateNotApplicableRun(
  run: Readonly<Record<string, unknown>>,
  coverage: RunCoverage
): ValidationResult<CheckRun> {
  if (run.status !== "completed" || !isRecord(run.result) || run.result.verdict !== "not-applicable"
    || Object.keys(run.result).length !== 1 || run.diagnostic !== null
    || coverage.plannedWorkCount !== 0 || coverage.acknowledgedWorkCount !== 0) {
    return issue("$", "invalid-value", "Not-applicable runs must complete with only a not-applicable result and zero coverage");
  }
  return acceptedDomain({
    checkId: run.checkId,
    checkRunId: run.checkRunId,
    selection: "selected",
    applicability: "not-applicable",
    status: "completed",
    result: { verdict: "not-applicable" },
    coverage,
    diagnostic: null
  } as CheckRun);
}

function validateCompletedRun(
  run: Readonly<Record<string, unknown>>,
  coverage: RunCoverage
): ValidationResult<CheckRun> {
  if (!isRecord(run.result) || Object.keys(run.result).length !== 1
    || !isCompletedVerdict(run.result.verdict) || run.diagnostic !== null
    || coverage.acknowledgedWorkCount !== coverage.plannedWorkCount) {
    return issue("$", "invalid-value", "Completed applicable runs require passed or failed result, complete coverage, and no diagnostic");
  }
  return acceptedDomain({
    checkId: run.checkId,
    checkRunId: run.checkRunId,
    selection: "selected",
    applicability: "applicable",
    status: "completed",
    result: { verdict: run.result.verdict },
    coverage,
    diagnostic: null
  } as CheckRun);
}

function validateFailedRun(
  run: Readonly<Record<string, unknown>>,
  coverage: RunCoverage
): ValidationResult<CheckRun> {
  if (run.result !== null) {
    return issue("$.result", "invalid-value", "Failed runs must have a null result");
  }
  const diagnostic = validateDiagnostic(run.diagnostic, "$.diagnostic");
  if (!diagnostic.ok) {
    return diagnostic;
  }
  return acceptedDomain({
    checkId: run.checkId,
    checkRunId: run.checkRunId,
    selection: "selected",
    applicability: "applicable",
    status: "failed",
    result: null,
    coverage,
    diagnostic: diagnostic.value
  } as CheckRun);
}

function validateApplicableRun(
  run: Readonly<Record<string, unknown>>,
  coverage: RunCoverage
): ValidationResult<CheckRun> {
  if (run.status === "completed") {
    return validateCompletedRun(run, coverage);
  }
  if (run.status === "failed") {
    return validateFailedRun(run, coverage);
  }
  return issue("$.status", "invalid-value", "Selected applicable run status must be completed or failed");
}

function validateSelectedRun(
  run: Readonly<Record<string, unknown>>
): ValidationResult<CheckRun> {
  const coverage = validateCoverage(run.coverage, "$.coverage");
  if (!coverage.ok) {
    return coverage;
  }
  if (run.applicability === "not-applicable") {
    return validateNotApplicableRun(run, coverage.value);
  }
  if (run.applicability !== "applicable") {
    return issue("$.applicability", "invalid-value", "Selected run applicability must be closed");
  }
  return validateApplicableRun(run, coverage.value);
}

export function validateMaterializedCheckRun(value: unknown): ValidationResult<CheckRun> {
  const fields = [
    "checkId",
    "checkRunId",
    "selection",
    "applicability",
    "status",
    "result",
    "coverage",
    "diagnostic"
  ];
  const closed = validateClosedRecord(value, "$", fields);
  if (!closed.ok) {
    return closed;
  }
  const run = closed.value;
  if (!isStableId(run.checkId)) {
    return issue("$.checkId", "invalid-value", "Invalid checkId");
  }
  if (!isCheckRunId(run.checkRunId)) {
    return issue("$.checkRunId", "invalid-value", "Invalid checkRunId");
  }
  if (run.selection === "unselected") {
    return validateUnselectedRun(run);
  }
  if (run.selection !== "selected") {
    return issue("$.selection", "invalid-value", "Unknown selection");
  }
  return validateSelectedRun(run);
}
