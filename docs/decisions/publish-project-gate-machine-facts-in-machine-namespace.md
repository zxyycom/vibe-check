---
title: 将 Project Gate machine facts 发布到 machine namespace
status: active
alignment: aligned
createdAt: 2026-09-04T06:54:15Z
purpose: 让 Gate invocation evidence 中的 machine facts 保持既有 canonical atomic ownership，同时与其它输出 owner 的路径边界直接可辨。
background: Gate target 与其它 artifacts 平铺；新 layout 用独立 machine namespace，目录移动不改变 schema 或 publisher。
decision: Gate 将既有 v4 canonical pair 发布到 invocation `machine/`，字节、schema、原子性与 failure semantics 不变。
tags:
  - configuration
  - workflow-policy
relations:
  - type: 修订
    target: publish-project-gate-machine-facts-with-invocation-evidence.md
---

## 目的

- 让维护者可从 `<invocation>/machine/` 直接定位完整 Check terminal data 与 Records，并清楚区别它们与 Gate、progress、Product diagnostic 及 Check-owned artifacts。
- 保持 machine publisher 对 canonical `run.json` 和 `records.ndjson` atomic pair 的唯一所有权，避免产生 quality/Gate-specific schema、第二套 Records 或人读 reducer。
- 确保 invocation-local machine facts 仍只是短期本地证据，未被误用为 release artifact 或跨环境可移植材料。

## 背景

- Project Gate 已在自己的 invocation directory 启用既有 machine publication，但原有根级 target 不表达 machine owner namespace。
- machine v4 bytes 和 schema 不因 target directory 移动而改变；只有 canonical bytes 改变才触发 schema version 评估。
- machine publication failure 仍须沿用 Product output failure 与 Gate unavailable 边界，不能把缺失 Records 伪装成成功 evidence。

## 决策

- 采用: bound Project Gate Run 将 machine output directory 指向 `<invocation>/machine/`，由既有 publisher 原样生成 canonical `run.json` 与 `records.ndjson` atomic pair；同步 Gate paths、readback、reference、docs examples 与 tests。
- 采用: standalone Product callers 继续自行选择 machine directory；Project Gate 不在 Product 已接收的 exact invocation directory 下再创建额外 invocation layer。
- 采用: machine facts 与同次 owner channels 和 Check artifacts 通过 invocation identity 关联，但 machine publisher 不拥有 Gate/progress/diagnostic/process 内容，也不承担它们的 writer failure。
- 不采用: 因目录移动升级 v4 schema、合并 canonical files、建立 quality-only machine view、第二套 Records、从 diagnostic text 反向解析 machine facts，或自动复制 invocation evidence 到长期 artifact owner。
