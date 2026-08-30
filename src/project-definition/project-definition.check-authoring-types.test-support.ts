import {
  defineCheck,
  type Check,
  type CheckExecution,
  type CheckPreflightResult,
  type CheckWithOptions
} from "../check/check.ts";

function _typeCheckPreparedOptionConversion() {
  const preparedFromOptionalAuthored = defineCheck<
    "prepared-from-optional-authored",
    { readonly maximum?: number },
    { readonly maximum: number }
  >({
    checkId: "prepared-from-optional-authored",
    displayName: "Prepared from optional authored",
    options: {},
    preflight(authored, signal) {
      const maybeMaximum: number | undefined = authored.maximum;
      void maybeMaximum;
      void signal.aborted;
      return { status: "success", preparedOptions: { maximum: authored.maximum ?? 1 } };
    },
    execution({ options }) {
      const requiredMaximum: number = options.maximum;
      void requiredMaximum;
      return { status: "passed", data: {} };
    }
  });
  const invalidBlockedPreflight: CheckPreflightResult = {
    status: "failure",
    action: "block",
    reason: { code: "invalid-options" },
    // @ts-expect-error block preflight results physically omit fallback, including undefined.
    fallback: undefined
  };
  void preparedFromOptionalAuthored;
  void invalidBlockedPreflight;
}

function _typeCheckPreparedOptionConversionIsRequired() {
  // @ts-expect-error a distinct prepared shape requires a preflight conversion.
  const missingPreparedConversion: Check<
    { readonly maximum?: number },
    { readonly maximum: number }
  > = {
    checkId: "missing-prepared-conversion",
    displayName: "Missing prepared conversion",
    options: {},
    execution: ({ options }) => ({ status: "passed", data: { maximum: options.maximum } })
  };
  // @ts-expect-error CheckWithOptions retains the same required conversion invariant.
  const missingPreparedCheckWithOptions: CheckWithOptions<
    "missing-prepared-check-with-options",
    { readonly maximum?: number },
    { readonly maximum: number }
  > = {
    checkId: "missing-prepared-check-with-options",
    displayName: "Missing prepared CheckWithOptions conversion",
    options: {}
  };
  void missingPreparedConversion;
  void missingPreparedCheckWithOptions;
}

function _typeCheckCheckExecutionContext() {
  const optionAware = defineCheck({
    checkId: "typed-check",
    displayName: "Typed check",
    options: { maximum: 5 },
    preflight: (options) => ({ status: "success", preparedOptions: options }),
    execution({ options, project, records, signal }) {
      const maximum: number = options.maximum;
      void maximum;
      void project.root;
      void signal.aborted;
      records.report({ id: "sample" }, { nested: { value: true } });
      // @ts-expect-error Record identities are closed at the public write boundary.
      records.report({ id: "sample", checkId: "typed-check" }, {});
      return { status: "passed", data: { maximum } };
    }
  });
  const noOptions = defineCheck({
    checkId: "no-options",
    displayName: "No options",
    execution({ dependencies, options }) {
      // @ts-expect-error no-options execution receives an empty options object.
      void options.unknown;
      const read = dependencies.get("typed-check");
      // @ts-expect-error dependency reads do not accept a caller-selected Data generic.
      dependencies.get<{ readonly source: string }>("typed-check");
      void read;
      return { status: "not-applicable" };
    }
  });
  const standalone: CheckExecution<{ readonly floor: number }> = ({ options }) => {
    const floor: number = options.floor;
    void floor;
    return { status: "failed", data: { floor } };
  };
  const heterogeneous: Check = {
    checkId: "heterogeneous",
    displayName: "Heterogeneous",
    checks: [optionAware, noOptions]
  };
  void standalone;
  void heterogeneous;
}

function _typeCheckClosedExecutionResults() {
  const messaged: Check = {
    checkId: "messaged-check",
    displayName: "Messaged check",
    visibility: "attention",
    execution: () => ({
      status: "not-applicable",
      messages: [{ code: "not-needed", level: "info", message: "Not needed" }]
    })
  };
  const invalid = defineCheck({
    checkId: "invalid-result",
    displayName: "Invalid result",
    // @ts-expect-error execution results have a closed status vocabulary.
    execution: () => ({ status: "unknown" })
  });
  void invalid;
  void messaged;
}
