import { type CheckExecution, type CheckResult } from "../check/check.ts";

function _typeCheckFinalDataBoundary() {
  // @ts-expect-error Check final data must be object-shaped at the write boundary.
  const invalid: CheckExecution = () => ({ status: "passed", data: 1 });
  // @ts-expect-error CheckExecution exposes only its Options generic.
  type _UnsupportedDataGeneric = CheckExecution<object, object>;
  void invalid;
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
