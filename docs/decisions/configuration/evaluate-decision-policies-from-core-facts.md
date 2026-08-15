---
title: 从 Core facts 求值封闭质量决策策略
status: active
alignment: aligned
createdAt: 2026-08-15T12:27:50Z
purpose: 让命名且声明式的 DecisionPolicy 在执行前完成验证，并仅从冻结的 Core 与 reference facts 得到可审计门禁。
background: Policy 必须可验证和确定性复核，不能通过执行函数或平行生命周期重新取得 Check 事实。
decision: Run pre-work 以唯一 Resolved Check 集合验证政策；evaluator 只读取 Core Check、Record 与 reference facts。
relations:
  - type: 修订
    target: configuration/keep-decision-policies-closed-and-declarative.md
---

## 目的

- 允许项目灵活组合 Check，同时让 acceptance、view、readiness 与唯一 gate decision 保持可审阅、可验证且可确定性复核。
- 让 policy 只消费一次 Run resolution 与冻结后的产品事实，不在 Core 增加领域特例或开放任意政策代码。

## 背景

- 项目提供的 Check binding 是受信任代码，但门禁政策还承担执行前引用验证、执行后证据解释和机器重放责任；其来源不创建另一种 Check lifecycle。
- 任意 evaluator function、动态属性访问或 binding state 会让 Core 无法在 work 前验证政策 owner、引用、合法操作和唯一阻断结果。
- Run pre-work 已为每个 Normalized Check 形成唯一 canonical Resolved Check collection；最终 Core snapshot 只保留闭合 Core Check outcome 与 QualityRecord，named reference facts/evidence 独立于当前 Run 的实体集合。

## 决策

- 采用: Project Definition 只形成 stable named、closed typed、serializable 且不可执行的 `DecisionPolicy` 数据；TypeScript helper 可以构造该数据，但不得把 function、动态属性访问或 runner state 带入 normalized policy。
- 采用: Package Run pre-work 以冻结的 canonical Resolved Check collection、其 Check declaration/Record policy surface 与 named reference identities 完成 policy owner、operand 和 reference validation；执行后不重新解析 configuration、binding 或 project function。
- 采用: evaluator 只查询 frozen Core Check outcome、QualityRecord、named reference facts/evidence 和已解析 policy，形成 acceptance、views、readiness、`DecisionEvidence` 与唯一 `GateResult`。Check 继续拥有自己的领域 verdict 与 Record 语义；policy 不通过平行 lifecycle、work acknowledgement 或项目函数返回值重新取得 operand。
- 采用: CLI 和其他调用方只显式选择 resolved named policy，不通过名称、profile 或缺省行为运行隐藏的 feature-specific reducer。
- 不采用: 将可执行 TypeScript 配置等同于可执行门禁函数，恢复固定 `all`、`changed`、`regressions` channel 作为 Core 特权逻辑，或从全局 execution reducer 推断 readiness。
