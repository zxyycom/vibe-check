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

### 主队列

主队列按当前推荐合入顺序排列。相邻 Change 可以并行完成调查和 Plan 收敛；修改相同 Definition、Run、
package material、lockfile 或稳定文档 owner 时，按序位串行实施与合入。

| 序位 | 当前 Change | 进入条件与完成出口 |
| --- | --- | --- |
| P0-0 | [`reorganize-repository-material-gate-checks`](../../changes/reorganize-repository-material-gate-checks/proposal.md) | 先完成 repository-material 的责任拆分、canonical `materials` 入口和新 Check identity；当前入口采用一次性语义切换。 |
| P0-1 | [`adopt-project-change-flags-and-dsl`](../../changes/adopt-project-change-flags-and-dsl/proposal.md) | 继承 P0-0 的 `materials`/`repository-material` 语义，冻结 changed-path corpus 和选择矩阵，再让 Gate 使用第二类 change region 与现有 flag DSL。 |
| P0-2 | [`adopt-markdown-lint-in-project-gate`](../../changes/adopt-markdown-lint-in-project-gate/proposal.md) | 继承 P0-0/P0-1 的材料 owner 与 selection 事实，接入真实 Markdown corpus，记录 Findings/成本，再决定 advisory、blocking 或有界 not-adopt。 |
| P1-1 | [`design-markdown-check-caching`](../../changes/design-markdown-check-caching/proposal.md) | 只消费 P0-2 已形成的真实 lint workload；据此作出 cache adopt 或 not-adopt 决定，不反向扩大 lint contract。 |
| P1-2 | [`add-composable-feature-config-packages`](../../changes/add-composable-feature-config-packages/proposal.md) | 以 P0 的真实 Gate 组合和 [`add-project-gate-building-guide`](../../changes/add-project-gate-building-guide/proposal.md) 为输入，固定 fragment grammar、冲突规则与 Gate projection。 |

[`add-project-gate-building-guide`](../../changes/add-project-gate-building-guide/proposal.md) 作为独立文档线现在即可推进。
它只使用实施时已验证的 Current API；可与 P0-0/P0-1/P0-2 并行完成调查和 Plan 收敛，但若共享 README、package
document registry、examples 或 installed-consumer 材料，则在对应 Gate/Package Change 后串行合入。

主队列包含两条约束：

1. P0 的三个 Change 可以并行进行调查和 Plan 收敛，但它们都修改 Gate manifest、repository material owner 或稳定 Gate 文档，实施与合入按 P0-0 → P0-1 → P0-2 串行。
2. Cache Change 只消费 P0-2 的真实 workload，不反向扩大首版规则、Finding 或资源边界；config package 只在真实组合已证明重复成本后固定公共抽象。

### 优先级与并行矩阵

优先级按“能否立即在本项目获得反馈”而不是 API 新旧排序。调查/Plan 可并行，代码、Case 账本、Gate manifest、lockfile
和稳定文档共享 owner 时必须串行。

| 轨道 | 优先级 | 可与谁并行 | 必须等待/串行原因 |
| --- | --- | --- | --- |
| Repository material reorganization | P0 | flags/DSL、Markdown lint 的 corpus 调查；Gate building guide | 先冻结 canonical owner/preset，避免新功能继续挂到 `docs` 语义下。 |
| Change flags + DSL | P0 | material reorganization、Markdown lint corpus 调查；Gate building guide | 等 P0-0 冻结 `materials` owner、Check identity 和 `repository-material` region 后确定 effective selection。 |
| Markdown lint dogfood | P0 | material reorganization、flags/DSL 的 corpus 调查 | 接入 material owner、独立 lint identity、`repository-quality.ts`/`definition.ts` 后与其它 Gate manifest 改动串行。 |
| Project Gate building guide | P1 | 全部 P0 调查、scheduler 证据 | 只消费已验证 API；共享 package docs 时按实际 diff 串行。 |
| Markdown lint cache | P1 | config package 的设计讨论 | 必须先有 lint 实际 workload；不与 lint 首次接线并行实施。 |
| Config packages | P2 | scheduler 证据、Gate guide 调查 | 需要 P0 的真实组合场景，且会改变 package authoring/Definition owner。 |
| Scheduler evidence queue | P1/P2 | P0 的文档/安全 corpus | 不修改 Gate quality manifest；若改 scheduler/runtime，按 scheduler 队列内部顺序串行。 |

P0 不是授权立即修改 Product 或把所有新 Check 设为 blocking；每个 Change 仍须按自身 artifacts、测试和用户授权实施。

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
7. **每项 Change 独立验收和提交。** owner 交接、验证与任务闭合后，只有取得当前任务的明确删除授权才运行 `complete`。
8. **堆叠分支按依赖顺序同步与合入。** 上游更新后，下游先同步并运行受影响验证。正式发布的 source/tag 与发布后修正、交接合回 `main` 的特殊顺序，以 [Package release](../tooling/package-release.md#发布工作区冻结源与交接) 为准。

## 维护与验证

当前 Change 新增、退出、stage 或 Outcome 改变，硬前置完成，条件分支激活，或实际冲突改变并行边界时更新本文：

1. 运行 `bun run change-plan -- list changes` 和 `bun run change-plan -- check-all changes`。
2. 读取发生变化的目标 artifacts，只维护当前依赖、允许工作、轨道和合入顺序；不复制动态任务计数或已完成材料。
3. 运行 `bun run validate -- docs`、`bun run decisions -- check` 和 `git diff --check`。
