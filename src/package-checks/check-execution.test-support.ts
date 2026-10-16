import type {
  CheckDependencies,
  CheckPreparation,
  CheckPreparationContext,
  CheckPreparationResult,
  CheckExecutionContext,
  CheckHandoffProvider,
  CheckResult,
  DeepReadonly
} from "../check/check.ts";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizeContextCallback } from "../data-boundary/context-callback.ts";
import {
  CHECK_EXECUTION_CONTEXT_KEYS,
  CHECK_PREPARATION_CONTEXT_KEYS
} from "../check/context-callback.ts";

export const NO_DEPENDENCIES: CheckDependencies = Object.freeze({
  get: (dependency: string | CheckHandoffProvider) =>
    Object.freeze({
      ok: false,
      error: Object.freeze({
        code: "dependency-not-declared" as const,
        checkId: typeof dependency === "string" ? dependency : dependency.checkId
      })
    }),
  list: () => Object.freeze([])
});

export interface ReportedCheckRecord {
  readonly data: object;
  readonly identity: Readonly<{ readonly id: string }>;
}

/** Executes one Check callback with an isolated project context and captured Records. */
export function executeCheck<Options extends object>(
  callback:
    | ((options: never, context: never) => CheckResult | Promise<CheckResult>)
    | Readonly<{
        contextNeeds?: readonly (keyof CheckExecutionContext)[] | undefined;
        callback: (options: never, context: never) => CheckResult | Promise<CheckResult>;
      }>,
  options: DeepReadonly<Options>,
  root: string,
  signal?: AbortSignal
): Promise<
  Readonly<{
    readonly records: readonly ReportedCheckRecord[];
    readonly result: CheckResult;
  }>
>;
export async function executeCheck(
  callback: unknown,
  options: object,
  root: string,
  signal: AbortSignal = new AbortController().signal
) {
  const records: ReportedCheckRecord[] = [];
  const context: CheckExecutionContext = Object.freeze({
    artifactDirectory: null,
    dependencies: NO_DEPENDENCIES,
    invocationId: "invocation/v1:direct-check-test",
    project: Object.freeze({ flags: Object.freeze([]), root }),
    records: Object.freeze({
      report: (identity: Readonly<{ readonly id: string }>, data: object): void => {
        records.push(Object.freeze({ data, identity }));
      }
    }),
    signal
  });
  // Named executors are called with an explicit full fixture; stored descriptors keep exact views.
  const invocation: unknown =
    typeof callback === "function"
      ? Reflect.apply(callback, undefined, [options, context])
      : normalizeContextCallback<[options: object], CheckExecutionContext>(
          callback,
          CHECK_EXECUTION_CONTEXT_KEYS
        )!.invoke(context, options);
  const result = await invocation;
  return Object.freeze({ records: Object.freeze(records), result });
}

/** Creates the common two-file TypeScript source fixture used by scanner Checks. */
export function createTypeScriptSourceRoot(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src", "a.ts"), "export const a = 1;\n", "utf8");
  writeFileSync(join(root, "src", "b.ts"), "export const b = 2;\n", "utf8");
  return root;
}

/** Direct slot calls explicitly narrow function/descriptor; no Run is created. */
export function prepareCheckOptions<Options extends object, Prepared extends object>(
  prepare: CheckPreparation<Options, Prepared>,
  options: DeepReadonly<Options>,
  signal: AbortSignal
): CheckPreparationResult<Prepared> | Promise<CheckPreparationResult<Prepared>>;
export function prepareCheckOptions(prepare: unknown, options: object, signal: AbortSignal) {
  const source: CheckPreparationContext = { signal, project: { flags: [], root: process.cwd() } };
  return normalizeContextCallback<[options: object], CheckPreparationContext>(
    prepare,
    CHECK_PREPARATION_CONTEXT_KEYS
  )!.invoke(source, options);
}
