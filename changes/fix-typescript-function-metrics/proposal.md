# Proposal

本 Change 以独立修复计划纠正内置函数分析器的显式返回类型边界污染与 `??` 分类/计量。

## Why

[行为核验](../../docs/investigations/verify-typescript-function-metrics-defects.md)和[来源核验](../../docs/investigations/trace-typescript-metrics-upstream-origin.md)确认两项错误由锁定上游继承，并影响公开 Finding。[新版复查](../../docs/investigations/verify-lizard-latest-typescript-defects.md)确认 `1.24.1` 仍存在，因此升级不能替代本项目结果维护责任。

## Outcome

显式返回类型函数在实际闭合位置结束，函数外控制流不影响位置或指标；带空格与紧凑 `??` 都为单 token，按[已确认短路计量 Decision](../../docs/decisions/align-nullish-coalescing-with-short-circuit-function-metrics.md)逐 token CCN +1、保留完整 token/line contributors，并沿用 `&&`/`||` 的实际 ND 状态路径。

可选参数、真实三元、正常内部嵌套和受影响继承 reader 保持正确；私有测量、公开 Worker/Check 与安装后消费者一致，原始 oracle 和受控偏差期望分开。

## Scope

### Intended Change

- 在 `CodeStateMachine.consume` 完成分支取出并清空旧 callback，再以原 receiver 调用它；重入安装的新 callback 保留。
- TypeScript-local tokenizer addition 识别 `??`，约束可选标识符规则不吞第一问号；TSX 的独立 addition 同步，TypeScript logicalOperators 采用 `??`。ND 仅在该 reader 已声明 `??` 为 logical operator 时沿用现有短路分支。
- 不改共享 tokenizer 的全语言符号表，不重定义复杂度、其他语言操作符、默认阈值或公开配置。具体路线和继承影响见 [Design](design.md)。

### Resulting Impacts

- shared callback 生命周期影响其他 reader/extension；TypeScript tokenizer/condition 集合由 JS、JSX/TSX、Vue 继承，需逐项验收这些消费者。
- CCN/ND、函数结束位置及 Finding/waiver 结算改变；需直接证明完整贡献、默认 limits 结果，并在验证后同步公开指南、内部 owner、变更日志和 Decision alignment。
- source fidelity 偏差、identity/来源/pin、直接测试/Case 及包/Worker 验收须同步，以原始固定上游结果证明来源，以修正期望证明产品正确性。

## Success Criteria

1. 四项边界对照中 typed-tail 的结束行/NLOC/CCN/ND 恢复 3/3/1/0，尾随控制流不贡献；正常内部嵌套保持，callback receiver、旧槽调用一次和重入新槽有直接证明。
2. 每个真实 `??` 独立贡献 CCN +1；四项空值合并 CCN 5、contributors 恰四项 `??`，带空格/紧凑结果一致。可选参数与真实三元不回归。
3. ND 在 condition 内外、混合短路、嵌套括号和 hidden-bracket 生命周期与同形 `&&`/`||` 路径一致；不能替换成总为零或所有链恒增一层。
4. 11 项原始样例、必要继承 reader、27-reader/extension 生命周期及 adapter→真实 Worker→Check 通过；Finding/blocking/waiver、exact package 与 installed Node consumer 验收闭合，完整 Gate 通过。

## Affected Owners

- [Function Metrics](../../docs/checks/function-metrics.md)、[scanner dependencies](../../docs/development/scanner-dependencies.md)：指标/贡献、公开结果与私有边界。
- [短路计量 Decision](../../docs/decisions/align-nullish-coalescing-with-short-circuit-function-metrics.md)：已确认短路口径的完整对齐判断；[来源维护](../../docs/tooling/source-mapping.md)、[包材料](../../docs/tooling/package-artifact.md)、[包生命周期](../../docs/tooling/package-lifecycle.md)。
- [测试策略](../../docs/testing/strategy.md)、[Case](../../docs/testing/case-maintenance.md)；[协调入口](../../docs/governance/change-coordination.md#lizard-升级与-typescript-修复)默认继承已验收固定来源的稳定提交；当前来源与局部偏差见[Scanner dependencies](../../docs/development/scanner-dependencies.md)，形成时验收见[实施调查](../../docs/investigations/verify-lizard-1-24-1-implementation.md)。固定来源交付不替代两项缺陷的独立修复与验收。
