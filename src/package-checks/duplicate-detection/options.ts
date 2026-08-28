import type { ProjectFileSelection } from "../project-files/configuration.ts";

export type DuplicateDetectionScannerCommand =
  /** 使用随 `vibe-check` 安装的 jscpd。 */
  | Readonly<{ readonly kind: "package" }>
  /** 显式授权一个 custom jscpd command。 */
  | Readonly<{
      /** 项目已授权且直接接受 jscpd CLI 参数的非空 command。 */
      readonly executable: string;
      readonly kind: "custom";
    }>;

/** `duplicateDetection` constructor 可省略的 cache policy。 */
export interface DuplicateDetectionCacheOptions {
  /** 省略时为 `.cache/vibe-check`；相对值以 project root 解析。 */
  readonly directory?: string;
  /** 省略时启用。 */
  readonly enabled?: boolean;
}

/** `duplicateDetection` constructor 可省略的 scanner policy。 */
export interface DuplicateDetectionScannerOptions {
  /** 省略时使用随 `vibe-check` 安装的 jscpd。 */
  readonly command?: DuplicateDetectionScannerCommand;
}

/** 一个 duplicate code area 可省略并由 constructor 补齐的文件 policy。 */
export interface DuplicateDetectionFileOptions {
  readonly excludeDirs?: readonly string[];
  readonly generatedFiles?: readonly string[];
  readonly include?: readonly string[];
}

/** 一个可独立选择文件的重复代码区域及其 defaulted finding policy。 */
export interface DuplicateDetectionCodeAreaOptions {
  /** 显式 area 必须声明本 branch；其中各 list 可省略并使用 package defaults。 */
  readonly files: DuplicateDetectionFileOptions;
  /** 省略时为 `3`。 */
  readonly minimumLines?: number;
  /** 省略时为 `75`。 */
  readonly minimumTokens?: number;
}

/** `duplicateDetection(options?)` 接受并补齐默认值的 public policy。 */
export interface DuplicateDetectionOptions {
  /** 省略时建立默认 `project` area；显式 map 必须非空。 */
  readonly codeAreas?: Readonly<Record<string, DuplicateDetectionCodeAreaOptions>>;
  readonly cache?: DuplicateDetectionCacheOptions;
  readonly scanner?: DuplicateDetectionScannerOptions;
}

/** Constructor 生成并由 Check preflight/execution 消费的完整 options。 */
export interface ResolvedDuplicateDetectionOptions {
  readonly cache: Readonly<{ readonly directory: string; readonly enabled: boolean }>;
  readonly codeAreas: Readonly<Record<string, ResolvedDuplicateDetectionCodeAreaOptions>>;
  readonly scanner: ResolvedDuplicateDetectionScannerOptions;
}

export interface ResolvedDuplicateDetectionCodeAreaOptions {
  readonly files: ProjectFileSelection;
  readonly minimumLines: number;
  readonly minimumTokens: number;
}

export interface ResolvedDuplicateDetectionScannerOptions {
  readonly command: DuplicateDetectionScannerCommand;
}
