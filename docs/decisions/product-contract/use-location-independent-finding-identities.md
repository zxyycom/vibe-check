---
title: 稳定质量身份不使用源码位置
status: active
alignment: unaligned
createdAt: 2026-08-04T15:02:12Z
purpose: 让质量 finding 在只发生行移动或排版变化时保持稳定身份和比较结果。
background: 行号、列号和 byte offset 是当前定位信息，不是问题本身的稳定语义，写入 key 会制造虚假新增和回归。
decision: 稳定 key 和 fingerprint 只使用规范化语义身份，源码位置只用于当前展示和导航。
relations: []
---

## 目的
- 让调用者显式选择同一 baseline 后，纯粹的前置空行、格式调整或代码移动不会把已有问题误报为新 finding 或 regression。
- 保留准确的当前定位信息，同时让接受、缓存和比较身份不依赖易变坐标。

## 背景
- Source line、column、range 和 byte offset 会随无语义关系的编辑变化；把它们放进稳定 key 会让历史接受项失效并制造噪声。
- 具名函数、路径、check、规则和格式内 semantic subject 可以形成更稳定的身份；同一 semantic subject 的重复 occurrence 仍需要确定性区分。
- Baseline 的选择已经由独立活动决策限定为调用方显式输入，身份稳定性不能通过推断另一份 baseline 补偿。

## 决策
- 采用: Finding、comparison、acceptance 和持久 cache 使用的稳定 identity/fingerprint 不包含 line、column、source range、byte offset 或它们的 digest。
- 采用: Location 作为 current-run 的展示、annotation 和导航信息单独携带，不改变 semantic identity。
- 采用: 同一路径和 semantic subject 下确有多个等价 occurrence 时，使用由解析顺序和安全语义字段派生的确定性 ordinal，而不是重新引入源码坐标。
- 不采用: 先以含行号的精确 key 匹配，再用名称或位置启发式猜测第二级 baseline 对象。
