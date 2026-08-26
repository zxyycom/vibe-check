import type { CodeAreaDefinition, ProjectFileSelection } from "../project-files/configuration.ts";

export interface FunctionMetricsScannerOptions {
  readonly args: readonly string[];
  readonly availabilityArgs: readonly string[];
  readonly executable: string;
}

/** `functionMetrics` 的完整 Check-owned options。 */
export interface FunctionMetricsOptions {
  /** 参与本 Check 的完整 repository-file selection。 */
  readonly files: ProjectFileSelection;
  /** 用于 metric finding policy 的 Check-owned code areas。 */
  readonly codeAreas: Readonly<Record<string, CodeAreaDefinition>>;
  /** lizard scanner 命令。 */
  readonly scanner: FunctionMetricsScannerOptions;
  /** function code-line 阈值和低 complexity allowance。 */
  readonly codeLines: Readonly<{
    /** 超过此值时产生 function code-line finding 的绝对阈值。 */
    readonly absoluteFloor: number;
    /** 小型低 complexity function 可使用的较高 code-line allowance。 */
    readonly lowComplexityAllowance: Readonly<{
      /** 使用 allowance 所需达到的 code-line 数。 */
      readonly codeLineFloor: number;
      /** allowance 只适用于小于此 exclusive complexity 上限的 function。 */
      readonly maxCyclomaticComplexityExclusive: number;
    }>;
  }>;
  /** function cyclomatic complexity 的绝对阈值。 */
  readonly cyclomaticComplexity: Readonly<{
    /** 超过此值时产生 complexity finding。 */
    readonly absoluteFloor: number;
  }>;
  /** function parameter count 的绝对阈值。 */
  readonly parameterCount: Readonly<{
    /** 超过此值时产生 parameter-count finding。 */
    readonly absoluteFloor: number;
  }>;
}
