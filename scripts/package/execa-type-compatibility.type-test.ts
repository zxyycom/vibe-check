import { execa, execaSync, type Result, type SyncResult } from "execa";

// This fixture is compiler-only: both TS6 and TS7 check the patched declaration graph.
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Assert<Value extends true> = Value;

export type ExecaAllOutputProof = [
  Assert<Equal<Result<{ all: true }>["all"], string>>,
  Assert<Equal<Result<{ all: true; buffer: true }>["all"], string>>,
  Assert<Equal<Result<{ all: true; buffer: false }>["all"], undefined>>,
  Assert<Equal<Result<{ all: true; buffer: { stdout: false } }>["all"], string>>,
  Assert<Equal<Result<{ all: true; buffer: { stderr: false } }>["all"], string>>,
  Assert<Equal<Result<{ all: true; buffer: { stdout: false; stderr: false } }>["all"], undefined>>,
  Assert<Equal<Result<{ all: true; buffer: boolean }>["all"], string | undefined>>,
  Assert<Equal<Result<{ all: true; encoding: "buffer" }>["all"], Uint8Array>>,
  Assert<Equal<Result<{ all: true; encoding: "utf8" | "buffer" }>["all"], string | Uint8Array>>,
  Assert<Equal<Result<{ all: true; lines: true }>["all"], string[]>>,
  Assert<Equal<Result<{ all: false }>["all"], undefined>>,
  Assert<Equal<SyncResult<{ all: true }>["all"], string>>
];

/** Checks the real public overloads without launching a child during test registration. */
export async function execaPublicOverloadProof(): Promise<void> {
  const buffered = await execa("fixture", { all: true });
  const text: string = buffered.all;
  const binary = await execa("fixture", { all: true, encoding: "buffer" });
  const bytes: Uint8Array = binary.all;
  const discarded = execaSync("fixture", { all: true, buffer: false });
  const absent: undefined = discarded.all;
  // @ts-expect-error Buffer output cannot be consumed as text.
  const invalidText: string = binary.all;
  // @ts-expect-error Public Options must still reject explicit undefined under exactOptionalPropertyTypes.
  await execa("fixture", { preferLocal: undefined });
  // @ts-expect-error The local patch must not widen descriptor buffer flags.
  await execa("fixture", { all: true, buffer: { stdout: "yes" } });
  void [text, bytes, absent, invalidText];
}
