# Design

本设计以恢复实施时的 owner-level outputs 为兼容目标，使用 language-specific private analyzers 完成一次性 Lizard hard cut。

## Context

当前 foundations 已经成为 ordinary Check、统一 scheduler、Core Record 和 TypeScript Project Definition；旧 Plan 中 `src/product/**`、Manager/TaskPlan、named reference 与 shared policy 均不存在。当前实现位于 `src/package-checks/function-metrics/**` 及其 local `lizard/**` adapter。已归档的 `fix-function-metrics-configuration` 把 public surface 收敛为 defaulted constructor、area-owned limits/finding policy 与 executable-only scanner input；恢复本 Plan 时以届时的稳定 owner contract 重新建立 parity baseline。

[`defer-lizard-until-after-check-foundations.md`](../../docs/decisions/defer-lizard-until-after-check-foundations.md) 的 foundations条件已满足，但它还要求在没有交付、平台、可靠性、安全或许可证阻塞证据时默认后置。首版优先决策据此不把内部 backend迁移放入首次公开 release gate。

## Goals / Non-Goals

**Goals**

- 移除 formal Python/Lizard runtime依赖，同时保持现有 `functionMetrics` observable contract。
- 用 fresh corpus而不是历史 CSV shape定义 parity。
- 让 source/license、failure、cache与 performance evidence可审计。

**Non-Goals**

- 不新增 Check、metric、language、policy或 public parser API。
- 不保留 dual backend、feature flag或 silent fallback。
- 不在首次公开版本前实施，除非出现决策列明的提前证据。

## Decisions

### Intended Change

1. **Fresh baseline先行。** 从 current formal Check对 checked-in fixtures生成 expected Records/final data/failure observations；不把 Lizard CSV bytes或 adapter types升级为 public contract。
2. **Language-specific analyzers。** `.ts`/`.d.ts`与 `.rs`使用分别 owned modules，共享的只是不变量一致的 normalized function candidate validator和 canonical ordering；不建立 generic parser plugin framework。
3. **只承诺 current measurements。** Function identity、range、NLOC、parameter count与 cyclomatic complexity必须匹配 corpus；parser内部结构和 diagnostics可不同。
4. **普通 callback内执行。** Callback遍历 approved exact paths、检查 signal并按现有 Record reporter/final result语义处理；不恢复 feature-local TaskPlan或新的 scheduler API。
5. **Cache/backend identity hard cut。** 新 implementation version进入 relevant cache key，旧 Lizard cache不可能命中；其它 Check/options不造成无关失效。
6. **Provenance先于代码。** 任何从 Lizard/第三方实现翻译或派生的代码都必须先固定 revision、license与 responsibility；无法证明则使用可描述的 clean-room behavior implementation或停止。
7. **一次切换。** Parity、failure与 performance通过后，同一 Change删除 Lizard probe/process/parser/options default dependency与 package prerequisite；不留 fallback。

### Resulting Impacts

- 已完成的配置 Change 只临时保留 scanner executable；backend port 完成后该 execution dependency 没有消费者，必须在同一次 hard cut 中从 constructor input/resolved options、文档与 package acceptance 删除。
- Full candidate/Gate必须证明 installed runtime无需 Python/Lizard。

## Risks / Trade-offs

- TypeScript/Rust syntax和 metric parity工作量高，且收益主要是内部依赖简化；后置避免挤占首版用户能力。
- 删除当前 public scanner executable policy 是有意的 contract migration，而不只是 private backend 替换；恢复实施时必须用 package documentation、types、runtime consumer 与迁移说明共同验证该影响。

## Open Questions

无。scanner executable policy 随 private Lizard backend 一起删除；恢复时仍需重基线 compatibility corpus、license/provenance 与 performance。

## Implementation Observations

2026-08-24：Foundations 已完成，但没有 release/platform/security/license 阻塞证据；本 Change 保持首版后。

2026-08-28：`fix-function-metrics-configuration` 已完成并归档，scanner executable 的当前边界已经明确；恢复本 Change 时仍需按届时的稳定 owner contract 刷新 parity baseline。

## Resume Conditions

1. 首版四项离线 Checks已完成并公开，或出现直接交付/平台/安全/许可证阻塞证据。
2. 恢复实施时已复核届时稳定的 constructor/Record contract，并以对应 owner 建立 parity baseline。
3. Fresh corpus与 source/license策略可提交、可复核。
