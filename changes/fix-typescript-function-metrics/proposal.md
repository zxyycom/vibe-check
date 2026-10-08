# Proposal

本 Draft 规划修复内置函数分析器继承的两项 TypeScript 指标缺陷。

## Why

[来源核验](../../docs/investigations/trace-typescript-metrics-upstream-origin.md)确认，显式返回类型使函数外控制流进入指标，`??` 被误计为两个三元问号；Vibe Check 将这些测量用于公开 Finding，承担结果维护责任。

[最新复查](../../docs/investigations/verify-lizard-latest-typescript-defects.md)在 `1.24.1` 及当次分支仍复现两项缺陷。因此修复具有独立价值，需在分析器 owner 纠正测量，使正常 TypeScript 写法取得可信结果。

## Outcome

显式返回类型的函数在实际闭合位置结束，函数外语句不影响指标；带空格及紧凑 `??` 均识别为单个操作符，并按明确的 CCN/ND 策略计量。

可选参数、真实三元、正常嵌套及受影响共享 reader 保持正确，私有测量与公开 Worker/Finding 一致；受控偏差有来源和验收证据，原始 oracle 与修正期望分别保留。

本 Change 独立于[源码升级](../upgrade-lizard-source-baseline/proposal.md)验收；默认基线与顺序见[Change 协调](../../docs/governance/change-coordination.md#lizard-升级与-typescript-修复)。
