import { executeCommandCheck } from "./execution.ts";
import { resolveCommandCheckInput } from "./options.ts";
import type { CommandCheck, CommandCheckInput, ResolvedCommandCheckOptions } from "./contract.ts";

export type {
  CommandCheck,
  CommandCheckEnvironment,
  CommandCheckFinalData,
  CommandCheckInput,
  CommandCheckOutput,
  CommandCheckUnavailableReasonCode
} from "./contract.ts";

/**
 * 构造一个单一 no-shell executable 的 ordinary Check。
 *
 * @remarks constructor 会闭合并冻结 command-owned options；ordinary selection、relation 与 scheduling fields 仍按普通 Check lifecycle 传递。默认 exact-empty environment 与 discard output 不会把 ambient variables、child stdout/stderr 或 native error text 发布到 Check facts。`output: { mode: "transcript" }` 仅在 invocation 授予此 Check artifact directory 时，将 raw stdout/stderr 写入固定 `process.log`。
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
export function commandCheck<const Id extends string>(
  input: CommandCheckInput<Id>
): CommandCheck<Id> {
  const resolved = resolveCommandCheckInput(input);
  if (resolved === undefined) {
    throw new TypeError(
      "commandCheck input must match the documented closed command and ordinary Check authoring policy"
    );
  }
  return {
    ...(input.admissionPriority === undefined
      ? {}
      : { admissionPriority: input.admissionPriority }),
    ...(input.checks === undefined ? {} : { checks: input.checks }),
    ...(input.dependsOn === undefined ? {} : { dependsOn: input.dependsOn }),
    ...(input.enabledByFlags === undefined ? {} : { enabledByFlags: input.enabledByFlags }),
    ...(input.maxParallel === undefined ? {} : { maxParallel: input.maxParallel }),
    ...(input.mutex === undefined ? {} : { mutex: input.mutex }),
    ...(input.observes === undefined ? {} : { observes: input.observes }),
    ...(input.omitQuietPassedRow === undefined
      ? {}
      : { omitQuietPassedRow: input.omitQuietPassedRow }),
    ...(input.resourceClaims === undefined ? {} : { resourceClaims: input.resourceClaims }),
    checkId: input.checkId,
    displayName: input.displayName,
    execute: executeCommandCheck,
    options: resolved.options,
    prepare: (options: ResolvedCommandCheckOptions) =>
      isRevalidatedCommandOptions(options, input.checkId, input.displayName)
        ? { status: "success", preparedOptions: options }
        : { status: "failure", action: "block", reason: { code: "invalid-options" } }
  } satisfies CommandCheck<Id>;
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
