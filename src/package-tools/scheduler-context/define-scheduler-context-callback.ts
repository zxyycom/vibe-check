import type {
  DeclaredSchedulerContextCallback,
  FullSchedulerContextCallback,
  SchedulerContextByPhase,
  SchedulerContextPhase,
  SchedulerContextResultByPhase
} from "../../project-definition/scheduler-context-callback.ts";

type ExactDescriptor<T> = T & Record<Exclude<keyof T, "contextNeeds" | "callback">, never>;

/**
 * 保留阶段、literal tuple 与 selected context 的 TypeScript 推导，不执行 callback。
 *
 * @remarks 未声明需求为 full，[] 为 none。同阶段按 union 共享冻结对象，类型只保证自身声明
 * 字段，不能依赖同行引入的额外字段。runtime 直接 descriptor 同样合法；raw TS descriptor 的
 * callback context 为 never，需读字段使用此 helper。Definition/prepared-result boundary 仍负责
 * closed validation 与 snapshot；此 helper 不替代验证，也不启动 measurement。
 */
export function defineSchedulerContextCallback<
  P extends SchedulerContextPhase,
  const N extends readonly (keyof SchedulerContextByPhase[P])[],
  const R extends SchedulerContextResultByPhase[P],
  const T extends DeclaredSchedulerContextCallback<P, N, R>
>(phase: P, descriptor: ExactDescriptor<T> & DeclaredSchedulerContextCallback<P, N, R>): T;
export function defineSchedulerContextCallback<
  P extends SchedulerContextPhase,
  const R extends SchedulerContextResultByPhase[P],
  const T extends FullSchedulerContextCallback<P, R>
>(phase: P, descriptor: ExactDescriptor<T> & FullSchedulerContextCallback<P, R>): T;
export function defineSchedulerContextCallback(
  _phase: SchedulerContextPhase,
  descriptor: Readonly<{
    readonly contextNeeds?: readonly string[] | undefined;
    readonly callback: (this: void, context: never) => unknown;
  }>
): unknown {
  return descriptor;
}
