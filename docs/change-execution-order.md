# Change 执行依赖与 Worktree 协调

本文是同时推进多个 active Change 时的协调入口。它维护跨 Change 的硬前置、推荐合入顺序、
共享 owner 冲突和 worktree 使用规则，让执行者能够从最新主分支选择下一项工作。

本文不是 active Change 清单、任务状态或实施授权。成员、stage、任务进度和 Git 距离以
`bun run change-plan -- list changes` 及目标 `changes/<change>/` artifacts 为准；暂停原因和恢复条件
仍由目标 Change 自身拥有。

## 使用步骤

每次创建或恢复 worktree 前按以下顺序执行：

1. 运行 `bun run change-plan -- list changes`，确认目标仍是 active member，并检查 stage、任务进度和
   Plan 距离。
2. 读取目标 Change 的 `proposal.md`、`design.md` 和存在时的 `tasks.md`，确认本文中的依赖边仍符合其
   当前 Outcome、开放问题和 Readiness。
3. 确认所有硬前置已经合入当前集成分支；仅在另一 worktree 完成但尚未合入，不算前置已满足。
4. 检查同一批 worktree 的共享 owner。硬依赖已经满足仍不代表适合并行修改同一模块。
5. 从最新集成分支创建一个只负责一个 Change 的分支和 worktree。完成验收、归档与独立提交后再合入，
   然后让下游 Change 重新核对 Plan 基线。

如果本文与目标 Change artifacts 不一致，以目标 artifacts 和当前事实为准，并在继续实施前更新本文；
不得用本文覆盖目标 Change 的暂停条件、任务或验收要求。

## 选择下一项 Change

执行者应使用以下判定顺序，而不是按目录名、Plan stage 或任务数量猜测优先级：

1. 排除仍有未闭合 Resume Conditions、开放设计问题或缺少实施授权的 Change；Plan stage 本身不表示可实施。
2. 对每条轨道只选择最早一个尚未合入、且硬前置全部满足的节点。
3. 并行候选优先来自不同轨道；候选修改相同主要源码 owner、lockfile 或稳定文档 owner 时按推荐顺序串行。
4. 证据工作只有在不会写入短命中间契约时才可提前；调查完成不改变对应 Change 的 stage、授权或任务状态。
5. 无法从本文和目标 artifacts 证明可以并行时，保守按串行处理，并先更新依赖判断。

该流程的输出应是一个或多个“现在可以创建实现 worktree”的 Change ID，以及每个未选 Change 的硬前置、
暂停条件或共享 owner 冲突。它不输出项目级业务优先级；业务优先级仍由当前用户请求决定。

## 关系定义

| 关系 | 含义 | 执行要求 |
| --- | --- | --- |
| 硬前置 | 下游契约直接依赖上游形成的代码或语义 | 上游完成、归档并合入后才启动下游 Implementation |
| 验收前置 | 下游可先设计或实现，但完成验收需要对应能力或等价证据 | 在下游验收前闭合；不得以未验证假设代替 |
| 推荐顺序 | 没有直接语义依赖，但共享 owner 或后落地会造成明显返工 | 默认串行；只有拆出无重叠证据工作时才并行 |
| 条件分支 | 仅在对应 Draft 满足恢复条件并获实施授权时进入主线 | 未激活时不阻塞其它 Change |
| 独立轨道 | Outcome 与主要源码 owner 不重叠 | 可以并行，但合入前仍需基于最新集成分支验证 |

## 当前协调基线

本节于 2026-09-01 基于 Git `9c0171243136bf72888be60999b8d8e5fb1aba34` 与当次 Change 集合审阅；
`require-passed-dependencies-and-observe-outcomes`、`extract-scheduler-admission-selection-policy` 与 `expose-custom-admission-selection-policy` 已完成、归档，当前集合保留 13 个 active Change。该提交只标识
本次依赖审阅的输入，不冻结后续 Change 状态，也不证明其它 Implementation 已完成。

### Scheduler 主线

已满足的基础是
[`require-passed-dependencies-and-observe-outcomes`](../changes/archive/require-passed-dependencies-and-observe-outcomes/proposal.md)：
它已完成并归档，形成成功前置、终态观测、task-local preflight 和 blocked settlement 的当前实现基础。该 archived
proposal 只保留形成时实施语境；active 下游 Change 应以稳定 owner 文档、active Decisions 和当前源码确认最终模型，不能把它当作
当前 Plan。

已满足的私有策略基础是
[`extract-scheduler-admission-selection-policy`](../changes/archive/extract-scheduler-admission-selection-policy/proposal.md)：
它已完成并归档，记录了形成时的 private full-graph handoff、select/wait/reservation implementation 与 Scheduler guard。reservation 是该历史实现的 current-at-formation fact，不是 active 下游的目标 contract；active Change 必须以当前源码、active Decisions 与 stable owners 恢复事实，不能把 archive 当作 current Plan。

custom selector 已完成并归档：[`expose-custom-admission-selection-policy`](../changes/archive/expose-custom-admission-selection-policy/proposal.md)。其 active Decision 继续约束 custom callback 的 synchronous pure boundary；该 archived Change 不再作为 active worktree 或后续 Plan 的硬前置。

剩余 active Scheduler 主线为：

```text
add-scheduler-performance-diagnostics
  -> schedule-checks-from-learned-durations
```

[`add-scheduler-performance-diagnostics`](../changes/add-scheduler-performance-diagnostics/proposal.md) 是 learned policy 的验收前置：learned policy 验收需要它提供或同步提供 admission delay、slot utilization 和 tail 的 matching-workload 证据。performance diagnostics 当前只观察 root/scope capacity、无状态 selected/wait 与 hard-guard facts，且不建立 custom callback timing。

因此推荐剩余 active Change 合入顺序为：

```text
add-scheduler-performance-diagnostics
  -> schedule-checks-from-learned-durations
```

这两项与已归档基础共同涉及 `src/project-run/task-scheduler/**`、`src/project-run/check-execution/**`、diagnostic 和公共说明；remaining active Change 不得在多个 worktree 中同时实施。Readiness 调查可以并行，但不得各自复制候选规则、图状态或时间 owner。

### Scheduler 条件分支

| Change | 恢复条件 | 激活后的推荐位置 |
| --- | --- | --- |
| [`add-invocation-fail-fast-policy`](../changes/add-invocation-fail-fast-policy/proposal.md) | 真实 workload 证明收益，并闭合 pending outcome 与 observer 规则 | 在当前 root/scope model 的 performance diagnostics 后；激活时先重审 cutoff、terminal summary 与 drain boundary |
| [`add-named-resource-capacity`](../changes/add-named-resource-capacity/proposal.md) | 真实资源争用基线证明 mutex 与 `maxParallel` 不足，并闭合有限进展 | 在当前 root/scope model 的 performance diagnostics 后；激活时先重审 named capacity denominator、hard-guard facts 与 interval boundary |

两项仍为 Draft 时不占用实现 worktree，也不阻塞 Scheduler 主线。若任一项被激活，性能诊断必须在其合入后重新审阅 Plan；不能把新 cutoff/resource facts 静默解释为现有 wait 或 effective capacity。

### Scanner 迁移轨道

以下三项没有硬语义依赖，但都会修改 package 或工具材料、scanner 文档、Case owner、环境或 Gate。默认按
推荐顺序串行合入，避免并行维护 `package.json`、lockfile 和共享 scanner owner：

1. [`upgrade-jscpd-duplicate-detection-to-5-1-1`](../changes/upgrade-jscpd-duplicate-detection-to-5-1-1/proposal.md)
2. [`upgrade-scc-file-metrics-to-v4`](../changes/upgrade-scc-file-metrics-to-v4/proposal.md)
3. [`replace-lizard-with-typescript-function-analyzers`](../changes/replace-lizard-with-typescript-function-analyzers/proposal.md)

差分语料、provenance 和平台调查可以在独立 worktree 并行形成；实际依赖、lockfile、environment、candidate 和
文档切换必须在前一项合入后重新基线化。Lizard 迁移还受其自身 Resume Conditions 与活动长期 Decision 约束，
不能因排在本表中就推断已经获得实施优先级。当前把 jscpd 放在 SCC 前，是因为其 Plan 基线更新、目标更窄且
直接排除已知 5.1.0 wrapper/engine 错配；把 Lizard 放在最后，是因为它的 owner 迁移最宽且仍受后置方向约束。

### 可独立推进与证据轨道

| Change | 当前协调判断 |
| --- | --- |
| [`surface-generic-finding-waivers`](../changes/surface-generic-finding-waivers/proposal.md) | 文档发现路径为主；收敛为 Plan 后可与 Scheduler 或 scanner 实现并行，合入时处理 README/configuration 小范围冲突 |
| [`provide-invocation-path-context`](../changes/provide-invocation-path-context/proposal.md) | Draft；先闭合只读 output facts 与 writable workspace/state owner，不直接实施 |
| [`cache-markdown-link-safe-facts`](../changes/cache-markdown-link-safe-facts/proposal.md) | Draft；可并行完成大型 corpus benchmark 和安全 payload 设计，persistent cache 实现不得假设 path-context Draft 已落地 |

Invocation path context 与 Markdown cache 只有在前者最终提供明确的 cross-run state capability 时才形成条件依赖；
仅暴露 machine 或 diagnostic output path 不构成 cache directory。

### 暂停的能力方向

以下 Change 不进入当前实现批次；Plan stage 也不表示恢复条件或实施授权已经满足：

- [`add-html-link-validation`](../changes/add-html-link-validation/proposal.md)：等待真实 consumer、范围和 parser/corpus 证据。
- [`add-network-link-validation`](../changes/add-network-link-validation/proposal.md)：等待安全输入 acquisition、显式授权和
  SSRF/credential 边界闭合。
- [`add-secret-detection`](../changes/add-secret-detection/proposal.md)：等待 detector precision/recall、provenance、泄漏和
  resource evidence。

## Worktree 与合入规则

1. **一个 Change 一个分支。** 分支使用 `codex/<change-name>`；同一分支不混入另一个 Change 的实现或归档。
2. **一个 Change 一个活跃实现 worktree。** 不让两个执行者同时修改同一 Change 目录；Readiness 调查的外部临时材料
   不得冒充已合入实现。
3. **依赖按“已合入”判断。** 上游 worktree 测试通过或存在本地提交都不足以解除下游硬前置。
4. **共享 owner 默认串行。** Scheduler 主线和 scanner 迁移分别在自己的轨道内串行；不同轨道才是优先并行单位。
5. **下游重新基线化。** 上游合入后，下游先语义复核当前 Plan；需要刷新 `baseCommit` 时再运行
   `bun run change-plan -- plan changes/<change>`，不能仅因 Git 距离非零机械刷新。
6. **完成后独立归档提交。** 每项 Change 在成功标准、稳定 owner 和验证闭合后，取得归档授权并归档；归档与该项最终
   实现作为可独立审阅的提交交付。
7. **集成后再启动下一项。** 合入后运行 Change、Decision 和目标验证入口；下一个硬依赖 worktree 从该集成结果开始。

## 维护与验证

出现以下任一情况时更新本文：新增、移除或归档 Change；某项 Draft 进入 Plan；Outcome 或受影响 owner 改变；
硬前置完成；条件分支被激活；实际冲突证明推荐轨道需要调整。

更新流程：

1. 运行 `bun run change-plan -- list changes` 和 `bun run change-plan -- check-all changes`。
2. 读取所有发生变化的目标 artifacts，只更新受影响的依赖边、轨道和协调说明。
3. 更新“当前协调基线”的日期和 Git 输入提交；不要复制任务完成数或 Plan 距离等 CLI 动态输出。
4. 运行 `bun run validate -- docs`、`bun run decisions -- check` 和 `git diff --check`。
