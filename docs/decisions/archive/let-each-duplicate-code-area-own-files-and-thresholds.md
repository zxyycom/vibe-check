---
title: 让每个重复检测区域共同拥有文件范围和阈值
status: archived
alignment: aligned
createdAt: 2026-08-28T04:31:52Z
purpose: 让 duplicateDetection 的每个 code area 成为自身输入范围与显著性阈值的单一配置事实源。
background: 顶层 files、默认阈值和 area override map 把同一策略拆散，并且无法自然表达重叠区域的完整规则。
decision: 每个 area 直接拥有完整 files 与 line/token 阈值，scanner 扫描各区域输入的去重并集并按最严格涉及区域策略过滤。
tags:
  - configuration
  - product-contract
relations:
  - type: 修订
    target: scan-duplicate-code-once-across-code-areas.md
---

## 目的

- 让 package consumer 在一个 `codeAreas[id]` 中完整读取和修改该区域的文件选择与重复显著性规则。
- 消除顶层默认值、area override map、分类 fallback 与区域定义之间需要人工对应的第二事实源。
- 在区域独立且可能重叠时，继续发现同 area、跨 area 与重叠 area 的重复代码。

## 背景

- 前序方向已经确定一个 invocation 只运行一次 jscpd，并在 raw measurement 后按涉及 area 的严格 token policy 过滤。
- 形成时配置仍把完整 `files` 与 `minimumLines` 放在 options 顶层，把 token policy 拆成 `defaultMinimumTokens` 和 `minimumTokensByCodeArea`，而 `codeAreas` 只负责再次分类。
- 这种结构迫使 consumer 同时维护 area ids、glob 分类、默认回退和 override keys；一个 area 的输入和判断标准不能作为完整单元组合。
- area 独立拥有 file selection 后，同一路径合法地可能属于多个 area；强制 first-match 或隐式 `unknown` 会重新制造隐藏策略。

## 决策

- 采用: `duplicateDetection.options` 顶层只保留 Check-owned `cache`、`scanner` 与 `codeAreas`；每个 `codeAreas[id]` 完整拥有 `files`、`minimumLines` 和 `minimumTokens`，area id 必须非空且两个阈值必须为正安全整数。
- 采用: 每个 area 独立形成 exact paths，scanner scope 是所有 area paths 的去重并集；未被 area 选中的路径不扫描，也不进入隐式 `unknown` 或默认阈值分支。
- 采用: 同一路径可以属于多个 area。scanner 分别使用所有实际输入 area 中最低的 line/token 阈值取得完整候选；每个 finding 的 line/token 必须分别达到所有 location 所涉及 area 阈值中的最大值。
- 采用: raw cache 继续绑定 exact-input union fingerprint 和 scanner-effective arguments；area membership 与最终严格策略在 cache hit/miss 后统一恢复，使不改变 raw scan 输入和下界的 area policy 调整可以安全复用 measurement。
- 采用: 本次仍处于 prestable public contract，移除顶层 `files`、`minimumLines`、`defaultMinimumTokens` 与 `minimumTokensByCodeArea`，不提供旧 shape fallback 或 compatibility reader。
