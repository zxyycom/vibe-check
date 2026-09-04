---
title: 按人工检查目的组织 Project Run 与 Gate 诊断
status: archived
alignment: aligned
createdAt: 2026-08-30T10:20:40Z
purpose: 让维护者从同一次 invocation 快速筛选 core 时间线、Gate 外层过程与子进程输出。
background: 通用 JSON 事件包装、未保存的 Gate 终端过程和根级平铺 process transcripts 降低了诊断可读性。
decision: 用带标签的紧凑 core 时间线、Gate plain transcript 和 process 子目录组织一次性人读诊断。
tags:
  - configuration
  - product-contract
  - workflow-policy
relations: []
---

## 目的

- 让维护者无需断点调试即可按 component、Check、phase、decision 和 outcome 筛选 Product core 的连续运行路径。
- 让 Product Run 外层的 prepared candidate identity、selection、performance observation、最终结果与 exit mapping 在同次 invocation 中可回放。
- 让 invocation 根直接区分 Gate、Product、machine facts 与 Check-owned process output。

## 背景

- Product diagnostic log 已覆盖真实 core facts，但当前每个事件使用英文摘要加完整 `details` JSON；一次 complete `--all` Gate 的普通成功路径也难以快速扫描。
- `run.json` 与 `records.ndjson` 是 machine final facts，不拥有 Scheduler 连续过程，也不应被复制成另一套人读归约器。
- Gate 的 afterGate performance observation、最终 Gate result 与 process exit mapping 形成在 Product Run 之外，当前 invocation artifacts 无法单独证明这些外层事实。
- Check-owned process transcripts 属于同次 invocation，但与根级 Gate/Product/machine 文件平铺会遮蔽事实层级。

## 决策

- 采用: Product diagnostic log 使用一条主行一个事件的紧凑时间线，以独立 `[]` 标签表达常用筛选轴，以 `key=value` 和有界续行表达动态 facts；Scheduler decision 的顶层 `kind` / `taskId` 与 Record observation 的顶层 `result` 已由标签完整表达时不重复渲染，每次 decision 与 Record observation 仍保留，日志继续不建立 parser、schema/version 或跨版本兼容。
- 采用: Project Gate 在 candidate preparation、import 和 exact entry identity 检查完成并成功创建 invocation directory 后保存一份 `gate.log` plain transcript，覆盖准备完成后的同次 stdout/stderr、performance observation、唯一最终结果与 exit mapping，同时不改变终端呈现；transcript setup 或 close 失败映射为 unavailable，并显示已创建的 directory。
- 采用: Check-owned process transcripts 只写入 `process/<check-id>.log`；`run.json`、`records.ndjson`、Product core log 与 `gate.log` 保持根级，并按各自 owner 独立成立。
- 不采用: 根目录 process transcript 双写、额外 `gate-result.json`、从 diagnostic text 反向解析 machine facts、质量专用 summary reducer，或把 child stdout/stderr 复制到 core 时间线。
