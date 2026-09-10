---
title: 将项目文件 refresh 建模为不可变代际
id: 260910-model-project-file-refresh-as-immutable-generations
status: archived
alignment: unaligned
createdAt: 2026-09-10T06:36:21Z
purpose: 用统一 refresh API 显式创建可复用且版本明确的路径快照
background: 原地刷新共享 current snapshot 会让并发消费者读到错误代际
decision: 由声明式 refresh 创建 ordinary Provider 节点并返回绑定该代的 typed reference
tags:
  - configuration
  - dependency-policy
  - performance
  - product-contract
relations:
  - type: 修订
    target: 260910-separate-live-file-collection-from-shared-snapshots
    summary: 以不可变 refresh 代际统一快照声明
---

## 目的

- 用一个 `refresh()` 概念同时承接“现在重新观察”和“将这次观察交给多个 Check 复用”，减少两套收集 API 的认知差异。
- 让每个 consumer 精确绑定某一次 refresh 产生的不可变路径代际，避免并发或后续刷新改写已授权输入。
- 继续用 Check 依赖图表达实际收集时点、生成器顺序、失败传播和可见消费者。

## 背景

- 实时 one-shot helper 和显式快照 Provider 的生命周期不同，但它们都在做“按同一 selections 重新观察 source”。如果对外呈现为无关的 collect 与 snapshot API，调用者必须重新理解同一份 matching 契约。
- 在共享对象上原地替换 `current` 会破坏代际身份：早期 consumer 可能在后续 refresh 之后才读取，并从而看到未声明依赖的新路径集合。在图中并行执行时，这类竞态无法靠自动失效解决。
- Project Definition 的构建阶段可以让 `refresh()` 声明 ordinary Provider 节点，而不在定义评估期间读取文件。返回的 typed reference 可将 consumer 绑定到该节点的特定代际。

## 决策

- 采用: 向调用方提供配置完整命名 `ProjectFileSelection` 的 project-files descriptor；其 `refresh(...)` 是声明式 authoring operation，用显式 Check ID 和依赖创建 ordinary Provider 节点，不在 Project Definition 评估期间执行 I/O。
- 采用: 每次 `refresh(...)` 返回一个绑定该 Provider identity 的 typed generation reference。同一 reference 可被多个 direct dependent 复用；再次调用 `refresh(...)` 产生拥有另一 Check ID 的新 generation，不修改旧 generation。
- 采用: Provider 只在自身被 Scheduler admission 后执行一次实际 collection，对它的同源命名 selections 共享 candidate acquisition。未进入 effective graph 的 refresh 节点不预收集。
- 采用: consumer 必须使用 generation reference 中的命名 selection；随包 constructor 由该引用组合 direct `dependsOn`，并在 provider 成功结算后从 invocation-private handoff 读取完整 path map。不提供与代际无关的 `current` / `latest` read。
- 采用: 实时 `collectProjectFiles(...)` 保留现有同步 one-shot façade，在内部执行一个临时 refresh generation 的同一 validation、acquisition 和 matching 机制后立即返回路径。每次调用仍重新观察 source，不保存跨调用状态。
- 采用: 需要生成文件后再收集时，将 generator 声明为该 refresh Provider 的 prerequisite；需要前后两代时，声明两次 refresh 并让各 consumer 引用正确 generation。
- 采用: refresh generation 冻结的是排序去重的 project-relative path sets 和最小 acquisition provenance，不是文件内容的原子快照。area、eligibility、bounded/no-follow read、scanner exact-input acceptance 和 Finding 继续由 consumer Check 拥有。
- 采用: `git-worktree` refresh 共享本 generation 所需的 Git discovery 与 provenance，但不建立通用 `gitInfo` 或跨 generation cache。影响 Scheduler selection 的 changed-path facts 仍在 Project 根 change preparation 中形成。
- 不采用: 原地改写共享 snapshot、可被任意 Check 在 execution 中调用的全局 refresh、不绑定 generation 的读取、自动失效、跨 Run cache，或 Product 对 Check ID/options 的探查。
