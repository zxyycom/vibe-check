/** `fileMetrics` constructor 可省略的 SCC executable policy。 */
export interface FileMetricsScannerOptions {
  /** 省略时直接执行 `scc`。 */
  readonly executable?: string;
}

/** 一个 file-metrics area 可省略并由 constructor 补齐的文件 policy。 */
export interface FileMetricsFileOptions {
  readonly excludeDirs?: readonly string[];
  readonly generatedFiles?: readonly string[];
  readonly include?: readonly string[];
}

/** 低 decision-token 文件可省略的较高 code-line allowance。 */
export interface FileMetricsLowDecisionTokenAllowanceOptions {
  /** 省略时为 `500`。 */
  readonly maximumCodeLines?: number;
  /** 省略时为 `10`。 */
  readonly maximumDecisionTokens?: number;
}

/** 一个 area 可省略的 file code-line policy。 */
export interface FileMetricsCodeLineOptions {
  /** 省略时为 `300`；只有严格超过此值才产生 finding。 */
  readonly maximum?: number;
  /** 省略时使用完整默认 allowance。 */
  readonly lowDecisionTokenAllowance?: FileMetricsLowDecisionTokenAllowanceOptions;
}

/** 一个可独立选择文件并定义 code-line policy 的 file-metrics area。 */
export interface FileMetricsCodeAreaOptions {
  /** 显式 area 必须声明本 branch；其中各 list 可省略并使用 package defaults。 */
  readonly files: FileMetricsFileOptions;
  /** 省略时使用 package default code-line policy。 */
  readonly codeLines?: FileMetricsCodeLineOptions;
}

/** `fileMetrics(options?)` 接受并补齐默认值的 public policy。 */
export interface FileMetricsOptions {
  /** 省略时建立默认 `project` area；显式 map 必须非空。 */
  readonly codeAreas?: Readonly<Record<string, FileMetricsCodeAreaOptions>>;
  /** 省略时直接执行 `scc`，CLI protocol 由 owning adapter 固定。 */
  readonly scanner?: FileMetricsScannerOptions;
}

/** Constructor 生成并由 Check preflight/execution 消费的完整 options。 */
export interface ResolvedFileMetricsOptions {
  readonly codeAreas: Readonly<Record<string, ResolvedFileMetricsCodeAreaOptions>>;
  readonly scanner: ResolvedFileMetricsScannerOptions;
}

export interface ResolvedFileMetricsCodeAreaOptions {
  readonly codeLines: Readonly<{
    readonly maximum: number;
    readonly lowDecisionTokenAllowance: Readonly<{
      readonly maximumCodeLines: number;
      readonly maximumDecisionTokens: number;
    }>;
  }>;
  readonly files: ProjectFileSelection;
}

export interface ResolvedFileMetricsScannerOptions {
  readonly executable: string;
}
import type { ProjectFileSelection } from "../project-files/configuration.ts";
