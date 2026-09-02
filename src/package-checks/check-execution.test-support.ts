import type {
  CheckDependencies,
  CheckExecution,
  CheckExecutionContext,
  CheckResult,
  DeepReadonly
} from "../check/check.ts";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const NO_DEPENDENCIES: CheckDependencies = Object.freeze({
  get: (checkId: string) =>
    Object.freeze({
      ok: false,
      error: Object.freeze({ code: "dependency-not-declared", checkId })
    }),
  list: () => Object.freeze([])
});

export interface ReportedCheckRecord {
  readonly data: object;
  readonly identity: Readonly<{ readonly id: string }>;
}

/** Executes one Check callback with an isolated project context and captured Records. */
export async function executeCheck<Options extends object>(
  callback: CheckExecution<Options>,
  options: DeepReadonly<Options>,
  root: string,
  signal: AbortSignal = new AbortController().signal
): Promise<
  Readonly<{
    readonly records: readonly ReportedCheckRecord[];
    readonly result: CheckResult;
  }>
> {
  const records: ReportedCheckRecord[] = [];
  const context: CheckExecutionContext<Options> = Object.freeze({
    dependencies: NO_DEPENDENCIES,
    options,
    project: Object.freeze({ flags: Object.freeze([]), root }),
    records: Object.freeze({
      report: (identity: Readonly<{ readonly id: string }>, data: object): void => {
        records.push(Object.freeze({ data, identity }));
      }
    }),
    signal
  });
  const result = await callback(context);
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
