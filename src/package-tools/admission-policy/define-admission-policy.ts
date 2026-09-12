import type {
  AdmissionPolicy,
  CustomAdmissionPreparationContext,
  CustomAdmissionStrategy,
  PreparedCustomAdmissionStrategy
} from "../../project-definition/scheduler-policy.ts";

type ExactAdmissionPolicy<T extends AdmissionPolicy> =
  T extends Readonly<{ readonly kind: "static" }>
    ? T & Record<Exclude<keyof T, "kind">, never>
    : T extends Readonly<{ readonly kind: "custom" }>
      ? T &
          Record<Exclude<keyof T, "kind" | "strategy">, never> &
          Readonly<{
            readonly strategy: ExactCustomAdmissionStrategy<T["strategy"]>;
          }>
      : never;

type ExactCustomAdmissionStrategy<T extends CustomAdmissionStrategy> =
  T extends Readonly<{ readonly kind: "simple" }>
    ? T & Record<Exclude<keyof T, "kind" | "decide">, never>
    : T extends Readonly<{ readonly kind: "prepared" }>
      ? T &
          Record<Exclude<keyof T, "kind" | "prepare">, never> &
          Readonly<{ readonly prepare: ExactCustomPreparation<T["prepare"]> }>
      : never;

type ExactCustomPreparation<T> = T extends (
  this: void,
  context: CustomAdmissionPreparationContext
) => infer Result
  ? (this: void, context: CustomAdmissionPreparationContext) => ExactCustomPreparationResult<Result>
  : never;

type ExactCustomPreparationResult<T> =
  T extends Promise<unknown>
    ? Promise<ExactPreparedCustomAdmissionStrategy<Awaited<T>>>
    : ExactPreparedCustomAdmissionStrategy<T>;

type ExactPreparedCustomAdmissionStrategy<T> = T extends PreparedCustomAdmissionStrategy
  ? T & Record<Exclude<keyof T, "decide" | "complete">, never>
  : never;

/**
 * 保留 closed admission policy literal 的 TypeScript inference，不创建额外运行语义。
 *
 * @remarks inline policy 与此 helper 的结果完全等价。custom simple `decide` 同步运行；prepared
 * strategy 为每个 graph-ready Run 解析独立 closure，调用方负责其 trusted host callback 的可重入性。
 */
export function defineAdmissionPolicy<const T extends AdmissionPolicy>(
  policy: ExactAdmissionPolicy<T>
): T {
  return policy;
}
