import type {
  ProjectFileSelection,
  ProjectFileSelectionOptions
} from "../project-files/configuration.ts";
import type { FindingPolicy } from "../code-quality-findings/policy.ts";

export type MarkdownRootExternalTargetMode = "ignore" | "report" | "validate";

/** 可省略的 Markdown validation work limits。 */
export interface MarkdownLinkValidationLimitOptions {
  readonly maxMarkdownBytes?: number;
  readonly maxOccurrences?: number;
  readonly maxTargetReads?: number;
}

/** `markdownLinkValidation(options?)` 接受的可省略 authoring policy。 */
export interface MarkdownLinkValidationOptions {
  /** 参与本 Check 的 Markdown source selection；省略字段使用 package defaults。 */
  readonly files?: ProjectFileSelectionOptions;
  /** local-reference finding 是否使本 Check failed；省略时为 blocking。 */
  readonly findingPolicy?: FindingPolicy;
  /** `false` 时缺失的本地文件或目录不构成 finding。 */
  readonly requireExistingTargets?: boolean;
  /** 是否检查 `#anchor` 对当前 Markdown 文档标题的引用。 */
  readonly validateSameDocumentAnchors?: boolean;
  /** 是否检查直接指向的 Markdown 文件中的 `#anchor`。 */
  readonly validateCrossDocumentAnchors?: boolean;
  /** root 外本机目标的授权模式；不授权网络请求。 */
  readonly rootExternalTargetMode?: MarkdownRootExternalTargetMode;
  /** 是否将空目录目标视为 finding。 */
  readonly requireNonEmptyDirectories?: boolean;
  /** 每次运行的 Markdown 内容、occurrence 和 direct target work 上限。 */
  readonly limits?: MarkdownLinkValidationLimitOptions;
}

/** `markdown-link-validation` execution 消费的完整、冻结 options。 */
export interface ResolvedMarkdownLinkValidationOptions {
  readonly files: ProjectFileSelection;
  readonly findingPolicy: FindingPolicy;
  readonly requireExistingTargets: boolean;
  readonly validateSameDocumentAnchors: boolean;
  readonly validateCrossDocumentAnchors: boolean;
  readonly rootExternalTargetMode: MarkdownRootExternalTargetMode;
  readonly requireNonEmptyDirectories: boolean;
  readonly limits: Readonly<{
    readonly maxMarkdownBytes: number;
    readonly maxOccurrences: number;
    readonly maxTargetReads: number;
  }>;
}
