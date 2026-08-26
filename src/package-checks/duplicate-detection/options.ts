import type { CodeAreaDefinition, ProjectFileSelection } from "../project-files/configuration.ts";

export interface DuplicateDetectionCacheOptions {
  /** Cache 仅由 duplicate-detection 读取和写入。 */
  readonly enabled: boolean;
  /** 相对值以 project root 解析。 */
  readonly directory: string;
}

export interface DuplicateDetectionScannerOptions {
  readonly args: readonly string[];
  readonly availabilityArgs: readonly string[];
  readonly executable: string;
  readonly maxConcurrency: number;
}

/** `duplicateDetection` 的完整 Check-owned options。 */
export interface DuplicateDetectionOptions {
  /** 参与本 Check 的完整 repository-file selection。 */
  readonly files: ProjectFileSelection;
  /** 用于 exact-input grouping 与 finding policy 的 Check-owned code areas。 */
  readonly codeAreas: Readonly<Record<string, CodeAreaDefinition>>;
  /** Cache 仅由该 Check 使用。 */
  readonly cache: DuplicateDetectionCacheOptions;
  /** jscpd scanner 命令与其 backend 并发上限。 */
  readonly scanner: DuplicateDetectionScannerOptions;
  /** 未被 code area 覆盖时使用的 duplicate token 最小值。 */
  readonly defaultMinimumTokens: number;
  /** 按 known code area 覆盖 duplicate token 最小值。 */
  readonly minimumTokensByCodeArea: Readonly<Record<string, number>>;
}
