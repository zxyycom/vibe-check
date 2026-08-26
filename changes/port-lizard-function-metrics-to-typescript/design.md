# Design

本设计以 current owner-level outputs为兼容目标，使用 language-specific private analyzers完成一次性 Lizard hard cut。

## Context

当前 foundations已经成为 ordinary Check、统一 scheduler、Core Record和 TypeScript Project Definition；旧 Plan中 `src/product/**`、Manager/TaskPlan、named reference与 shared policy均不存在。Current paths are `src/package-checks/function-metrics/**` and its local `lizard/**` adapter, invoked through Check-owned `options.scanner`.

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

- `FunctionMetricsOptions` 是否继续公开 `scanner` branch需要在恢复时作为真实 public contract migration判断；若移除会改变 surface，必须先演进对应长期 Decision与 package docs，不能在 private backend替换中悄悄删除。
- Full candidate/Gate必须证明 installed runtime无需 Python/Lizard。

## Risks / Trade-offs

- TypeScript/Rust syntax和 metric parity工作量高，且收益主要是内部依赖简化；后置避免挤占首版用户能力。
- 当前 public scanner options可能让纯 private hard cut不成立；Resume时必须先确认是保留 compatibility adapter、演进 public options还是缩小 Change。

## Open Questions

- 恢复时如何处理当前 public `FunctionMetricsOptions.scanner`，以免“移除 Lizard”与已公开 native composition contract冲突。

## Implementation Observations

2026-08-24：Foundations已完成，但没有 release/platform/security/license阻塞证据；本 Change保持首版后。恢复前必须先解决 public scanner-options边界并刷新 baseline。

## Resume Conditions

1. 首版四项离线 Checks已完成并公开，或出现直接交付/平台/安全/许可证阻塞证据。
2. Current function-metrics public options迁移方向已确认。
3. Fresh corpus与 source/license策略可提交、可复核。
