---
title: 公开发布前要求完整 Project Gate 证据
status: active
alignment: aligned
createdAt: 2026-08-30T17:34:09Z
purpose: 让公开 package 只在 exact candidate、真实消费者、完整 Gate 和外部发布授权均有证据后发布。
background: 本地 quality dogfood 能证明部分能力，但不能代替 package candidate、consumer 和发布边界验收。
decision: 先形成不访问 registry 的本地候选，再完成完整 Gate 与发布授权条件。
tags:
  - product-contract
  - product-priority
relations:
  - type: 拆分
    target: preserve-release-gate-readiness-with-invocation-creation-time.md
---

## 目的

- 区分“本地 Gate 已能运行”和“公开 package 已由真实候选及消费者完整证明”。
- 保留开发期尽早使用 local candidate 的价值，同时不让本决策隐含授予 registry 查询、credential 或发布权限。

## 背景

- Project Gate 的正式 root entry 会准备 exact candidate、绑定项目 Definition 与 Run，并从 explicit aggregate 映射 process exit；它是仓库适配器，不是第二个 Product CLI。
- 仅运行 quality Checks、fixture 或 workspace 源码不能证明 tarball 内容、public API、外部消费者、partial execution 与 progress 的发布可用性。

## 决策

- 采用: 先形成不访问 registry 的可安装 local package candidate，并让 Project Gate 通过正式 public package API 消费该 exact candidate。
- 采用: 公开发布前必须由项目拥有的 Definition、bound Run 与 Gate root entry 完整证明核心验收类别、可观察 result/log/exit、invocation-controlled partial execution 和可用 progress feedback。
- 采用: Gate 不自动继承旧 CLI 的每个参数、分组、格式或 presentation 细节；没有实际 consumer 证明静态 scheduler 容量不足时，不建立 public concurrency requirement。
- 采用: exact candidate、tarball、外部 consumer acceptance、fresh registry checks 与明确外部写入授权全部满足后，才可公开发布 package。
- 不采用: 先发布只完成 quality dogfood 的 package，再补齐完整 Gate、partial execution、progress 或 consumer evidence；本决策也不授权 registry 查询、credential 使用或 `npm publish`。
