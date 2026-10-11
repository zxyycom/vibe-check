---
title: 让空值合并沿用现有短路运算符的函数指标口径
id: 261011-align-nullish-coalescing-with-short-circuit-function-metrics
status: active
alignment: unaligned
createdAt: 2026-10-11T13:22:21Z
purpose: 保持 TypeScript 空值合并的 token、CCN 贡献与 ND 计量一致且不受空白影响。
background: 函数指标继承了将 ?? 拆为三元问号的缺陷；用户已确认采用现有短路运算符口径。
decision: 将真实 ?? 识别为单一 token，每项 CCN +1 并保留完整贡献位置；ND 复用现有短路路径，以受控偏差独立取证。
tags:
  - function-metrics
  - product-contract
  - source-fidelity
relations: []
---

## 目的

- 让正常 TypeScript 空值合并表达式取得可解释、空白不变的函数指标；同一短路路径不因被误拆为三元问号而增大 CCN 或 ND。
- 固定长期计量选择及相对上游的取证边界，让后续修复和源码升级不重新选择 `??` 策略。

## 背景

- [来源核验](../investigations/trace-typescript-metrics-upstream-origin.md)与[最新复查](../investigations/verify-lizard-latest-typescript-defects.md)保存 `??` 分类缺陷及其上游来历；这些是形成时证据，不证明修复已实施。
- [公开指南](../checks/function-metrics.md)拥有 CCN contributors 与 ND 的当前契约；[现有 ND processor](../../src/package-checks/function-metrics/analyzer/extensions/lizardnd.ts)对 `&&`/`||` 已有 condition tracking、condition 内首个运算符处理和 condition 外处理。用户已确认让 `??` 采用同一口径。
- [指定扩展采用决策](adopt-selected-lizard-extensions-in-product-owned-analyzer.md)继续拥有私有 selected pair、source fidelity 和闭合 Product contract 的采用边界。本记录独立承接 `??` 的产品计量及必要受控偏差，不替代或归档该完整方向。

## 决策

- 采用: 将每个真实 `??` 识别为单一 token，带空格与紧凑写法的分类和计量一致；可选参数与真实三元保持各自既有语义。
- 采用: 每个真实 `??` 使 CCN 增加 1，与现有 `&&`/`||` 的逐 token 贡献口径一致；完整有序 contributors 保留 `??` token 及其 source line，不拆成两项 `?`，也不以 human message 的展示上限截断 Record。
- 采用: `??` 复用现有 `&&`/`||` 的 ND 处理路径，包括 condition tracking、condition 内只计首个短路运算符的规则、condition 外处理及 hidden-bracket/嵌套生命周期。它既不是两个三元运算符，也不一律对 ND 贡献零；不能将该方向简化为所有短路链固定只增一层。
- 采用: 相对上游的必要分类和计量修正作为有界受控偏差独立取证，保留上游身份、原始 oracle 和修正期望，分别证明来源差异与产品正确性；实施时按[分析器 owner](../development/scanner-dependencies.md)及[来源维护](../tooling/source-mapping.md)闭合 identity、provenance 和派生 pin。修复、升级各按其实际基线重验，不以原始 oracle 的错误结果覆盖修正期望。
- 采用: 保持现有复杂度体系、默认阈值与公开配置面；本选择不重新定义其他操作符或引入可选计量模式。工程实施由 [TypeScript 修复 Change](../../changes/fix-typescript-function-metrics/design.md)承接；完整实现、直接行为及公开调用链证据、稳定 owner 同步和包验收完成后，才核对本记录是否 aligned。
- 本记录是已确认但未实施的未来方向；Change 阶段、执行顺序及产品修复、源码升级、联网、上游写入和 Git 操作仍由当前任务分别授权。
