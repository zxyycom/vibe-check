import type { ResolvedMarkdownLinkValidationOptions } from "./options.ts";
import type { ProjectFileSelection } from "../project-files/configuration.ts";
import type {
  CheckDependencies,
  CheckExecution,
  CheckExecutionContext,
  CheckProjectContext,
  CheckResult
} from "../../check/check.ts";

const FILES = Object.freeze({
  exclude: Object.freeze([]),
  include: Object.freeze(["**/*.ts"]),
  source: "filesystem" as const
});

const NO_DEPENDENCIES: CheckDependencies = Object.freeze({
  get: (checkId: string) =>
    Object.freeze({
      ok: false,
      error: Object.freeze({ code: "dependency-not-declared", checkId })
    })
});

function project(root: string): CheckProjectContext {
  return Object.freeze({
    flags: Object.freeze([]),
    root
  });
}

export async function execute(
  callback: CheckExecution<ResolvedMarkdownLinkValidationOptions>,
  options: ResolvedMarkdownLinkValidationOptions,
  root: string,
  files: ProjectFileSelection = FILES,
  signal: AbortSignal = new AbortController().signal
): Promise<
  Readonly<{
    readonly records: readonly ReportedRecord[];
    readonly result: CheckResult;
  }>
> {
  const records: ReportedRecord[] = [];
  const executionOptions: ResolvedMarkdownLinkValidationOptions = Object.freeze({
    ...options,
    files
  });
  const context: CheckExecutionContext<ResolvedMarkdownLinkValidationOptions> = Object.freeze({
    dependencies: NO_DEPENDENCIES,
    options: executionOptions,
    project: project(root),
    records: Object.freeze({
      report: (identity: Readonly<{ readonly id: string }>, data: object): void => {
        records.push(Object.freeze({ data, identity }));
      }
    }),
    signal
  });
  const result = await callback(context);
  return Object.freeze({
    records: Object.freeze(records),
    result
  });
}

export interface ReportedRecord {
  readonly data: object;
  readonly identity: Readonly<{ readonly id: string }>;
}
