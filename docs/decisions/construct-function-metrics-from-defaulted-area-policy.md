---
title: 以带默认值的区域政策构造函数指标 Check
status: active
alignment: aligned
createdAt: 2026-08-28T06:28:26Z
purpose: 让 functionMetrics 完整记录区域 findings，并以全局默认和区域覆盖明确区分阻断结果。
background: 完整默认 Check value 混合扫描范围、阈值和无实际分档的 warning policy，非法输入与未分类 measurement 还能静默通过。
decision: functionMetrics 使用默认化 constructor 和区域政策，完整记录 findings 后按 effective blocking policy 结算。
tags:
  - configuration
  - product-contract
relations: []
---

## 目的

- 让 consumer 以闭合、可默认化且能直接表达合法组合的 policy 构造 function-metrics Check。
- 让所有可信 metric findings 都保留为 evidence，同时明确哪些 findings 会使 Check failed。
- 消除空区域、未匹配区域、伪 warning 分档和 object-order overlap 带来的静默行为。

## 背景

- 当前 `functionMetrics` 是完整 Check value，consumer 必须用多层 object spread 替换 files、code areas、scanner 与 thresholds。
- 共享 `CodeAreaDefinition` 的 description 没有 function consumer，五种 warning policy 只有 `exclude-warnings` 与其它值的二分行为；未匹配 area 的 metric candidate 被丢弃。
- 当前 options validator 接受空 area map、负数、零和小数，与 public 文档的正安全整数契约不一致。
- 用户要求顶层提供 finding 是否阻断的默认配置，并允许子空间决定 finding 阻断还是继续形成后续 evidence。

## 决策

- 采用: `functionMetrics(options?)` 是带默认值的 specialized constructor；input 是 closed partial policy，resolved Check options 是完整冻结领域值，非法 constructor input 同步拒绝，preflight 继续防御完整 options replacement。
- 采用: 顶层 finding policy 提供 `blocking` / `non-blocking` 默认值，每个 code area 可覆盖并在 resolved options 中物化 effective policy。
- 采用: 每个 code area 自己拥有 files、function metric limits 与 effective finding policy；explicit area 必须声明 files branch，无参 constructor 建立完整默认 project area。
- 采用: 一次 invocation 扫描全部 area exact paths 的去重并集，path 恢复所有 matching areas；重叠 area 使用最严格 maximum，任一 matching area blocking 时 finding 为 blocking，不依赖 authoring order。
- 采用: 所有 accepted findings 都产生 supplemental Records；final data 区分 total 与 blocking finding count，只有 blocking count 非零时 Check failed。finding policy 不触发 scanner fail-fast，也不丢失后续 area evidence。
- 采用: threshold 名称表达 maximum 与 exclusive-below 比较方向，constructor 拒绝非正安全整数与小于普通 maximum 的 low-complexity allowance。
- 不采用: 继续公开五档但无对应行为的 warning policy、用空/unknown area 静默排除 findings、按第一个 matching area决定政策，或只为让 repository 当前通过而提高 package defaults。
