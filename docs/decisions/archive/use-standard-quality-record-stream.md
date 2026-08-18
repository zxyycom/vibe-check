---
title: 使用统一质量记录流与独立能力运行状态
status: archived
alignment: null
createdAt: 2026-08-05T06:43:16Z
purpose: 让所有内置质量能力通过同一标准数据协议逐条发布最终语义，并让有效记录不再被能力整体完成状态覆盖。
background: 按 metric、content、security 划分结果形状并要求能力原子提交，会让 Core 持续承担领域分支，也会在后续工作失败时丢失已经可信的数据。
decision: 编译期 capability 逐条输出统一 QualityRecord，CapabilityRun 独立表达状态与覆盖；Core 只验证、汇集、执行策略并发布 machine v2。
tags:
  - product-contract
relations:
  - type: 替代
    target: use-generic-machine-v2-for-content-findings.md
---

## 目的
- 让新增数值、内容、安全或网络质量能力只需注册内部 capability 并输出标准数据，不修改 Core 的领域判断逻辑。
- 让单条数据的有效性、能力运行覆盖和最终产品决断分别拥有可观察契约。

## 背景
- Closed metric/content/security finding variants 仍然按预想 feature 类型扩展公共模型，不能形成真正统一的数据协议。
- 原子 capability result 把“后续工作失败”错误地解释为“此前所有记录都不可信”，不适合逐 work unit 产生结果的检查。
- 固定 warning streams 与 capability-wide completeness 让 machine consumer 无法并排恢复 records、coverage 和配置化决策依据。

## 决策
- 采用: Capability 只作为 Product 编译期注册的内部模块，不提供第三方或运行时加载；每个 capability 逐条 emit 已经包含 stable identity、final level、subject、safe message、typed fields 和可选 comparison relation 的统一 `QualityRecord`。
- 采用: 每条record通过catalog validation后独立进入committed set；后续work或capability failure不撤销已经committed的records。Policy acceptance只产生独立annotation，不参与record commit。`CapabilityRun`单独发布final status、coverage、record count和diagnostic。
- 采用: Capability 拥有 parser、threshold、classification、level 和领域 relation 判断；Core 只拥有 registry、exact-work coordination、record/run validation、确定性汇集、声明式策略执行和 output publication。
- 采用: Machine output hard cut 为 single-active run v2 与 record v2，发布一个 run summary 和一个统一 record stream；不保留 metric/content/security union、Observation/Finding 双模型、旧 warning streams 或 dual writer。
- 不采用: 让 Core 从 neutral value、message 或 backend output重新判断 warning，或用 capability overall failure删除此前有效数据。
