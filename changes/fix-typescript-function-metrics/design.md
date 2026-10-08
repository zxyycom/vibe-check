# Design

本 Draft 在私有分析器 owner 修复函数边界与操作符分类，分别证明来源偏差和公开结果正确性。

## Context

- [行为核验](../../docs/investigations/verify-typescript-function-metrics-defects.md)、[来源核验](../../docs/investigations/trace-typescript-metrics-upstream-origin.md)及[最新复查](../../docs/investigations/verify-lizard-latest-typescript-defects.md)保存原因、候选和 11 项正反样例；候选尚未完成公开 Worker、跨 reader 与发布验收。
- 类型注解回调重放 token，重入安装函数结束回调；外层消费随后清空新槽。共享 tokenizer 缺少 `??`，TypeScript 优先匹配 `\w+\?`，使问号分类受空白影响。
- [分析器 owner](../../docs/development/scanner-dependencies.md)以 source fidelity 为先；[来源维护](../../docs/tooling/source-mapping.md)承接来源证据。[公开指南](../../docs/checks/function-metrics.md)定义 CCN 贡献解释与 ND，但尚未规定 `??` 计量策略。

## Goals / Non-Goals

- **目标**：精确函数边界、空白不变的 `??` 分类及明确计量，取得私有与公开直接证据。
- **保持**：可选参数、真实三元、正常嵌套及共享 reader 生命周期，既有 Finding、waiver、取消与资源边界。
- **范围**：聚焦两项已确认缺陷；其他返回类型、箭头函数及 TSX 按实际影响补充取证，整库升级由相邻 Change 承接。

## Decisions

### Intended Change

暂定以下最小修正；补丁与 `??` 策略在 Plan 前明确批准。

1. 调用完成回调前保存并清空旧槽，再调用旧回调，保留重入安装的新槽。
2. 调整组合符号及 TypeScript 可选标识符优先级，使带空格和紧凑 `??` 均为单个 token，并保持可选参数、真实三元分类。
3. 显式确定 `??` 的 CCN、ND 及贡献解释期望，再实现计量。

实施基线与顺序由[Change 协调](../../docs/governance/change-coordination.md#lizard-升级与-typescript-修复)承接，切换基线后重新证明修正成立。

### Resulting Impacts

| 影响 | 必要处理与验收 |
| --- | --- |
| 来源与 oracle | 维护获批 deviation、identity/来源材料和派生 pin；保留上游身份、原始结果与修正期望，分别证明偏差来源及正确性。 |
| 指标与公开解释 | 核对 Finding、blocking 结算与 waiver 匹配变化，同步 `??` 计量说明，验证 contributor token/line 与 ND；稳定事实交接给公开指南和分析器 owner。 |
| 直接行为证据 | 按[测试策略](../../docs/testing/strategy.md)从 11 项样例提取必要测试：边界四对照、`??` 空白不变性、可选参数与真实三元；覆盖正常嵌套及受影响共享 reader。 |
| Product 与包 | 验证 analyzer→adapter→Worker→Check 的位置、指标、贡献及默认 limits 结算，再验收候选包、installed consumer 和完整 Gate。 |

## Risks / Trade-offs

- 回调槽由共享状态机拥有，可选标识符规则影响相邻问号形态；局部 TypeScript 通过之外，还需直接证明受影响 reader 无回归。
- `??` 的 CCN/ND 属于待定计量选择。已确认的是分类及空白不变性错误，默认阈值保持原状。
- 修复与升级共享实现、来源、Case 和包材料，按协调顺序串行；修复必要性独立于升级进度。

## Open Questions

1. `??` 采用什么 CCN/ND 策略，贡献列表怎样解释？每个操作符若计一个 CCN 决策，四项为 5；这是候选值，ND 需另给依据。
2. 受控偏差怎样记录，哪些共享 reader、返回类型和问号形态属于直接验收范围？

保持 Draft；策略、偏差和影响范围收敛后派生 tasks，实施及上游 issue/PR 写入需另获授权。
