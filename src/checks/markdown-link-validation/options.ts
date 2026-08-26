import type { ProjectFileSelection } from "../../project-files/configuration.ts";

/** `markdownLinkValidation` 的完整离线本地 Markdown 链接校验 options。 */
export interface MarkdownLinkValidationOptions {
  /** 参与本 Check 的完整 Markdown source selection。 */
  readonly files: ProjectFileSelection;
  /** `false` 时缺失的本地文件或目录不构成 finding。 */
  readonly requireExistingTargets: boolean;
  /** 是否检查 `#anchor` 对当前 Markdown 文档标题的引用。 */
  readonly validateSameDocumentAnchors: boolean;
  /** 是否检查直接指向的 Markdown 文件中的 `#anchor`。 */
  readonly validateCrossDocumentAnchors: boolean;
  /** root 外本机目标的授权模式；不授权网络请求。 */
  readonly rootExternalTargetMode: "ignore" | "report" | "validate";
  /** 是否将空目录目标视为 finding。 */
  readonly requireNonEmptyDirectories: boolean;
  /** 每次运行的 Markdown 内容、occurrence 和 direct target work 上限。 */
  readonly limits: Readonly<{
    /** 单个 Markdown source 或 anchor target 可读取的最大 UTF-8 byte 数。 */
    readonly maxMarkdownBytes: number;
    /** 所有 source 可处理的 Markdown semantic occurrence 上限。 */
    readonly maxOccurrences: number;
    /** 可进入 direct endpoint validation 的 occurrence 上限。 */
    readonly maxTargetReads: number;
  }>;
}
