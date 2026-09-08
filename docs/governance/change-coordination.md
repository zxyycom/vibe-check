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

下表只列存在跨 Change 约束的轨道，不是完整成员或状态清单；完整当前集合由 `bun run change-plan -- list changes` 查询。
已完成 Change 在 owner 接管、验证闭合且获当次删除授权后通过 `complete` 退出；历史仅在明确审计时提供线索。

| 轨道 | 当前 Change | 协调边界 |
| --- | --- | --- |
| Scheduler 简单优化 | [`redesign-learned-admission-heuristic`](../../changes/redesign-learned-admission-heuristic/proposal.md) | 继承稳定平台和资源输入，先跑基线与解释反例，再形成有限候选、比较并交接采用/不采用；不提前确定最终算法。 |
| Scheduler 旧比较方案 | [`optimize-learned-admission-strategy`](../../changes/optimize-learned-admission-strategy/proposal.md) | 继续暂停，不作为新算法 Change 的依赖或并行实施入口；保留其原有恢复门禁，不继承旧 private baseline 或采用结论。 |
| 0.0.2 发布 | [`release-0-0-2`](../../changes/release-0-0-2/proposal.md) | 继承 Gate 配置与平台基线，等待算法稳定提交后再冻结正式包；算法不采用时完成证据收尾与稳定提交即可解除该项前置。可先审核升级差异，正式准备、验收与授权发布串行执行。 |
| Scheduler 条件分支 | [`add-invocation-fail-fast-policy`](../../changes/add-invocation-fail-fast-policy/proposal.md) | 只有真实 workload 证明收益并闭合 pending outcome、observer 与 drain 规则后才恢复。若先实施，会使算法 Change 的相关 corpus 和 terminal evidence 失效。 |
| Link 条件分支 | [`add-html-link-validation`](../../changes/add-html-link-validation/proposal.md) | 等待真实 consumer、source kinds、attributes 与 parser/corpus 证据，不静默扩张 Markdown Link Check。 |
| Link 条件分支 | [`add-network-link-validation`](../../changes/add-network-link-validation/proposal.md) | 恢复前等待真实 consumer、安全输入 acquisition、显式网络授权和 hermetic SSRF/redirect/DNS 证据，恢复时必须重新 plan。 |
| Scanner 判断 | [`decide-file-metrics-public-scc-expansion`](../../changes/decide-file-metrics-public-scc-expansion/proposal.md) | 没有真实 consumer outcome 时保持 executable-only，不占生产实现 worktree。 |

### Scheduler 轨道

Scheduler 的稳定行为仍由 runtime、Architecture、API mechanics 与
[统一 Invocation 策略生命周期 Decision](../decisions/keep-invocation-lifecycle-free-of-learned-special-cases.md)承接；跨 Change 的虚拟评估方向由[以可复现虚拟负载为主评估准入启发式](../decisions/evaluate-admission-heuristics-with-seeded-virtual-workloads.md)承接。Change artifacts 只保存各自当前实施边界。

资源输入由 [Gate 配置 owner](../tooling/project-gate.md#并发与优先级)维护，基线提交为 `b30477b6`；[虚拟平台 owner](../tooling/workspace.md#virtual-admission-workbench) 的基线提交为 `f7e9f353`。算法实验继承这两个稳定输入，先形成基线再设计候选，不预定采用结论。

[Gate 时长调查](../investigations/calibrate-gate-duration-variation.md)保存形成时的经验范围与后续建议，不是当前资源配置的实测门禁。资源分类由 Gate owner 承接，profile、竞争模型与证据接口由 [Workspace workbench owner](../tooling/workspace.md#virtual-admission-workbench) 承接，比较和停止流程由算法 design 承接。资源变化只使对应 Gate 场景重新验收，不反向改变通用模拟模型或候选采用标准。

[`optimize-learned-admission-strategy`](../../changes/optimize-learned-admission-strategy/proposal.md)继续暂停，不作为新轨道依赖或并行 helper 修改入口；未来恢复仍须其原有 Readiness 与新的范围确认。`add-invocation-fail-fast-policy` 若先改变 candidate、terminal 或 drain facts，须使受影响 baseline、trace 和比较证据重新有效。

[`release-0-0-2`](../../changes/release-0-0-2/proposal.md)继承 Gate 配置与平台基线，等待算法的 owner 交接和稳定提交；算法不采用时完成证据收尾与稳定提交即可解除该项前置，发布与外部写入仍需独立授权。发布可先审查升级差异，但 package、Gate 和用户材料 owner 的正式冻结/验收须串行继承上游结果。

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
