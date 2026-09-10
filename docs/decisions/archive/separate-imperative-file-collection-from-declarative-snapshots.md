---
title: 分别提供命令式文件收集与声明式路径快照
id: 260910-separate-imperative-file-collection-from-declarative-snapshots
status: archived
alignment: unaligned
createdAt: 2026-09-10T06:45:36Z
purpose: 让两种不同生命周期使用各自准确的公开契约并只复用内部机制
background: 无跨代安全复用的 refresh 只是统一命名且会暗示不存在的共享状态
decision: 保留命令式 collect helper，并另设声明式 snapshot Provider 而不公开 refresh
tags:
  - configuration
  - dependency-policy
  - performance
  - product-contract
relations:
  - type: 替代
    target: 260910-model-project-file-refresh-as-immutable-generations
    summary: 撤销无实际跨代复用的统一 refresh
---

## 目的

- 让命令式“现在收集并返回”与声明式“在依赖图指定时点产生可复用输入”使用各自忠实的公开契约。
- 只在 source/include/exclude validation、candidate acquisition、matching 和路径规范化这些真正同义务上复用内部机制。
- 让声明式快照在同一代内为多个 Check 消除重复遍历与 Git 进程，而不暗示不存在的跨代缓存。

## 背景

- 命令式 helper 的 caller 拥有调用时点，需要当场返回当前 source 的路径或抛出 source failure；它不知道 Project Run、Scheduler 或 consumer graph。
- 声明式快照的时点、授权和失败传播由 Check 依赖图拥有；它只需在 Provider 成功结算后把同一份 invocation-private path map 交给明确的 direct dependents。
- 两个场景共用收集数据模型和实现算法，但不共用生命周期、返回形式或失败语义。把它们合并为公开 `refresh()` 并不会增加安全复用。
- filesystem 或 Git worktree 在两次观察之间可以任意变化；若 refresh 必须重新 acquisition 才能保持正确性，它只是 collect/snapshot 的统一命名，却会暗示可复用的 mutable collector。

## 决策

- 采用: 命令式入口继续是同步 one-shot `collectProjectFiles({ projectRoot, selection })`。每次调用都验证输入、重新观察当前 source、返回冻结的稳定路径数组，且不保存跨调用或跨 Run 状态。
- 采用: 声明式入口是 package-provided ordinary `projectFileSnapshot(...)` Provider Check constructor。它持有调用方命名的完整 `ProjectFileSelection` 集合，在自身被 Scheduler admission 后执行一次 batch collection。
- 采用: 同一 snapshot Provider 对同源 selections 共享 candidate acquisition，并允许多个 direct dependent 通过 generation-bound typed selection reference 取得同一 path map identity。这是该契约承诺的复用边界。
- 采用: 需要不同收集时点时声明拥有不同 Check ID/依赖的多个 `projectFileSnapshot(...)` Provider，并让各 consumer 引用正确 Provider。各 Provider 重新 acquisition，不试图在无变更证明时复用上一代观察。
- 采用: 两个公开入口都委托中立 project-files owner 的同一 selection validation、candidate enumeration、glob matching、安全剪枝和路径规范化；共享的是这个内部引擎，不是对外 lifecycle abstraction。
- 采用: Provider 的 canonical final data 仅发布有界摘要与最小 acquisition provenance，完整 path map 通过 invocation-private handoff 交给 direct dependents。消费 Check 仍自行拥有 area membership、eligibility、bounded/no-follow content read、scanner exact-input acceptance 与 Finding。
- 采用: 快照是路径集合快照，不是文件内容的原子快照。`git-worktree` Provider 可复用本 snapshot 所需的 Git discovery/provenance，但不建立通用 `gitInfo` 或跨 snapshot cache；changed-path selection facts 仍由 Project 根 preparation 拥有。
- 不采用: 公开 project-files descriptor/`refresh()`、可变 `current` / `latest`、跨 snapshot/Run cache、Product 对 Check options 的探查，或将 area、eligibility、内容与 scanner 合并进通用收集层。
