import type { PackageCheckAuthoringOptions } from "../check-authoring.ts";
import type { FindingPolicy } from "../code-quality-findings/policy.ts";
import type {
  ProjectFileSelection,
  ProjectFileSelectionOptions
} from "../project-files/configuration.ts";

/** 由 Product 拥有且独立于 backend 名称的闭合 Markdown lint 规则目录。 */
export const MARKDOWN_LINT_RULE_NAMES = Object.freeze([
  "heading-increment",
  "no-reversed-links",
  "no-missing-space-atx",
  "fenced-code-language",
  "no-empty-links",
  "no-alt-text",
  "link-fragments",
  "reference-links-images",
  "table-column-count"
] as const);

/** `markdownLint` 支持的稳定 Product-owned 规则名称。 */
export type MarkdownLintRuleName = (typeof MARKDOWN_LINT_RULE_NAMES)[number];

/** `markdownLint(options?)` 可接受的可省略 work limits。 */
export interface MarkdownLintLimitOptions {
  /** 单个 accepted Markdown source 的 UTF-8 字节上限。 */
  readonly maxMarkdownBytes?: number;
  /** 一次完整 traversal 中可积累的 lint finding 上限。 */
  readonly maxFindings?: number;
}

/** `markdownLint(options?)` 可接受的闭合 authoring policy。 */
export interface MarkdownLintOptions<
  Id extends string = string
> extends PackageCheckAuthoringOptions<Id> {
  /** 参与本 Check 的 source selection；省略时使用 package defaults。 */
  readonly files?: ProjectFileSelectionOptions;
  /** lint finding 是否使本 Check failed；省略时为 non-blocking。 */
  readonly findingPolicy?: FindingPolicy;
  /** 非空数组完整替换 recommended rule set。 */
  readonly rules?: readonly MarkdownLintRuleName[];
  /** 每次 execution 的 Markdown 内容与 finding work 上限。 */
  readonly limits?: MarkdownLintLimitOptions;
}

/** `markdown-lint` execution 消费的完整冻结 policy。 */
export interface ResolvedMarkdownLintOptions {
  readonly files: ProjectFileSelection;
  readonly findingPolicy: FindingPolicy;
  readonly rules: readonly MarkdownLintRuleName[];
  readonly limits: Readonly<{
    readonly maxMarkdownBytes: number;
    readonly maxFindings: number;
  }>;
}
