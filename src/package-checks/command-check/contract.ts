import type {
  Check,
  CheckExecutionContext,
  CheckFlagEnablement,
  CheckResourceClaims,
  CheckResult,
  CheckWithOptions,
  InheritableCheckCollection
} from "../../check/check.ts";

/** command Check 的显式环境策略；默认 exact-empty，避免定义时读取 ambient environment。 */
export type CommandCheckEnvironment =
  | Readonly<{
      readonly mode: "exact";
      readonly variables?: Readonly<Record<string, string>>;
    }>
  | Readonly<{
      readonly mode: "inherit";
      readonly overrides?: Readonly<Record<string, string | null>>;
    }>;

/** child stdout/stderr 的处理边界；默认 discard。 */
export type CommandCheckOutput = Readonly<{ readonly mode: "discard" | "transcript" }>;

/** command 以 numeric exit status 结束时发布的唯一 final data。 */
export interface CommandCheckFinalData {
  /** child process 的 numeric exit status。 */
  readonly exitCode: number;
}

/** command Check 自己产生的 stable unavailable reason code。 */
export type CommandCheckUnavailableReasonCode =
  | "command-output-limit-exceeded"
  | "command-start-failed"
  | "command-terminated-by-signal"
  | "command-timeout"
  | "command-transcript-unavailable"
  | "invalid-options";

/** `commandCheck` 的 closed authoring input；ordinary Check composition fields 原样交由 Core 处理。 */
export interface CommandCheckInput<Id extends string = string> {
  readonly checkId: Id;
  readonly displayName: string;
  readonly executable: string;
  readonly arguments?: readonly string[];
  readonly workingDirectory?: string;
  readonly environment?: CommandCheckEnvironment;
  readonly timeoutMs: number;
  readonly outputByteLimit: number;
  readonly output?: CommandCheckOutput;
  readonly enabledByFlags?: CheckFlagEnablement;
  readonly checks?: readonly Check[];
  readonly dependsOn?: InheritableCheckCollection<string>;
  readonly observes?: InheritableCheckCollection<string>;
  readonly maxParallel?: number;
  readonly admissionPriority?: number;
  readonly mutex?: InheritableCheckCollection<string>;
  readonly resourceClaims?: CheckResourceClaims;
  readonly omitQuietPassedRow?: true;
}

/** command constructor materializes、冻结并在 preparation 再次验证的内部完整 options。 */
export interface ResolvedCommandCheckOptions {
  readonly arguments: readonly string[];
  readonly environment:
    | Readonly<{ readonly mode: "exact"; readonly variables: Readonly<Record<string, string>> }>
    | Readonly<{
        readonly mode: "inherit";
        readonly overrides: Readonly<Record<string, string | null>>;
      }>;
  readonly executable: string;
  readonly output: Readonly<{ readonly mode: "discard" | "transcript" }>;
  readonly outputByteLimit: number;
  readonly timeoutMs: number;
  /** `null` 表示 execution 时使用 invocation project root。 */
  readonly workingDirectory: string | null;
}

/** 可放入普通 Project Definition 的 process-backed Check。 */
export type CommandCheck<Id extends string = string> = CheckWithOptions<
  Id,
  ResolvedCommandCheckOptions
> &
  Readonly<{
    execute(
      this: void,
      context: CheckExecutionContext<ResolvedCommandCheckOptions>
    ): CheckResult<CommandCheckFinalData> | Promise<CheckResult<CommandCheckFinalData>>;
  }>;
