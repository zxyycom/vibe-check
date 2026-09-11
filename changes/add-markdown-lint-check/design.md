# Design

本设计以 `markdownlint` 程序内 API 作为私有 backend，为新的随包 Check 定义规则、输入、诊断和结算边界。

## Context

[`survey-markdown-lint-tools.md`](../../docs/investigations/survey-markdown-lint-tools.md) 将 `markdownlint` 程序内 API 选为通用 TypeScript 集成基线。Draft 当前针对 `markdownlint@0.41.1`：使用 `markdownlint/promise` 的 `strings` API 取得结构化 lint errors，其 Node engine 要求与 Package 宿主范围兼容。

[`keep-format-aware-check-capabilities-independent.md`](../../docs/decisions/keep-format-aware-check-capabilities-independent.md) 要求不同格式风险保留独立 Check owner，并在出现明确产品优先级时重新基线。本 Change 提供了 Markdown lint 的独立结果、规则和验收边界。

现有 [`markdownLinkValidation`](../../docs/checks/markdown-link-validation.md) 继续拥有本地 target、same/cross-document anchor、root containment 与 I/O 授权。活动决策 [`exclude-undefined-markdown-references-from-link-check.md`](../../docs/decisions/exclude-undefined-markdown-references-from-link-check.md) 将未定义 reference 留给独立 lint 能力，因此新 Check 可以覆盖该规则；`MD051` 默认关闭，避免重复报告 same-document fragment。

缓存由 [`design-markdown-check-caching`](../design-markdown-check-caching/) 单独设计，不进入本 Change 的实现或验收。

## Goals / Non-Goals

### Goals

- 提供可无参构造、默认产生高信号诊断的 package-provided Check。
- 固定默认规则和受支持规则集合，同时允许消费者有界启用或禁用规则。
- 通过 Check-owned adapter 将第三方结果转换为 Product-owned Records、消息和四态结果。
- 沿用项目文件选择、输入资格对账、资源限制、取消和 Finding policy 约定。

### Non-Goals

- Link target、跨文档 anchor、网络与 HTML link 继续由独立能力负责。
- Cache 由相邻 Change 设计；修复、格式化、拼写、术语、事实和代码示例执行不属于本 Change。
- `markdownlint` 配置文件、`extends`、`customRules`、任意 rule object、parser plugin 和 AST 保持私有或不可用。
- 首版只提供 Check 级 `findingPolicy`，不增加 per-rule severity 或工作区写入。

## Decisions

### Intended Change

以下是当前设计方向；标为“暂定”的公共名称、集合和数值需在形成 Plan 前闭合。

1. **公共身份。** 暂定 constructor 为 `markdownLint(options?)`、Check ID 为 `markdown-lint`。根入口导出普通 `TypedCheckWithOptions`、final-data parser 和必要公共类型，不增加 CLI、`bin` 或 package subpath。
2. **私有 backend。** 新增 `markdownlint@0.41.1` production dependency；adapter 只调用 `markdownlint/promise` 的 `strings` API。Product 提供已授权的 exact inputs，backend 不发现文件或配置。Plan readiness 复核精确版本、license、transitive graph 和 installed-consumer execution。
3. **闭合规则配置。** 暂定 options 为 `rules: { preset?, enable?, disable? }`。省略时使用 Product-owned `recommended`；增减列表只接受公共 `MarkdownLintRuleName`，并拒绝未知、重复、冲突或最终为空的配置。`all`、`none` 和 supported catalog 的精确范围仍待闭合；依赖升级不会自动扩大它们。
4. **高信号默认集。** 候选规则是 `MD001`、`MD011`、`MD018`、`MD040`、`MD042`、`MD045`、`MD052` 与 `MD056`；`MD051` 和排版风格规则默认关闭。形成 Plan 前用排除 archive、generated 和保真资源的维护语料核对 Finding 数量、误报和 Link 重叠。
5. **固定 parser policy。** adapter 设置 `noInlineConfig: true`；Front matter、GFM 和其它方言行为由固定 policy 与 fixture 锁定，不随 backend 默认变化。
6. **有界逐文件执行。** 默认选择 `.md`/`.markdown` 大小写变体；显式选中的其他路径形成 non-blocking `input-rejected` Record。文件按稳定顺序逐一处理，以便在文件之间检查 cancellation。单文件 byte 上限、全次 Finding 上限及对应 unavailable reason 在 Plan 前闭合；失败不发布 partial lint Findings。
7. **稳定结果。** Lint Record 暂定包含 project-relative path、公共 rule name 和 one-based UTF-16 range，ID 由 path、rule 与 occurrence index 构成。Product 提供规则摘要和消息，不发布第三方 message/context 或 source。省略 `findingPolicy` 时普通 Finding 为 `non-blocking`；zero selected、all-rejected 和 blocking settlement 沿用现有文件型质量 Check 语义。Final data 暂定为 `sourceFileCount`、`findingCount` 与 `rejectedInputCount`。

### Resulting Impacts

- **Product runtime 与依赖。** 新 owner 位于 `src/package-checks/markdown-lint/**`，并影响 `src/index.ts`、根 `package.json`、`pnpm-lock.yaml`、release manifest、public API inventory、artifact/candidate dependency probes 和 installed-consumer evidence。普通 npm dependency 不复制进本仓 `licenses/`，但实际安装的 license 与解析版本必须通过现有 package audit。
- **公开材料。** 新增 `docs/checks/markdown-lint.md`，并同步 README Check 索引、`docs/package-documents.json` 的 `checkGuides`、导航摘要、可执行示例、type acceptance 与 changelog。指南完整拥有 options、默认规则、结果、Records/messages、不可用、方言、资源与非目标边界。
- **测试证据。** 原生 tests 覆盖 constructor/options、默认规则、rule 增减、inline config、方言、range/Record identity、输入对账、limits、取消、backend failure、四态结算和排序；测试正文变化同步维护 Case ledger。
- **长期决策。** 形成 Plan 前建立 Markdown lint Check 的长期方向，并核对 package quality defaults 与 Gate selection 判断是否需要演进。
- **Project Gate。** Package Check 不自动加入本仓 Gate。若同一 Change 采用 dogfood，则同步 repository-quality options、`--quality`/`--docs` selection 与 aggregate tests，并处理严格模式下的维护语料 Findings。
- **相邻 Change。** [`design-markdown-check-caching`](../design-markdown-check-caching/) 拥有 cache identity、失效和性能验收；本 Change 只证明无 cache 的完整行为。

## Risks / Trade-offs

- 默认集需要在信号覆盖与迁移噪声之间取舍，真实维护语料是 Plan readiness 的判断依据。
- 公共 rule name 与 preset 会成为版本化契约；语义名称降低 backend 锁定，但增加映射和升级审计成本。
- 顺序逐文件执行便于取消和隔离 backend 的 module-local cache，但大型 corpus 会重复解析未变化文件。
- 消费者显式启用 `MD051` 时可能同时取得 Link Check 的 fragment 证据，指南需说明该重叠。

## Open Questions

- 公共 constructor、Check ID、类型名和 rule 名称是否采用本 Draft 的暂定命名。
- `recommended` 的最终规则清单是什么；首版是否提供 `all`/`none` preset，以及 supported catalog 是否只覆盖审阅过的高信号规则。
- Front matter 与 GFM 的固定方言是什么，哪些 parser 行为需要 Product-owned fixture 锁定。
- 单文件 byte 上限、全次 Finding 上限、range fallback 和 final-data 计数不变量是什么。
- 是否在同一 Change 中把新 Check 加入本仓 Project Gate 的 `--quality` 与 `--docs` selection；该选择不影响随包 Check 本身的首版目标。
- 长期 Decision 只建立 Markdown lint 方向，还是同时演进 package-quality default 与 Gate selection 判断。
