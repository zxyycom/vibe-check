import type { ProjectOutputs } from "../../project-definition/project-definition.ts";
/** 单次 run 调用的闭合上下文与 output override；Project Definition 保持为 authored input。 */
export interface RunControls {
  readonly checkAggregation?: CheckAggregation;
  readonly changedFiles?: readonly string[];
  /** 仅为本次调用覆盖 machine publication 或 progress rendering。 */
  readonly outputs?: Partial<{
    machinePublication: Partial<ProjectOutputs["machinePublication"]>;
    progressRendering: Partial<ProjectOutputs["progressRendering"]>;
  }>;
  readonly flags?: readonly string[];
  readonly projectRoot?: string;
  readonly signal?: AbortSignal;
}
/** 将选定 Check statuses 折叠为 invocation aggregate 的规则。 */
export interface CheckAggregation {
  readonly checks: "all" | readonly string[];
  readonly mode: "all" | "any";
  readonly unavailable: "propagate" | "fail" | "exclude";
  readonly notApplicable: "exclude" | "pass" | "fail";
  readonly empty: "passed" | "failed" | "not-applicable";
}
/** `CheckAggregation` 计算出的 invocation 级结果。 */
export type CheckAggregate = "passed" | "failed" | "not-applicable" | "unavailable";
