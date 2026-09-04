import type { Check } from "@zxyycom/vibe-check";

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
    dependencies: {
      get: (checkId: string) => ({
        ok: false,
        error: { code: "dependency-not-declared", checkId }
      }),
      list: () => Object.freeze([])
    },
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
