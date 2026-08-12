---
title: QualityRecord 稳定身份不使用当前源码位置
status: active
alignment: aligned
createdAt: 2026-08-05T11:15:26Z
purpose: 让记录在仅发生行移动或排版变化时保持稳定 identity、acceptance 和 comparison 结果。
background: 行列与 byte offset 是当前导航信息，不是 Record 的稳定领域语义，写入身份会制造虚假变化。
decision: Record identity 只使用 catalog 声明的规范化语义字段；当前位置独立用于展示和导航。
relations:
  - type: 修订
    target: product-contract/use-location-independent-finding-identities.md
---

## 目的
- 让纯粹的位置移动不把同一质量事实误报为新增、回归或另一条记录。
- 在保留准确当前定位信息的同时，使 acceptance、comparison 和持久引用依赖稳定 record identity。

## 背景
- Line、column、range 与 byte offset 会随无关编辑变化，不能可靠标识记录表达的领域事实。
- `checkId`、`recordTypeId`、semantic subject 和 catalog 标记的 identity fields 可以形成更稳定的身份输入。
- 同一 semantic subject 的重复 occurrence 仍需由 producing Check 与 record catalog 提供确定性语义区分。

## 决策
- 采用: RecordManager 只使用 `checkId`、`recordTypeId`、规范化 semantic subject 和 catalog 明确声明的 identity fields 计算稳定 record identity；当前 line、column、range、byte offset、message 和 arrival order 不参与。
- 采用: Producing Check 单独提供 current location 供本次展示、annotation 和导航，位置变化不得改写记录身份或 comparison relation。
- 采用: 同一 semantic subject 下需要区分多个 occurrence 时，由 producing Check 使用安全且确定性的领域字段表达，不由 Core 通过当前位置启发式猜测。
- 不采用: 以含位置的 key 先匹配，再用名称、邻近位置或隐式 baseline 启发式修补稳定性。
