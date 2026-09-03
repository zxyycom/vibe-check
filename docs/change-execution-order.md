# Change 执行依赖与 Worktree 协调

本文是同时推进多个 active Change 时的协调入口。它维护当前集成基线、跨 Change 前置关系、推荐合入顺序、
共享 owner 冲突和 worktree 使用规则，供执行者判断“现在可以推进什么”和“哪些工作可以并行”。

本文不拥有 Change 的 stage、任务状态、实施授权或恢复条件。成员与动态状态以
`bun run change-plan -- list changes` 和目标 `changes/<change>/` artifacts 为准；本文与目标 artifacts 不一致时，
先按当前事实更新本文，不得用协调摘要覆盖 Change 自身的约束。

## 使用步骤

**协调边界：**本文只安排 worktree、共享 owner 和推荐合入顺序。每个 Change 的 Outcome、唯一 owner、语义硬前置、Plan 进入条件、public/private 承诺和验收出口只由其自身 artifact 与 stable owner 决定；“推荐串行”绝不自动成为语义依赖。

每次创建或恢复 worktree 前依次执行：

1. 运行 `bun run change-plan -- list changes`，确认目标仍是 active member，并读取其 stage、任务进度和 Plan 距离。
2. 读取目标 Change 的 `proposal.md`、`design.md` 和存在时的 `tasks.md`，确认 Outcome、开放问题、Resume Conditions、
   Readiness 与本文一致。
3. 确认硬前置的实现提交已经包含在目标 worktree 的实施基线中。该基线可以是 `main`、集成分支或上游
   Change 分支的稳定提交，不要求先合入 `main`。
4. 检查同批 worktree 是否修改相同源码 owner、lockfile、Gate、Case 账本或稳定文档 owner；有重叠时默认串行合入。
5. 从选定实施基线创建一个 Change 一个分支、一个活跃实现 worktree。存在硬依赖时，下游可以直接从上游实现提交
   建立堆叠分支；上游变化后，下游同步基线并重新复核，不必等待 `main` 合并。

## 选择规则

按以下顺序选择下一项工作，不按目录名、stage 或任务数量猜测优先级：

1. 排除 Resume Conditions、开放设计问题或实施授权尚未闭合的 Change。`stage=plan` 只表示计划可交接。
2. 每条轨道只选择最早一个硬前置已进入当前实施基线的实现节点。
3. 优先并行不同 owner 的工作；共享主要 owner 的 Change 即使没有硬依赖，也按推荐顺序串行。
4. benchmark、corpus、provenance 和方案审阅可以提前，但不得依赖或写入尚未合入的短命契约。
5. 无法证明实现可以并行时，只并行证据工作，并在首次合入后重新基线化后续实现。

项目业务优先级仍由当前用户请求决定。本文只说明依赖、冲突和默认工程顺序。

## 关系定义

| 关系 | 含义 | 执行要求 |
| --- | --- | --- |
| 硬前置 | 下游契约直接依赖上游代码或语义 | 上游所需契约已实现并形成稳定提交，且该提交进入下游实施基线后，才启动下游 Implementation |
| 验收前置 | 下游可以先设计或实现，但验收需要对应能力或证据 | 验收前闭合，不得用假设替代 |
| 推荐顺序 | 没有直接语义依赖，但共享 owner 或后落地会造成明显返工 | 默认串行；只并行不重叠的证据工作 |
| 条件分支 | 只有恢复条件和实施授权成立时才进入主线 | 未激活时不占实现 worktree，也不阻塞其它 Change |
| 独立轨道 | Outcome 与主要源码 owner 不重叠 | 可以并行；合入前仍需基于最新集成分支验证 |

## 基线定义

- **协调基线**：本文最近一次审阅 active Changes 和跨 Change 关系时使用的项目提交，只用于说明判断所依据的事实。
- **实施基线**：某个 Change worktree 实际继承的提交。它可以来自 `main`、集成分支或上游 Change 分支，不要求已经
  进入 `main`。
- **稳定提交**：上游所需契约已经实现、能够被下游消费且可在 Git 中精确继承的提交。未提交 working tree、口头状态或
  另一 worktree 中不可定位的临时字节，不构成实施基线。

依赖链可以连续堆叠：下游从上游稳定提交建立分支，继续实现和验证；最终按依赖顺序合入目标主线。若上游随后修改
下游正在消费的契约，下游必须同步新的上游提交并重跑受影响验证。是否要求上游先完成验收或归档，由目标 Change
自身的 Readiness 和验收规则决定，不由“是否已进 main”代替。

## 当前协调基线

本节于 2026-09-03 按当前工作树提交 `2828a7970ad6a24fdf977dd5597feb78ccf81c0a` 与当前 active Change artifacts 审阅。该基线包含：

- `714fcd48d76416a27fe813466ef1550a25ddedf7` 中已集成的 Scheduler 依赖、策略、测量与性能诊断基础；
- `bc69ab625abeaee3c52505a31dfb2b9d8e6c7b91` 中已集成的 jscpd 与 SCC scanner 迁移；
- 后续 flag-control 接入修复、内置 Finding waiver、重复检测比较域和仓库质量扫描范围调整；
- `fa0993d78eddfb6bac351f9e0a592d7dd3c5ea2d` 中已交付并归档的 learned duration model 与 greedy
  critical-path admission，以及 central Gate adoption。

近期 flag-control 修复会影响 pre-admission Task 和 learned-duration 样本边界；质量扫描范围调整会影响旧 Gate
性能基线。`schedule-checks-from-learned-durations` 已在实施前的 Readiness 中复核这些变化并重新采集 A/B
baseline，没有沿用旧测量。

### 当前推荐批次

| 批次 | Change | 当前允许的工作 | 并行边界 |
| --- | --- | --- | --- |
| 1A：Scheduler lifecycle Plan | [`separate-duration-learning-from-admission-strategy`](../changes/separate-duration-learning-from-admission-strategy/proposal.md) | 已定义 17 项 Plan tasks，当前 **0/17 未开始**；当前只可按 Readiness 固定等价 oracle。取得实施授权并闭合其 Implementation 前置后才能执行 | 实施时独占 duration-model、task-scheduler、provider、resolved-checks 与 invocation seam；不改变算法或 public API |
| 1B：Custom lifecycle Draft | [`support-invocation-scoped-custom-admission-strategies`](../changes/support-invocation-scoped-custom-admission-strategies/proposal.md) | 调查真实 consumer、outer prepare/complete、failure/output、compatibility 与 fingerprint；不得写 runtime 或 tasks | Plan/Implementation 硬依赖 1A seam 验收；若 simulation 也被采用，推荐 simulation → custom 以复用 stable decision-time DTO，但不是语义硬依赖 |
| 1C：Admission simulation Draft | [`provide-admission-strategy-simulation`](../changes/provide-admission-strategy-simulation/proposal.md) | 调查 decision-time inspect/catalog/validator/next-boundary legality、branch transition、caller-specified settlement、compatibility、Decision alignment；Plan 前必须建立 compile/catalog/validation/branch/fanout/search 与 real static/custom/learned path 的可复现性能 baseline，不得写 runtime 或 tasks | simulation 建立 single compiled machine + pure core state/reducer + canonical effects，real shell 与 simulation facade 同源；因 task-scheduler/invocation owner 重叠，推荐在 1A 稳定提交后串行并继承基线，但不是语义硬依赖；若 custom lifecycle 也采用，推荐 simulation → custom 以避免重复定义 DTO，仍不与 1B 合并 |
| 1D：Scheduler 算法 Plan | [`optimize-learned-admission-strategy`](../changes/optimize-learned-admission-strategy/proposal.md) | 已收敛为 strict baseline 与唯一 same-layer admissible-first 候选的可证伪比较；当前按 Readiness 冻结 corpus、prediction provenance、A/B data contract 与门槛，不得在 1A seam 验收前切换生产策略 | **生产策略实施**硬依赖 1A；证据准备可先行。固定 duration prediction 输入，不与 model/statistics 优化混跑；scope unsafe-backfill witness 一旦出现 protected-delay 退化即 not-adopt；可共享 private kernel/test harness，但不得依赖 1C 的 public contract |
| 1E：规划 | [`provide-invocation-path-context`](../changes/provide-invocation-path-context/proposal.md) | 闭合只读 output facts 与 writable workspace/state owner，推进到 Plan | 可与 1A–1D 并行规划；不要同时修改 invocation runtime |
| 1F：证据 | [`cache-markdown-link-safe-facts`](../changes/cache-markdown-link-safe-facts/proposal.md) | 完成大型 corpus benchmark、安全 payload 和 limit 语义设计 | 不得假设 path-context Draft 已落地 |
| 1G：条件证据 | [`replace-lizard-with-typescript-function-analyzers`](../changes/replace-lizard-with-typescript-function-analyzers/proposal.md) | 仅在当前任务授权后重审 owner，准备 oracle、corpus、provenance 与性能证据 | 未闭合 Resume Conditions 前不修改生产 backend |

## 条件分支重新基线矩阵

下表只决定 simulation/algorithm 证据何时必须重采或重审；它不把条件分支激活前的 Change 变成硬依赖，也不改变各 Change 的 Outcome。

| 在目标 Plan/Implementation 前进入实施基线的事实 | simulation 必须重新审阅 / 重采 | algorithm 必须重新审阅 / 重采 | 不得推断 |
| --- | --- | --- | --- |
| 两者均未落地 | 以当前 relation、mutex、`maxParallel`、settlement 和 hard-guard 行为建立正式 baseline | 以当前 candidate set/capacity/settlement 形成固定比较 corpus | 条件分支将必然实现或当前 baseline 可跨事实复用 |
| 仅 fail-fast | cancellation cutoff、pending outcome、catalog reason、canonical cancellation effects、running-drain/complete boundary，以及全部受影响 simulation trace/baseline | cutoff 改变前后候选集合、进展/等待与结果归因；重采受影响 workload | fail-fast 可以只改 real shell 而不影响 core/facade 或算法证据 |
| 仅 named capacity | capacity denominator、atomic claim/release、catalog/validator reason、scope/mutex interaction、fanout/search 和 real hot path baseline | capacity contention、backfill safety、utilization/critical-chain delay与结果归因；重采受影响 workload | named capacity 只是 `maxParallel` 的别名或不影响选择合法性 |
| 两者都已落地或随后变化 | 以上两行的并集；重新确认 shared core、real shell 与 simulation facade 同 trace | 以上两行的并集；冻结新 corpus 后才比较 baseline/candidate | 可只复用旧 numeric threshold、旧 trace 或旧原因词汇 |

simulation 在切为 Plan 前必须完成表中适用的正式 baseline；algorithm 在冻结候选结果前必须完成其适用的 corpus rebaseline。custom lifecycle 只有在其 public output/failure 或 consumer DTO 实际受影响时才重审相应 compatibility matrix。

第一批完成后按以下顺序继续：

1. learned-duration Change 已提供稳定实现与 Gate adoption evidence，并在完成 Decision 对齐和 `18/18` tasks 后归档；
   归档 artifact 只保留形成时上下文，当前行为继续由 runtime、配置、API 与 Decision owner 承接。
2. 先将 duration model 与 pure admission algorithm 解耦，并以 provider 驱动的 `prepare once → private admissionPolicy.decide 0..N`、现有per-decision/terminal measurement requirement矩阵、以及仅在 existing terminal sequence/context 返回且既有terminal Hook delivery后的一次 `complete`，连同当前 trace、history bytes 与 public results 证明行为等价。只有该 lifecycle seam 验收后，后继 Change 才能依赖稳定实现。
3. custom lifecycle Draft 可提前审阅真实 consumer，但进入 Plan/Implementation 前必须继承 1A 的稳定提交；它与算法 Change
   都会消费该 seam。二者若同时修改 invocation、Scheduler adapter、公共 API 或同一 Case/document owner，默认串行合入。
4. admission simulation Draft 可服务现有 custom callback 的 lookahead，也可供未来 decide lifecycle 使用；但它不与 custom lifecycle Draft 合并，并自行建立一次 graph compile 的 private machine、pure core state/reducer 与 canonical effects，使 real shell 和 simulation facade 同源。它与 1A 因 task-scheduler/invocation owner 重叠而推荐在 1A 稳定提交后串行、继承该提交的基线；这不是语义硬依赖，1A 不实施不阻止 simulation 独立成立。算法 Change 仅可共享该 private machine/test harness，不能把 simulation public API 当作算法实施前置。进入 Plan 前还须以可复现 compile/catalog/validation/branch/fanout/search 与 real static/custom/learned path baseline 闭合性能设计，并审阅现有 Decision 对 public branchable simulator 的对齐或后继记录需要。
5. 算法 Change 在固定 prediction input 上比较 strict baseline 与候选；算法证据准备可以提前进行，但生产 strategy 切换不能越过 1A。
6. invocation path context 达到 Plan 后再实现；若只暴露 machine/diagnostic effective paths，不构成 Markdown cache 的
   硬前置。只有它明确提供 cross-run state capability 时，Markdown cache 才依赖它。
7. Markdown cache 在 benchmark 与安全 payload 证明收益后进入 Plan；其实现可以与 Lizard analyzer 的独立源码工作并行，
   但二者涉及的 package、Gate、Case 和公共文档改动必须分次合入并重新验证。
8. learned scheduler 已形成首轮诊断与 A/B evidence；只有新的真实 workload 证明独立收益时，才重新判断 fail-fast 与 named capacity 是否值得激活。若二者先实施，simulation Plan 必须复核它们对 catalog、reason、settlement 和 hard guard 的影响。
9. Node execution backend 最后独占推进，避免重复迁移测试、candidate、Gate 和性能基线。若 Windows/Bun 问题已是当前
   发布阻塞，则反转此推荐顺序：先冻结其它实现，把 Node Change 提升为唯一主线。

### Scheduler 轨道

Scheduler 的 passed dependency、terminal observation、admission policy、measurement Hook 与性能诊断基础均已归档并
进入当前基线。`schedule-checks-from-learned-durations` 已完成 Product implementation 和同 candidate、同 membership 的
交错 A/B acceptance；central Gate 已采用 learned policy，完整数据和环境边界见其
[`acceptance.md`](../changes/archive/schedule-checks-from-learned-durations/acceptance.md)。learned-history 专项 Decision 已在最终代码、
文档、测试和 Gate 验收后标记为 `active + aligned`，对应 Change 已归档。该对齐只确认长期方向已经成为当前事实；
归档 artifact 不再接受 lifecycle 写入。Scheduler 轨道当前没有第二个已授权的生产实现主线。

后续包含两个 active Plan 与两个相关 Draft：`separate-duration-learning-from-admission-strategy` 已形成行为等价的 private
provider lifecycle/owner 解耦 Plan；`support-invocation-scoped-custom-admission-strategies` 只评审公共 custom lifecycle，
其 Plan/Implementation 硬依赖前者验收；`provide-admission-strategy-simulation` 评审由 Scheduler snapshot 支持的 public catalog、per-task validator、wait/complete next-boundary legality 与 branchable select/settle simulation，并要求把一次 graph compile 的 private machine、pure core state/reducer 和 canonical effects 作为 real shell 与 simulation facade 的唯一 shared owner；进入 Plan 前还必须建立可复现的 compile/catalog/validation/branch/fanout/search 与 real static/custom/learned path baseline。它因 owner 重叠推荐继承前者稳定提交、串行实施，但不语义依赖前者，也不因前者未实施失去独立路径。`optimize-learned-admission-strategy` 只规划固定 model input 的算法比较，也以前者完成验收为生产实现前置。simulation 可服务现有及 future custom decide，但不与 lifecycle Draft 合并；算法可共享 private machine/test harness，不能依赖其 public contract。
Draft/Plan 的存在都不表示已经取得实施授权。

以下两项仍是条件分支，不与 learned scheduler 并行实现：

| Change | 恢复条件 | 激活后的复核重点 |
| --- | --- | --- |
| [`add-invocation-fail-fast-policy`](../changes/add-invocation-fail-fast-policy/proposal.md) | 真实 workload 证明收益，并闭合 trigger、pending outcome 与 observer 规则 | cutoff、terminal summary、drain boundary 和未启动 Task 结算 |
| [`add-named-resource-capacity`](../changes/add-named-resource-capacity/proposal.md) | 真实资源争用证明 `mutex` 与 `maxParallel` 不足，并闭合有限进展 | capacity denominator、atomic claims、hard-guard facts 与 interval boundary |

### Scanner 轨道

jscpd 与 SCC 迁移已经完成。`replace-lizard-with-typescript-function-analyzers` 的 Plan 基线早于当前 scanner、package、
environment 和 quality-scope 事实；实施前必须重审 27 readers、55 extensions、public options、license/provenance、
candidate 与性能证据，并取得其 Resume Conditions 要求的明确优先级授权。

[`decide-file-metrics-public-scc-expansion`](../changes/decide-file-metrics-public-scc-expansion/proposal.md) 只评审是否存在新的
consumer outcome。没有真实 consumer 时不扩张 public SCC 能力，也不占实现 worktree；它不阻塞 Lizard 迁移。

### Invocation path、Markdown cache 与 Node 轨道

- `provide-invocation-path-context` 在 Plan 前必须区分只读 Product-owned output facts、per-invocation writable workspace 与
  cross-run state。没有真实 writable consumer 时，不预置通用 path map、workspace 或 state registry。
- `cache-markdown-link-safe-facts` 可以独立完成 benchmark、invocation memo 和安全 payload 设计。machine/diagnostic output
  path 不是 cache directory；只有明确的 cross-run state owner 才形成依赖。
- `adopt-node-execution-backend` 横跨 repository scripts、Test Evidence、package/candidate、Gate、lockfile、性能和 Windows
  验收。默认等 Scheduler、scanner 和 cache 轨道稳定后独占实施；不能与其它生产 Change 共用实现批次。

### 暂停的能力方向

以下 Change 当前不进入实现批次：

- [`add-html-link-validation`](../changes/add-html-link-validation/proposal.md)：等待真实 consumer、source kinds、attributes 与 parser/corpus 证据。
- [`add-network-link-validation`](../changes/add-network-link-validation/proposal.md)：等待真实 consumer、安全输入 acquisition、显式授权和 hermetic SSRF/redirect/DNS 证据；旧 Plan 必须先重新基线化。
- [`add-secret-detection`](../changes/add-secret-detection/proposal.md)：等待 detector、license/provenance、representative corpus 和 leak-canary 证据；旧 Plan 必须先重新基线化。

## Worktree 与合入规则

1. **默认一个 active Change 一个分支。** 分支使用 `codex/<change-name>`。有硬依赖时，下游分支直接建立在上游
   稳定提交之上；分支历史包含前序 Change 是正常的，不需要为了分支名称或等待 `main` 而重建 worktree。
2. **一个 Change 一个活跃实现 worktree。** 不让两个执行者同时修改同一 Change 目录。
3. **按下游实际继承的提交解除依赖。** 上游实现提交进入下游分支祖先链即可，不要求远端或 `main` 可见；只有
   未提交 working tree、测试结果或未被下游继承的旁支提交，不足以解除依赖。
4. **共享 owner 默认串行。** 不同轨道可以并行；package、Gate、Case、lockfile 或稳定文档的交叉改动分次合入。
5. **先语义复核，再刷新 Plan。** Git 距离非零本身不要求机械重写 `baseCommit`；确认当前 Plan 仍成立后再运行 `plan`。
6. **每项 Change 独立验收、归档和提交。** 归档必须有当前任务的明确授权。
7. **堆叠分支按依赖顺序同步与合入。** 上游更新后，下游先同步并运行受影响验证；最终向目标主线合入时保持依赖
   顺序，不把下游提交先于其上游引入。

## 维护与验证

出现以下任一情况时更新本文：active Change 新增、移除或归档；Draft 进入 Plan；Outcome、Resume Conditions 或主要
owner 改变；硬前置完成；条件分支激活；实际冲突证明并行边界需要调整。

更新时：

1. 运行 `bun run change-plan -- list changes` 和 `bun run change-plan -- check-all changes`。
2. 读取发生变化的目标 artifacts，只维护当前依赖、允许工作、轨道和合入顺序；不复制动态任务计数。
3. 更新本节日期和输入提交；协调提交自身不需要作为它所审阅的输入基线。
4. 运行 `bun run validate -- docs`、`bun run decisions -- check` 和 `git diff --check`。
