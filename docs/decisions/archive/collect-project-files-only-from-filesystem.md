---
title: 仅从 filesystem 收集项目文件
id: 261010-collect-project-files-only-from-filesystem
status: archived
alignment: unaligned
createdAt: 2026-10-10T08:05:52Z
purpose: 用统一磁盘收集与显式范围降低文件选择、剪枝和诊断的语义成本
background: 双来源各自获取候选，范围提前生效不一致；叠加 ignore 与追踪例外会增加策略和查询成本
decision: 收集只使用 filesystem 和 include/exclude，移除 source 与 Git 枚举，不解释 ignore；保留同步工具和 Check 输入边界
tags:
  - configuration
  - file-selection
  - filesystem
  - product-contract
  - project-files
relations:
  - type: 归并
    target: 260828-select-check-files-from-explicit-sources
    summary: 以纯磁盘收集替代双来源，保留显式范围与Check内共享
  - type: 归并
    target: 260908-provide-synchronous-single-selection-file-collection
    summary: 同步工具改用无source选择，保留校验、快照与失败边界
---

## 目的

- 让公开工具与随包 Check 依赖一套现存文件收集、范围判断与目录剪枝规则，不再分别维护 filesystem 和 Git 递归 acquisition。
- 让扫描结果只受磁盘现状和显式选择影响，不为复用 ignore 文件引入追踪状态查询、例外或组合策略。
- 保留同步单份工具、Check 内批处理和 exact inputs 的责任边界，不扩大 Run 生命周期或公共文件状态。

## 背景

- 双来源选择曾消除了 Git 不可用时隐式回退的问题；公开同步工具随后复用了同一 source/include/exclude 契约。两项判断共同约束了当前选择与工具边界。
- [文件收集调查](../../investigations/fast-glob-git-collection-boundaries.md)记录了 filesystem 仅从部分 exclude 提前剪枝、Git 在最终过滤前访问被排除子仓库的缺口。共享最终 matcher 尚不足以统一访问前的范围责任。
- 统一磁盘枚举若仍复现 Git 文件选择，就需协调 ignore 规则、tracked 例外、仓库范围与查询失败；将 ignore 用于一般扫描过滤也需要额外规则来源和优先级。用户已决定不支持这些能力，采用纯文件收集。
- Run 的 Git 变更获取用于 baseline、changed paths 和 flags，与磁盘现存文件全集不同；移除收集中的 Git acquisition 不要求改变 Run 的变更语义。
- 本判断归并双来源选择与公开同步工具的采用方向，保留其显式范围、可信失败、输入校验和快照约束。方向已确认，产品实现与现行使用指南尚未迁移；完整对齐须由后续实施与验收证明。

## 决策

- 采用: 项目文件收集只枚举显式 project root 下的普通文件，不跟随文件或目录 symlink。子仓库作为普通目录，仅按文件选择判断访问，不检查 Git 初始化、gitlink 或仓库身份。
- 采用: 完整 `ProjectFileSelection` 收敛为 `{ include, exclude }`，移除 `source` 和 `git-worktree` 来源。两组规则使用共同生效的 project-root-relative `/` 路径 glob，点号路径参与匹配，exclude 优先。constructor 继续由 owning Check 物化省略字段；显式数组替换默认数组，公共完整选择由调用方显式给出。
- 采用: 不发现或解析 `.gitignore`、`.git/info/exclude`、用户全局 ignore 或其它 ignore 文件作为收集策略，也不把它们转成 exclude。文件是否 tracked、untracked 或 changed 不影响收集。ignore 文件本身若在显式范围内，仍是普通文件候选。
- 采用: 在读取子树前，由统一收集机制根据本次共享候选的全部 selections 安全判断有无需求；只有全部无需求才剪枝，无法证明时保留访问。最终每份选择仍应用完整 matcher，保持冻结、排序去重的相对路径结果。
- 采用: 保留公开 `collectProjectFiles({ projectRoot, selection })` 同步单份入口。options、显式 root 和完整 selection 经 closed、descriptor-safe 校验并形成 detached snapshot；root 非空且无 NUL，相对路径从调用时工作目录解析。非法参数抛出 TypeError，范围内必要读取失败抛出带路径上下文的 Error，合法空结果返回冻结空数组。空 include 不免除 root 可用性验证。
- 采用: 每个 owning Check 内的多个 selections 共享必要的磁盘候选枚举；不增加 Product-wide file context、provider Check、跨 Check hidden cache、watcher 或 invocation barrier。公开工具不增加命名批量集合、Map、异步协议或 AbortSignal。
- 采用: 收集只负责路径，不承诺 sandbox、内容可读性、内容原子快照或返回后的存在性。Check 继续拥有 eligibility、accepted/rejected、内容安全读取、阈值、Finding、Record、scanner exact-input handoff 与终态；工具不隐式创建 Check、Run 或 machine output。
- 采用: Run 的 Git 变更获取、rename/delete 路径与 change flags 保持既有职责，不作为 collection 的候选来源或 changed-only 输入。Core membership 继续只计算显式输入的关系，构造和查询均无 I/O。
- 采用: 后续实施同步选择类型、校验、默认值、constructors、公开指南、示例、迁移诊断与安装后消费者验收。旧 `source` 配置明确拒绝，不提供 alias、双读、双后端或隐式语义映射；仅移除收集专用 Git 接线，不删除其它 owner 仍使用的 Git 能力。后端与 matcher 的具体采用和性能结论由接入证据决定，不由本决策提前证明。
