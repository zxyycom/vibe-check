---
title: 比较只使用显式命名并冻结的参考
status: active
alignment: aligned
createdAt: 2026-08-05T10:31:35Z
purpose: 让 Check、Record 和门禁中的变化判断都绑定到调用者明确选择且可复现的参考。
background: Project Definition 可以声明比较需求，但从分支、历史、远端或政策名称猜测参考仍会产生不稳定结果。
decision: 每个比较引用稳定名称和显式输入，调用开始时解析并冻结；Check 产生关系，声明式政策决定不完整证据的结果。
relations:
  - type: 修订
    target: workflow-policy/require-explicit-quality-comparison-references.md
---

## 目的
- 让任何变化、回归、新增或解决结果都能说明相对于哪个参考，并在同一次 invocation 内保持一致。
- 保持 reference 选择、领域比较和最终门禁三个责任边界独立。

## 背景
- TypeScript Project Definition 改变了 authoring 载体，但不能替代调用者对实际 comparison input 的明确选择。
- Git history、branch、remote、cache 或 policy 名称都不能可靠推断本次验收希望使用的参考。
- 不同 Check 对匹配和变化的领域含义不同，Core 不应提供一个全局比较算法。

## 决策
- 采用: Project Definition 或 selected named policy 可以声明稳定的 named reference 需求，但调用者必须显式提供对应 input；Product 不从历史、分支、远端、cache 或依赖状态补猜缺失参考。
- 采用: 每个 reference 在任何检查、缓存或产物工作前解析一次并冻结 invocation identity；同一次运行中的 checks、records、diagnostics 和 evidence 只使用该身份。
- 采用: Producing Check 拥有匹配与 comparison relation 的领域语义，Record catalog 验证其输出，DecisionPolicy 只查询已发布关系。
- 采用: Reference 或 comparison evidence 不可用或不完整时如实保留 Check/Record 事实，由 selected declarative policy 决定是否阻断；Core 不应用全局全有或全无规则。
- 不采用: 让 `changed`、`regressions` 或其它 policy/view 名称隐式选择参考。
