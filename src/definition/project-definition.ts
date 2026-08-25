import { createHash } from "node:crypto";

import {
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  maintenanceReminders,
  jsonSchemaValidation,
  markdownLinkValidation,
  jsonValidation,
  type DuplicateDetectionOptions,
  type FileMetricsOptions,
  type FunctionMetricsOptions,
  type MarkdownLinkValidationOptions,
  type MaintenanceReminder,
  type MaintenanceReminderOptions,
  type JsonSchemaValidationOptions,
  type JsonValidationOptions
} from "./default-checks.ts";
import { resolveCheckTree, type ResolvedCheckTreeLeaf } from "./check-tree/resolution.ts";
import type { MeaninglessCheckWarning } from "./check-tree/authoring.ts";
import type { CheckDefinition } from "./check-definition.ts";
import {
  defineCheck,
  inherit,
  type Check,
  type CheckExecution,
  type CheckExecutionContext,
  type CheckOutcome,
  type CheckResult,
  type CheckUnavailableReason,
  type CheckVisibility,
  type InheritableCheckCollection
} from "./custom-check.ts";
import { DEFAULT_PROJECT_EFFECTS } from "./effect-defaults.ts";
import { isNonArrayRecord } from "../foundation/type-guards.ts";
import {
  NEUTRAL_QUALITY_CONFIGURATION,
  type ProjectQualityConfiguration
} from "./quality-configuration.ts";

export {
  defineCheck,
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  maintenanceReminders,
  markdownLinkValidation,
  inherit,
  jsonSchemaValidation,
  jsonValidation,
  type Check,
  type CheckExecution,
  type CheckExecutionContext,
  type CheckOutcome,
  type CheckResult,
  type CheckUnavailableReason,
  type DuplicateDetectionOptions,
  type FileMetricsOptions,
  type InheritableCheckCollection,
  type FunctionMetricsOptions,
  type MarkdownLinkValidationOptions,
  type MaintenanceReminder,
  type MaintenanceReminderOptions,
  type JsonSchemaValidationOptions,
  type JsonValidationOptions,
  type ProjectQualityConfiguration
};

/** 一次 Run 的 cache、output 与 progress effect 配置。 */
export interface ProjectEffects {
  /** Cache effect 的目录和启用状态。 */
  readonly cache: Readonly<{
    /** Cache 目录；相对值以 project root 解析，默认值为 `.cache/vibe-check`。 */
    readonly directory: string;
    /** `false` 时本次 Run 不读取或写入 cache。 */
    readonly enabled: boolean;
  }>;
  /** Output effect 的目录和启用状态。 */
  readonly output: Readonly<{
    /** `run.json` 与 `records.ndjson` 的目录；相对值以 project root 解析，默认值为 `artifacts/vibe-check`。 */
    readonly directory: string;
    /** `false` 时本次 Run 不发布 machine output。 */
    readonly enabled: boolean;
  }>;
  /** 人读 progress presentation 的启用状态。 */
  readonly progress: Readonly<{
    /** `false` 时不构造或写入 progress writer。 */
    readonly enabled: boolean;
  }>;
}

/** 定义级的并行预算；更细的调度 scope 保持为 Run 私有实现。 */
export interface SchedulerPolicy {
  /** 同时执行的 Check 上限；必须是正安全整数。 */
  readonly maxParallel: number;
}

/** 已补齐 Product 默认值、可交给 {@link run} 执行的项目定义。 */
export interface ProjectDefinition {
  /** 当前唯一支持的 authoring contract 版本。 */
  readonly apiVersion: "1";
  /** 根 Check collection；执行节点可递归包含子节点。 */
  readonly checks: readonly Check[];
  /** 本定义的默认 effect 配置。 */
  readonly effects: ProjectEffects;
  /** Check callback 可读取的已规范化质量范围。 */
  readonly quality: ProjectQualityConfiguration;
  /** 根 Check 的调度默认值。 */
  readonly scheduler: SchedulerPolicy;
}

type ProjectDefinitionInput = Readonly<{
  apiVersion?: "1";
  checks?: readonly Check[];
  effects?: Partial<{
    cache: Partial<ProjectEffects["cache"]>;
    output: Partial<ProjectEffects["output"]>;
    progress: Partial<ProjectEffects["progress"]>;
  }>;
  quality?: ProjectQualityConfiguration;
  scheduler?: Partial<SchedulerPolicy>;
}>;

/** 单次 {@link run} 调用的闭合上下文与 effect override，不能改写 Project Definition。 */
export interface RunControls {
  /** 仅为本次调用选择 aggregation 的规则；省略时 `aggregate` 为 `null`。 */
  readonly checkAggregation?: CheckAggregation;
  /** 传给 Check callback 的已变更文件路径，不改变默认 Check 的 metric 语义。 */
  readonly changedFiles?: readonly string[];
  /** 仅为本次调用覆盖 cache、output 或 progress effect 的设置。 */
  readonly effects?: Partial<{
    cache: Partial<ProjectEffects["cache"]>;
    output: Partial<ProjectEffects["output"]>;
    progress: Partial<ProjectEffects["progress"]>;
  }>;
  /** 传给 Check callback 的密集字符串 token；Product 不解释其业务含义。 */
  readonly flags?: readonly string[];
  /** 解析为绝对 project root，并作为相对 effect 目录的基准。 */
  readonly projectRoot?: string;
  /** 取消前尚未开始的工作；取消阶段通过 {@link RunResult} 返回。 */
  readonly signal?: AbortSignal;
}

/** 将选定 Check statuses 折叠为 invocation aggregate 的规则。 */
export interface CheckAggregation {
  /** 参与 aggregation 的全部 Check 或其唯一 ID 集合。 */
  readonly checks: "all" | readonly string[];
  /** `all` 要求所有参与项通过，`any` 接受任一通过项。 */
  readonly mode: "all" | "any";
  /** 遇到 `unavailable` status 时的处理。 */
  readonly unavailable: "propagate" | "fail" | "exclude";
  /** 遇到 `not-applicable` status 时的处理。 */
  readonly notApplicable: "exclude" | "pass" | "fail";
  /** 没有参与项时产生的 aggregate。 */
  readonly empty: "passed" | "failed" | "not-applicable";
}

/** {@link CheckAggregation} 计算出的 invocation 级结果。 */
export type CheckAggregate = "passed" | "failed" | "not-applicable" | "unavailable";

export interface ProjectDefinitionDiagnostic {
  readonly kind: "invalid-project-definition" | "invalid-run-controls";
  readonly path: string;
  readonly reason: "invalid-value" | "unknown-key";
}

export type DefinitionWarning = MeaninglessCheckWarning;

export type ValidationResult<T> = Readonly<
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ProjectDefinitionDiagnostic }
>;

export type ProjectDefinitionValidationResult = Readonly<
  | {
      readonly ok: true;
      readonly value: ProjectDefinition;
      readonly warnings: readonly DefinitionWarning[];
    }
  | { readonly ok: false; readonly error: ProjectDefinitionDiagnostic }
>;

export interface NormalizedCheckDeclaration {
  readonly definition: CheckDefinition;
  readonly dependsOn: readonly string[];
  readonly maxParallel: number;
  readonly mutex: readonly string[];
  /** Definition-validated JSON data that contributes to the fingerprint only. */
  readonly options: object;
  readonly visibility: CheckVisibility;
}

export interface NormalizedCheck extends NormalizedCheckDeclaration {
  /** Trusted project code; deliberately excluded from `declarative`. */
  readonly execution: CheckExecution;
}

export interface DeclarativeProjectSnapshot {
  readonly apiVersion: "1";
  /** Canonically ordered executable Check declarations. */
  readonly checks: readonly NormalizedCheckDeclaration[];
  readonly effects: ProjectEffects;
  readonly quality: ProjectQualityConfiguration;
  readonly scheduler: SchedulerPolicy;
}

export interface NormalizedProjectDefinition {
  readonly checks: readonly NormalizedCheck[];
  readonly declarative: DeclarativeProjectSnapshot;
  readonly definitionWarnings: readonly DefinitionWarning[];
}

/**
 * 使用 Product 默认值创建普通 Project Definition。
 *
 * @remarks `run` 仍是关闭 Check tree 与校验 declarative data 的唯一边界；本函数不执行 runtime
 * validation，也不合并被调用方替换的嵌套 default Check options。
 */
export function defineConfig<const T extends ProjectDefinitionInput>(
  value: T & Record<Exclude<keyof T, keyof ProjectDefinitionInput>, never>
): ProjectDefinition {
  return {
    apiVersion: value.apiVersion ?? "1",
    checks: value.checks ?? [],
    effects: {
      cache: {
        directory: value.effects?.cache?.directory ?? DEFAULT_PROJECT_EFFECTS.cache.directory,
        enabled: value.effects?.cache?.enabled ?? DEFAULT_PROJECT_EFFECTS.cache.enabled
      },
      output: {
        directory: value.effects?.output?.directory ?? DEFAULT_PROJECT_EFFECTS.output.directory,
        enabled: value.effects?.output?.enabled ?? DEFAULT_PROJECT_EFFECTS.output.enabled
      },
      progress: {
        enabled: value.effects?.progress?.enabled ?? DEFAULT_PROJECT_EFFECTS.progress.enabled
      }
    },
    quality: value.quality ?? NEUTRAL_QUALITY_CONFIGURATION,
    scheduler: { maxParallel: value.scheduler?.maxParallel ?? 4 }
  };
}

export function normalizeProjectDefinition(
  definition: ProjectDefinition
): NormalizedProjectDefinition {
  const tree = resolveCheckTree(definition.checks, definition.scheduler.maxParallel);
  if (tree === undefined)
    throw new TypeError("Project Definition Check tree failed closed normalization");
  const checks = Object.freeze(tree.leaves.map(normalizeCheck));
  return Object.freeze({
    checks,
    declarative: freezeDeclarativeSnapshot(definition, checks),
    definitionWarnings: tree.warnings
  });
}

function normalizeCheck(leaf: ResolvedCheckTreeLeaf): NormalizedCheck {
  return Object.freeze({
    definition: leaf.definition,
    dependsOn: leaf.dependsOn,
    execution: leaf.execution,
    maxParallel: leaf.maxParallel,
    mutex: leaf.mutex,
    options: leaf.options,
    visibility: leaf.visibility
  });
}

export function createDeclarativeFingerprint(snapshot: DeclarativeProjectSnapshot): string {
  return createHash("sha256").update(stableJson(snapshot)).digest("hex");
}

function freezeDeclarativeSnapshot(
  definition: ProjectDefinition,
  checks: readonly NormalizedCheck[]
): DeclarativeProjectSnapshot {
  const declarations = checks
    .map(({ execution: _execution, ...declaration }) => declaration)
    .sort((left, right) => compareText(left.definition.checkId, right.definition.checkId));
  return deepFreeze({
    apiVersion: definition.apiVersion,
    checks: declarations,
    effects: definition.effects,
    quality: definition.quality,
    scheduler: definition.scheduler
  });
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isNonArrayRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
