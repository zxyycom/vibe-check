# Design

推荐先复用通用 Finding waiver 对账，为 `markdownLint` 提供精确豁免；批量加数量断言由独立 Change 后续承接。

## Context

- [`docs/checks/markdown-lint.md`](../../docs/checks/markdown-lint.md) 拥有 `markdownLint` 的闭合 options、完整遍历、Record/final data 与 terminal semantics；[`src/package-checks/markdown-lint/`](../../src/package-checks/markdown-lint/) 是实现 owner。当前没有 `findingWaivers`，inline config 固定禁用。
- [`docs/guides/finding-waivers.md`](../../docs/guides/finding-waivers.md) 定义通用完整候选集 reconciliation，现由四项内置 Check 采用；`markdownLint` 是新增采用方，不应在 Gate 外再过滤 Records。
- [`add-count-asserted-batch-finding-waivers`](../add-count-asserted-batch-finding-waivers/proposal.md) 单独规划泛型批量对账；本 Change 可先实施精确模式，日后是否采用批量模式由 `markdownLint` owner 再判断。
- Project Gate 当前对完整 docs/changes corpus 使用 non-blocking Markdown lint；本 Change 只新增 package 能力，不改变 Gate 配置。

## Goals / Non-Goals

目标是 Check-owned、带理由、失败闭合且不丢证据的 Finding 例外；正常 lint 必须先完成完整 source traversal，随后才对账。既有 `files`、规则、limit、错误和取消语义应保持可解释。

例外只在完整 lint 后对账；本 Change 不新增扫描前排除、整文件或整规则静默忽略、backend 配置透传，也不改 Project Gate policy。

## Decisions

### Intended Change

暂定新增闭合的 `findingWaivers` authoring，先支持结构化精确 identity 与非空 reason。Identity 应来自 Product-owned 的 path、public rule 和可定位 occurrence，而不是第三方 message/context 或对原始 Record ID 做字符串截取；形成 Plan 前验证其在同一路径、规则和位置重复报告时仍能唯一对账，并确定可从公开 Record 安全复制的表示。

完整可信 lint candidates 形成后使用通用 reconciliation。只有唯一匹配才豁免；零命中与过宽匹配发布 audit、不豁免。被豁免的 Finding Record 继续发布，其 waiver reason 作为 evidence；Check 的 blocking 判断只依据未豁免 Finding。配置非法、source/backend unavailable 或取消不能伪装为成功 audit。

### Resulting Impacts

- Options resolution/validation、执行结算、Record data、message 和可能的 final-data 计数都须明确 total 与 actionable/waived 的区别；无 waiver 的输出行为保持原状，机器材料和 parser 若变化则同步验收。
- 公共 Check 指南、通用 waiver 指南、JSDoc、示例、类型验收和相邻测试需说明 identity、reason、audit、结果和 failure boundaries。
- Project Gate 的现有 non-blocking 配置保持不变。任何在仓库实际声明 waiver 或提高 lint blocking 程度都是另一次采用判断，不由产品能力交付自动发生。
- 形成 Plan 时核对活动 waiver/Markdown lint Decisions，并按产品行为变更的交付审查由非实施代理从实际 diff 反查公开说明与内部 owner。

## Risks / Trade-offs

- Markdown 行列会随编辑漂移；精确 waiver 因而可能变为 unused，这是安全失效而非自动迁移。若希望忽略整个路径或规则，应先证明那是输入资格或规则适用性问题，而不是用宽 waiver 掩盖。
- Inline suppression 与结构化 waiver 的 owner、可见性和审计语义不同；首版不同时增加两套机制。若确需文内指令，应作为单独候选再评估。
- 批量 waiver 的 selector 与 `expectedCount` 由独立 Change 设计；本 Change 的精确模式不为它预设字段。

## Open Questions

- 哪些 Product-owned 字段组成唯一且可复制的 Markdown lint Finding identity，如何处理同位置多 Finding？
- `findingCount` 是否继续只表示全部 Finding，另用 Record/audit 表达 waived/actionable，还是增加明确计数？以保持现有 parser 和 consumer 兼容性为先。
