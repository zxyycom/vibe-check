# Proposal

本 Draft 评估四个随包 Check 的 Finding message 呈现是否值得进一步收敛；它不预设共享 preset 或新增全局 option。

## Why

file metrics、function metrics、duplicate detection 与 markdown link validation 已共同使用 `presentCheckFindings`，但各自固定最多 10 条 detail 和 optional overflow message。formatting、level 与 waiver-audit 附近仍存在可审查的重复候选。

同时，这些 Check 的真实排序、安全字段、input rejection 与 waiver identity 并不相同。将“代码形状相似”直接升级为全局行为会破坏 Check-owned policy，并与 progress preview 的 renderer owner 混淆。

## Outcome

逐项判定 remaining repetition 应保持 local、抽为 private共同 presenter/preset，还是不作改变；只有能保持四个 Check 的差异 contract 时才进入实施 Plan。公开全局 option 不是本 Draft 的默认或隐含结果。

当前稳定 owner 是 [`docs/guides/presenting-findings.md`](../../docs/guides/presenting-findings.md)、[`docs/development/check-results.md`](../../docs/development/check-results.md)、四个 Check 指南、`src/check/finding-presentation.ts` 及相邻 tests。guide 已修正“10 条 Finding messages”与“5 条 terminal preview”的层级表述，本 Draft 不重复登记它为 bug。
