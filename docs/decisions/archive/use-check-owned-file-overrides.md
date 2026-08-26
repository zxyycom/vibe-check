---
title: 由 Check options 表达文件级差异
status: archived
alignment: unaligned
createdAt: 2026-08-22T05:52:33Z
purpose: 让需要按文件或目录改变行为的 Check 在不扩大 scan scope 或建立共享配置层前提下声明自己的可审阅覆盖。
background: 当前 Project Definition 只拥有 scope fields；不同领域 Check 的匹配与阈值语义不构成 Product 共享配置模型。
decision: 文件级差异留在 producing Check 的 closed options；它只作用于该 Check 的 eligible inputs，Check 以四态 result 表达结论。
tags:
  - configuration
relations:
  - type: 修订
    target: use-file-policy-overrides.md
---

## 目的

- 让确有文件或目录差异的 producing Check 能在自己的 options 中声明可审阅、可验证的局部行为，而不复制整个 Project Definition。
- 保持全局 scan scope 的输入资格 owner 不变；局部规则不能重新纳入 scope 外、排除、generated 或不支持的文件。
- 防止少数 built-in 的阈值、匹配与合并需求演变为所有 Checks 必须使用的共享质量配置层。

## 背景

- 当前 `ProjectDefinition.quality` 只定义文件 scope；Product 没有 shared selection layer，普通 Check 自己拥有 closed options、领域数据与 execution semantics。
- README、生成示例或普通实现的差异是否有意义，取决于 producing Check 的领域语义；不存在可安全推广给 arbitrary custom Checks 的统一 patch grammar、默认补值或接受规则。
- Check final status 是该 Check 的四态事实；需要多 Check conclusion 的调用方只能使用显式 Run aggregation，不能从局部 option/Record 内容重建全局结论。

## 决策

- 采用：需要文件级变化的 Check 可以在自己的 closed options 中定义匹配输入和局部覆盖；该 Check 的文档、validation 与 execution 共同拥有其 pattern、precedence、threshold 或 merge semantics。
- 采用：局部覆盖只可作用于该 Check 已取得资格的 inputs，不能扩大 Project scope、改变其他 Check 的 options、重写 scanner dependency 或创建 shared runtime configuration。
- 采用：optional behavior 在该 Check 的完整 options 中明确 absent/disabled semantics；Product 不从 neutral default、`null` 删除或未声明 section 推断该行为。
- 采用：producing Check 用自己的四态 result、final data 与 supplemental Records 表达局部工作；caller 如需多 Check conclusion，显式配置 aggregation 并只消费 settled statuses。
- 采用：当某个实际 Check consumer 需要这种能力时，先为该 Check 选择并验证完整 option grammar；没有共同消费者时，不提前建立 Product-wide glob language、generic partial patch 或 cross-Check merge engine。
- 不采用：完整基础配置和共享有序 override catalog、由产品统一派生的 partial patch、隐式默认补值，或依靠局部配置内容推断 Gate conclusion。
