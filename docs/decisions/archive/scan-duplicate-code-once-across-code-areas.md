---
title: 让重复检测以显式 command 扫描完整 Check scope
status: archived
alignment: aligned
createdAt: 2026-08-28T02:48:20Z
purpose: 让 duplicateDetection 安全配置 jscpd，并发现满足明确 area policy 的跨 area 重复。
background: package marker 与 per-area 进程把启动细节、并发和质量范围混在一起，还会漏掉跨 area 重复。
decision: 使用 Check-owned package/custom command，一次扫描全部 exact inputs，并以所涉及 area 中最严格的阈值过滤 finding。
tags:
  - configuration
  - product-contract
relations: []
---

## 目的

- 让 `duplicateDetection` 的普通 options 完整、安全且可组合地表达 jscpd 执行依赖和稳定质量语义。
- 让一个 Check scope 内的重复检测不会因 code-area 分类边界漏掉跨 area clone。
- 让 scanner 并发只由 jscpd worker policy 表达，不叠加按 area 启动的多个 scanner 进程。

## 背景

- 既有方向要求 external executable 继续由 owning Check options 持有，不进入 Run Controls 或 Product-wide registry。
- 默认 executable 使用只有在全部 command 字段保持默认时才解析的 marker；普通 nested spread 修改 `args` 后会把 marker 当作真实程序执行。
- 每个 code area 独立调用 jscpd，使不同 area 之间的文件从不互相比较；`maxConcurrency` 实际控制 area subprocess，而 jscpd 还拥有自己的 workers。
- token 阈值和 `minLines` 是质量语义；availability argv、bin target 和 JSON reporter/output 是 adapter command 机制。

## 决策

- 采用: scanner command 继续属于 `duplicateDetection` options，但以 package 与 custom 两种显式变体表达；package 变体由 Check-local adapter 解析 installed jscpd，custom 变体完整携带 executable、args 与 availability args。
- 采用: 一个 `duplicateDetection` invocation 对全部 approved exact paths 调用一次 jscpd，并使用 scanner-owned `workers` policy；不再按 area 启动多个 jscpd 进程或公开 `maxConcurrency`。
- 采用: scanner 使用所有实际输入 area token 阈值中的最小值取得完整候选；每个候选按 location path 恢复 code area，且 token count 必须达到所有涉及 area 阈值中的最大值才形成 finding。该规则让同 area 行为保持不变，并要求跨 area clone 对每个涉及 area 都足够显著。
- 采用: `minimumLines` 是全 Check 的正安全整数质量语义，默认值为 3；token 默认值和 area overrides 同样只接受正安全整数。jscpd mode、format、max-size 等没有当前稳定 consumer 的能力不进入公共 options。
- 采用: 本次 public options 变更沿用 prestable hard cut，不保留 marker、旧 scanner 字段或 per-area cache compatibility reader。
