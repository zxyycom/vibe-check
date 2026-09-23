# Design

当前设计方向是为既有完整候选集 reconciliation 增加结构化批量选择和精确数量断言，保持 Check-owned 结果结算。

## Context

- [`docs/guides/finding-waivers.md`](../../docs/guides/finding-waivers.md) 定义通用 helper 的精确 identity、完整集合对账与 audit；[`src/package-tools/finding-waivers/reconciliation.ts`](../../src/package-tools/finding-waivers/reconciliation.ts) 是实现 owner。
- 现有内置采用者是 `fileMetrics`、`functionMetrics`、`duplicateDetection` 与 `secretDetection`；各 Check 拥有自身安全 identity、Record、消息和 status。精确 identity 的通用类型允许 canonical JSON 值，批量选择候选仅适用于对象形状的 identity。
- 活动 Decision [`provide-generic-finding-waiver-reconciliation`](../../docs/decisions/provide-generic-finding-waiver-reconciliation.md) 将多于一条的精确 identity 命中定义为 overmatched 且不豁免。本 Change 应保留该精确模式，并在实施前为新增批量模式核对 Decision 的长期契约影响。
- [`add-markdown-lint-finding-waivers`](../add-markdown-lint-finding-waivers/proposal.md) 单独规划 `markdownLint` 的首版精确 waiver 采用；它可以先实施，本 Change 不以它为前置。

## Goals / Non-Goals

目标是提供声明式、可审计、失败闭合的批量匹配；精确命中数量断言是必需字段。保留原 Finding、完整扫描与既有精确 waiver 行为。

批量选择只比较语义 identity 对象的字段，不接受任意 predicate、正则、Record ID 前缀或扫描前排除；不自动生成 baseline，也不在 Gate 层另建过滤器。

## Decisions

### Intended Change

暂定在通用 reconciliation 中增加与既有精确 waiver 明确区分的批量 authoring，仅接受对象形状的 Finding identity。选择条件按 canonicalized identity 的字段作结构化匹配：声明字段逐项精确相等，未声明字段不参与选择。每项批量 waiver 声明非空 reason 和正安全整数 `expectedCount`；实际命中数完全相等才应用。

通用 helper 只对账选择、数量和冲突，不决定哪些 identity 字段适合批量选择。内置 Check 的可声明字段、是否允许批量豁免、audit/Record/status 投影仍由各自 owner 审查。首版只选择有实际稳定分组语义的采用者，避免为所有 Check 机械加同名选项；在形成 Plan 前固定首批采用范围和具体 public authoring 形状。

### Resulting Impacts

- 共享 helper 需要区分精确模式的 `unused`/`applied`/`overmatched` 与批量模式的数量失配、选择冲突和正常应用；任何异常不能使相关 Finding 被豁免，审计须含声明数量与实际数量。
- 如果一个 Finding 同时被精确与批量声明命中，必须有明确的无歧义处理；推荐冲突涉及的声明全部不应用，不用隐式优先级。重复或等价 selector 在 authoring 边界拒绝。
- Public types、JSDoc、finding-waivers 指南和被选中的 Check 指南、options、Record/messages、示例与相邻测试需一致；未采用的 Check 保持原行为。
- 验证覆盖 0、少于、等于、多于 `expectedCount`，相同数量但 Finding 替换的已知限制，重复/冲突、malformed selector、hostile authoring、原引用与 detached evidence，以及完整候选集形成前的 unavailable 不伪造 audit。

## Risks / Trade-offs

- 数量相等只证明基数，不能证明命中的身份集合未替换；首版不把它描述为 exact set pin。需要逐项身份稳定时仍使用现有精确 waiver。
- 过宽选择器即使数量暂时相等也可能覆盖不相关 Finding。内置采用者必须限制可选字段组合，并在指南说明复核责任；通用 helper 不猜测领域语义。
- 新增批量 authoring 与冲突分支会扩大 API 和审计复杂度。首版以一项选择条件、一项正整数断言和显式失败闭合为限，不预建通用 matcher DSL。

## Open Questions

- 首版的 public authoring 应采用与 `{ identity, reason }` 区分的独立 `batchWaivers` 输入，还是同一数组内的判别变体？形成 Plan 前以现有采用者的解析、类型和兼容性选择最小形状。
- 哪个现有内置 Check 有真实且稳定的多 Finding 分组场景可作为首批采用者？若没有，先交付 generic helper 与 custom Check 用法，不制造无依据的内置选项。
- 对选择冲突应在配置解析时拒绝，还是在完整候选集形成后产生 fail-closed audit？需要区分静态重复与运行时重叠。
