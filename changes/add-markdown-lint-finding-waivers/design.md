# Design

复用通用 Finding waiver 对账，在完整 Markdown lint facts 后应用精确豁免，不删除原始证据或缓存结算。

## Context

- [`Markdown lint`](../../docs/checks/markdown-lint.md) 与 `src/package-checks/markdown-lint/**` 拥有闭合规则、遍历、Record 和终态。用户已授权本 Change 实施。
- 逐文件 lint findings cache 已在本 Change 之前实现；缓存只保存 backend-normalized facts，Records、policy 与终态每次重新计算。
- [`通用 waiver`](../../docs/guides/finding-waivers.md) 及[活动决策](../../docs/decisions/provide-generic-finding-waiver-reconciliation.md)固定完整候选集、唯一命中、unused/overmatched 与安全 materialization。本 Change 是 Check-owned 采用，不改变通用契约。
- [Markdown lint 首版决策](../../docs/decisions/provide-bounded-markdown-lint-check.md)的闭合规则、完整可信结果与 private backend 边界继续适用；[Gate adoption](../../docs/decisions/adopt-project-gate-markdown-lint-advisory.md)的完整 corpus 与 advisory policy 保持不变。
- [`add-count-asserted-batch-finding-waivers`](../add-count-asserted-batch-finding-waivers/proposal.md) 独立承接批量模式，不是本 Change 的前置。

## Goals / Non-Goals

目标是带理由、可复制、失败闭合且不丢证据的精确 Finding 例外。未声明 waiver 时保持既有输出；改变 waiver 时实时重新对账，包括 lint cache hit。

不增加 inline suppression、glob/批量 waiver、第三方配置透传、新规则、自动迁移 identity、全局 waiver 或 Gate policy 变更；不缓存豁免结算。

## Decisions

### Intended Change

1. **Identity 使用完整公开位置。** 新增 `MarkdownLintFindingIdentity`，形状是 `{ path, rule, range: { start: { line, column }, end: { line, column } } }`。path 使用规范 project-relative `/` 路径，rule 属于闭合 public catalog；line/column 是正安全整数，range 同行且 end column 不小于 start column。调用方直接复制 lint Record 的 path、rule、range；不解析 Record ID 或引入隐藏 ordinal。
2. **不唯一时失败闭合。** 不同 end range 可区分相同起点的 Findings；完全相同 identity 出现多次时使用既有 `overmatched`，不按顺序任选一项，也不添加让调用方无法从当前 Record data 恢复的序号。identity 有意不保证任意 backend 输出都唯一。
3. **闭合 authoring。** 新增可省略 `findingWaivers`，省略解析为冻结空数组；每项 closed `{ identity, reason }`，复用 Check-owned authoring helper 拒绝重复 canonical identity、空 reason、未知字段与 hostile/accessor 输入。快照不保留调用方可变引用。
4. **完整 facts 后实时对账。** source discovery/read、backend/cache、limits 与取消全部成功后才使用 `reconcileFindingWaivers`。仅 `waived` 从 actionable 集合移除；所有 raw lint Findings 仍计入 maxFindings。source/backend failure、取消与超限不发布 partial lint 或成功 audit；没有 selected path 继续 N/A、没有 audit。
5. **保留 Record 与计数兼容性。** lint Record id、排序和既有字段保持不变；applied Finding 只增加 `waiver: { reason }`。unused/overmatched 使用既有 hashed audit Record builder，发布 `kind: "finding-waiver-audit"`、identity、reason、matchCount、status。final data 仍是 sourceFileCount、findingCount、rejectedInputCount；findingCount 包括被豁免 Finding 和 rejected input，不包括 audit。不增加 waived/actionable 计数或修改 final-data parser。
6. **消息解释豁免。** 未豁免 Findings 继续按 findingPolicy 呈现；豁免不产生阻断级错误，提供明确 applied/unused/overmatched 消息。无 waiver 时消息字节与顺序保持不变。reason 会公开发布，指南提示不得放入秘密。
7. **缓存不含 waiver。** 不改变 cache key、payload 或 contract version。对账只消费完整 Product candidates；缓存命中后新增、修改或移除配置都使用当前 waiver。缓存故障与本次 waiver 无关，继续按既有策略 fresh lint。

### Resulting Impacts

- **公开类型与使用材料：** export identity/waiver/audit types；更新 Check guide、通用 waiver adoption 列表、source JSDoc 和受管示例。示例展示从公开 Record 字段构造 identity 的用途，保持可执行。
- **输出与消费：** Check-specific Record data 是现有 machine Record envelope 的 opaque JSON，不改 v4 schema、publication set 或历史 examples；通过实际 consumer runtime 验证新 Record 与原 final-data parser。
- **内部责任：** 保持 generic reconciliation、closed authoring 与 audit helpers 的原 owner；Markdown-specific identity、发布与消息属于本 Check。不为 shape 不同的 lint Record 强行复用带 blocking 字段的 metrics publisher。
- **测试证据：** 新增或扩展 authoring、applied/unused/overmatched、遍历完整性、无配置 parity、cache hit 后配置变化与 consumer tests。Case 以实际证明目的维护，不按测试数量拆分；起点完整检查为 655 entities / 158 Cases。
- **长期判断：** 采用既有通用完整候选集对账方向，当前 concrete identity、计数与使用方式由 Check guide 持有。本次不改活动 Decision 或已有用户的 Decision 维护改动。
- **独立反查：** 非实施代理从实际 diff 核对产品行为、文档、示例与验证；Gate 不增加 waiver、仍为 non-blocking。

## Risks / Trade-offs

- 行列和 range 随源编辑漂移后 waiver 变为 unused，这是安全失效而非自动迁移；同 identity 多 Finding 不可用精确模式任选其一。
- 保持三项 final counts 意味着消费者须从 Record waiver evidence 区分 waived 与 actionable，不能把 findingCount 当成阻断数。
- 测试 synthetic 重复 candidates 只证明 Check publication 的防御性分支，不宣称当前 backend 一定产生重复诊断。
- 完整 Gate 包含本地工具链、candidate 与外部 consumer 前提；环境缺失或本地时间门槛失败必须分别报告，不能降级验收标准。

## Open Questions

无阻断性开放问题；用户已授权实施，以上 identity、计数、缓存与 Gate 边界作为本 Plan 的验收基础。
