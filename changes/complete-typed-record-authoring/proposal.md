# Proposal

本 Draft 是 repository hard cutover 之后的首次公开 package 优化：补全自定义 Check 的 TypeScript Record authoring，使 `recordTypes` 声明与 `records.report()` / `records.reportReference()` 在 LSP 和编译期形成同一份可推断契约。cutover 完成前不进入本 Change 的 implementation；Draft 本身不授权修改公共 API。

## Why

Product runtime 已支持一个 Check 声明多个 Record types、提交零到多个 Records，并在 Definition/Core 边界校验 Record type、fields、identity 与 ownership；但当前 `Check<Options>` 只关联 options，`CheckRecordReporter` 仍接受宽泛的 `QualityRecordCandidate`。因此错误的 `recordTypeId`、缺失 required field 或错误 field value type 往往只能在运行时被拒绝，package consumer 无法从 `defineCheck` 的相邻 `recordTypes` 直接获得完整 LSP 提示。

这不是新的 Record runtime、第二种 Check result 或 machine schema 需求。需要补齐的是现有普通 Check authoring surface 的类型闭合，并继续让 runtime validation 成为不受 TypeScript 信任边界影响的最终 authority。

## Outcome

完成后，使用 literal Record catalog 声明普通 Check 的 consumer 可以在 `records.report()` 与 `records.reportReference()` 处获得对应 `recordTypeId`、required/optional fields 和 field value types 的编译期约束；动态或已拓宽的声明仍有明确 fallback。现有 runtime Record、Core snapshot、policy、`RunResult` 和 machine v3 bytes 不改变。
