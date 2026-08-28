import type { ProjectFileSelection } from "../project-files/configuration.ts";

export const FUNCTION_METRICS_FINDING_POLICIES = Object.freeze([
  "blocking",
  "non-blocking"
] as const);

export type FunctionMetricsFindingPolicy = (typeof FUNCTION_METRICS_FINDING_POLICIES)[number];

/** `functionMetrics` constructor 可省略的 file-selection policy。 */
export interface FunctionMetricsFileOptions {
  /** 省略时使用 package 默认目录排除；显式数组完整替换该默认值。 */
  readonly excludeDirs?: readonly string[];
  /** 省略时排除 package 默认的 generated-file globs；显式数组完整替换该默认值。 */
  readonly generatedFiles?: readonly string[];
  /** 省略时包含全部相对路径；显式数组完整替换该默认值。 */
  readonly include?: readonly string[];
}

/** `functionMetrics` constructor 可省略的 function metric limits。 */
export interface FunctionMetricsLimitOptions {
  readonly codeLines?: Readonly<{
    /** 省略时为 `50`；function NLOC 超过此值时产生 finding。 */
    readonly maximum?: number;
    readonly lowComplexityAllowance?: Readonly<{
      /** 省略时为 `5`；complexity 小于此值时可使用较高 NLOC 上限。 */
      readonly cyclomaticComplexityBelow?: number;
      /** 省略时为 `150`；不得小于普通 code-line maximum。 */
      readonly maximum?: number;
    }>;
  }>;
  readonly cyclomaticComplexity?: Readonly<{
    /** 省略时为 `10`。 */
    readonly maximum?: number;
  }>;
  readonly parameters?: Readonly<{
    /** 省略时为 `5`。 */
    readonly maximum?: number;
  }>;
}

/** 一个可独立选择文件和 finding policy 的 function-metrics 区域。 */
export interface FunctionMetricsCodeAreaOptions {
  /** 显式 area 必须声明本 branch；其中各 list 可省略并使用 package defaults。 */
  readonly files: FunctionMetricsFileOptions;
  /** 省略时继承顶层 `findingPolicy`。 */
  readonly findingPolicy?: FunctionMetricsFindingPolicy;
  /** 省略的 nested limits 使用 package defaults。 */
  readonly limits?: FunctionMetricsLimitOptions;
}

/** `functionMetrics` constructor 可省略的 Lizard executable policy。 */
export interface FunctionMetricsScannerOptions {
  /** 省略时为 `lizard`；显式 command 必须直接接受 adapter-owned Lizard arguments。 */
  readonly executable?: string;
}

/** `functionMetrics(options?)` 接受并补齐默认值的 public policy。 */
export interface FunctionMetricsOptions {
  /** 省略时建立默认 `project` area；显式 map 必须非空，且每个 area 必须声明 `files`。 */
  readonly codeAreas?: Readonly<Record<string, FunctionMetricsCodeAreaOptions>>;
  /** 省略时为 `blocking`；area 可局部覆盖。 */
  readonly findingPolicy?: FunctionMetricsFindingPolicy;
  /** 省略时使用 PATH 中的 `lizard`。 */
  readonly scanner?: FunctionMetricsScannerOptions;
}

/** Constructor 生成并由 Check preflight/execution 消费的完整 options。 */
export interface ResolvedFunctionMetricsOptions {
  readonly codeAreas: Readonly<Record<string, ResolvedFunctionMetricsCodeAreaOptions>>;
  readonly scanner: ResolvedFunctionMetricsScannerOptions;
}

export interface ResolvedFunctionMetricsCodeAreaOptions {
  readonly files: ProjectFileSelection;
  readonly findingPolicy: FunctionMetricsFindingPolicy;
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
