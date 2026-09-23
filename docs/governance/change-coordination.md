# Change 执行依赖与 Worktree 协调

本文是同时推进多个当前 Change 时的协调入口。它完整维护 `main` 作为开发集成线、Change 分支命名、一般 worktree 规则、跨 Change 前置关系、推荐合入顺序与共享 owner 冲突；不保存已完成 Change 的副本或形成时证据。正式发布的双工作区、冻结 source、同一 tarball 验收、Git tag 与发布后交接时序由 [Package release](../tooling/package-release.md#发布工作区冻结源与交接) 完整定义。

本文不拥有 Change 的 stage、任务状态、实施授权或恢复条件。成员与动态状态以
`bun run change-plan -- list changes` 和目标 `changes/<change>/` artifacts 为准；本文与目标 artifacts 不一致时，先按当前事实更新本文，不得用协调摘要覆盖 Change 自身的约束。

## 使用步骤

每次创建或恢复 worktree 前依次执行：

1. 运行 `bun run change-plan -- list changes`，确认目标仍是当前直接成员，并读取其 stage、任务进度和 Plan 距离。
2. 读取目标 Change 的 `proposal.md`、`design.md` 和存在时的 `tasks.md`，确认 Outcome、开放问题、Resume Conditions 与 Readiness。
3. 确认硬前置的稳定提交已经包含在目标 worktree 的实施基线中。该基线可以是 `main`、集成分支或上游 Change 分支，不要求先合入 `main`。
4. 检查同批 worktree 是否修改相同源码 owner、lockfile、Gate、Case 账本或稳定文档 owner；有重叠时默认串行合入。
5. 从选定实施基线创建一个 Change 分支和一个活跃实现 worktree。发布的 detached 冻结 worktree 是 [Package release](../tooling/package-release.md#发布工作区冻结源与交接) 所定义的正式验收边界，不替代本项实施 worktree。上游变化后，下游同步基线并重新复核。

## 当前 Change 协调

完整当前集合由 `bun run change-plan -- list changes` 查询。本节让执行者恢复三项协调信息：下一项工作、
跨 Change 前置和共享 owner 的合入顺序。目标 Change 的 stage、Readiness、开放问题和实施授权仍由其
artifacts 决定。

### 待启动主队列

当前材料入口、变更选择和 Markdown lint adoption 已由
[Project Gate](../tooling/project-gate.md) 与
[repository-material owner](../tooling/repository-material-validation.md) 承接。
下列条目是后续候选，不因前置能力已交付而自动获得实施授权。

| 优先级 | 当前 Change | 进入条件与完成出口 |
| --- | --- | --- |
| P1 | [`add-project-gate-building-guide`](../../changes/add-project-gate-building-guide/proposal.md) | 使用已验证 API 和本项目实际构建路径形成 consumer 指南；与 package docs 共享 owner 的改动串行合入。 |
| P1 | [`design-markdown-check-caching`](../../changes/design-markdown-check-caching/proposal.md) | 以真实 lint workload 为输入，补充重复运行与失效证据后作出 cache adopt 或 not-adopt 决定；不反向扩大 lint contract。 |
| P2 | [`add-composable-feature-config-packages`](../../changes/add-composable-feature-config-packages/proposal.md) | 在真实 Gate 组合与 building guide 已证明重复成本后，固定 fragment grammar、冲突规则与 Gate projection。 |

### 并行与合入边界

调查和 Plan 收敛可以并行。代码、Case 账本、Gate manifest、lockfile、package material 和稳定文档共享
owner 时，实施与合入必须串行。

| 轨道 | 可并行工作 | 实施前置与共享边界 |
| --- | --- | --- |
| Project Gate building guide | cache workload 调查、scheduler 证据 | 只消费已验证 API；共享 package docs 时按实际 diff 串行。 |
| Markdown lint cache | config package 设计讨论 | 已有 lint adoption；仍需证明重复执行成本与失效语义。 |
| Config packages | scheduler 证据、Gate guide 调查 | 需要真实组合成本证据，且会改变 package authoring/Definition owner。 |
| Scheduler evidence queue | 文档和独立 corpus 调查 | 若改 scheduler/runtime，按以下证据队列内部顺序串行。 |

每个 Change 仍须按自身 artifacts、测试和用户授权实施；新的 blocking policy 或公共抽象须有独立证据。

### Scheduler 证据队列

Scheduler 的当前行为由 runtime、Architecture、API mechanics、
[统一 Invocation 策略生命周期 Decision](../decisions/keep-invocation-lifecycle-free-of-learned-special-cases.md)
和[虚拟评估 Decision](../decisions/evaluate-admission-heuristics-with-seeded-virtual-workloads.md)承接。以下队列只协调
当前 Change 的证据顺序：

1. [`add-scheduler-performance-reference`](../../changes/add-scheduler-performance-reference/proposal.md) 现在可以完成
   consumer 价值、measurement sufficiency 与命名门禁。
2. [`adapt-admission-optimization-to-effective-opportunity`](../../changes/adapt-admission-optimization-to-effective-opportunity/proposal.md)
   以当前 [Project Definition](../development/project-definition.md#flag-enabled-checks) 已拥有的 effective selection，建立分层 workload、opportunity facts、算法成本和
   adoption/non-regression 门槛。Performance reference 只在具有独立判断价值时进入该证据。
3. [`optimize-learned-admission-strategy`](../../changes/optimize-learned-admission-strategy/proposal.md) 保持暂停；上一步
   收敛后，根据新证据重写、拆分或以 not-adopt 结束旧 Plan。

[`add-invocation-fail-fast-policy`](../../changes/add-invocation-fail-fast-policy/proposal.md) 取得真实 workload，并闭合
pending outcome、observer 与 drain 语义后才能激活。若它先激活，应在新的 Scheduler corpus、terminal evidence
与 timing baseline 冻结前完成，因为这些结果会成为后续比较的新输入。

### 等待恢复条件

下列 Change 当前只进行解除恢复条件所需的有界调查：

| 当前 Change | 恢复条件 |
| --- | --- |
| [`add-html-link-validation`](../../changes/add-html-link-validation/proposal.md) | 命名 consumer 与 corpus 已明确 source kinds、supported attributes、parser 和本地 target 语义。 |
| [`add-network-link-validation`](../../changes/add-network-link-validation/proposal.md) | 命名 consumer、安全 input acquisition、显式网络授权和 hermetic SSRF/redirect/DNS 证据齐备；恢复时重新形成 Plan。 |
| [`decide-file-metrics-public-scc-expansion`](../../changes/decide-file-metrics-public-scc-expansion/proposal.md) | 出现当前 executable-only contract 无法满足的具体 consumer outcome，再评审独立 public contract。 |
| [`refine-agent-document-routing`](../../changes/refine-agent-document-routing/proposal.md) | 用户明确恢复后，以代表性任务重新评估 AGENTS、导航和领域 owner 的路由边界。 |

## Worktree 与合入规则

1. **`main` 是开发集成线。** 当前 Change 从选定的实施基线分出；需要集成时按已验提交合回 `main`，而非把 `main` 当作活动 Change 分支。
2. **默认一个当前 Change 一个无前缀语义分支。** 普通 Change 使用 `<change-name>`；发布使用 `release-<version 的连字符形式>`，例如 `release-0-0-2`。新项目分支直接使用语义名称，不使用工具或分类命名空间；既有分支不因此迁移或重命名。有硬依赖时，下游分支可直接建立在上游稳定提交上。
3. **一个 Change 一个活跃实现 worktree。** 不让两个执行者同时修改同一 Change 目录。[Package release](../tooling/package-release.md#发布工作区冻结源与交接) 为正式发布另设 detached 冻结 worktree；它不是第二个实现 worktree，且不在其上更新活动 Change 记录，但 `S` 的快照可以保留已提交的 Change 文件。
4. **按下游实际继承的提交解除依赖。** 未提交 working tree、测试结果或未被下游继承的旁支提交不足以解除依赖。
5. **共享 owner 默认串行。** package、Gate、Case、lockfile 或稳定文档的交叉改动分次合入。
6. **先语义复核，再刷新 Plan。** Git 距离非零本身不要求机械重写 `baseCommit`；确认当前 Plan 仍成立后再运行 `plan`。
7. **每项 Change 独立验收和提交。** owner 交接、验证与任务闭合后，只有取得当前任务的明确删除授权才运行 `finalize`。
8. **堆叠分支按依赖顺序同步与合入。** 上游更新后，下游先同步并运行受影响验证。正式发布的 source/tag 与发布后修正、交接合回 `main` 的特殊顺序，以 [Package release](../tooling/package-release.md#发布工作区冻结源与交接) 为准。

## 维护与验证

当前 Change 新增、退出、stage 或 Outcome 改变，硬前置完成，条件分支激活，或实际冲突改变并行边界时更新本文：

1. 运行 `bun run change-plan -- list changes` 和 `bun run change-plan -- check-all changes`。
2. 读取发生变化的目标 artifacts，只维护当前依赖、允许工作、轨道和合入顺序；不复制动态任务计数或已完成材料。
3. 运行 `bun run validate -- materials`、`bun run decisions -- check` 和 `git diff --check`。
