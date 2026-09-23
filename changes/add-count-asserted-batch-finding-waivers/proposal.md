# Proposal

本 Draft 规划带精确数量断言的批量 Finding waiver：一项声明可审计地处理同一原因形成的多条 Finding。

## Why

当前通用 `reconcileFindingWaivers(...)` 按完整语义 identity 对账：零命中为 `unused`，恰好一条可豁免，多条为 `overmatched` 且全部保持 actionable。对同一原因形成的多条 Finding，调用方只能逐项声明。

批量声明应使用稳定的语义字段选择完整候选集，并以精确预期数量约束覆盖范围。数量变化或选择冲突时，相关 Finding 继续 actionable。

## Outcome

调用方能用结构化语义条件、非空理由和正整数 `expectedCount` 声明一组 Finding 的 waiver。完整集合对账后，仅当实际命中数等于声明值且无冲突时应用；其它情况返回可审计的失效结果，相关 Finding 仍待处理。既有精确 waiver 行为保持不变，采用方仍拥有 Record、message、计数和 Check 结算。
