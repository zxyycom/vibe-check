---
title: 将 Project Gate machine facts 写入 invocation evidence
status: active
alignment: aligned
createdAt: 2026-08-29T15:40:19Z
purpose: 让 Gate 中的 Check final data 与 Records 在进程结束后仍可直接检查，而不建立质量专用报告器。
background: 本 Decision 形成时，direct quality Checks 需要 Records，但 Gate 关闭 machine publication。
decision: 在 Gate invocation directory 发布既有标准 machine fact set，并把它限定为本次运行的临时本地证据。
tags:
  - configuration
  - workflow-policy
relations: []
---

## 目的

- 让维护者无需调试或修改调用方，即可从一次 Project Gate invocation 恢复每个 Check 的终态、final data 与 supplemental Records。
- 复用 Product 已有的 machine publication contract，不为 quality、Gate 或 diagnostic logging 新建第二套字段、parser 或归约器。
- 让 machine facts 与同次 core diagnostic、process transcripts 共享明确的 invocation directory owner。

## 背景

- package-provided quality Checks 的 actionable terminal message 只给出 finding count，并要求消费其 Records 取得路径、位置和测量值。
- 本 Decision 形成时，Gate 只把 core diagnostic log 写入 invocation directory，并关闭 machine publication；进程结束后没有稳定的 Record readback file。
- 现有 machine v4 已投影所有 selected/raw Check facts 和 Records。Gate 的 prepared candidate data 包含 invocation-local 绝对路径，因此这些 bytes 只适合作为本地短期 evidence，不是发布 artifact。
- 本记录当前为 `aligned`：完整方向已成为当前稳定基线并完成核对；后续局部接线、测试或文档修改不单独改变这一对齐状态。

## 决策

- 采用: bound Project Gate Run 在自己的 invocation directory 启用现有 machine publication，生成标准 complete fact set；不筛选为 quality-only view，也不重新解释 Records。
- 采用: machine files、单份 core diagnostic log 与 Check-owned process transcripts 都由同一次 invocation directory 承接；它们没有 `latest`、index、retention 或跨 invocation 合并协议。
- 采用: Gate machine facts 是本地临时证据，可能包含 prepared candidate 等 invocation-local路径；不得把该目录当作 package release artifact、公开报告或跨环境可移植材料。
- 采用: publication failure 沿用 Product output failure 与 Gate unavailable 边界，不把缺失 Records 伪装为成功 evidence。
- 不采用: quality 专用 machine schema、第二套 Records 文件、从 diagnostic text 反向解析事实、额外 summary reducer，或把 invocation evidence 自动复制到长期 artifact owner。
