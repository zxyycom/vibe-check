---
title: 在调用输入边界批量准备 Check 声明的项目文件
id: 260910-batch-declared-project-file-inputs-at-invocation-boundary
status: active
alignment: unaligned
createdAt: 2026-09-10T07:01:28Z
purpose: 让 Check 自含文件声明并由 Product 对本次有效集合统一收集
background: 独立 Provider 增加接线样板而静态图锁定或逐 Check 收集都不能兼顾新鲜度与复用
decision: 新增标准 Check 文件输入字段并在 effective selection 后形成一次调用级路径快照
tags:
  - configuration
  - dependency-policy
  - performance
  - product-contract
relations:
  - type: 替代
    target: 260910-separate-imperative-file-collection-from-declarative-snapshots
    summary: 用 Check 自含声明替代独立快照 Provider
---

## 目的

- 让每个需要项目文件的 Check 在自身定义中完整声明所需命名 selections，不要求项目作者另外创建 Provider Check、分配 ID 并接线依赖。
- 让 Product 在本次 Run 的有效 Check 集合已确定后一次聚合这些声明，按 source 共享 candidate acquisition 与 Git 进程。
- 用明确的 invocation input cut 规定路径集合的时间语义，同时保持 area、eligibility、内容读取、scanner 和 Finding 由 owning Check 处理。

## 背景

- 独立 snapshot Provider 虽然可以在图中表达时点，但会迫使一个本可自含的 Check 依赖项目级额外声明；调用者必须重复管理 Provider ID、selection name、dependency 和 consumer reference。
- 若各 Check 在 callback 前单独收集，相同 source 的目录遍历与 Git discovery 仍会重复；若在 Project Definition 构建或静态图结构锁定时收集，又会把可重用的纯定义与某一时刻的 workspace 状态错误绑定。
- 当前 Run 在静态 graph validation 后还会根据 invocation flags 确定 effective Check IDs，未来影响 selection 的 project-change preparation 也必须在该点之前完成。因此“effective selection 已固定、首个 Check-owned preflight/execution 尚未开始”是可验证的单次调用输入边界。
- 文件系统与 `git-worktree` 不提供通用的原子 worktree 快照。共同 collection 可以固定路径 membership，但不能在不提前读取全部内容的前提下保证 consumer 之后看到同一时刻的 bytes。

## 决策

- 采用: ordinary executable Check grammar 增加标准、可选的 `projectFiles` 输入字段，其值是由 Check 本地 slot name 到完整 `ProjectFileSelection` 的非空映射。slot name 对 Product 是不透明 identity；字段只在 executable Check 上合法，不从 container 继承。
- 采用: `projectFiles` 由 Check constructor/author 直接声明，进入 normalized declaration、declarative snapshot 与 fingerprint。随包 constructor 可以保留现有 area/files 的低样板输入，但必须在构造时将文件 selection 投影到标准字段；Product 不按 Check ID 或 `options` shape 探查领域配置。
- 采用: 静态 Definition normalization 与 Task graph validation 继续是纯结构操作，不读取 workspace。每次 Run 在 root/controls 固定、所有影响 Check selection 的 preparation 完成且 effective Check IDs 确定后，在 Scheduler 启动任何 Check-owned preflight/execution 前执行一次 project-file input preparation barrier。
- 采用: barrier 先把 effective Checks 的命名 selections 归一化为去重的 matcher plans，并保留每个 plan 对应的 Check ID/slot subscribers；相同 source/include/exclude 只编译、执行一份 matcher plan。
- 采用: 对每个 source 取得一份 candidate observation 时，同步以相关 matcher plans 判定每条 candidate，并在命中当下直接写入按 Check ID/slot 索引的 membership。barrier 完成后只冻结、排序、去重该 materialized membership；分发与 Check callback 不得再次运行 include/exclude matcher，也不保留一个待消费时过滤的全量 candidate list。这里的“一次”是每个 source 每个 invocation 一次 acquisition；Git submodule/provenance 可以需要多条底层命令。
- 采用: Check callback 只能从 Product-owned context 读取自己声明的 slot，不能读取其它 Check 的路径。该输入不是 Check fact、dependency handoff、RunResult 或 machine output，不需要项目作者建立 Provider relationship。
- 采用: source acquisition failure 只使请求该 source 的 effective Checks 以 Product-owned project-input unavailable reason 在 author work 前结算；未声明该 source 的 Checks 继续进入 Scheduler。定义内的非法 selection 在 normalization 阶段作为 configuration failure 关闭，不延迟到 barrier。
- 采用: barrier 固定的是本次 invocation 的 path membership。每次 Run 都重新 acquisition，不建立跨 Run cache；barrier 之后新增的路径不进入本轮，已选路径后续消失或不可读时仍由 owning Check 按其内容/输入安全契约结算。Product 不将 path snapshot 声称为原子 content snapshot。
- 采用: 明确需要消费同一 Run 内生成或修改后文件的 Check 不声明 invocation-bound `projectFiles`；它在所需 `dependsOn` 结算后由 execution 使用命令式 `collectProjectFiles(...)`。这类动态输入不与调用初始快照伪装成同一批次。
- 采用: `projectFiles` 只拥有 source/include/exclude 与 path result。area membership 可使用 slot name 由 Check 恢复，eligibility、bounded/no-follow read、secret handling、scanner exact-input acceptance 与 Finding 继续由各 Check 拥有。
- 采用: `git-worktree` acquisition 在 barrier 内共享本 invocation 的 candidate 与收集所必需的最小 provenance，但不发布通用 `gitInfo`。在 effective selection 前影响 Check 集合的 changed-path facts 继续由 Project 根 change preparation 拥有，不使用 execution-time file input 反推。
- 不采用: 项目作者手工声明的 snapshot Provider Check、在静态 Definition/图锁定阶段读取 workspace、每个 Check 的独立预收集、隐藏 lazy cache、公开 `refresh()`、跨 Run cache、通用 content snapshot 或 Project-wide area/eligibility policy。
