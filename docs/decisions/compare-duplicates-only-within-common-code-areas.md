---
title: 只在共同代码区域内形成重复 Finding
status: active
alignment: aligned
createdAt: 2026-09-02T06:42:05Z
purpose: 让 duplicateDetection 的每个 area 成为实际比较边界，同时保留一次 scanner 执行。
background: 当前实现会把互斥 area 的文件合并比较，使独立 Product 与 scripts 区域产生跨边界 Finding。
decision: scanner 继续扫描 exact-input 并集，但只有全部 location 共享至少一个 area 时才形成 Finding。
tags:
  - configuration
  - product-contract
relations:
  - type: 修订
    target: let-each-duplicate-code-area-own-files-and-thresholds.md
---

## 目的

- 让 `duplicateDetection.codeAreas[id]` 同时拥有文件范围、比较边界、阈值与 Finding policy。
- 保留单次 jscpd 扫描与 exact-input 证据，不为区域隔离增加进程或公共 DSL。

## 背景

- 当前 Check 将全部 area 的路径去重后一次性交给 jscpd，并把每个 location 涉及的 area 取并集；因此分别只属于 `src/**` 与 `scripts/**` 的片段仍形成跨 area Finding。
- 独立 area 更自然的含义是只有该 area 同时包含全部 duplicate locations 时才拥有这条 Finding。需要跨目录比较的 consumer 可以显式声明一个同时选中这些目录的 area。
- raw scanner 候选仍可从所有 exact paths 的一次扫描获得；区域隔离可以在可信结果进入 Finding 前通过 area 集合交集完成。

## 决策

- 采用: 每个 raw fragment 分别恢复所有 location 所属的 area IDs，并取这些集合的交集；交集为空时，该 fragment 不属于任何完整比较域，不形成 Finding、Record、message 或 final count。
- 采用: 交集非空时，Finding 的 `codeAreas` 恰为排序后的共同 area IDs；line/token threshold 与 blocking policy 只从这些共同 area 计算，重叠 area 继续采用严格有效政策。
- 采用: 一个 invocation 继续只把全部 area exact paths 的去重并集交给一次 jscpd；scanner 使用足以取得完整候选的最低阈值，cache identity 与 exact-input containment 保持不变。
- 采用: 需要跨既有区域比较时，调用方显式声明一个同时包含相关文件的 area；不增加 `comparisonGroups`、跨 area flag、隐式全局 area 或 per-area scanner。
- 不采用: 把只覆盖部分 locations 的 area 标到 Record 上，或用 waiver 接受由区域边界本身产生的跨 area Finding。
