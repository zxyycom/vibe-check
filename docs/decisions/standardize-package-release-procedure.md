---
title: 固定 package 发布流程与证据保存约定
id: 260909-standardize-package-release-procedure
status: active
alignment: aligned
createdAt: 2026-09-09T03:55:09Z
purpose: 让后续发布复用同一套执行规则而不是重复选择流程
background: 发布 tag、认证机制和证据位置反复作为临时输入，增加交接成本并容易漂移
decision: 由 Package release 固定 latest、本地交互式 2FA 和公共 Git 目录中的证据归档，保留当次事实核验与授权
tags:
  - workflow-policy
relations: []
---

## 目的

让每次正常发布按同一套稳定规则执行，只核对当次事实与授权，不重复讨论既定流程。

## 背景

已有流程约束了干净源码与同一 tarball 验收，但 dist-tag、认证机制和证据位置仍被作为每轮临时选择。
用户确认沿用 latest 与本地交互式 2FA，并要求发布流程由持久文档负责，避免后续重复选择。

## 决策

- 采用: 由 [Package release](../tooling/package-release.md) 完整拥有固定发布约定，正常发布使用 latest、本地交互式 2FA，并发布同一份通过正式验收的 tarball。
- 采用: 非敏感产物与证据归档位于 Git 公共目录的 `vibe-check/releases/<version>/<receipt-sha256>/`，独立于临时 worktree；保存原始 tarball、receipt、正式 Gate 日志和按摘要命名的交接快照，复制后核对 bytes，保留冲突而不覆盖。
- 采用: Change 引用流程并记录实际版本、S、产物、publisher、registry 观察与执行结果；沿用流程无需重复选择，但当次事实核验及外部写入、worktree 和清理授权继续独立成立。
- 采用: 长期流程调整先更新 owner 与 Decision，单次例外须事先明确授权并记录边界。归档属于显式人工交接，不冒充脚本自动化或跨机器备份。
