import type { AfterCommandContext, Check, CheckDependencies } from "@zxyycom/vibe-check";

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
  readonly result: Awaited<ReturnType<NonNullable<Check["execute"]>>>;
}

export interface AfterCommandFixture {
  readonly context: AfterCommandContext;
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
    command: {
      exitCode: input.exitCode,
      stderr: input.stderr ?? "",
      stdout: input.stdout ?? ""
    },
    dependencies: input.dependencies ?? NO_DECLARED_DEPENDENCIES,
    invocationId: "invocation/v1:fixture-command",
    options: {
      arguments: [],
      environment: { mode: "exact", variables: {} },
      executable: process.execPath,
      output: { mode: "transcript" },
      outputByteLimit: 64 * 1024,
      timeoutMs: 30_000,
      workingDirectory: process.cwd()
    },
    project: { flags: [], root: process.cwd() },
    records: {
      report: (identity, data) => records.push(Object.freeze({ data, identity }))
    },
    signal: new AbortController().signal
  };
  return Object.freeze({ context, records });
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
export async function invokeCheckWithRecords(
  check: Check,
  signal = new AbortController().signal,
  artifactDirectory: string | null = null,
  dependencies: CheckDependencies = NO_DECLARED_DEPENDENCIES
): Promise<DirectCheckInvocation> {
  if (check.execute === undefined) throw new Error("fixture Check must have an execute callback");
  const records: Array<
    Readonly<{
      readonly data: object;
      readonly identity: { readonly id: string };
    }>
  > = [];
  const result = await check.execute({
    artifactDirectory,
    dependencies,
    invocationId: "invocation/v1:fixture-check",
    options: check.options ?? {},
    project: {
      root: process.cwd(),
      flags: []
    },
    records: {
      report: (identity, data) => records.push(Object.freeze({ data, identity }))
    },
    signal
  });
  return Object.freeze({ records, result });
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
