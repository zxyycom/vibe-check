import {
  defineCheck,
  type Check,
  type CheckExecution,
  type CheckPreparation,
  type CheckPreparationResult,
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
    prepare(authored, signal, project) {
      const maybeMaximum: number | undefined = authored.maximum;
      void maybeMaximum;
      void signal.aborted;
      const root = project?.root;
      const changes = project?.changes;
      void root;
      void changes;
      return { status: "success", preparedOptions: { maximum: authored.maximum ?? 1 } };
    },
    execute({ options }) {
      const requiredMaximum: number = options.maximum;
      void requiredMaximum;
      return { status: "passed", data: {} };
    }
  });
  const invalidBlockedPreparation: CheckPreparationResult = {
    status: "failure",
    action: "block",
    reason: { code: "invalid-options" },
    // @ts-expect-error block preparation results physically omit fallback, including undefined.
    fallback: undefined
  };
  const optionalProjectPreparation: CheckPreparation<{ readonly maximum: number }> = (
    options,
    signal,
    project
  ) => {
    const optionalRoot: string | undefined = project?.root;
    void options.maximum;
    void signal.aborted;
    void optionalRoot;
    return { status: "success", preparedOptions: options };
  };
  const oldTwoArgumentDirectCall = optionalProjectPreparation(
    { maximum: 1 },
    new AbortController().signal
  );
  void preparedFromOptionalAuthored;
  void invalidBlockedPreparation;
  if (oldTwoArgumentDirectCall instanceof Promise) oldTwoArgumentDirectCall.catch(() => undefined);
}

function _typeCheckPreparedOptionConversionIsRequired() {
  // @ts-expect-error a distinct prepared shape requires a preparation conversion.
  const missingPreparedConversion: Check<
    { readonly maximum?: number },
    { readonly maximum: number }
  > = {
    checkId: "missing-prepared-conversion",
    displayName: "Missing prepared conversion",
    options: {},
    execute: ({ options }) => ({ status: "passed", data: { maximum: options.maximum } })
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
    prepare: (options) => ({ status: "success", preparedOptions: options }),
    execute({ options, project, records, signal }) {
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
    execute({ dependencies, options }) {
      // @ts-expect-error no-options execute receives an empty options object.
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

function _typeCheckDeepReadonlyOptionProjection() {
  type Command = readonly [executable: string, ...arguments: string[]];
  type OptionalTuple = readonly [head: string, tail?: number];
  type TaggedValue =
    | readonly [kind: "text", value: string]
    | readonly [kind: "count", value: number];

  const preservedOptionShapesExecution: CheckExecution<{
    readonly command: Command;
    readonly optional: OptionalTuple;
    readonly payload: unknown;
    readonly tagged: TaggedValue;
  }> = ({ options }) => {
    const command: Command = options.command;
    const optional: OptionalTuple = options.optional;
    const executable: string = options.command[0];
    if (options.tagged[0] === "count") {
      const count: number = options.tagged[1];
      void count;
    }
    // @ts-expect-error unknown leaves retain their uncertainty in callback options.
    const payload: string = options.payload;
    // @ts-expect-error callback option tuples remain deeply readonly.
    options.command[0] = "bun";
    void command;
    void executable;
    void optional;
    void payload;
    return { status: "passed", data: {} };
  };
  void preservedOptionShapesExecution;
}

function _typeCheckClosedExecutionResults() {
  const messaged: Check = {
    checkId: "messaged-check",
    displayName: "Messaged check",
    omitQuietPassedRow: true,
    execute: () => ({
      status: "not-applicable",
      messages: [{ code: "not-needed", level: "info", message: "Not needed" }]
    })
  };
  const invalid = defineCheck({
    checkId: "invalid-result",
    displayName: "Invalid result",
    // @ts-expect-error execute results have a closed status vocabulary.
    execute: () => ({ status: "unknown" })
  });
  const invalidQuietPassPolicy: Check = {
    checkId: "invalid-quiet-pass-policy",
    displayName: "Invalid quiet-pass policy",
    // @ts-expect-error quiet-pass omission is an opt-in literal, not a runtime boolean switch.
    omitQuietPassedRow: false,
    execute: () => ({ status: "passed", data: {} })
  };
  // @ts-expect-error quiet-pass omission belongs only to executable Check branches.
  const invalidQuietPassContainer: Check = {
    checkId: "invalid-quiet-pass-container",
    displayName: "Invalid quiet-pass container",
    omitQuietPassedRow: true
  };
  const retiredVisibility: Check = {
    checkId: "retired-visibility",
    displayName: "Retired visibility",
    // @ts-expect-error visibility has no authoring alias.
    visibility: "attention",
    execute: () => ({ status: "passed", data: {} })
  };
  void invalid;
  void invalidQuietPassContainer;
  void invalidQuietPassPolicy;
  void messaged;
  void retiredVisibility;
}

function _typeCheckProviderHandoffRead() {
  const provider = defineCheck({
    checkId: "handoff-provider",
    displayName: "Handoff provider",
    handoff: true,
    execute: () => ({
      status: "passed",
      data: { version: 1 },
      handoff: { close: () => undefined }
    })
  });
  const ordinaryProvider = defineCheck({
    checkId: "ordinary-provider",
    displayName: "Ordinary provider",
    execute: () => ({ status: "passed", data: {} })
  });
  const consumer = defineCheck({
    checkId: "handoff-consumer",
    displayName: "Handoff consumer",
    dependsOn: ["handoff-provider"],
    execute({ dependencies }) {
      const read = dependencies.get(provider);
      if (read.ok) {
        const checkId: "handoff-provider" = read.checkId;
        read.handoff.close();
        void checkId;
      } else {
        const code: "dependency-not-declared" | "upstream-handoff-unavailable" = read.error.code;
        void code;
      }
      // @ts-expect-error ordinary providers have no declared handoff capability.
      dependencies.get(ordinaryProvider);
      // @ts-expect-error provider reads require a Check returned by defineCheck, not an object lookalike.
      dependencies.get({ checkId: "forged-provider", handoff: true });
      return { status: "not-applicable" };
    }
  });
  void consumer;
}
