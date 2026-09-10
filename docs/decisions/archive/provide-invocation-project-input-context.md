---
title: 在调用上下文提供项目输入查询
id: 260910-provide-invocation-project-input-context
status: archived
alignment: unaligned
createdAt: 2026-09-10T06:00:33Z
purpose: 让同一 Run 复用文件与 Git 获取而不把 Check 领域策略移入 Core
background: 各 Check 当前独立收集同源候选，外部 helper 无法拥有调用生命周期，Provider Check 又会把基础输入伪装为终态事实
decision: 由 Product 建立调用内项目输入 session，并以分层 files 与 Git 查询供 Check 使用
tags:
  - configuration
  - dependency-policy
  - performance
  - product-contract
relations: []
---

## 目的

- 让同一 Run 的多个 package-provided 或自定义 Check 复用项目文件候选和相同 Git 查询，减少重复目录读取与 Git 子进程，同时保持每次 invocation 隔离。
- 让文件来源、通用 include/exclude 与稳定路径结果成为 Product 提供的输入能力，但不让 Product Core 解释 code area、文件类型资格、内容安全、scanner 或 Finding。
- 保留 Run 外独立脚本的单份文件收集入口，并让它与调用内能力复用同一个枚举和匹配事实源。

## 背景

- 当前 `collectProjectFileSets` 只在一次 Check 内按 source 合并 area collection；不同 Check 即使使用相同 root/source，仍分别遍历 filesystem 或执行 `git ls-files` 与 submodule inspection。
- `ProjectFileSelection`、默认基线、公共 `collectProjectFiles` 以及多个 package Check 已证明 source/include/exclude 是真实公共契约；area membership 与 eligibility 则分别改变 Finding、input rejection、读取上限和安全失败，不能成为同一个全局 policy。
- ordinary provider Check 适合交付可复用领域产物，但 project-root 输入查询是 callback 的基础 capability。把它建模为 Check 会增加显式关系、selection propagation、aggregation 与失败翻译，并要求每个 consumer 重复绑定；外部 helper 或 tool 则无法自动共享一次 Run 的状态，额外 tool 还会增加待消除的进程。
- Git worktree candidate、当前 HEAD 和 changed paths 都依赖 Git，但它们的用途、合法状态和生命周期不同。HEAD 不能证明 working-tree 内容，changed paths 还必须在 Check selection 前准备，因而不能合并成无约束的 `gitInfo` 数据包。

## 决策

- 采用: Product 为每次 Run 建立独立的 project-input session，并在 `CheckProjectContext` 提供只读 `files` capability。Check 仍显式提交完整 `ProjectFileSelection`；capability 复用同一 root/source 的 acquisition，再应用唯一 include/exclude matcher，返回冻结、稳定排序且去重的 relative slash paths。
- 采用: filesystem acquisition 以 invocation-local memoized directory observations 保留 selection-specific pruning，每个已访问目录只读取一次；`git-worktree` 以每个 repository 一份 candidate observation 复用 `git ls-files` 和必要的 gitlink traversal。两者都不承诺文件内容快照或整个目录树的原子时刻。
- 采用: area 继续只是 owning Check 对多份 selection 的命名、重叠和 policy；它可重复调用同一 `files` capability，但 Product 不新增 code-area 领域类型。suffix/reader support、no-follow、bounded read、secret handling 与其它 eligibility 继续留在各 Check。
- 采用: Git 由同一 project-input session 提供若干有明确语义的 typed query，并按 exact query/repository 复用 acquisition。初始共同能力只覆盖 `git-worktree` collection 所需事实与 current HEAD；branch、status、diff、history 和任意键值集合不进入通用 context。
- 采用: 需要在 Scheduler selection 前影响 Check 集合的 changed-path snapshot 继续由 Project 根 change preparation 拥有；它可以复用同一底层 Git session，但不能降级成 execution-time provider 或普通 context query。历史 commit assessment 继续由 maintenance-reminders owner 处理。
- 采用: Run 外的公共 `collectProjectFiles(...)` 保持单次同步 façade 和现有失败契约，内部委托相同 collection/matcher engine，但不同调用之间不建立隐藏 cache。现有 Check 未显式使用新 context 时没有 caller-global 状态。
- 采用: 实施先记录 filesystem directory-read、Git command 和 source-acquisition 次数，并以同一 workload 比较 before/after；不以减少调用次数直接替代 wall-time、内存、取消和失败语义验证。
- 不采用: 把 project input 做成 ordinary provider Check、外部收集进程、Project-wide area/eligibility policy、通用 scanner result、任意 `gitInfo` 对象、跨 Run cache，或让 Product introspect package Check ID/options。
