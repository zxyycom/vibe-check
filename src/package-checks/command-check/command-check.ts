import { CHECK_EXECUTION_CONTEXT_KEYS } from "../../check/context-callback.ts";
import type { CheckExecutionContext, Check, CheckDataParser } from "../../check/check.ts";
import { executeCommandCheck } from "./execution.ts";
import { resolveCommandCheckInput } from "./options.ts";
import type {
  AfterCommand,
  AfterCommandExecution,
  CommandCheck,
  CommandCheckInput,
  CommandCheckWithAfterCommand,
  ResolvedCommandCheckOptions,
  TypedCommandCheck
} from "./contract.ts";

export type {
  AfterCommand,
  AfterCommandContext,
  AfterCommandExecution,
  CommandCheckWithAfterCommand,
  CommandEnvironmentContext,
  CommandEnvironmentResolver,
  CompletedCommand,
  CommandCheck,
  CommandCheckEnvironment,
  CommandCheckFinalData,
  CommandCheckInput,
  CommandCheckOutput,
  CommandCheckUnavailableReasonCode,
  TypedCommandCheck
} from "./contract.ts";

type CommandCheckImplementationInput = CommandCheckInput<string, AfterCommand | undefined>;

/**
 * 构造直接执行单个可执行文件的 Check，不经 shell。
 *
 * 构造时校验并冻结命令配置；选择、关系与调度字段按普通 Check lifecycle 处理。
 * 默认不继承 ambient environment，也不持久化子进程输出；Product 不会自动将环境变量、
 * 子进程 stdout/stderr 或原生错误文本发布到 Check facts。
 * `output: { mode: "transcript" }` 在 invocation 授予此 Check artifact directory 时，
 * 将原始 stdout/stderr 写入固定 `process.log`。
 *
 * @see [执行外部命令的 Check](../../../docs/guides/command-check.md#执行外部命令的-check)
 * @example 以 process.execPath 构造无 shell command Check
 * ```ts
 * import { commandCheck, defineConfig, run } from "@zxyycom/vibe-check";
 *
 * const nodeProbe = commandCheck({
 *   checkId: "node-probe",
 *   displayName: "Node probe",
 *   executable: process.execPath,
 *   arguments: ["--eval", "process.exit(0)"],
 *   timeoutMs: 5_000,
 *   outputByteLimit: 64 * 1024
 * });
 *
 * const definition = defineConfig({
 *   checks: [nodeProbe],
 *   outputs: {
 *     diagnosticLogging: { enabled: false },
 *     machinePublication: { enabled: false },
 *     progressRendering: { enabled: false }
 *   }
 * });
 *
 * const result = await run(definition);
 * if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
 * const outcome = result.snapshot.checks.find(
 *   ({ checkId }) => checkId === nodeProbe.checkId
 * )?.outcome;
 * if (outcome?.status !== "passed" || outcome.data.exitCode !== 0) {
 *   throw new Error("Node probe did not produce the expected passed outcome");
 * }
 * ```
 */
export function commandCheck<const Id extends string, const FinalData extends object>(
  input: CommandCheckInput<
    Id,
    Readonly<{
      readonly execute: AfterCommandExecution<FinalData>;
      readonly parseData?: never;
    }>
  >
): CommandCheckWithAfterCommand<Id, FinalData>;
export function commandCheck<const Id extends string, const Parser extends CheckDataParser>(
  input: CommandCheckInput<
    Id,
    Readonly<{
      readonly execute: AfterCommandExecution<NoInfer<ReturnType<Parser>>>;
      readonly parseData: Parser;
    }>
  >
): TypedCommandCheck<Id, Parser>;
export function commandCheck<const Id extends string>(
  input: CommandCheckInput<Id>
): CommandCheck<Id>;
export function commandCheck(input: CommandCheckImplementationInput): Check {
  const commandInput = input;
  const resolved = resolveCommandCheckInput(input);
  if (resolved === undefined) {
    throw new TypeError(
      "commandCheck input must match the documented closed command and ordinary Check authoring policy"
    );
  }
  return {
    ...(commandInput.admissionPriority === undefined
      ? {}
      : { admissionPriority: commandInput.admissionPriority }),
    ...(commandInput.checks === undefined ? {} : { checks: commandInput.checks }),
    ...(commandInput.dependsOn === undefined ? {} : { dependsOn: commandInput.dependsOn }),
    ...(commandInput.enabledByFlags === undefined
      ? {}
      : { enabledByFlags: commandInput.enabledByFlags }),
    ...(commandInput.maxParallel === undefined ? {} : { maxParallel: commandInput.maxParallel }),
    ...(commandInput.mutex === undefined ? {} : { mutex: commandInput.mutex }),
    ...(commandInput.observes === undefined ? {} : { observes: commandInput.observes }),
    ...(commandInput.omitQuietPassedRow === undefined
      ? {}
      : { omitQuietPassedRow: commandInput.omitQuietPassedRow }),
    ...(commandInput.resourceClaims === undefined
      ? {}
      : { resourceClaims: commandInput.resourceClaims }),
    checkId: commandInput.checkId,
    displayName: commandInput.displayName,
    execute: {
      contextNeeds: executionContextNeeds(resolved),
      callback: (options: ResolvedCommandCheckOptions, context: CheckExecutionContext) =>
        executeCommandCheck(options, context, {
          afterCommand: resolved.afterCommand,
          resolveEnvironment: resolved.resolveEnvironment
        })
    },
    options: resolved.options,
    prepare: (options: ResolvedCommandCheckOptions) =>
      isRevalidatedCommandOptions(options, commandInput.checkId, commandInput.displayName)
        ? { status: "success", preparedOptions: options }
        : { status: "failure", action: "block", reason: { code: "invalid-options" } },
    ...(resolved.afterCommand?.parseData === undefined
      ? {}
      : { parseData: resolved.afterCommand.parseData })
  };
}

function isRevalidatedCommandOptions<Id extends string>(
  options: ResolvedCommandCheckOptions,
  checkId: Id,
  displayName: string
): boolean {
  return (
    resolveCommandCheckInput({
      checkId,
      displayName,
      executable: options.executable,
      arguments: options.arguments,
      environment: options.environment,
      output: options.output,
      outputByteLimit: options.outputByteLimit,
      timeoutMs: options.timeoutMs,
      ...(options.workingDirectory === null ? {} : { workingDirectory: options.workingDirectory })
    }) !== undefined
  );
}

function executionContextNeeds(
  resolved: NonNullable<ReturnType<typeof resolveCommandCheckInput>>
): readonly (keyof CheckExecutionContext)[] {
  const requested = new Set<keyof CheckExecutionContext>(["project", "signal"]);
  if (resolved.options.output.mode === "transcript") requested.add("artifactDirectory");
  for (const slot of [resolved.resolveEnvironment, resolved.afterCommand?.execute]) {
    if (slot === undefined || typeof slot === "function") continue;
    for (const key of slot.contextNeeds ?? []) requested.add(key);
  }
  return Object.freeze(CHECK_EXECUTION_CONTEXT_KEYS.filter((key) => requested.has(key)));
}
