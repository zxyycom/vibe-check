# Change 执行依赖与 Worktree 协调

本文是同时推进多个当前 Change 时的协调入口，维护日常 `main` 工作区、跨 Change 前置关系、执行顺序与共享 owner 冲突；不保存已完成 Change 的副本或形成时证据。发布分支、双工作区、冻结 source、同一 tarball 验收、Git tag 与发布后交接时序由 [Package release](../tooling/package-release.md#发布工作区冻结源与交接) 完整定义。

本文不拥有 Change 的 stage、任务状态、实施授权或恢复条件。成员与动态状态以
`bun run change-plan -- list changes` 和目标 `changes/<change>/` artifacts 为准；本文与目标 artifacts 不一致时，先按当前事实更新本文，不得用协调摘要覆盖 Change 自身的约束。

## 使用步骤

每次开始或恢复 Change 工作前依次执行：

1. 运行 `bun run change-plan -- list changes`，确认目标仍是当前直接成员，并读取其 stage、任务进度和 Plan 距离。
2. 读取目标 Change 的 `proposal.md`、`design.md` 和存在时的 `tasks.md`，确认 Outcome、开放问题、Resume Conditions 与 Readiness。
3. 确认日常工作区位于 `main`，且硬前置的稳定提交已包含在当前实施基线中；发现其它分支时先核对授权，不沿用它继续普通 Change 工作。
4. 检查同批任务是否修改相同源码 owner、lockfile、Gate、Case 账本或稳定文档 owner；有重叠时串行实施和提交，保留其它任务的改动。
5. 在当前 `main` 上限定本次写入范围与验证对象。前置变化后，下游先重新复核；发布工作区另按[发布流程](../tooling/package-release.md#发布工作区冻结源与交接)准备。

## 当前 Change 协调

完整当前集合由 `bun run change-plan -- list changes` 查询。本节让执行者恢复三项协调信息：下一项工作、
跨 Change 前置和共享 owner 的执行顺序。目标 Change 的 stage、Readiness、开放问题和实施授权仍由其
artifacts 决定。

### 当前主队列

下列条目按各自已获授权的范围推进；前置能力交付不自动授权其它候选。

| 优先级 | 当前 Change | 进入条件与完成出口 |
| --- | --- | --- |
| P1 | [`add-composable-feature-config-packages`](../../changes/add-composable-feature-config-packages/proposal.md) | 以真实 Gate 组合与 building guide 证明重复成本为前提，再固定 fragment grammar、冲突规则与 Gate projection；指南交付本身不证明需要新抽象。 |

### 0.0.4 发布轨道

[`release-0-0-4`](../../changes/release-0-0-4/proposal.md) 已完成发布、分发核验及 main/tag 交接，
保留发布分支、实现工作区与 detached 冻结工作区。当前维护交接证据，不再承担发布输入调整；
归档结果及保留范围以 [current evidence](../../changes/release-0-0-4/current-evidence.md) 为准。
Change 结项删除与工作区清理尚未授权，不能从发布成功推导清理权限。

### 并行与提交边界

调查和 Plan 收敛可以并行。代码、Case 账本、Gate manifest、lockfile、package material 和稳定文档共享
owner 时，实施与提交必须串行。

| 轨道 | 可并行工作 | 实施前置与共享边界 |
| --- | --- | --- |
| Config packages | scheduler 证据、公开 API 使用调查 | 需要真实组合成本证据，且会改变 package authoring/Definition owner。 |
| Scheduler evidence queue | 文档和独立 corpus 调查 | 若改 scheduler/runtime，按以下证据队列内部顺序串行。 |

每个 Change 仍须按自身 artifacts、测试和用户授权实施；新的 blocking policy 或公共抽象须有独立证据。

### Scheduler 证据队列

共用 Scheduler owner 的源码和 Case 写入串行，性能采样使用独占窗口。
策略队列继续前，以当前 Scheduler 数据模型与观察输入重新核对其输入和验收基线。

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

1. **日常开发与提交只在 `main` 进行。** 普通 Change 是范围与验收单位，不创建对应分支或另设合入阶段。创建、切换或使用其它分支须有用户明确授权；已有分支的存在不构成使用授权，删除或重命名也须另行授权。
2. **发布分支遵循独立发布流程。** [Package release](../tooling/package-release.md#发布工作区冻结源与交接)保留发布分支、实现工作区和 detached 冻结工作区的职责及授权要求；该例外不扩展到普通 Change。显式获准的分支按[命名规则](../decisions/use-unprefixed-project-branch-names.md)命名。
3. **写入所有权互斥。** 不让两个执行者同时修改同一 Change 目录或共享 owner；只读调查及写入范围不重叠的任务可在 `main` 工作区并行。发布冻结工作区不维护活动 Change 记录，但 `S` 的快照可以包含已提交的 Change 文件。
4. **按当前基线中的稳定提交解除依赖。** 未提交 working tree、测试结果或基线以外的提交不足以解除依赖。
5. **共享 owner 串行提交。** package、Gate、Case、lockfile 或稳定文档的交叉改动按任务隔离、复核和提交，不包含其它任务的未完成改动。
6. **先语义复核，再刷新 Plan。** Git 距离非零本身不要求机械重写 `baseCommit`；确认当前 Plan 仍成立后再运行 `plan`。
7. **每项 Change 独立验收和提交。** owner 交接、验证与任务闭合后，只有取得当前任务的明确删除授权才运行 `finalize`。
8. **前置变化后复核下游。** 上游在 `main` 更新后，下游重新确认假设并运行受影响验证。正式发布的 source/tag 与发布后修正、交接合回 `main` 的特殊顺序，以 [Package release](../tooling/package-release.md#发布工作区冻结源与交接) 为准。

## 维护与验证

当前 Change 新增、退出、stage 或 Outcome 改变，硬前置完成，条件分支激活，或实际冲突改变并行边界时更新本文：

1. 运行 `bun run change-plan -- list changes` 和 `bun run change-plan -- check-all changes`。
2. 读取发生变化的目标 artifacts，只维护当前依赖、允许工作、轨道和执行顺序；不复制动态任务计数或已完成材料。
3. 运行 `bun run validate -- materials`、`bun run decisions -- check` 和 `git diff --check`。
