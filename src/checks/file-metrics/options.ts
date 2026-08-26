import type {
  CodeAreaDefinition,
  ProjectFileSelection
} from "../../project-files/configuration.ts";

export interface FileMetricsScannerOptions {
  readonly args: readonly string[];
  readonly availabilityArgs: readonly string[];
  readonly executable: string;
}

/** `fileMetrics` 的完整 Check-owned options。 */
export interface FileMetricsOptions {
  /** 参与本 Check 的完整 repository-file selection。 */
  readonly files: ProjectFileSelection;
  /** 用于 metric finding policy 的 Check-owned code areas。 */
  readonly codeAreas: Readonly<Record<string, CodeAreaDefinition>>;
  /** scc scanner 命令。 */
  readonly scanner: FileMetricsScannerOptions;
  /** 每个文件 code-line metric 的阈值和低 decision-token allowance。 */
  readonly codeLines: Readonly<{
    /** 超过此值时产生 file metric finding 的绝对阈值。 */
    readonly absoluteFloor: number;
    /** 小型低 decision-token 文件可使用的较高 code-line allowance。 */
    readonly lowDecisionTokenAllowance: Readonly<{
      /** 使用 allowance 所需达到的 code-line 数。 */
      readonly codeLineFloor: number;
      /** 使用 allowance 时允许的最大 decision-token 数。 */
      readonly maxDecisionTokens: number;
    }>;
  }>;
}
