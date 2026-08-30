import type {
  ProjectFileSelection,
  ProjectFileSelectionOptions
} from "../project-files/configuration.ts";
import type { FindingPolicy } from "../code-quality-findings/policy.ts";

/** `fileMetrics` 构造函数可省略的 SCC 可执行文件策略。 */
export interface FileMetricsScannerOptions {
  /** 省略时直接执行 `scc`；显式命令必须直接接受 adapter 拥有的 SCC 参数。 */
  readonly executable?: string;
}

/** file-metrics 区域可省略并由构造函数补齐的文件策略。 */
export type FileMetricsFileOptions = ProjectFileSelectionOptions;

/** SCC decision-token 数较低的文件可使用的代码行宽限策略。 */
export interface FileMetricsLowDecisionTokenAllowanceOptions {
  /** 省略时为 `600`；必须严格大于同一区域的普通代码行上限。 */
  readonly maximumCodeLines?: number;
  /** 省略时为 `12`；decision-token measurement 不大于此值时应用宽限上限。 */
  readonly maximumDecisionTokens?: number;
}

/** 一个区域可省略的文件代码行策略。 */
export interface FileMetricsCodeLineOptions {
  /** 省略时为 `360`；只有严格超过此值才产生 finding。 */
  readonly maximum?: number;
  /** 省略时使用完整默认宽限策略。 */
  readonly lowDecisionTokenAllowance?: FileMetricsLowDecisionTokenAllowanceOptions;
}

/** 可独立选择文件并定义代码行与 finding policy 的 file-metrics 区域。 */
export interface FileMetricsCodeAreaOptions {
  /** 显式区域必须声明本字段；其中各子字段可省略并使用 package 默认值。 */
  readonly files: FileMetricsFileOptions;
  /** 省略时继承顶层 `findingPolicy`。 */
  readonly findingPolicy?: FindingPolicy;
  /** 省略时使用 package 默认代码行策略。 */
  readonly codeLines?: FileMetricsCodeLineOptions;
}

/** `fileMetrics(options?)` 接受并补齐默认值的公开策略。 */
export interface FileMetricsOptions {
  /** 省略时建立默认 `project` 区域；显式映射必须非空。 */
  readonly codeAreas?: Readonly<Record<string, FileMetricsCodeAreaOptions>>;
  /** 省略时为 `non-blocking`；区域可局部覆盖。 */
  readonly findingPolicy?: FindingPolicy;
  /** 省略时直接执行 `scc`；CLI 协议由 owning adapter 固定。 */
  readonly scanner?: FileMetricsScannerOptions;
}

/** 构造函数生成并由 Check preflight/execution 消费的完整 options。 */
export interface ResolvedFileMetricsOptions {
  readonly codeAreas: Readonly<Record<string, ResolvedFileMetricsCodeAreaOptions>>;
  readonly scanner: ResolvedFileMetricsScannerOptions;
}

export interface ResolvedFileMetricsCodeAreaOptions {
  readonly codeLines: ResolvedFileMetricsCodeLineOptions;
  readonly files: ProjectFileSelection;
  readonly findingPolicy: FindingPolicy;
}

export interface ResolvedFileMetricsCodeLineOptions {
  readonly lowDecisionTokenAllowance: ResolvedFileMetricsLowDecisionTokenAllowanceOptions;
  readonly maximum: number;
}

export interface ResolvedFileMetricsLowDecisionTokenAllowanceOptions {
  readonly maximumCodeLines: number;
  readonly maximumDecisionTokens: number;
}

export interface ResolvedFileMetricsScannerOptions {
  readonly executable: string;
}
