import type { Check, CheckDependencies } from "@zxyycom/vibe-check";

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
  readonly result: Awaited<ReturnType<NonNullable<Check["execution"]>>>;
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
  artifactDirectory: string | null = null
): Promise<DirectCheckInvocation> {
  if (check.execution === undefined)
    throw new Error("fixture Check must have an execution callback");
  const records: Array<
    Readonly<{
      readonly data: object;
      readonly identity: { readonly id: string };
    }>
  > = [];
  const result = await check.execution({
    artifactDirectory,
    dependencies: NO_DECLARED_DEPENDENCIES,
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
