---
title: 保持质量决策策略封闭且声明式
status: archived
alignment: unaligned
createdAt: 2026-08-05T10:31:35Z
purpose: 让可执行检查仍由可验证、可审阅且确定性的通用政策完成最终决断。
background: TypeScript Project Definition 可以构造检查和政策，但任意政策函数会形成第二套不可预检的执行系统。
decision: DecisionPolicy 保持命名、封闭和声明式；TypeScript helper 只构造待验证数据，Core 对 Check 与 Record 快照执行通用求值。
tags:
  - configuration
relations:
  - type: 修订
    target: use-declarative-quality-decision-policies.md
---

## 目的
- 允许项目灵活实现检查，同时让查询、接受和门禁仍能在执行前验证并在执行后确定性复核。
- 让新增检查接入同一决策系统，而不在 Core 增加领域分支或开放任意政策代码。

## 背景
- Custom runner 本身已经是受信任可执行代码，但门禁政策还承担审阅、验证、证据引用和机器重放责任。
- 如果 Project Definition 直接提供任意 evaluator function，Core 无法在 work 前验证引用、合法操作和唯一阻断结果。
- Check 运行状态、领域 verdict 与逐条 Record 是不同 operands，固定 channel 又不足以组合它们。

## 决策
- 采用: Resolved Project Definition 产生 stable named、closed typed、serializable 且不可执行的 `DecisionPolicy` 数据；Core 在任何检查执行前完成 owner validation、reference validation 和冻结。
- 采用: TypeScript authoring helper 可以帮助构造政策，但不得把 function、动态属性访问或 runner 状态带入 normalized policy；Core 只实现一套通用声明式 evaluator。
- 采用: DecisionPolicy 分别查询冻结的 `CheckRun`、nullable `CheckResult` 与 `QualityRecord` 快照，并用封闭组合表达 acceptance、view 和唯一 gate decision；检查继续拥有自己的领域 verdict 与记录语义。
- 采用: CLI 和其它调用者只显式选择 resolved named policy，不通过名称、profile 或缺省行为执行隐藏的 feature-specific reducer。
- 不采用: 把可执行 TypeScript 配置等同于可执行门禁函数，或恢复固定 `all`、`changed`、`regressions` channel 作为 Core 特权逻辑。
