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

本节于 2026-09-03 按本地集成分支提交 `9491be07bb5d12f11ee9972f1a1857837a236a29`、当前 active Change
artifacts 与 Decision 状态审阅。该提交在既有 `main` 基线上按依赖顺序包含：

- 截至 `f2ad74c5a390335fd16d63a30a2b174a066e91c8` 的 Scheduler 栈：依赖/观测、策略抽取、自定义 lifecycle、
  simulation、learned duration model、critical-path admission、选择优化与 central Gate adoption；
- 合并提交 `fad3004a2b8e2251d186d8f9d2b1350e02d13304` 中已交付并归档的 Markdown Link parse-facts cache、
  严格串行优化和单文件 JSONL packing；
- 合并提交 `1c6aca890586eb8ada3151935713739330f288e8` 中已交付并归档的 TypeScript Function Analyzer hard cut、
  Lizard 1.24.0 source alignment、私有 port、reader fast path 和 selected extensions；
- 合并提交 `9491be07bb5d12f11ee9972f1a1857837a236a29` 中已交付并归档的 Secret Detection、受限 no-follow
  input acquisition、通用 Finding waiver 接入和 Secretlint 随包材料。

以上能力已经进入同一稳定集成祖先链。下游 worktree 可以直接从该提交或其后继稳定提交建立，不需要等待它先进入
`main`；若继续使用更早的实施基线，必须先同步并重新核对目标 Change 的 Readiness 与验收证据。

### 当前推荐批次

| 批次 | Change | 当前允许的工作 | 并行边界 |
| --- | --- | --- | --- |
| 1A：私有 lifecycle 基线 | [active + aligned private lifecycle Decision](decisions/retain-private-invocation-admission-strategy-lifecycle.md) | 当前 stable baseline 是 Invocation-private provider lifecycle 与 Scheduler execution boundary；runtime、Architecture 和 API mechanics 是 current owner。形成时 archive 只保留 provenance。 | duration-model、task-scheduler、provider、resolved-checks 与 invocation 的 current owner 以 stable owner 为准；本行不授予新的 implementation 工作。 |
| 1B：Custom lifecycle 已交付 | [已归档的 `support-invocation-scoped-custom-admission-strategies`](../changes/archive/support-invocation-scoped-custom-admission-strategies/proposal.md) | 已交付并归档。现行 public simple/prepared lifecycle、terminal aggregate 与 consumer evidence 由 runtime、Architecture、API mechanics 及两个 active + aligned [authoring](decisions/adopt-invocation-scoped-custom-admission-strategy-authoring.md) / [output](decisions/extend-measurement-hook-output-to-prepared-complete.md) Decisions 承接；archive 只留形成时 provenance。 | 后续 Simulation/algorithm 若修改 project-definition、invocation、terminal delivery、RunResult output、Case 或 docs owner，默认按当前 stable contract 串行集成；Simulation 仍只独立、增量地提供 context object。 |
| 1C：Admission simulation Plan 已归档 | [已归档的 `provide-admission-strategy-simulation`](../changes/archive/provide-admission-strategy-simulation/proposal.md) | standalone 与 callback 的 immutable `AdmissionGraph` / `AdmissionState` 已在同一 private compiled machine、pure core state/reducer 与 canonical effects 上完成实施/验证；归档 Plan 只保留形成时 provenance，稳定 public contract 由 runtime、Architecture、Configuration、API mechanics 和 active + aligned [Decision](decisions/provide-immutable-admission-graph-state.md)承接。 | 已交付 custom lifecycle 仍是 stable baseline；algorithm 可复用 private core/test harness，但不依赖 simulation public contract，也不与 archived Plan 混合实现。 |
| 1D：Scheduler 算法 Plan | [`optimize-learned-admission-strategy`](../changes/optimize-learned-admission-strategy/proposal.md) | 已收敛为 strict baseline 与唯一 same-layer admissible-first 候选的可证伪比较；当前 seam 已可作为稳定基线。当前按自身 Readiness 冻结 corpus、prediction provenance、A/B data contract 与门槛；未满足本 Change 的 evidence gates 与单独授权前不得切换生产策略 | 固定 duration prediction 输入，不与 model/statistics 优化混跑；scope unsafe-backfill witness 一旦出现 protected-delay 退化即 not-adopt；可共享 private kernel/test harness，但不得依赖 1C 的 public contract |
| 1E：Invocation path 已交付 | [已归档的 `provide-invocation-path-context`](../changes/archive/provide-invocation-path-context/proposal.md) | invocation path context、owner-scoped Gate evidence 与相关 output contract 已交付并归档；稳定契约由当前 runtime、output owner 与 aligned Decisions 承接。 | 后续统一路径或新增 writable consumer 时建立独立 Change；不得从 archive 恢复实施授权。 |
| 1F：Markdown 缓存已交付 | [已归档的 `cache-markdown-link-safe-facts`](../changes/archive/cache-markdown-link-safe-facts/proposal.md) | 显式 parse-facts cache、严格串行语义、单文件 JSONL packing 与性能证据均已交付并归档 | 后续缓存演进建立独立 Change，不从 archive 恢复实施授权 |
| 1G：Lizard analyzer 已交付 | [已归档的 `replace-lizard-with-typescript-function-analyzers`](../changes/archive/replace-lizard-with-typescript-function-analyzers/proposal.md) | source-aligned hard cut、1.24.0 同步、私有 port、性能证据、reader fast path 与 selected extensions 均已交付并归档 | 后续 upstream 同步、性能优化或 extension adoption 各自建立独立 Change |

## 条件分支重新基线矩阵

下表只决定 simulation/algorithm 证据何时必须重采或重审；它不把条件分支激活前的 Change 变成硬依赖，也不改变各 Change 的 Outcome。

| 在目标 Plan/Implementation 前进入实施基线的事实 | simulation 必须重新审阅 / 重采 | algorithm 必须重新审阅 / 重采 | 不得推断 |
| --- | --- | --- | --- |
| 两者均未落地 | 以当前 relation、mutex、`maxParallel`、settlement 和 hard-guard 行为建立正式 baseline | 以当前 candidate set/capacity/settlement 形成固定比较 corpus | 条件分支将必然实现或当前 baseline 可跨事实复用 |
| 仅 fail-fast | cancellation cutoff、pending outcome、catalog reason、canonical cancellation effects、running-drain/complete boundary，以及全部受影响 simulation trace/baseline | cutoff 改变前后候选集合、进展/等待与结果归因；重采受影响 workload | fail-fast 可以只改 real shell 而不影响 core/facade 或算法证据 |
| 仅 named capacity | capacity denominator、atomic claim/release、catalog/validator reason、scope/mutex interaction、fanout/search 和 real hot path baseline | capacity contention、backfill safety、utilization/critical-chain delay与结果归因；重采受影响 workload | named capacity 只是 `maxParallel` 的别名或不影响选择合法性 |
| 两者都已落地或随后变化 | 以上两行的并集；重新确认 shared core、real shell 与 simulation facade 同 trace | 以上两行的并集；冻结新 corpus 后才比较 baseline/candidate | 可只复用旧 numeric threshold、旧 trace 或旧原因词汇 |

simulation 已在其实施基线中完成表中适用的正式 baseline；algorithm 在冻结候选结果前仍须完成其适用的 corpus rebaseline。已交付的 custom lifecycle 不依赖 simulation；只有后续 Change 的 implementation baseline 中 simulation、fail-fast 或 named-capacity 事实实际改变 current decision context、terminal owner 或 consumer DTO时，才重审相应 matrix。

Scheduler 相关 Change 的合入协调：

1. 1A 的 stable private seam 是后继 Change 的 implementation baseline；当前生命周期事实由 runtime、Architecture、API mechanics 与 private lifecycle Decision 承接。
2. 1B 已交付并归档。其形成时 artifacts 只提供 provenance；现行 public contract、terminal output 与 evidence 分别由 stable owner 和两个 active + aligned Decisions 承接，machine contract 保持既有 owner。
3. Simulation 与 algorithm Change 保持各自的 contract、evidence gate 和实施授权。Simulation 已完成自身 Plan 的 implementation/verification；后继 Change 修改 shared owner 时仍以已交付 custom lifecycle 与 current simulation contract 为 stable baseline 串行集成，Simulation 不是该 lifecycle 的语义前置。
4. admission simulation 已为当前 custom `decide` lifecycle 提供同型 lookahead，但不与已归档的 custom lifecycle Change 合并。它以一次 graph compile 的 private machine、pure core state/reducer 与 canonical effects 使 real shell 和 simulation facade 同源；稳定 public contract、consumer evidence 与 performance evidence 由各自 current owner 承接。算法 Change 仅可共享该 private machine/test harness，不能把 simulation public API 当作算法实施前置；其自身仍须闭合独立的 corpus、evidence gate 和对齐判断。
5. 算法 Change 在固定 prediction input 上比较 strict baseline 与候选；它可从包含当前 seam 的稳定提交开始，但生产 strategy 切换仍须满足算法 Change 自己的 evidence gates 与单独授权。
6. invocation path context 达到 Plan 后再实现；已归档的 Markdown cache 没有依赖该 Draft，也没有预先建立通用
   cross-run state owner。
7. Markdown cache 已完成 benchmark、安全 payload、严格串行实现与单文件 JSONL packing。后续演进必须建立独立
   Change，并重新证明与当时 invocation path、package、Gate、Case 和公共文档事实兼容。
8. learned scheduler 已形成首轮诊断与 A/B evidence；只有新的真实 workload 证明独立收益时，才重新判断 fail-fast 与 named capacity 是否值得激活。若二者先实施，任何后继 simulation Change 必须复核它们对 catalog、reason、settlement 和 hard guard 的影响。
9. Node execution backend 最后独占推进，避免重复迁移测试、candidate、Gate 和性能基线。若 Windows/Bun 问题已是当前
   发布阻塞，则反转此推荐顺序：先冻结其它实现，把 Node Change 提升为唯一主线。

### Scheduler 轨道

Scheduler 轨道的 current baseline 由 runtime、Architecture、API mechanics 与 [active + aligned private lifecycle Decision](decisions/retain-private-invocation-admission-strategy-lifecycle.md)承接。archive 与既有 Gate evidence 只提供形成时 provenance；它们不扩展当前 implementation authorization。

[已归档的 `support-invocation-scoped-custom-admission-strategies`](../changes/archive/support-invocation-scoped-custom-admission-strategies/proposal.md) 已交付 public lifecycle。现行 simple/prepared authoring、terminal output 与证据边界由 runtime、Architecture、API mechanics 以及两个 active + aligned [authoring](decisions/adopt-invocation-scoped-custom-admission-strategy-authoring.md) / [output](decisions/extend-measurement-hook-output-to-prepared-complete.md) Decisions 承接。[已归档的 `provide-admission-strategy-simulation`](../changes/archive/provide-admission-strategy-simulation/proposal.md) 保留其 implementation/verification provenance；immutable-state contract 由 current owners 和 active + aligned [simulation Decision](decisions/provide-immutable-admission-graph-state.md)承接。`optimize-learned-admission-strategy` 若与这些 owner 冲突，默认以当前 stable contract 串行集成。Simulation 和 algorithm 的 contract、evidence 与 authorization 保持独立。
Draft/Plan 的存在都不表示已经取得实施授权。

以下两项仍是条件分支，不与 learned scheduler 并行实现：

| Change | 恢复条件 | 激活后的复核重点 |
| --- | --- | --- |
| [`add-invocation-fail-fast-policy`](../changes/add-invocation-fail-fast-policy/proposal.md) | 真实 workload 证明收益，并闭合 trigger、pending outcome 与 observer 规则 | cutoff、terminal summary、drain boundary 和未启动 Task 结算 |
| [`add-named-resource-capacity`](../changes/add-named-resource-capacity/proposal.md) | 真实资源争用证明 `mutex` 与 `maxParallel` 不足，并闭合有限进展 | capacity denominator、atomic claims、hard-guard facts 与 interval boundary |

### Scanner 轨道

jscpd 与 SCC 迁移已经完成。`functionMetrics` 也已完成 source-aligned hard cut：不再使用 Python/Lizard runtime 或
public `scanner.executable`，保持 27 readers/55 suffixes，并已私有采用 `complextags` 与 nesting-depth；其余 optional
bodies 与 Halstead 继续 deferred。source-aligned port 只经私有 façade 和 Product adapter 接入，package 保留完整
provenance、notice 与许可证，explicit-only repository advisory 只提示 upstream stable release。

已归档的 1.24.0 同步、性能比较、reader-resolution 优化与 selected-extension adoption 只保存形成时证据。任何上游版本
采用、性能预算、core hotspot 调查或其它 extension body 都使用独立 Change，不得把归档结果恢复为实施授权，也不得
把 analyzer-only benchmark 外推为完整 Product regression。

[`decide-file-metrics-public-scc-expansion`](../changes/decide-file-metrics-public-scc-expansion/proposal.md) 只评审是否存在新的
consumer outcome。没有真实 consumer 时不扩张 public SCC 能力，也不占实现 worktree；它不阻塞 Lizard 迁移。

### Invocation path、Markdown cache 与 Node 轨道

- [已归档的 `provide-invocation-path-context`](../changes/archive/provide-invocation-path-context/proposal.md) 已交付只读
  invocation path facts 与 owner-scoped Gate evidence；它没有预置通用 writable path map、workspace 或 cross-run state registry。
- [已归档的 `cache-markdown-link-safe-facts`](../changes/archive/cache-markdown-link-safe-facts/proposal.md) 已交付显式
  parse-facts cache；machine/diagnostic output path 没有因此成为 cache directory，项目也没有建立通用 cross-run state owner。
- `adopt-node-execution-backend` 横跨 repository scripts、Test Evidence、package/candidate、Gate、lockfile、性能和 Windows
  验收。默认等 Scheduler、scanner 和 cache 轨道稳定后独占实施；不能与其它生产 Change 共用实现批次。

### 暂停的能力方向

以下 Change 当前不进入实现批次：

- [`add-html-link-validation`](../changes/add-html-link-validation/proposal.md)：等待真实 consumer、source kinds、attributes 与 parser/corpus 证据。
- [`add-network-link-validation`](../changes/add-network-link-validation/proposal.md)：等待真实 consumer、安全输入 acquisition、显式授权和 hermetic SSRF/redirect/DNS 证据；旧 Plan 必须先重新基线化。

### 已完成并归档

- [`add-secret-detection`](../changes/archive/add-secret-detection/proposal.md)：已完成随包、显式 file scope 与通用 Finding waiver 的 production implementation 并归档；固定 Secretlint rule/license/provenance、bounded no-follow input read、representative corpus、package/candidate、长期 Decision 与 leak-canary evidence 均已闭合，归档时 `tasks.md` 为 12/12。它不进入其它 Change 的实现批次。

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
