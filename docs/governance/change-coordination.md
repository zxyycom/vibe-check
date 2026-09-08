# Change 执行依赖与 Worktree 协调

本文是同时推进多个当前 Change 时的协调入口。它只维护当前集成基线、跨 Change 前置关系、推荐合入顺序、共享 owner 冲突和 worktree 规则；不保存已完成 Change 的副本或形成时证据。

本文不拥有 Change 的 stage、任务状态、实施授权或恢复条件。成员与动态状态以
`bun run change-plan -- list changes` 和目标 `changes/<change>/` artifacts 为准；本文与目标 artifacts 不一致时，先按当前事实更新本文，不得用协调摘要覆盖 Change 自身的约束。

## 使用步骤

每次创建或恢复 worktree 前依次执行：

1. 运行 `bun run change-plan -- list changes`，确认目标仍是当前直接成员，并读取其 stage、任务进度和 Plan 距离。
2. 读取目标 Change 的 `proposal.md`、`design.md` 和存在时的 `tasks.md`，确认 Outcome、开放问题、Resume Conditions 与 Readiness。
3. 确认硬前置的稳定提交已经包含在目标 worktree 的实施基线中。该基线可以是 `main`、集成分支或上游 Change 分支，不要求先合入 `main`。
4. 检查同批 worktree 是否修改相同源码 owner、lockfile、Gate、Case 账本或稳定文档 owner；有重叠时默认串行合入。
5. 从选定实施基线创建一个 Change 一个分支、一个活跃实现 worktree。上游变化后，下游同步基线并重新复核。

## 当前 Change 协调

当前集合只包含 `changes/` 的直接普通目录。已完成 Change 在稳定 owner 接管、验证闭合且取得当次删除授权后通过
`complete` 退出集合；Git 历史只能在明确历史审计时提供恢复线索，不能成为当前事实、实施授权或验证输入。

| 轨道 | 当前 Change | 协调边界 |
| --- | --- | --- |
| 治理迁移 | [`migrate-governance-skill-contracts`](../../changes/migrate-governance-skill-contracts/proposal.md) | 独占修改治理 skills、记录身份、索引与治理文档；完成迁移前，其余 Change 不手工改写这些投影。 |
| Scheduler 算法 | [`optimize-learned-admission-strategy`](../../changes/optimize-learned-admission-strategy/proposal.md) | 先完成 Readiness 0.0，以当前 public prepared strategy、resource guards、history identity 与测量边界重新基线化；未满足证据 gate 和单独授权前不切换生产策略。 |
| Scheduler 条件分支 | [`add-invocation-fail-fast-policy`](../../changes/add-invocation-fail-fast-policy/proposal.md) | 仍是 Draft；只有真实 workload 证明收益并闭合 pending outcome、observer 与 drain 规则后才恢复。若先实施，会使算法 Change 的相关 corpus 和 terminal evidence 失效。 |
| Link 条件分支 | [`add-html-link-validation`](../../changes/add-html-link-validation/proposal.md) | 仍是 Draft；等待真实 consumer、source kinds、attributes 与 parser/corpus 证据，不静默扩张 Markdown Link Check。 |
| Link 条件分支 | [`add-network-link-validation`](../../changes/add-network-link-validation/proposal.md) | Plan 保持暂停；等待真实 consumer、安全输入 acquisition、显式网络授权和 hermetic SSRF/redirect/DNS 证据，恢复时必须重新 plan。 |
| Scanner 判断 | [`decide-file-metrics-public-scc-expansion`](../../changes/decide-file-metrics-public-scc-expansion/proposal.md) | 仍是 Draft；没有真实 consumer outcome 时保持 executable-only，不占生产实现 worktree。 |

### Scheduler 轨道

Scheduler 当前基线由 runtime、Architecture、API mechanics 与
[统一 Invocation 策略生命周期 Decision](../decisions/keep-invocation-lifecycle-free-of-learned-special-cases.md)承接；public simple/prepared authoring、terminal output、immutable simulation state 与 learned helper 的长期方向分别由当前 owner 和相关活动 Decisions 承接。

`optimize-learned-admission-strategy` 只能在其 tasks 0.0 完成语义重审后冻结 corpus。`add-invocation-fail-fast-policy` 若先落地或改变 candidate、terminal、drain facts，算法 Change 必须重新采集受影响 baseline、trace 与 A/B evidence。Simulation public API 不是算法实施前置；共享 private owner 时保持串行集成。

### Link 与 Scanner 轨道

HTML 与 Network Link 方向都不进入当前实现批次。前者必须先明确独立的 format-aware occurrence owner；后者必须先闭合显式授权、敏感输入、transport、SSRF、redirect、rate/resource 与 nondeterminism 边界。两者都不能从旧材料恢复实现授权。

SCC public expansion 只评审新的 consumer outcome；当前 `fileMetrics` consumer contract 与 scanner-private boundary 分别由其稳定文档 owner 持有。未来 upstream 同步、性能优化或 extension adoption 应各自建立独立 Change。

## Worktree 与合入规则

1. **默认一个当前 Change 一个分支。** 分支使用 `codex/<change-name>`；有硬依赖时，下游分支可直接建立在上游稳定提交上。
2. **一个 Change 一个活跃实现 worktree。** 不让两个执行者同时修改同一 Change 目录。
3. **按下游实际继承的提交解除依赖。** 未提交 working tree、测试结果或未被下游继承的旁支提交不足以解除依赖。
4. **共享 owner 默认串行。** package、Gate、Case、lockfile 或稳定文档的交叉改动分次合入。
5. **先语义复核，再刷新 Plan。** Git 距离非零本身不要求机械重写 `baseCommit`；确认当前 Plan 仍成立后再运行 `plan`。
6. **每项 Change 独立验收和提交。** owner 交接、验证与任务闭合后，只有取得当前任务的明确删除授权才运行 `complete`。
7. **堆叠分支按依赖顺序同步与合入。** 上游更新后，下游先同步并运行受影响验证。

## 维护与验证

当前 Change 新增、退出、stage 或 Outcome 改变，硬前置完成，条件分支激活，或实际冲突改变并行边界时更新本文：

1. 运行 `bun run change-plan -- list changes` 和 `bun run change-plan -- check-all changes`。
2. 读取发生变化的目标 artifacts，只维护当前依赖、允许工作、轨道和合入顺序；不复制动态任务计数或已完成材料。
3. 运行 `bun run validate -- docs`、`bun run decisions -- check` 和 `git diff --check`。
