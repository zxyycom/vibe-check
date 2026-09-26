import type { PackageCheckAuthoringOptions } from "../check-authoring.ts";
import type { LocalCacheOptions } from "../local-cache-options.ts";
import type { FindingPolicy } from "../code-quality-findings/policy.ts";
import type { FindingWaiver } from "../../package-tools/finding-waivers/reconciliation.ts";
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

/** 可直接从 lint Record 复制的精确身份；完整 range 相同的多个 Finding 不可唯一豁免。 */
export interface MarkdownLintFindingIdentity {
  /** 规范化的 project-root-relative `/` 路径。 */
  readonly path: string;
  /** 闭合 Product catalog 中的规则名称。 */
  readonly rule: MarkdownLintRuleName;
  /** 一基 UTF-16 正安全整数位置；必须同行，end-exclusive column 不小于 start column。 */
  readonly range: Readonly<{
    readonly start: Readonly<{ readonly line: number; readonly column: number }>;
    readonly end: Readonly<{ readonly line: number; readonly column: number }>;
  }>;
}

/** 完整 traversal 后唯一匹配才应用的精确豁免；reason 会公开发布，不得包含秘密。 */
export type MarkdownLintFindingWaiver = FindingWaiver<MarkdownLintFindingIdentity>;

/** `markdownLint(options?)` 可接受的可省略 work limits。 */
export interface MarkdownLintLimitOptions {
  /** 单个 accepted Markdown source 的 UTF-8 字节上限。 */
  readonly maxMarkdownBytes?: number;
  /** 一次完整 traversal 中可积累的 lint finding 上限。 */
  readonly maxFindings?: number;
}

/** 调用方拥有的逐文件 lint findings 本地缓存；省略时关闭。 */
export type MarkdownLintCacheOptions = LocalCacheOptions;

/** `markdownLint(options?)` 可接受的闭合 authoring policy。 */
export interface MarkdownLintOptions<
  Id extends string = string
> extends PackageCheckAuthoringOptions<Id> {
  /** 参与本 Check 的 source selection；省略时使用 package defaults。 */
  readonly files?: ProjectFileSelectionOptions;
  /** 未豁免 lint finding 是否使本 Check failed；省略时为 non-blocking。 */
  readonly findingPolicy?: FindingPolicy;
  /** 闭合的精确 Finding 豁免；保留原始证据，不改变输入、limits 或缓存 facts。 */
  readonly findingWaivers?: readonly MarkdownLintFindingWaiver[];
  /** 非空数组完整替换 recommended rule set。 */
  readonly rules?: readonly MarkdownLintRuleName[];
  /** 每次 execution 的 Markdown 内容与 finding work 上限。 */
  readonly limits?: MarkdownLintLimitOptions;
  /** 可删除、可信 absolute directory；只缓存由当前 bytes 和规则计算的逐文件 findings。 */
  readonly cache?: MarkdownLintCacheOptions;
}

/** `markdown-lint` execution 消费的完整冻结 policy。 */
export interface ResolvedMarkdownLintOptions {
  readonly files: ProjectFileSelection;
  readonly findingPolicy: FindingPolicy;
  readonly findingWaivers: readonly MarkdownLintFindingWaiver[];
  readonly rules: readonly MarkdownLintRuleName[];
  readonly cache: MarkdownLintCacheOptions;
  readonly limits: Readonly<{
    readonly maxMarkdownBytes: number;
    readonly maxFindings: number;
  }>;
}
