import type {
  ProjectFileSelection,
  ProjectFileSelectionOptions
} from "../project-files/configuration.ts";
import type { FindingPolicy } from "../code-quality-findings/policy.ts";
import type { FindingWaiver } from "../../finding-waivers/reconciliation.ts";

export type DuplicateDetectionScannerCommand =
  /** 使用随 `@zxyycom/vibe-check` 安装的 jscpd。 */
  | Readonly<{ readonly kind: "package" }>
  /** 显式授权另一个 jscpd 命令。 */
  | Readonly<{
      /** 项目已授权且直接接受 jscpd CLI 参数的非空命令。 */
      readonly executable: string;
      readonly kind: "custom";
    }>;

/** `duplicateDetection` 构造函数可省略的缓存策略。 */
export interface DuplicateDetectionCacheOptions {
  /** 省略时为 `.cache/vibe-check`；相对路径以项目根目录解析。 */
  readonly directory?: string;
  /** 省略时启用。 */
  readonly enabled?: boolean;
}

/** `duplicateDetection` 构造函数可省略的 scanner 策略。 */
export interface DuplicateDetectionScannerOptions {
  /** 省略时使用随 `@zxyycom/vibe-check` 安装的 jscpd。 */
  readonly command?: DuplicateDetectionScannerCommand;
}

/** duplicate-detection identity 的 locations 数组中的一段 project-relative range。 */
export interface DuplicateDetectionFindingLocation {
  readonly endLine: number;
  readonly path: string;
  readonly startLine: number;
}

/** duplicate-detection 用于精确识别一条可豁免 finding 的稳定字段。 */
export interface DuplicateDetectionFindingIdentity {
  readonly locations: readonly DuplicateDetectionFindingLocation[];
  readonly metric: "duplicate-tokens";
}

/** 一项 duplicate-detection finding 的声明式豁免。 */
export type DuplicateDetectionFindingWaiver = FindingWaiver<DuplicateDetectionFindingIdentity>;

/** 重复代码区域可省略并由构造函数补齐的文件策略。 */
export type DuplicateDetectionFileOptions = ProjectFileSelectionOptions;

/** 可独立选择文件、阈值和 finding policy 的重复代码区域。 */
export interface DuplicateDetectionCodeAreaOptions {
  /** 显式区域必须声明本字段；其中各子字段可省略并使用 package 默认值。 */
  readonly files: DuplicateDetectionFileOptions;
  /** 省略时继承顶层 `findingPolicy`。 */
  readonly findingPolicy?: FindingPolicy;
  /** 省略时为 `4`。 */
  readonly minimumLines?: number;
  /** 省略时为 `100`。 */
  readonly minimumTokens?: number;
}

/** `duplicateDetection(options?)` 接受并补齐默认值的公开策略。 */
export interface DuplicateDetectionOptions {
  /** 省略时建立默认 `project` 区域；显式映射必须非空。 */
  readonly codeAreas?: Readonly<Record<string, DuplicateDetectionCodeAreaOptions>>;
  readonly cache?: DuplicateDetectionCacheOptions;
  /** 省略时为 `non-blocking`；区域可局部覆盖。 */
  readonly findingPolicy?: FindingPolicy;
  /** 省略时没有豁免；identity 使用 Finding 发布的完整排序 location ranges。 */
  readonly findingWaivers?: readonly DuplicateDetectionFindingWaiver[];
  readonly scanner?: DuplicateDetectionScannerOptions;
}

/** 构造函数生成并由 Check preflight/execution 消费的完整 options。 */
export interface ResolvedDuplicateDetectionOptions {
  readonly cache: Readonly<{ readonly directory: string; readonly enabled: boolean }>;
  readonly codeAreas: Readonly<Record<string, ResolvedDuplicateDetectionCodeAreaOptions>>;
  readonly findingWaivers: readonly DuplicateDetectionFindingWaiver[];
  readonly scanner: ResolvedDuplicateDetectionScannerOptions;
}

export interface ResolvedDuplicateDetectionCodeAreaOptions {
  readonly files: ProjectFileSelection;
  readonly findingPolicy: FindingPolicy;
  readonly minimumLines: number;
  readonly minimumTokens: number;
}

export interface ResolvedDuplicateDetectionScannerOptions {
  readonly command: DuplicateDetectionScannerCommand;
}
