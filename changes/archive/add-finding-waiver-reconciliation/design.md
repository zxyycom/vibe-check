# Design

本设计已以纯 reconciliation 作为共享能力，并让 producing Check 保持 Finding 发布与终态结算责任。

## Context

package-provided Checks 各自拥有 scanner、candidate shape、Record data、messages 与 final status；`src/finding-waivers/**` 是独立纯函数边界。Core 只接收 minimal Record facts，不能判断 waiver 的领域 identity 或 status 影响。此前 repository Gate 从 input selection 排除 historical v2 run schema，保护不可改 bytes 却不保留 measurement evidence。

## Goals / Non-Goals

**Goals**

- 对完整 findings 与 user-authored semantic identities 做确定性、可审计的集合 reconciliation。
- 保留首个 file-metrics adoption 的 SCC measurement/finding，并可见地携带 historical preservation reason。
- 使 unused 与 overmatched waiver 不能静默漂移。

**Non-Goals**

- 不修改 Core Record identity、Run aggregation 或 Gate 机制，不创建全局 waiver special case。
- 不提供 glob/selector waiver、隐式一对多豁免、全局 configuration registry 或 scanner-level exclusion。
- 不重写 historical v2 Schema、不修改 SCC limits，且不扩大到其它 historical materials。

## Decisions

### Intended Change

1. **Pure generic boundary.** helper 接收 readonly findings、`identify` projection 与 waiver definitions，使用 caller-defined canonical structural identity 输出 finding disposition 和 waiver audit；waiver material 会 detached/deep-frozen，finding 保留原引用。
2. **Set reconciliation.** helper 先处理完整 candidate set：zero 为 `unused`、one 为 `waived`、many 为 `overmatched`。overmatched finding 保持 actionable，避免宽泛 identity 静默覆盖多个问题。
3. **Check owns publication and settlement.** helper 不构造 Core Record，也不决定 messages、warnings/errors 或 final status。采用它的 Check 将 reconciliation 转换为自己的 Records，并用中性 `{ actionable, blocking }` settlement 得出自身 outcome。
4. **Narrow first adoption.** Gate 恢复 historical v2 run schema 到 schemas-examples input；file-metrics 以 path + metric identity author waiver。matching finding Record 保留 reason，unused/overmatched audit 使用正常 path 域外的 ID；原 one-path exclusion 已删除。

### Resulting Impacts

- helper 的公开 API、runtime/type tests 覆盖 canonical equality、duplicate identity、0/1/>1、hostile input 与 mutation boundary。
- file-metrics 保持既有 final-data shape `{ findingCount, blockingFindingCount }`；其 authored waiver shape 为 `{ identity: { metric, path }, reason }`。waiver 是 Record/message evidence 与 Check-local settlement 调整，而不是 machine final-data 新字段。
- Gate 及 file-metrics tests 证明 exact input 恢复、historical run schema 的 measurement/reason、zero exact input 下仍审计 unused waiver、以及 audit ID 不与正常 path collision。
- machine schema/example shape 未改变，无需同步修改；已更新的 owner 文档只描述实际 input/Check 行为。

## Risks / Trade-offs

- identity 选择不稳定会导致 unused，选择过宽会导致 overmatched；helper 显式反馈两种情况，但调用方继续拥有 identity choice。
- 只将共享部分限定为 pure reconciliation，避免 selector、expected match count 或跨 Check policy 过早扩大公共契约。

## Open Questions

无。
