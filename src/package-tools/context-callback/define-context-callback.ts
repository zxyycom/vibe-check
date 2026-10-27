import type {
  CheckExecutionContext,
  CheckPreparation,
  CheckPreparationContext,
  CheckPreparationResult,
  CheckResult
} from "../../check/check.ts";
import type {
  AdmissionPolicyContext,
  AdmissionProposal,
  PreparedCustomAdmissionStrategy,
  SchedulerMeasurementContext
} from "../../project-definition/scheduler-policy.ts";
import type {
  AfterCommandInput,
  CommandCheckEnvironment,
  CommandEnvironmentContext
} from "../../package-checks/command-check/contract.ts";
import type {
  DeclaredContextCallback,
  EmptyContextCallback
} from "../../data-boundary/context-callback.ts";

type ExactDescriptor<T> = T & Record<Exclude<keyof T, "contextNeeds" | "callback">, never>;
// 从公开 Check 参数派生只读约束；包裹 options 以避开广义 collection 的 object → never 擦除。
type CallbackOptions<O extends object> = Parameters<
  Extract<CheckPreparation<{ readonly options: O }>, (...args: never[]) => unknown>
>[0]["options"];
/** 各领域拥有的框架字段表；业务 options 不属于 context。 */
export interface CallbackContextByPhase {
  readonly "check.prepare": CheckPreparationContext;
  readonly "check.execute": CheckExecutionContext;
  readonly "scheduler.prepare": Pick<AdmissionPolicyContext, "graph">;
  readonly "scheduler.decide": AdmissionPolicyContext;
  readonly "scheduler.terminal": SchedulerMeasurementContext;
  readonly "command.environment": CommandEnvironmentContext;
  readonly "command.complete": CheckExecutionContext;
}

/** 声明 helper 的真实调用阶段。 */
export type CallbackContextPhase = keyof CallbackContextByPhase;

type CheckPhase = "check.prepare" | "check.execute";
type CheckResultByPhase = {
  readonly "check.prepare": CheckPreparationResult | Promise<CheckPreparationResult>;
  readonly "check.execute":
    | CheckResult<object, object>
    | CheckResult
    | Promise<CheckResult<object, object> | CheckResult>;
};
type OtherArgumentsByPhase = {
  readonly "scheduler.prepare": [];
  readonly "scheduler.decide": [];
  readonly "scheduler.terminal": [];
  readonly "command.environment": [options: AfterCommandInput["options"]];
  readonly "command.complete": [input: AfterCommandInput];
};
type OtherResultByPhase = {
  readonly "scheduler.prepare":
    | PreparedCustomAdmissionStrategy
    | Promise<PreparedCustomAdmissionStrategy>;
  readonly "scheduler.decide": AdmissionProposal;
  readonly "scheduler.terminal": void | Promise<void>;
  readonly "command.environment": CommandCheckEnvironment | Promise<CommandCheckEnvironment>;
  readonly "command.complete": CheckResult | Promise<CheckResult>;
};

/**
 * 根据阶段与 literal 需求自动推导精确 context，保留业务 input 和返回值；不执行 callback。
 *
 * @remarks 省略需求、undefined 或 [] 均为空。宽化数组和 union 只保证共同确定字段。
 * Definition、command constructor 或 prepared-result 边界负责验证、复制与固定声明。
 * @see [声明 callback context](../../../docs/guides/callback-context.md)
 */
export function defineContextCallback<
  P extends CheckPhase,
  O extends object,
  const N extends readonly (keyof CallbackContextByPhase[P])[],
  const R extends CheckResultByPhase[P],
  const T extends DeclaredContextCallback<
    [options: CallbackOptions<O>],
    CallbackContextByPhase[P],
    N,
    R
  >
>(
  phase: P,
  descriptor: ExactDescriptor<T> &
    DeclaredContextCallback<[options: CallbackOptions<O>], CallbackContextByPhase[P], N, R>
): T;
export function defineContextCallback<
  P extends CheckPhase,
  O extends object,
  const R extends CheckResultByPhase[P],
  const T extends EmptyContextCallback<[options: CallbackOptions<O>], R>
>(
  phase: P,
  descriptor: ExactDescriptor<T> & EmptyContextCallback<[options: CallbackOptions<O>], R>
): T;
export function defineContextCallback<
  P extends "scheduler.prepare" | "scheduler.decide" | "scheduler.terminal",
  const N extends readonly (keyof CallbackContextByPhase[P])[],
  const R extends OtherResultByPhase[P],
  const T extends DeclaredContextCallback<[], CallbackContextByPhase[P], N, R>
>(
  phase: P,
  descriptor: ExactDescriptor<T> & DeclaredContextCallback<[], CallbackContextByPhase[P], N, R>
): T;
export function defineContextCallback<
  P extends "scheduler.prepare" | "scheduler.decide" | "scheduler.terminal",
  const R extends OtherResultByPhase[P],
  const T extends EmptyContextCallback<[], R>
>(phase: P, descriptor: ExactDescriptor<T> & EmptyContextCallback<[], R>): T;
export function defineContextCallback<
  const N extends readonly (keyof CallbackContextByPhase["command.environment"])[],
  const R extends OtherResultByPhase["command.environment"],
  const T extends DeclaredContextCallback<
    OtherArgumentsByPhase["command.environment"],
    CallbackContextByPhase["command.environment"],
    N,
    R
  >
>(
  phase: "command.environment",
  descriptor: ExactDescriptor<T> &
    DeclaredContextCallback<
      OtherArgumentsByPhase["command.environment"],
      CallbackContextByPhase["command.environment"],
      N,
      R
    >
): T;
export function defineContextCallback<
  const R extends OtherResultByPhase["command.environment"],
  const T extends EmptyContextCallback<OtherArgumentsByPhase["command.environment"], R>
>(
  phase: "command.environment",
  descriptor: ExactDescriptor<T> &
    EmptyContextCallback<OtherArgumentsByPhase["command.environment"], R>
): T;
export function defineContextCallback<
  const N extends readonly (keyof CallbackContextByPhase["command.complete"])[],
  const R extends OtherResultByPhase["command.complete"],
  const T extends DeclaredContextCallback<
    OtherArgumentsByPhase["command.complete"],
    CallbackContextByPhase["command.complete"],
    N,
    R
  >
>(
  phase: "command.complete",
  descriptor: ExactDescriptor<T> &
    DeclaredContextCallback<
      OtherArgumentsByPhase["command.complete"],
      CallbackContextByPhase["command.complete"],
      N,
      R
    >
): T;
export function defineContextCallback<
  const R extends OtherResultByPhase["command.complete"],
  const T extends EmptyContextCallback<OtherArgumentsByPhase["command.complete"], R>
>(
  phase: "command.complete",
  descriptor: ExactDescriptor<T> &
    EmptyContextCallback<OtherArgumentsByPhase["command.complete"], R>
): T;
export function defineContextCallback(_phase: CallbackContextPhase, descriptor: unknown): unknown {
  return descriptor;
}
