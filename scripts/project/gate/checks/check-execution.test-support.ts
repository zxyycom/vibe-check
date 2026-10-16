import type {
  AfterCommandContext,
  AfterCommandInput,
  Check,
  CheckDependencies,
  CheckExecutionContext,
  CheckResult
} from "@zxyycom/vibe-check";

type HandoffProvider<Id extends string = string> = Readonly<{
  readonly checkId: Id;
  readonly handoff: true;
}>;
type DependencyNotDeclaredResult = Readonly<{
  readonly ok: false;
  readonly error: Readonly<{ readonly code: "dependency-not-declared"; readonly checkId: string }>;
}>;

/** Closed dependency reader for direct callback fixtures that deliberately declare no relations. */
export const NO_DECLARED_DEPENDENCIES: CheckDependencies = Object.freeze({
  get: dependencyNotDeclared,
  list: () => Object.freeze([])
});

export interface DirectCheckInvocation {
  readonly records: readonly Readonly<{
    readonly data: object;
    readonly identity: { readonly id: string };
  }>[];
  readonly result: CheckResult | CheckResult<Readonly<Record<never, never>>, object>;
}

export interface AfterCommandFixture {
  readonly context: AfterCommandContext;
  readonly completed: AfterCommandInput;
  readonly records: readonly Readonly<{
    readonly data: object;
    readonly identity: { readonly id: string };
  }>[];
}

/** Creates one direct caller-owned command-settlement context and captures its Records. */
export function createAfterCommandFixture(
  input: Readonly<{
    readonly artifactDirectory?: string | null;
    readonly dependencies?: CheckDependencies;
    readonly exitCode: number;
    readonly stderr?: string;
    readonly stdout?: string;
  }>
): AfterCommandFixture {
  const records: Array<
    Readonly<{
      readonly data: object;
      readonly identity: { readonly id: string };
    }>
  > = [];
  const context: AfterCommandContext = {
    artifactDirectory:
      input.artifactDirectory === undefined
        ? "/tmp/vibe-check-command-fixture"
        : input.artifactDirectory,
    dependencies: input.dependencies ?? NO_DECLARED_DEPENDENCIES,
    invocationId: "invocation/v1:fixture-command",
    project: { flags: [], root: process.cwd() },
    records: {
      report: (identity, data) => records.push(Object.freeze({ data, identity }))
    },
    signal: new AbortController().signal
  };
  const completed: AfterCommandInput = {
    command: {
      exitCode: input.exitCode,
      stderr: input.stderr ?? "",
      stdout: input.stdout ?? ""
    },
    options: {
      arguments: [],
      environment: { mode: "exact", variables: {} },
      executable: process.execPath,
      output: { mode: "transcript" },
      outputByteLimit: 64 * 1024,
      timeoutMs: 30_000,
      workingDirectory: process.cwd()
    }
  };
  return Object.freeze({ completed, context, records });
}

/** Executes one Check callback with the smallest closed Project Gate context. */
export async function invokeCheck(
  check: Check,
  signal = new AbortController().signal,
  artifactDirectory: string | null = null
) {
  return (await invokeCheckWithRecords(check, signal, artifactDirectory)).result;
}

/** Executes one Check callback and retains only the Records it publishes. */
export function invokeCheckWithRecords(
  check: Check,
  signal?: AbortSignal,
  artifactDirectory?: string | null,
  dependencies?: CheckDependencies
): Promise<DirectCheckInvocation>;
export async function invokeCheckWithRecords(
  check: Check,
  signal = new AbortController().signal,
  artifactDirectory: string | null = null,
  dependencies: CheckDependencies = NO_DECLARED_DEPENDENCIES
) {
  if (check.execute === undefined) throw new Error("fixture Check must have an execute callback");
  const records: Array<
    Readonly<{
      readonly data: object;
      readonly identity: { readonly id: string };
    }>
  > = [];
  const context: CheckExecutionContext = {
    artifactDirectory,
    dependencies,
    invocationId: "invocation/v1:fixture-check",
    project: {
      root: process.cwd(),
      flags: []
    },
    records: {
      report: (identity, data) => records.push(Object.freeze({ data, identity }))
    },
    signal
  };
  const callback = check.execute;
  // The typed overload preserves the known Check result; reflection crosses only erased slot inputs.
  const invocation: unknown = Reflect.apply(
    typeof callback === "function" ? callback : callback.callback,
    undefined,
    [
      check.options ?? {},
      typeof callback === "function"
        ? Object.freeze({})
        : Object.freeze(
            Object.fromEntries((callback.contextNeeds ?? []).map((key) => [key, context[key]]))
          )
    ]
  );
  const result = await invocation;
  return Object.freeze({ records: Object.freeze(records), result });
}

/** Exposes captured Records' JSON fields without asserting their private object prototypes. */
export function recordJsonFacts(records: DirectCheckInvocation["records"]): unknown {
  return JSON.parse(JSON.stringify(records)) as unknown;
}

function dependencyNotDeclared<Id extends string>(
  provider: HandoffProvider<Id>
): DependencyNotDeclaredResult;
function dependencyNotDeclared(checkId: string): DependencyNotDeclaredResult;
function dependencyNotDeclared(dependency: string | HandoffProvider): DependencyNotDeclaredResult {
  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code: "dependency-not-declared" as const,
      checkId: typeof dependency === "string" ? dependency : dependency.checkId
    })
  });
}
