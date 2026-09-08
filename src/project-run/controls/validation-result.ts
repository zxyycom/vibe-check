import type { ProgressRenderingFieldExpectation } from "../../project-definition/progress-rendering-output.ts";

/** 本次 controls 不符合封闭输入契约时的定位诊断；不包含被拒绝的原始值。 */
export type RunControlDiagnostic = Readonly<
  {
    readonly kind: "invalid-run-controls";
    /** 被拒绝的字段；对象本身无法安全读取时指向该对象。 */
    readonly path: string;
  } & (
    | {
        readonly reason: "invalid-value";
        /** 输出覆盖值非法时的合法值要求；未提供此提示的诊断省略。 */
        readonly expected?: ProgressRenderingFieldExpectation | "non-empty-string-without-nul";
      }
    | { readonly reason: "unknown-key"; readonly expected?: never }
  )
>;

/** Closed validation result for a Run-owned invocation control. */
export type RunControlValidationResult<T> = Readonly<
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: RunControlDiagnostic }
>;
