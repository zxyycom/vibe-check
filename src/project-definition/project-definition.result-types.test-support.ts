import type { CheckExecution, CheckResult } from "../check/check.ts";

function _typeCheckFinalDataBoundary() {
  // @ts-expect-error Check final data must be object-shaped at the write boundary.
  const invalid: CheckExecution = () => ({ status: "passed", data: 1 });
  // @ts-expect-error CheckExecution exposes only its Options generic.
  type _UnsupportedDataGeneric = CheckExecution<object, object>;
  void invalid;
}

function _typeCheckHandoffResultBranches() {
  const passed: CheckResult<{ readonly value: number }, { readonly reference: object }> = {
    status: "passed",
    data: { value: 1 },
    handoff: { reference: {} }
  };
  // @ts-expect-error marked providers must include a handoff on the passed branch.
  const missingPassedHandoff: CheckResult<Record<never, never>, { readonly reference: object }> = {
    status: "passed",
    data: {}
  };
  // @ts-expect-error ordinary results never carry a handoff.
  const ordinaryHandoff: CheckResult = { status: "passed", data: {}, handoff: {} };
  // @ts-expect-error failed results never carry a handoff.
  const failedHandoff: CheckResult<Record<never, never>, { readonly reference: object }> = {
    status: "failed",
    data: {},
    handoff: { reference: {} }
  };
  // @ts-expect-error unavailable results never carry a handoff.
  const unavailableHandoff: CheckResult<Record<never, never>, { readonly reference: object }> = {
    status: "unavailable",
    reason: { code: "unavailable" },
    handoff: { reference: {} }
  };
  void passed;
  void missingPassedHandoff;
  void ordinaryHandoff;
  void failedHandoff;
  void unavailableHandoff;
}

function _typeCheckMessagesOnEveryTerminalResult() {
  const results: readonly CheckResult[] = [
    {
      status: "passed",
      data: {},
      messages: [{ code: "passed-with-note", level: "info", message: "Passed" }]
    },
    {
      status: "failed",
      data: {},
      messages: [{ code: "failed-with-note", level: "error", message: "Failed" }]
    },
    {
      status: "not-applicable",
      messages: [{ code: "not-required", level: "warning", message: "Not required" }]
    },
    {
      status: "unavailable",
      reason: { code: "unavailable" },
      messages: [{ code: "unavailable", level: "error", message: "Unavailable" }]
    }
  ];
  void results;
}
