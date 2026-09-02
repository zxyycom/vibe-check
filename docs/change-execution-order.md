# Change 执行依赖与 Worktree 协调

本文是同时推进多个 active Change 时的协调入口。它维护跨 Change 的硬前置、推荐合入顺序、
共享 owner 冲突和 worktree 使用规则，让执行者能够从当前已确认的集成基线选择下一项工作。

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
5. 从最新集成基线创建一个只负责一个 Change 的分支和 worktree。完成验收、归档与独立提交后再合入，
   然后让下游 Change 重新核对 Plan 基线。若当前协调基线已明确指定连续堆叠分支，则该分支就是本轮下游的
   集成基线；不得为了形式上回到 `main` 而重建 worktree 或丢弃已验收的前序结果。

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

本节于 2026-09-02 按主线集成提交 `714fcd48d76416a27fe813466ef1550a25ddedf7` 审阅；该提交已经包含
scanner 集成提交 `bc69ab625abeaee3c52505a31dfb2b9d8e6c7b91`，以及此前位于
`82da7ac6ec0bf29fe9cd95c56dc962a67758d0b4` 的 Scheduler 连续成果。下列“已完成”只表示对应实现与
Change archive 已进入该主线基线；当前 active 成员、stage、任务和 Git 距离仍以 `change-plan` 查询为准。

### Scheduler 主线

以下基础均已完成并归档：

1. [`require-passed-dependencies-and-observe-outcomes`](../changes/archive/require-passed-dependencies-and-observe-outcomes/proposal.md)：形成 passed prerequisite、terminal observation、task-local preflight 与 blocked settlement。
2. [`extract-scheduler-admission-selection-policy`](../changes/archive/extract-scheduler-admission-selection-policy/proposal.md)：把候选选择从 Scheduler 状态机中分离，同时保留 hard guard。
3. [`expose-custom-admission-selection-policy`](../changes/archive/expose-custom-admission-selection-policy/proposal.md)：公开受约束的 synchronous `select | wait` callback。
4. [`add-scheduler-performance-diagnostics`](../changes/archive/add-scheduler-performance-diagnostics/proposal.md) 与 [`extend-scheduler-pressure-and-tail-diagnostics`](../changes/archive/extend-scheduler-pressure-and-tail-diagnostics/proposal.md)：形成 invocation-local 性能汇总、压力分解和 tail facts。
5. [`add-scheduler-measurement-hooks`](../changes/archive/add-scheduler-measurement-hooks/proposal.md) 与 [`provide-decision-boundary-admission-measurement`](../changes/archive/provide-decision-boundary-admission-measurement/proposal.md)：把 terminal raw measurement 和 captured-prefix action observation 交给受约束 Hook / custom policy context。

当前 Scheduler 主线只剩：

```text
schedule-checks-from-learned-durations
```

该 Change 的 Plan 基线已经刷新为上述 `714fcd4` 集成提交，可以从自身 Readiness 开始；它仍需建立 priority/history 后继
Decision、保存 static A/B baseline，并确认 fail-fast 与 named resource 两个 Draft 没有被误当作已经落地的 hard guard。
它继续独占 `src/project-run/task-scheduler/**`、`src/project-run/check-execution/**`、diagnostic 与相关公共说明；不要与
Scheduler 条件分支在不同 worktree 同时实施。

### Scheduler 条件分支

| Change | 恢复条件 | 激活后的推荐位置 |
| --- | --- | --- |
| [`add-invocation-fail-fast-policy`](../changes/add-invocation-fail-fast-policy/proposal.md) | 真实 workload 证明收益，并闭合 pending outcome 与 observer 规则 | 在当前 root/scope model 的 performance diagnostics 后；激活时先重审 cutoff、terminal summary 与 drain boundary |
| [`add-named-resource-capacity`](../changes/add-named-resource-capacity/proposal.md) | 真实资源争用基线证明 mutex 与 `maxParallel` 不足，并闭合有限进展 | 在当前 root/scope model 的 performance diagnostics 后；激活时先重审 named capacity denominator、hard-guard facts 与 interval boundary |

两项仍为 Draft 时不占用实现 worktree，也不阻塞 Scheduler 主线。若任一项被激活，性能诊断必须在其合入后重新审阅 Plan；不能把新 cutoff/resource facts 静默解释为现有 wait 或 effective capacity。

### Scanner 迁移轨道

[`upgrade-jscpd-duplicate-detection-to-5-1-1`](../changes/archive/upgrade-jscpd-duplicate-detection-to-5-1-1/proposal.md)
与 [`upgrade-scc-file-metrics-to-v4`](../changes/archive/upgrade-scc-file-metrics-to-v4/proposal.md) 已归档并合入当前主线。
scanner migration 当前只剩
[`replace-lizard-with-typescript-function-analyzers`](../changes/replace-lizard-with-typescript-function-analyzers/proposal.md)；它必须先按
当前 jscpd/SCC、package candidate、environment 和 lockfile 事实重审旧 Plan 基线，再决定是否满足自身 Resume Conditions。

[`decide-file-metrics-public-scc-expansion`](../changes/decide-file-metrics-public-scc-expansion/proposal.md) 是独立 Draft，只判断
SCC v4 是否值得扩张公共能力；它不改变当前 executable-only runtime，不阻塞 Lizard，也不授权实现。

### 可独立推进与证据轨道

| Change | 当前协调判断 |
| --- | --- |
| [`surface-generic-finding-waivers`](../changes/surface-generic-finding-waivers/proposal.md) | 文档发现路径为主；收敛为 Plan 后可与 Scheduler 或 scanner 实现并行，合入时处理 README/configuration 小范围冲突 |
| [`provide-invocation-path-context`](../changes/provide-invocation-path-context/proposal.md) | Draft；先闭合只读 output facts 与 writable workspace/state owner，不直接实施 |
| [`cache-markdown-link-safe-facts`](../changes/cache-markdown-link-safe-facts/proposal.md) | Draft；可并行完成大型 corpus benchmark 和安全 payload 设计，persistent cache 实现不得假设 path-context Draft 已落地 |
| [`adopt-node-execution-backend`](../changes/adopt-node-execution-backend/proposal.md) | Draft；先闭合 runtime Decision、Bun launcher、package candidate、Windows 与 Test Evidence 边界；其 package/runtime owner 较宽，形成 Plan 后必须重新检查与 scanner 或 Scheduler worktree 的共享文件 |

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

1. **默认一个 active Change 一个分支。** 分支使用 `codex/<change-name>`；已明确作为当前集成基线的连续堆叠分支可以
   保留已验收、已归档的前序 Change。此时分支名只标识起始 Change，不要求为了名称或 `main` 重新建立下游 worktree。
2. **一个 Change 一个活跃实现 worktree。** 不让两个执行者同时修改同一 Change 目录；Readiness 调查的外部临时材料
   不得冒充已合入实现。
3. **依赖按“已进入当前集成基线”判断。** 默认是合入目标集成分支；当前协调基线明确指定连续堆叠分支时，也可以是该
   分支中已验收、已归档的前序结果。上游 worktree 测试通过或单独存在本地提交都不足以解除下游硬前置。
4. **共享 owner 默认串行。** Scheduler 主线和 scanner 迁移分别在自己的轨道内串行；不同轨道才是优先并行单位。
5. **下游重新基线化。** 上游进入当前集成基线后，下游先语义复核当前 Plan；需要刷新 `baseCommit` 时再运行
   `bun run change-plan -- plan changes/<change>`，不能仅因 Git 距离非零机械刷新。
6. **完成后独立归档提交。** 每项 Change 在成功标准、稳定 owner 和验证闭合后，取得归档授权并归档；归档与该项最终
   实现作为可独立审阅的提交交付。
7. **集成后再启动下一项。** 合入或按本文明确进入连续堆叠基线后，运行 Change、Decision 和目标验证入口；下一个
   硬依赖 worktree 从该集成结果开始。

## 维护与验证

出现以下任一情况时更新本文：新增、移除或归档 Change；某项 Draft 进入 Plan；Outcome 或受影响 owner 改变；
硬前置完成；条件分支被激活；实际冲突证明推荐轨道需要调整。

更新流程：

1. 运行 `bun run change-plan -- list changes` 和 `bun run change-plan -- check-all changes`。
2. 读取所有发生变化的目标 artifacts，只更新受影响的依赖边、轨道和协调说明。
3. 更新“当前协调基线”的日期和 Git 输入提交；不要复制任务完成数或 Plan 距离等 CLI 动态输出。
4. 运行 `bun run validate -- docs`、`bun run decisions -- check` 和 `git diff --check`。
