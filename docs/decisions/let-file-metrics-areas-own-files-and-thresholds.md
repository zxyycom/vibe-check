---
title: 让文件指标区域拥有文件范围与行数策略
status: active
alignment: aligned
createdAt: 2026-08-28T06:39:31Z
purpose: 让 fileMetrics 以区域 ID 共同组织文件选择和行数策略，并对重叠区域使用明确的最严格语义。
background: 顶层文件选择与全局阈值使不同文件无法采用不同策略，现有事后 code-area 分类还会静默丢弃未匹配结果。
decision: 每个 fileMetrics code area 直接拥有 files 与 codeLines，一次扫描区域并集并按文件涉及区域的最严格上限结算。
tags:
  - configuration
  - product-contract
relations: []
---

## 目的

- 让项目按稳定区域 ID 为不同文件集合声明不同的 file code-line policy。
- 让文件选择、阈值、重叠语义和 finding identity 由一个可验证的 area policy 直接表达。
- 消除顶层扫描范围、事后分类与隐式 `unknown` fallback 之间的分散责任。

## 背景

- 当前 `fileMetrics` 在顶层分别声明 `files`、`codeAreas` 与 `codeLines`；所有 area 共享一个阈值，不能直接表达不同文件集合的不同 policy。
- 当前 code-area definition 的 `description` 和多数 `warningPolicy` 值不改变 file-metrics 结果；空 area map 与未匹配文件还可能使超限 measurement 被静默丢弃。
- SCC 对单个文件独立测量，因此可以对所有 area exact paths 的去重并集扫描一次，再依据每个文件实际所属的 area policy 结算。

## 决策

- 采用: `fileMetrics(options?)` 接受可省略的 `codeAreas`；省略时建立默认 `project` area，显式 map 必须非空且每个 area 必须声明 `files` branch。
- 采用: 每个 `codeAreas[id]` 直接拥有可默认化的完整 `files` 与 `codeLines`，顶层不再声明 `files`、全局 `codeLines`、事后分类 definition 或隐式 `unknown` area。
- 采用: owning Check 分别收集每个 area 的 exact paths，把去重并集一次性交给 SCC；同一路径可以被多个 area 选择。
- 采用: 每个 measurement 恢复全部实际 input area，分别计算各 area 的有效 code-line maximum，并使用其中最严格的最小值结算；每个超限路径最多产生一个 finding，Record 保存稳定排序的全部 area IDs 与有效 limit。
- 采用: constructor 同步拒绝未知字段、空 area map、缺失 files branch、非法整数和无效 allowance 关系；resolved preflight 与 execution 继续防御性验证完整 shape。
