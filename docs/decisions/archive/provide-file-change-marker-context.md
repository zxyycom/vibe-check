---
title: 提供文件变更标记 Check 与 execution wrapper
id: 260909-provide-file-change-marker-context
status: archived
alignment: unaligned
createdAt: 2026-09-09T10:30:21Z
purpose: 让多个 Check 复用一次可信文件变更采集并通过稳定查询判断相关工作
background: 重复采集与线性扫描会放大 I/O 和查询成本，而全局上下文会制造隐式契约
decision: 公开显式 provider Check 和普通 execution wrapper，并将规范事实与私有派生索引分层
tags:
  - configuration
  - performance
  - product-contract
relations: []
---

## 目的

- 让多个 Check 只采集一次可信的文件变更事实，并用类型化 marker 判断本次是否存在相关工作。
- 让 consumer 通过普通 execution composition 取得稳定的只读查询能力，同时保持 Check relation 与生命周期显式。
- 让 canonical facts 承担发布责任、私有 query/index 承担访问加速，并以测量证据选择索引策略。

## 背景

- `260828-drive-run-from-check-owned-inputs-and-explicit-providers` 已确定 changed-file facts 应由显式 producing Check 拥有，并要求未来 constructor 明确 source 与 baseline；Product 不为所有 callback 提供一个含义不明的全局 changed-files context。
- 当前 typed dependency 已能让 direct dependent 读取 provider 的 canonical final data 并调用其 parser，但每个 consumer 都要重复编写 `dependencies.get`、解析和领域错误映射，且直接扫描大型 changes 数组会把查询成本乘以 consumer 数量。
- canonical Check data 是可发布的 JSON facts，无法携带真正的 `Map`、`Set` 或方法；展开的 marker/path/kind 索引还会重复事实并增加一致性义务。
- 常见 consumer 只判断 marker，详细 consumer 才会列出文件或按路径查询。公共查询契约与内部索引布局因此需要分层，实际索引由代表性 workload 的 baseline 决定。

## 决策

- 采用: package 提供 opt-in 的 typed file-change marker provider constructor。它形成 ordinary Check，显式拥有 acquisition source、comparison baseline、marker rules、失败语义与 versioned final-data shape；没有可信采集结果时结算 `unavailable`，可信的零变更仍结算 `passed`。
- 采用: provider 的 canonical final data 保存稳定排序、去重的 normalized change facts 和紧凑 `changedMarkers` 并集；Plan 收敛后属于公开事实的 comparison、path 与 rename representation（如适用）进入同一版本化契约，具体字段和语义当前不预先决定。按 marker/path/kind 展开的 `Map`/`Set` 索引不进入 final data、Core、RunResult 或 machine schema。
- 采用: package 另提供只包装 execution function 的 helper，例如 `withFileChanges(provider, execution)`。Helper 读取 direct dependency、调用 provider parser、构造冻结的扩展 context，并把只读 `change` query 交给实际 execution；外围 Check 继续显式拥有 `dependsOn`、preflight、适用性判断与 aggregation。
- 采用: helper 把 dependency read、provider parse 或 query construction 失败映射为稳定的 owning-Check `unavailable`。实际 execution 位于该错误捕获边界之外，其 throw/reject、malformed result、Records 与 messages 继续由普通 execution/settlement owner 处理。
- 采用: `change` 提供以 consumer 操作为中心的稳定查询，例如任意变更、marker 命中、按 marker/kind 列出文件、按路径查询、已变更 marker 与总数；具体方法、筛选与返回 shape 在 Change 进入 Plan 前冻结。返回值只读，内部 `Map`/`Set` 留在闭包或 package-private owner，允许后续替换数据结构而不改变公共 API。
- 采用: 先比较 linear scan、per-consumer eager index 与 lazy/memoized index 的同条件 baseline，再决定索引、缓存和性能 guard。实现可以用 canonical dependency object 的 `WeakMap` 机会式复用解析与派生索引，但 cache miss 只影响成本；正确性和公共性能契约不依赖跨 consumer object identity。
- 不采用: 修改 Core 或 `RunControls` 注入 changed files、给所有 Product execution context 增加 `change`、由 helper 隐式改写 Definition relation、把重复索引发布为 canonical facts，或仅凭直觉冻结索引实现与 wall-clock 门槛。
