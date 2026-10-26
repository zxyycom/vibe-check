---
title: 以现有性能预算阻断 Gate 并保全同次现场
id: 261022-enforce-gate-performance-budgets
status: archived
alignment: aligned
createdAt: 2026-10-22T07:06:05Z
purpose: 在现场处理性能退化，避免只留告警导致事后证据不足
background: 用户重新选择现场阻断，要求三个现有阈值不变且不自动重试
decision: 总耗时、均值或P95任一超标使Gate失败，沿用统计口径并留存同次安全事实
tags:
  - configuration
  - gate-performance
  - performance
  - project-gate
  - workflow-policy
relations:
  - type: 修订
    target: 260926-warn-on-gate-and-check-duration-budgets
    summary: 以现场阻断替代仅告警，保留阈值与测量边界
---

## 目的

- 让性能超标在现场得到处理，并保留同次事实供定位；完整正确性验收与 Gate 性能达标分别可观察。

## 背景

- 前序采用留有余量的三项先验预算，但只输出 warning，使所有 Check 通过的运行仍退出 0。用户认为现场处理通常不难，事后恢复输入、负载和准备状态反而困难，因此明确改为三项全部阻断，阈值保持不变。
- 现有 resultContributor 已能消费 frozen 初步结果、candidate/context 与同次 Run execution durations，仅允许 passed→failed；现有 Gate transcript 可留存现场，无需增加 Product API、重跑或历史测量系统。

## 决策

- 采用: required / all 总反馈时间、Check execution 均值与 P95 各自独立判断，任一严格超过现有预算即 error / Gate failed / exit 1；等于预算通过。focused preset 不评估性能，初步非 passed 不提升，实际 Check 失败、配置/测量无效及不可用的原失败边界保持。
- 采用: 保留本机 required 30000ms、all 90000ms、两个 profile 均值 2000ms、P95 5000ms 的既有阈值。schemaVersion 1 本机普通文件按 profile/runtime 唯一配置；Check 字段省略时沿用 2000/5000 默认值，总耗时必填，三个字段均为正 safe integer，显式非法值不回退。旧声明指纹只作合法可选元数据，不参与匹配；Gate 只读预算，不自动创建、学习、回写或上调。
- 采用: 保留同次 Run 的非 null execution duration，零值计入；均值为累计 execution / N，P95 为升序 ceil(0.95 × N) 项，不插值。N 小于 20 时 P95 为最大值，空集合为 n/a 且只评估总耗时；重复身份、非法 duration 或累计溢出拒绝测量。每次有效评估报告连续阶段、执行数量、累计 execution、均值/P95 对照和最慢三项；累计 execution 不是墙钟或 CPU 时间。
- 采用: 超标时在既有 gate.log 保存同次 profile/runtime、原始预算与测量、candidate version/artifact/input 身份、实际准备动作、声明指纹、全部 Check duration facts 与日志定位；终端显示超标和日志入口。只投影明确安全字段，不复制源正文、环境或自由异常。候选输入与声明指纹不是完整工作区快照，不据此自动判定冷热或根因。
- 采用: 接受环境波动可能阻断的取舍，不自动重试以取得绿色，也不因超标放宽预算。保留 exact candidate、配置预检、receipt exact artifact、help 无副作用，以及单次 preparation/load/Run；不新增诊断用子进程、缓存或全仓扫描。
- 采用: 预算只属于 Gate 私有贡献层，不改写 Product facts、aggregate、Check outcome、Record 或 machine publication。Check 粒度和测试选择服从行为 owner 与独立证明责任，不以拆分、合并、跳过或转移到 preparation 改善指标。当前精确行为由 [Gate owner](../../tooling/project-gate.md#性能预算与-check-耗时分布) 拥有，测试清理另按 owner 分批审计。
