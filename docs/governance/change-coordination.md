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
| 1 | [`batch-file-metrics-scc-exact-input`](../../changes/batch-file-metrics-scc-exact-input/proposal.md) | 先收敛 command-line 与累计资源预算，再修复已有 Windows SCC exact-input transport 故障；它直接消费已批准路径，与 invocation-wide project-file batching 独立。 |
| 2 | [`refine-quiet-pass-progress-presentation`](../../changes/refine-quiet-pass-progress-presentation/proposal.md) | 固定 public grammar、`visibility` 兼容路径和计数文案，在后续 Definition grammar 扩张前完成这项窄行为。 |
| 3 | [`add-project-change-flags`](../../changes/add-project-change-flags/proposal.md) | 固定 change source、expression、unknown 语义与 preparation lifecycle，产出可复用的 effective Check selection。 |
| 4 | [`batch-declared-project-file-inputs`](../../changes/batch-declared-project-file-inputs/proposal.md) | 以前一项的 effective selection 为输入，在 Check author work 前建立 project-file input barrier；保持 change semantics 由其上游 owner 定义。 |
| 5 | [`add-markdown-lint-check`](../../changes/add-markdown-lint-check/proposal.md) | 在标准 file-input 路径稳定后交付无 persistent cache 的 Markdown lint Check，并冻结 rule、adapter、Finding 与资源边界。 |
| 6 | [`add-public-command-check`](../../changes/add-public-command-check/proposal.md) | 分别固定 result projection、output、environment 和 resource defaults，交付独立的 command Check 语义。 |
| 7 | [`design-markdown-check-caching`](../../changes/design-markdown-check-caching/proposal.md) | 依据已冻结的 Markdown lint contract 和 workload 数据作出 cache adopt 或 not-adopt 决定；key matrix 与 storage spike 可提前准备。 |
| 8 | [`add-composable-feature-config-packages`](../../changes/add-composable-feature-config-packages/proposal.md) | 以已交付的 feature families、字段 owner 和真实 Gate 构建路径固定 fragment grammar、冲突规则与 Gate projection。 |

[`add-project-gate-building-guide`](../../changes/add-project-gate-building-guide/proposal.md) 作为独立文档线现在即可推进。
它只使用实施时已验证的 Current API，并在序位 8 形成 Plan 前完成，以真实构建路径检验配置组合需求。
若它与主队列共享 README、package document registry、examples 或 installed-consumer 材料，则与对应主队列
提交串行合入。

主队列包含三条硬前置：

1. Project change preparation 先形成 effective Check selection，project-file input barrier 再消费该结果。
2. Markdown lint contract 先冻结，cache Change 再作采用判断。
3. 已交付 feature families 与 Gate building guide 先提供真实组合场景，config package Change 再固定公共抽象。

### Scheduler 证据队列

Scheduler 的当前行为由 runtime、Architecture、API mechanics、
[统一 Invocation 策略生命周期 Decision](../decisions/keep-invocation-lifecycle-free-of-learned-special-cases.md)
和[虚拟评估 Decision](../decisions/evaluate-admission-heuristics-with-seeded-virtual-workloads.md)承接。以下队列只协调
当前 Change 的证据顺序：

1. [`add-scheduler-performance-reference`](../../changes/add-scheduler-performance-reference/proposal.md) 现在可以完成
   consumer 价值、measurement sufficiency 与命名门禁。
2. [`adapt-admission-optimization-to-effective-opportunity`](../../changes/adapt-admission-optimization-to-effective-opportunity/proposal.md)
   在 `add-project-change-flags` 固定 effective selection 后，建立分层 workload、opportunity facts、算法成本和
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
