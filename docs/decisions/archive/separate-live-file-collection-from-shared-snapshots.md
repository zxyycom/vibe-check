---
title: 分离实时文件收集与声明式共享快照
id: 260910-separate-live-file-collection-from-shared-snapshots
status: archived
alignment: unaligned
createdAt: 2026-09-10T06:22:03Z
purpose: 让即时读取与跨 Check 复用具有不同且显式的生命周期语义
background: 隐藏调用内缓存会让首个调用者意外决定快照时点且无法可靠失效
decision: 保留每次调用重新观察的实时 helper，并以显式 Provider Check 产生可复用路径快照
tags:
  - configuration
  - dependency-policy
  - performance
  - product-contract
relations:
  - type: 替代
    target: 260910-provide-invocation-project-input-context
    summary: 以显式快照替代隐藏调用内缓存
---

## 目的

- 让调用式文件收集如实表达“现在重新读取”，不要求每个 Check 启动前先做一次全局收集。
- 让多个 Check 需要复用同一份路径结果时，由 Project Definition 显式表达快照的内容、时点、依赖和消费者。
- 共享 source/include/exclude 的收集机制，但不把 area、eligibility、内容读取、scanner 或 Finding 提升为 Product Core 策略。

## 背景

- `collectProjectFiles(...)` 这类普通调用不知道调用者的 Run 边界，也不知道项目文件何时变化。跨调用缓存会将一次实时查询悄然改成无法判断过期的快照。
- 调用内惰性缓存也不是中性优化：首个偶然运行的 Check 会决定快照时点；之前或之后生成、格式化或删除文件的 Check 无法让 Product 自动安全失效。
- 现有 Check 依赖图已经拥有顺序、授权和失败传播。已建立的调用内私有依赖交接方向可以传递保持身份的路径集合，而不将其发布为 machine facts。
- 当前多个随包 Check 重复遍历 filesystem 或执行 Git discovery；共享 acquisition 有实测价值，但不足以证明应隐藏改变全部调用的时间语义。

## 决策

- 采用: 保留实时调用语义。公开 `collectProjectFiles(...)` 以及未绑定共享快照的 Check，每次调用都重新观察当前 source；不在独立调用之间、Check callback context 或 Run 内建立隐藏缓存。
- 采用: 提供 package-provided ordinary `projectFileSnapshot` Provider Check。它接收调用方命名的完整 `ProjectFileSelection` 集合，在自身被 Scheduler admission 后收集一次，对同一 source 共享 candidate acquisition，再分别应用唯一 include/exclude matcher。
- 采用: consumer 通过 typed snapshot reference 声明所需命名集合；随包 constructor 将该引用组合为 direct `dependsOn`，并在已结算 provider 的 invocation-private handoff 中读取对应路径。Product 不按 Check ID 或 options shape 探查、预收集或自动改写依赖图。
- 采用: 快照时点由图显式决定。需要先生成文件时声明 `generator -> projectFileSnapshot -> consumers`；需要两个收集阶段时定义两个拥有不同 ID/依赖的 Provider Check，不在共享对象上增加隐藏 `refresh()` 或可变失效。
- 采用: Provider 产生的是排序去重的 project-relative path snapshot 及有明确语义的最小 acquisition provenance，不是文件内容的原子快照。consumer 后续读取内容时文件仍可变化；需要内容一致性的场景应使用另一个明确的内容产物 Provider。
- 采用: source/include/exclude、候选枚举和 matching 留在中立 project-files owner，one-shot helper、snapshot Provider 与未绑定 consumer 共用同一机制。area membership、文件类型资格、bounded/no-follow read、secret handling、scanner exact-input acceptance 和 Finding 仍由各 Check 拥有。
- 采用: `git-worktree` 路径快照可在 Provider 内共享 candidate 与收集所必需的 Git provenance，但不发布通用 `gitInfo` 对象。在 Scheduler selection 前影响 Check 集合的 changed-path facts 继续由 Project 根 change preparation 拥有，不改成 execution-time snapshot。
- 采用: 实施以结果集合等价、每个 Provider 只收集一次、未绑定调用仍实时、生成器顺序、不同 Run/Provider 不共享、source failure/cancellation 传播以及代表性 filesystem/Git 成本对比为验收边界。
- 不采用: 每个 Check 前的全局 eager collection、调用内 lazy hidden session cache、跨 Run cache、可变快照刷新、Project-wide area/eligibility policy、通用 scanner result 或无约束 Git 数据包。
