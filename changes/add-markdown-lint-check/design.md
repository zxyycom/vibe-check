# Design

本设计把 Markdown lint 限定为独立、无缓存、使用 Product-owned 规则与结果契约的 package Check。

## Context

- [`survey-markdown-lint-tools.md`](../../docs/investigations/survey-markdown-lint-tools.md) 选择
  `markdownlint` 程序内 API 作为 TypeScript 集成基线，并完成 `markdownlint@0.41.1` Promise API spike。
- [`provide-bounded-markdown-lint-check`](../../docs/decisions/provide-bounded-markdown-lint-check.md) 是本设计的
  长期权威：独立 Check、九项闭合规则、私有 backend、有界执行、package advisory default、Gate 分离。
- [`markdownLinkValidation`](../../docs/checks/markdown-link-validation.md) 继续拥有本地 target 与 anchor 完整性；
  本 Check 拥有 Markdown 结构和明确内容缺陷。`link-fragments` 默认关闭，避免重复 evidence。
- [`design-markdown-check-caching`](../design-markdown-check-caching/) 只消费本 Change 稳定后的 rule、adapter、
  range、Finding 与资源契约。

## Goals / Non-Goals

### Goals

- 提供可无参构造、默认产生高信号诊断的 package Check。
- 让 consumer 通过非空闭合列表完整选择首版支持的规则，不接触 backend 配置语言。
- 把 exact authorized inputs 转换为可排序、可验证且不含 source 的 Product Records、消息和四态结果。
- 沿用 project-file selection、输入资格对账、资源限制、取消和 Finding policy 的现有约定。

### Non-Goals

- Link target、跨文档 anchor、网络和 HTML link 仍由其它能力负责。
- 首版不覆盖排版偏好、拼写、术语、事实、代码示例执行、自动修复、waiver 或 persistent cache。
- Backend 配置文件、preset/tag、custom rule、任意 rule object、rule 参数、parser plugin、AST 和原始诊断
  不构成公共能力。
- Repository Gate adoption 不属于本 Change。

## Decisions

### Intended Change

#### Public Configuration and Rules

Constructor 固定为 `markdownLint(options?)`，Check ID 为 `markdown-lint`，display name 为 `Markdown lint`。
根入口导出 constructor、`parseMarkdownLintData`、options/resolved options、rule name、final data、Record data 与
unavailable reason 类型；不增加 CLI、`bin` 或 package subpath。

`MarkdownLintOptions` 只接受 `files?`、`findingPolicy?`、`rules?` 和 `limits?`：

- `rules` 省略时使用 recommended；显式数组完整替换默认集，必须非空、无 sparse item、无重复且只含下表名称。
  Resolved 顺序固定为 Product catalog 顺序。
- `limits` 的 `maxMarkdownBytes` / `maxFindings` 默认值为 `1_048_576` / `10_000`，必须为正安全整数，
  最大值为 `16_777_216` / `100_000`。
- `files` 默认选择大小写不敏感的 `.md` / `.markdown`；`findingPolicy` 默认为 `non-blocking`。

| Public rule | Backend configuration | Default | Product meaning |
| --- | --- | --- | --- |
| `heading-increment` | `MD001: { front_matter_title: "^\\s*title\\s*[:=]" }` | 是 | 标题层级一次最多增加一级 |
| `no-reversed-links` | `MD011: true` | 是 | 反向 `()[]` 链接语法 |
| `no-missing-space-atx` | `MD018: true` | 是 | ATX 标题 marker 后缺少空格 |
| `fenced-code-language` | `MD040: { allowed_languages: [], language_only: false }` | 是 | 围栏代码块缺少语言 |
| `no-empty-links` | `MD042: true` | 是 | 空 link destination 或空 fragment |
| `no-alt-text` | `MD045: true` | 是 | Markdown image 缺少 alt text |
| `link-fragments` | `MD051: { ignore_case: false, ignored_pattern: "" }` | 否 | same-document fragment 未匹配标题 |
| `reference-links-images` | `MD052: { ignored_labels: ["x"], shortcut_syntax: false }` | 是 | full/collapsed reference 缺少 definition |
| `table-column-count` | `MD056: true` | 是 | GFM pipe table 各行列数不一致 |

Adapter 从 `default: false` 开始，只启用 resolved rules；每项配置值都由 Product fixture 锁定。

#### Private Backend and Markdown Dialect

生产依赖固定为 exact `markdownlint@0.41.1`，adapter 只调用 `markdownlint/promise` 的 `strings` API。
Backend 不取得路径或文件系统权限。每次调用设置 `noInlineConfig: true`，并显式传入以下 front matter RegExp：

```js
/((^---[^\S\r\n\u2028\u2029]*$[\s\S]+?^---\s*)|(^\+\+\+[^\S\r\n\u2028\u2029]*$[\s\S]+?^(\+\+\+|\.\.\.)\s*)|(^\{[^\S\r\n\u2028\u2029]*$[\s\S]+?^\}\s*))(\r\n|\r|\n|$)/m
```

该方言识别文件开头的 YAML、TOML 和 JSON metadata，并使用 backend 0.41.1 的 CommonMark/GFM constructs。
Fixture 锁定 front matter、inline directives、pipe table、HTML comments 和不支持扩展的实际行为；不承诺与任意 renderer 等价。

#### Inputs, Limits, and Cancellation

Check 每次 execution 只收集一次 selected paths 并稳定排序。`.md` / `.markdown` 大小写变体进入 accepted sources；
其它路径逐项发布 non-blocking `input-rejected / unsupported-file-type` Record。

每个 accepted source 必须在 project root containment 内安全读取为 regular UTF-8 file，且不超过
`maxMarkdownBytes`。文件依次交给 backend，在每个文件前后检查 cancellation。Lint candidates 先缓冲并完成
全量 traversal、`maxFindings` 检查和 adapter validation，随后一次发布；失败不留下 partial lint Findings。

#### Product Output and Settlement

Adapter 只接受 selected MD code、落在对应 source line 内的正一基 `lineNumber`，以及 `null` 或由正安全整数
`[column, length]` 构成且不越过该行 UTF-16 边界的 `errorRange`。
Public lint Record 为 `{ kind: "lint-finding", path, rule, range }`，range 使用一基 UTF-16 line/column 和
同一行 end-exclusive position；缺少 `errorRange` 时使用该行 column 1 的 point range。

Record ID 编码 path、public rule、start line/column 和同位置 tie ordinal。排序依次使用 path、range、catalog rule、
tie ordinal。Product 为每条规则提供固定摘要；Finding detail 只含 path、start position、public rule 和摘要。
Backend message、context、source、fix、URL、severity 和异常均不发布。

Final data 固定为 `{ sourceFileCount, findingCount, rejectedInputCount }`。`sourceFileCount` 是成功 lint 的 accepted
source 数量；`findingCount` 是 lint Findings 与 rejected inputs 的合计，因此不小于 `rejectedInputCount`。

- Zero selected：`not-applicable / no-eligible-input`。
- All rejected：带 non-blocking Findings 的 `passed`。
- Lint Findings：`non-blocking` 时 `passed`，`blocking` 时 `failed`；无 Finding 时 `passed`。
- `project-root-unavailable`、`source-unavailable`、`source-too-large`、`finding-limit-exceeded`、
  `backend-failed`、`backend-protocol-invalid` 和 `cancelled`：`unavailable`，不含 final data 或 partial lint Findings。

### Resulting Impacts

- `src/package-checks/markdown-lint/**` 独立拥有配置、traversal、backend adapter、output 和 unavailable reasons；
  只消费公共 project-file/result mechanisms。
- 根 dependency、lockfile 与 release manifest 声明 exact backend；package audit、candidate artifact 和 installed consumer
  证明 ESM subpath、Node engine、license、transitive graph 与实际执行。
- `docs/checks/markdown-lint.md` 完整拥有公共说明；README、导航、document registry、示例、type acceptance、
  API inventory 和 changelog 维护相应投影。
- Native tests 与 Case evidence 覆盖配置、九项规则、方言、range/identity/order、输入对账、limits、取消、
  backend/protocol failure、no-partial publication 和四态结算。
- Project Gate 与 `design-markdown-check-caching` 均保持自己的 owner 和后续验收。

## Risks / Trade-offs

- 九个语义规则名成为版本化 Product contract；它降低 backend 锁定与噪声，但 backend 升级需要 mapping 与 fixture 审计。
- 完整替换数组没有 preset 简写，但在九项 catalog 下避免了 enable/disable 冲突和 preset 演进歧义。
- 固定 dialect 不能代表所有 Markdown renderer；公开指南必须描述本 Check 实际识别的 constructs。
- 顺序执行与结果缓冲简化取消、limit 和 no-partial 保证；重复解析的成本只在取得 workload 证据后由 cache Change 处理。
- 显式启用 `link-fragments` 可能与 `markdownLinkValidation` 重复报告；默认关闭并在指南中说明组合边界。

## Open Questions

无。
