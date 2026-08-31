---
title: 将 Run output directory 视为显式受信任 target
status: archived
alignment: aligned
createdAt: 2026-08-31T15:15:51Z
purpose: 让 machine publication 与 diagnostic logging 使用同一可审阅的目录选择契约，而不虚构文件系统隔离。
background: 受信任 TypeScript 配置可选择任意文件系统工作；旧 diagnostic containment 与 machine 实际行为不一致且不能约束 symlink。
decision: 两项 output 允许非空且无 U+0000 的相对或绝对目录；相对值从 projectRoot 解析，绝对值为明确 target，且不建立 containment 或共享 outputRoot。
tags:
  - configuration
  - product-contract
relations: []
---

## 目的

- 让调用方在 Project Definition 或 invocation-local RunControls 中，以同一规则选择 machine publication 与 diagnostic logging 的输出目标。
- 让文档、配置诊断与实际 Node path 解析表达同一能力，同时保持两项 output 的文件、状态和失败责任独立。

## 背景

- Product 的配置来自调用项目的受信任 TypeScript；项目 Hook 也能执行普通文件系统工作。仅靠一个 lexical `projectRoot` containment 不会形成安全边界，也不处理 symlink。
- machine publication 已能通过相对 `..` 或 absolute directory 写到 root 外，而 diagnostic logging 在 Definition 与 RunControls 中被不对称地拒绝，使 public contract 无法准确描述真实行为。
- machine publisher 的完整集合与临时文件 ownership、diagnostic logger 的 invocation-specific exclusive-create 文件和输出失败优先级已经各有稳定 owner，不需要合并配置或引入目录级清理协议。

## 决策

- 采用：machine publication 与 diagnostic logging 的 directory 共用 grammar：接受不为空、且不含 U+0000 的 string；不 trim，也不新增跨平台字符禁用表。relative target 从 effective `projectRoot` 解析，absolute target 直接作为目标，`..` 合法。
- 采用：Definition 与 RunControls 在 output I/O 前应用相同 validation；两个 output 可选择同一目录，但继续独立拥有 enabled/status/failure，以及 machine 的 `run.json`/`records.ndjson`/私有 temp 与 diagnostic 的 invocation-specific log。
- 采用：diagnostic readback 保持 `path.relative(projectRoot, resolvedFile)`；root 外结果可包含 `..`，跨卷时采用平台返回的 absolute readback。Definition fingerprint 保留 author directory text，因此文档建议可移植 Definition 选用 relative text，把 invocation-specific 外部 target 放在 RunControls。
- 不采用：filesystem sandbox、lexical/realpath/symlink containment、directory allowlist、共享 `outputRoot`、目录清空、retention 或让任一 output 管理另一项文件。
