import type {
  ProjectFileSelection,
  ProjectFileSelectionOptions
} from "../project-files/configuration.ts";
import type { FindingPolicy } from "../code-quality-findings/policy.ts";

/** `functionMetrics` 构造函数可省略的文件选择策略。 */
export type FunctionMetricsFileOptions = ProjectFileSelectionOptions;

/** `functionMetrics` 构造函数可省略的函数指标上限。 */
export interface FunctionMetricsLimitOptions {
  readonly codeLines?: Readonly<{
    /** 省略时为 `60`；函数 NLOC 超过此值时产生 finding。 */
    readonly maximum?: number;
    readonly lowComplexityAllowance?: Readonly<{
      /** 省略时为 `6`；复杂度小于此值时可使用较高 NLOC 上限。 */
      readonly cyclomaticComplexityBelow?: number;
      /** 省略时为 `180`；不得小于普通代码行上限。 */
      readonly maximum?: number;
    }>;
  }>;
  readonly cyclomaticComplexity?: Readonly<{
    /** 省略时为 `12`。 */
    readonly maximum?: number;
  }>;
  readonly parameters?: Readonly<{
    /** 省略时为 `6`。 */
    readonly maximum?: number;
  }>;
}

/** 可独立选择文件、指标上限和 finding policy 的 function-metrics 区域。 */
export interface FunctionMetricsCodeAreaOptions {
  /** 显式区域必须声明本字段；其中各子字段可省略并使用 package 默认值。 */
  readonly files: FunctionMetricsFileOptions;
  /** 省略时继承顶层 `findingPolicy`。 */
  readonly findingPolicy?: FindingPolicy;
  /** 省略的嵌套上限使用 package 默认值。 */
  readonly limits?: FunctionMetricsLimitOptions;
}

/** `functionMetrics` 构造函数可省略的 Lizard 可执行文件策略。 */
export interface FunctionMetricsScannerOptions {
  /** 省略时为 `lizard`；显式命令必须直接接受 adapter 拥有的 Lizard 参数。 */
  readonly executable?: string;
}

/** `functionMetrics(options?)` 接受并补齐默认值的公开策略。 */
export interface FunctionMetricsOptions {
  /** 省略时建立默认 `project` 区域；显式映射必须非空，且每个区域必须声明 `files`。 */
  readonly codeAreas?: Readonly<Record<string, FunctionMetricsCodeAreaOptions>>;
  /** 省略时为 `non-blocking`；区域可局部覆盖。 */
  readonly findingPolicy?: FindingPolicy;
  /** 省略时使用 PATH 中的 `lizard`。 */
  readonly scanner?: FunctionMetricsScannerOptions;
}

/** 构造函数生成并由 Check preflight/execution 消费的完整 options。 */
export interface ResolvedFunctionMetricsOptions {
  readonly codeAreas: Readonly<Record<string, ResolvedFunctionMetricsCodeAreaOptions>>;
  readonly scanner: ResolvedFunctionMetricsScannerOptions;
}

export interface ResolvedFunctionMetricsCodeAreaOptions {
  readonly files: ProjectFileSelection;
  readonly findingPolicy: FindingPolicy;
  readonly limits: ResolvedFunctionMetricsLimits;
}

export interface ResolvedFunctionMetricsLimits {
  readonly codeLines: Readonly<{
    readonly maximum: number;
    readonly lowComplexityAllowance: Readonly<{
      readonly cyclomaticComplexityBelow: number;
      readonly maximum: number;
    }>;
  }>;
  readonly cyclomaticComplexity: Readonly<{ readonly maximum: number }>;
  readonly parameters: Readonly<{ readonly maximum: number }>;
}

export interface ResolvedFunctionMetricsScannerOptions {
  readonly executable: string;
}
