import type {
  Check,
  CheckDataParser,
  CheckDependencies,
  CheckExecutionContext,
  CheckFlagEnablement,
  CheckProjectContext,
  CheckResourceClaims,
  CheckResult,
  CheckWithOptions,
  DeepReadonly,
  InheritableCheckCollection,
  TypedCheckWithOptions
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

/** 已完整结束且只在 invocation-local callback 中可见的 child material。 */
export interface CompletedCommand {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

/** spawn 前 environment resolver 可读取的最小 invocation context。 */
export interface CommandEnvironmentContext {
  readonly dependencies: CheckDependencies;
  readonly options: DeepReadonly<ResolvedCommandCheckOptions>;
  readonly project: CheckProjectContext;
  readonly signal: AbortSignal;
}

/** 完整 command 后 caller-owned settlement 可读取的 context。 */
export type AfterCommandContext = CheckExecutionContext<ResolvedCommandCheckOptions> &
  Readonly<{ readonly command: CompletedCommand }>;

/** 完整 command 的 caller-owned settlement callback。 */
export type AfterCommandExecution<FinalData extends object = object> = (
  this: void,
  context: AfterCommandContext
) => CheckResult<FinalData> | Promise<CheckResult<FinalData>>;

/** command 完成后的可选 caller-owned settlement 与 typed-provider parser。 */
export type AfterCommand<FinalData extends object = object> = Readonly<{
  readonly execute: AfterCommandExecution<FinalData>;
  readonly parseData?: CheckDataParser | undefined;
}>;

/** spawn 前解析此次 command closed environment policy 的 callback。 */
export type CommandEnvironmentResolver = (
  this: void,
  context: CommandEnvironmentContext
) => CommandCheckEnvironment | Promise<CommandCheckEnvironment>;

/** command Check 自己产生的 stable unavailable reason code。 */
export type CommandCheckUnavailableReasonCode =
  | "command-environment-resolution-failed"
  | "command-output-limit-exceeded"
  | "command-start-failed"
  | "command-terminated-by-signal"
  | "command-timeout"
  | "command-transcript-unavailable"
  | "invalid-options";

/** `commandCheck` 的 closed authoring input；ordinary Check composition fields 原样交由 Core 处理。 */
interface CommandCheckBaseInput<Id extends string> {
  readonly checkId: Id;
  readonly displayName: string;
  readonly executable: string;
  readonly arguments?: readonly string[];
  readonly workingDirectory?: string;
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

/** Static environment 与 invocation-time resolver 互斥；两者都省略时使用 exact-empty。 */
export type CommandCheckInput<
  Id extends string = string,
  After extends AfterCommand | undefined = undefined
> = CommandCheckBaseInput<Id> &
  (
    | Readonly<{
        readonly environment?: CommandCheckEnvironment;
        readonly resolveEnvironment?: never;
      }>
    | Readonly<{
        readonly environment?: never;
        readonly resolveEnvironment: CommandEnvironmentResolver;
      }>
  ) &
  (After extends undefined
    ? Readonly<{ readonly afterCommand?: undefined }>
    : Readonly<{ readonly afterCommand: After }>);

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

/** 带 caller-owned completion callback 的 ordinary command Check。 */
export type CommandCheckWithAfterCommand<Id extends string, FinalData extends object> = Omit<
  CheckWithOptions<Id, ResolvedCommandCheckOptions>,
  "execute"
> &
  Readonly<{
    execute(
      this: void,
      context: CheckExecutionContext<ResolvedCommandCheckOptions>
    ): CheckResult<FinalData> | Promise<CheckResult<FinalData>>;
  }>;

/** 带 caller-owned completion callback 与 parser 的 typed-provider command Check。 */
export type TypedCommandCheck<
  Id extends string,
  Parser extends CheckDataParser
> = TypedCheckWithOptions<Id, ResolvedCommandCheckOptions, Parser>;
