import type { CheckProjectContext } from "./project-context.ts";
import type { CheckDependencies, CheckResult, CheckPreparationResult } from "./check.ts";
import {
  normalizeContextCallback,
  snapshotContextCallback
} from "../data-boundary/context-callback.ts";

/** callback 写入 supplemental Record 时的 Check-local identity。 */
interface RecordIdentityInput {
  /** 非空且在当前 Check 内唯一的 Record ID。 */
  readonly id: string;
}

/** callback 写入 supplemental Records 的 Product-owned reporter。 */
interface CheckRecordReporter {
  /**
   * 追加 canonical JSON object 补充事实；合法 Record 的存在或数量不决定 Check status。
   * data 须满足 `canonicalizeJsonObject` 的接受条件；无效数据、空 ID 或重复 ID 使 owning Check
   * 结算为 unavailable，此前已接受的 Records 仍保留。结算后 reporter 关闭，继续写入会抛错。
   * @see [terminal result、Records 与 messages](../../docs/api-mechanics.md#terminal-resultrecords-与-messages)
   */
  report(identity: RecordIdentityInput, data: object): void;
}

/**
 * Check callback 收到的 Product-owned execution context。
 *
 * 只承接显式声明的框架字段；prepared options 通过 callback 的业务参数传入。
 */
export interface CheckExecutionContext {
  /** 当前 Check 的 absolute invocation artifact directory；caller 未授予时为 `null`。 */
  readonly artifactDirectory: string | null;
  /** 读取当前 Check 的已声明 direct relations。 */
  readonly dependencies: CheckDependencies;
  /** 同一次 invocation 内由 Product 统一提供的 identity。 */
  readonly invocationId: string;
  /** 已规范化的项目根与 flags。 */
  readonly project: CheckProjectContext;
  /** 写入 supplemental Records 的 reporter。 */
  readonly records: CheckRecordReporter;
  /** 本次 invocation 的 cancellation signal。 */
  readonly signal: AbortSignal;
}

/** Check preparation 可请求的框架字段。 */
export interface CheckPreparationContext {
  readonly signal: AbortSignal;
  readonly project: CheckProjectContext;
}

export const CHECK_PREPARATION_CONTEXT_KEYS = Object.freeze([
  "project",
  "signal"
] as const satisfies readonly (keyof CheckPreparationContext)[]);
export const CHECK_EXECUTION_CONTEXT_KEYS = Object.freeze([
  "artifactDirectory",
  "dependencies",
  "invocationId",
  "project",
  "records",
  "signal"
] as const satisfies readonly (keyof CheckExecutionContext)[]);

export function snapshotCheckExecution(value: unknown) {
  return snapshotContextCallback<
    [options: object],
    CheckExecutionContext,
    | CheckResult
    | CheckResult<Readonly<Record<never, never>>, object>
    | Promise<CheckResult>
    | Promise<CheckResult<Readonly<Record<never, never>>, object>>
  >(value, CHECK_EXECUTION_CONTEXT_KEYS);
}
export function snapshotCheckPreparation(value: unknown) {
  return snapshotContextCallback<
    [options: object],
    CheckPreparationContext,
    CheckPreparationResult | Promise<CheckPreparationResult>
  >(value, CHECK_PREPARATION_CONTEXT_KEYS);
}
export function normalizeCheckExecution(value: unknown) {
  return normalizeContextCallback<[options: object], CheckExecutionContext>(
    value,
    CHECK_EXECUTION_CONTEXT_KEYS
  );
}
export function normalizeCheckPreparation(value: unknown) {
  return normalizeContextCallback<[options: object], CheckPreparationContext>(
    value,
    CHECK_PREPARATION_CONTEXT_KEYS
  );
}
