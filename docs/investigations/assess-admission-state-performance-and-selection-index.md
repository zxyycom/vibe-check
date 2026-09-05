---
title: "Admission state 性能与单一 selection index 评估"
formedAt: "2026-09-03T11:15:08+00:00"
question: "当前 immutable AdmissionGraph/AdmissionState 的实际性能与复杂度如何，单一 selection index 和逐条件筛选能否成为下一轮优化的核心？"
tags:
  - "admission-scheduling"
  - "performance"
  - "scheduler"
  - "simulation"
relations: []
---

## 形成时背景

本报告保存 `2026-09-03T11:15:08+00:00` 时对 Admission state 性能的调查认识，供后续性能 Change
恢复问题、证据强度、候选方向与验证缺口。它不是实施授权、性能预算、public contract 或长期技术决定：
当前行为由源码、测试和稳定行为文档 owner 承接；本报告的 Markdown 是本轮调查认识的语义 owner，
`investigation-index.json` 只是它的派生发现索引。

历史 Change `provide-admission-strategy-simulation` 已交付并归档。它引入 private parent+delta state，
让 standalone `AdmissionGraph`、callback-bound `AdmissionState` 和真实 Scheduler 共用 legality、transition、
forced-block 与 effect 语义，同时让 successor 保留 predecessor reference 而不复制完整动态状态。该归档 Change
提供本轮的形成时 benchmark 材料；它不是当前实现或下一轮优化方案的 owner。

形成时的性能问题来自两个已观察到的事实：完整 Scheduler real-run 相对实施前同机记录变慢，以及当前实现会在
state 查询、candidate 枚举、capacity/mutex/scope 判断和 forced-block closure 中重复扫描 graph 或 delta chain。
用户提出一个待评估的方向：同一 immutable state 边界只形成一份 selection legality 事实，list、单项校验和
`select` 从该事实投影；条件按既有 primary rejection reason 优先级逐层筛掉失败 Task，避免继续执行不会影响
结果的后续判断。

## 调查目的

本轮回答以下问题，并明确回答的强度：

1. 当前证据是否足以把 admission mechanism 作为下一轮性能调查的候选重点；不是据此建立跨主机预算或归因到
   某一个函数。
2. 当前公开操作、Scheduler candidate path、settlement 与 graph compile 的时间和空间增长由哪些变量决定；哪些
   只是保守静态上界，哪些尚未通过 scaling curve 实测。
3. 单一 private semantic selection index 与逐条件筛选是否能在 immutable state、primary rejection reason、
   synchronous custom callback 的最终 hard revalidation，以及 Scheduler owner 边界内实现；不是选择其具体数据结构。
4. 下一轮性能 Change 需要先测什么、如何比较前后、必须保留哪些正确性边界，以及什么结果会使本轮推断需要复查。

本轮不选择 parent+delta compaction、persistent map、dense chunked COW、cache lifetime 或数值预算；这些都是
后续 profile 和代表性 workload 取得后才可作出的实现或长期判断。

## 调查范围与依据

### 形成时快照、owner 与材料作用

调查以当前实现 commit `ff9b40bc7b650c224a3462048fa7692af93d5957` 为时点。下表区分形成时材料与它能支持的
结论，避免把历史 benchmark、correctness 验收和当前源码混作同一种证据。

| 材料 | 在本报告中的作用 | 能支持 / 不能支持 |
| --- | --- | --- |
| [归档 benchmark summary](../../changes/archive/provide-admission-strategy-simulation/readiness/admission-state-benchmark.summary.md)、相邻 [raw evidence](../../changes/archive/provide-admission-strategy-simulation/readiness/admission-state-benchmark.raw.json) 与 [manifest](../../changes/archive/provide-admission-strategy-simulation/readiness/admission-state-benchmark.manifest.json) | 当前量级、batch shape、fixture、host 与测量限制的形成时证据 | 支持同一记录内的 p50/p95 和 workload 描述；不把 `heapUsed` proxy 当 allocation/retained-object 计数，不证明函数级因果。 |
| Plan 基线 commit `bc93fe0ca7cbcd310cf187a2a2c2076b57eb6e13` 的同一 benchmark `pre-implementation real-shell` rows | 同机、同 fixture/seed/batch-shape 的 before signal | 支持回退调查信号；两次采集时间不同，不能充当跨环境预算或将差异完全归因于 admission state。 |
| 形成时的 `src/project-run/task-scheduler/admission-core.ts`、[`graph-validation.ts`](../../src/project-run/task-scheduler/graph-validation.ts)、[`scheduler.ts`](../../src/project-run/task-scheduler/scheduler.ts) 与 [`execution-state.ts`](../../src/project-run/task-scheduler/execution-state.ts) | 形成时的 selection、state、settlement、compile 和 Scheduler owner 分析 | 支持本文的静态控制流与渐近推导；不替代新的 profile 或多规模测量。 |
| [归档 tasks 的 Verification 2.1–2.5](../../changes/archive/provide-admission-strategy-simulation/tasks.md#verification) | 形成时 correctness 与 Gate 验证已完成的记录；Gate process entry 由 `scripts/project/gate/run.ts` 拥有。 | 支持把它们视为行为验收，而非本轮的性能材料；不能证明没有 numeric performance regression，因为 Gate 没有该 budget。 |

Benchmark 命令为 `bun changes/provide-admission-strategy-simulation/readiness/admission-state-benchmark.ts`。形成时环境为
Bun `1.3.14`、Linux WSL2、AMD Ryzen AI 7 H 450，固定 seed `20260903`、5 个 warmup sample 与 17 个
measured sample。real path 是 96-Task acyclic mixed-relation graph、root capacity 8；implementation path 是
256-Task、16-Task layer 的 deterministic DAG、root capacity 8。除特别注明的 fanout 与 retained-branch row 外，
不要把其中任一 workload 当成一般生产分布。

### 计量口径与复杂度符号

summary 的 `wall p50/p95 ms` 都是**一个 sample 内全部 iterations 的 batch 时间分位数**。本文表中的“派生每次”
等于相应 batch p50 或 p95 除以该 row 的固定 `iterations/sample`；它方便比较固定 batch shape，**不是**单个操作的
p50 或 p95，也不表示各操作分布已经独立采样。前后比较必须保留 command、fixture、seed、iterations/sample、
warmup/measured samples、runtime 和 host 假设。

下列符号只用于本报告的静态上界；没有任何一个指数已经由 scaling curve 拟合：

| 符号 | 含义 |
| --- | --- |
| `T` | Task 总数。 |
| `E` | `dependsOn` 与 `observes` relation edge 总数。 |
| `M` | 全 graph 的 Task–mutex membership 总数；单次 `Array.includes` 的 membership 扫描不能假定为 `O(1)`。 |
| `S` | scope 总数。 |
| `P` | 当前 pending Task 数。 |
| `V` | 当前 relation/mutex 均未阻塞、因此还会进入 capacity 判断的 pending Task 数，`V ≤ P`。 |
| `D` | 当前 parent+delta chain 深度。 |
| `B` | 一次 settlement 的 forced-block closure 中新增的 blocked Task 数。 |
| `r` / `m` | 一次分析中任一被检查 Task 的 relation edge 数 / mutex 数上界；两者可随 `T` 增长，不能默认为常数。 |

空间方面，普通 successor 只新增一个 delta node；一次含 `B` 个 forced block 的 transition 新增 `O(B)` nodes。
单条被保留的 state history 以 `D` 增长；跨 branch 保留的总量取决于所有实际保留的 distinct successor nodes。
现有 retained-heap row 只能证明实验保留了多少 branch，不能给出每个 state 的字节数或缓存预算。

## 调查结果与边界

### 已确认事实：real-run 有同机回退信号，但没有性能预算

下表保留 raw batch 数值、固定除数与派生值，消除 batch 与每次操作的混淆。`baseline p95/次` 只用于检验下一句的
“当前 p50 高于 baseline p95”；它同样是 batch p95 除以 4 的派生值。

| 路径 | baseline batch p50 / 4 → 派生 p50/次 | baseline p95/次 | 当前 batch p50 / 4 → 派生 p50/次 | 同机 p50 变化 |
| --- | --- | ---: | --- | ---: |
| static | `86.677 ms / 4` → `21.7 ms` | `23.1 ms` | `147.661 ms / 4` → `36.9 ms` | `+70%` |
| custom（callback 不读 public state） | `166.631 ms / 4` → `41.7 ms` | `45.6 ms` | `353.913 ms / 4` → `88.5 ms` | `+112%` |
| learned | `91.445 ms / 4` → `22.9 ms` | `25.1 ms` | `144.814 ms / 4` → `36.2 ms` | `+58%` |
| graph compile | `12.429 ms / 64` → `0.194 ms` | `0.225 ms` | `12.169 ms / 64` → `0.190 ms` | `-2%` |

三条 real-run 的当前派生 p50 都高于对应 baseline 派生 p95，而 graph compile 基本持平。这足以把 admission
mechanism 标为需要 isolate/profile 的回退信号；不同时间采样仍留下 runtime、host load 与其它同时变化因素，故不能
据此声称已找到 bottleneck、已证明因果，或建立可阻断的数值 budget。

### 已确认事实：public state target-operation 的形成时量级与覆盖空洞

下表仅列 implementation-parent-delta row。`depth-16` 是先完成 8 对 `select + settle` 的预建 immutable state；
所谓 `warm` 表示复用该 state，当前实现没有 catalog cache。所有数字继续遵守“batch quantile ÷ 固定 iterations”
口径。

| 操作与 fixture | batch p50 / n → 派生 p50/次 | batch p95 / n → 派生 p95/次 | 已计入 / 未计入 |
| --- | --- | --- | --- |
| `inspection`，预建 depth-16 state | `1.695 ms / 64` → `26.5 μs` | `3.194 ms / 64` → `49.9 μs` | 只读 projection；不含构造 state。 |
| initial-state `catalog` | `2.221 ms / 8` → `278 μs` | `4.657 ms / 8` → `582 μs` | 每次从 initial state 投影 catalog。 |
| depth-16 `catalog` | `2.631 ms / 8` → `329 μs` | `4.428 ms / 8` → `554 μs` | 复用 state，但不复用 catalog DTO。 |
| depth-16 `validateSelection` | `6.031 ms / 512` → `11.8 μs` | `9.460 ms / 512` → `18.5 μs` | 对预建 state 的 selectable Task 循环校验。 |
| 同一 initial predecessor 的 branch | `4.804 ms / 512` → `9.4 μs` | `6.102 ms / 512` → `11.9 μs` | successor 共享 predecessor。 |
| 连续 `select + settle` | `41.462 ms / 64` → `648 μs` | `47.298 ms / 64` → `739 μs` | 64 对连续执行，chain depth 继续增长。 |
| 8 对 fixed-depth state setup | `189.397 ms / 64` → `2.96 ms` | `204.552 ms / 64` → `3.20 ms` | 包含为选取 Task 而读取的 catalog。 |
| post-fanout `catalog + validateSelection` | `8.399 ms / 64` → `131 μs` | `10.538 ms / 64` → `165 μs` | 复用已完成 root-unsatisfied settlement 且已有 255 个 forced block 的 state。 |

`high-fanout` 没有计时触发这 255 个 forced block 的 settlement，因而不能量化 fanout transition 成本。255 个
retained DFS branch 的 implementation `heapUsed` observation 为约 `151 KB`，BFS 为负值；该 process-wide、
GC-dependent proxy 的冲突只说明噪声足以否定字节级结论，不能用来承诺 branch/state 的内存占用。

### 已确认事实：当前代码的成本来源与适用复杂度

`taskStatusFor` 沿 parent chain 找最近状态，最坏 `O(D)`；当前没有 bounded compaction、persistent status index 或
memo。`isCoreComplete` 与 `runningCount` 都扫描全部 Task 并调用它。`isMutexHeld` 对每个目标 mutex 再扫描 graph；
scope lifecycle 会沿 chain 查询状态，`scopeCapacityBlockerFor` 还会筛选、排序 active scope。这些实现事实说明
parent+delta 的低 successor-copy 成本不等于 selection 为 `O(1)`。

令 `Q_select` 表示一次 pending Task 的完整选择校验。包含 state-complete、relation、mutex、running-count 和 scope
处理后，保守静态写法是：

```text
Q_select = O((T + r + S)D + m(M + TD) + S log S)
```

这是上界而非实测曲线：`r`、`m`、`M`、`S` 是否有界会改变结果。稀疏 relation、`M=O(T)`、常数 `r/m`、简单或无
scope 的场景可近似为 `O(TD)`；若 `m = Θ(T)`，即使 `M=O(T)`，mutex scan 已可使单项检查达到 `O(T²D)`；密集
mutex membership 还会更高。`select` 在 validation 后只新增一个普通
delta node（`O(1)`），故总成本仍由 validation 主导；它不能仅凭 immutable successor allocation 被描述为 `O(1)`。

当前 operation 的更完整上界如下。这里的 `catalog` / candidate / inspection 复杂度不含最终 public DTO 或 reason payload
的输出字节，后者至少还需要线性写出所返回的成员。

| 路径 | 形成时实现模式 | 条件化静态上界与解释 |
| --- | --- | --- |
| Scheduler candidates | 遍历 `T` 个 Task；`P` 个 pending 做 relation/mutex 检查，`V` 个继续做 capacity。 | `O(TD + P(rD + m(M + TD)) + V(TD + SD + S log S))`。capacity 不是一次全局结果，而会被每个 viable candidate 重算。 |
| `catalog` | public-order 遍历后，对每个 pending 执行完整 selection。 | `O(TD + P · Q_select)`，外加 `O(P)` 及 rejection payload 的序列化。`P,D = Θ(T)` 且 `r/m/S` 有界时已可达 `O(T³)`。 |
| `inspection` | 先投影 Task/status，再以 `some` 查找 selectable pending Task。 | 最好在早期命中；最坏再检查至多 `P` 个 Task，故为 `O(TD + P · Q_select)`。 |
| forced-block closure | 每次寻找下一个 blocked Task 都从 graph 末尾扫描 pending Task 和其 dependencies。 | 若 closure 新增 `B` 个 block，保守为 `O((B + 1)(T + E)(D + B))`；每新增 node 使后续 status lookup 更深。稀疏 `E=O(T)` 且 `B,D=O(T)` 时可接近 `O(T³)`；dense graph 更高。 |
| graph compile / validation | normalisation、map、cycle check、public-ID sort，随后每个 scoped Task 都可能从 terminal 做 relation traversal。 | 无 scope reachability 重复时通常 `O(T + E + T log T)`；当前 scope terminal reachability 最坏 `O(T(T + E))`。 |

完整 sparse Scheduler Run 的 `O(T³)` 只是在每个 boundary 的 candidate/selection 工作可收敛为 `O(TD)`、且
`D=O(T)` 的**条件化**推断，不能作为全局上界。现有 `admissionCandidatesForCore` 对每个 `V` 重算 capacity：当
`P,V,D = Θ(T)`，即使 `r`、`m`、`S` 有界，一个 candidate boundary 可达 `O(T³)`，跨 `O(T)` 个
decision/settlement boundaries 可出现 `O(T⁴)` 的静态最坏组合。这既不是 96/256-Task benchmark 已测出的曲线，
也不预测每一种 graph 的实际延迟；它说明下一轮必须用多规模 profile/benchmark 区分常见路径与最坏输入。

### 推断：单一 selection index 与逐条件筛法相容，但尚未被实现或选择

同一 immutable core-state 在创建后不会改变，所以**同一 state identity 的 selection facts** 可以被多个消费者复用。
这是设计可行性推断，不是现有实现事实，也不要求提前构造 public `catalog` DTO。形成时源码中的优先级是：

1. `validateSelection` 先处理 `state-complete`、unknown task 与 non-pending task；
2. pending Task 依次处理 `dependsOn`、`observes`、mutex；
3. 再处理 scope capacity、root capacity。

候选 semantic index 应保持这套 primary-reason precedence：Task 在首次失败的阶段记录一个 reason，后续阶段不再为该
Task 执行不会改变 public reason 的检查。下列消费者应从同一**语义**结果投影，而不是各自重算 legality：Scheduler
policy candidates、public `AdmissionState.catalog`、`validateSelection(taskId)`、`select(taskId)` 的最终 legality guard，
以及 synchronous custom callback 返回后的 Scheduler hard revalidation。

callback 后仍必须在 Scheduler owner 内用当前 immutable core state 做 hard revalidation。仅在 cache/index 的 state identity
与 guard 所用 core state 相同，且 callback 没有产生新的 state 边界时，才可重用该 index；identity 不同必须读取新 state 的
index。这个条件防止把 cache 生命周期误写成 public identity contract 或接受过期 legality。

一条待验证的内部设计边界是：compile 时建立 task status slot、reverse dependsOn/observes、mutex members、scope members
和 canonical public-order index；state successor 只增量更新 status、running count、held mutex、scope lifecycle 与局部
relation blocker counter；root/scope capacity 作为查询时的全局或分组 gate，不在每次 running count 变化时重写所有 pending
Task 的相同 reason。selection index 可以 private、lazy 且按 immutable state cache，`catalog` 在读取时才序列化 `O(P)` 的
DTO，单项 validation/select 不构造 catalog array。

这不是“cold state 上所有操作都是 `O(1)`”的主张。若首次读取仍要从 parent chain 或完整 graph 临时建 index，该首次读取
至少保留建表成本；下列目标只在 index 已增量维护或该 state-specific cache 已形成时成立：status lookup `O(1)`、单项
validate/select legality 接近 `O(1)` 加 reason payload、catalog `O(P)` 加 DTO payload、settle 接近实际受影响 reverse
edges 加 `B`。这些目标还依赖 scope/capacity 计数、index representation 与 cache invalidation 的实测设计。

### 建议：下一轮性能 Change 的测量与验证矩阵

以下是建议的调查和验收路径，不是本报告建立的任务、预算或决定。应先 profile current implementation；只有 profile
证实 selection/status chain 或 forced-block scan 是目标 workload 的主要成本，才比较具体 representation。

| 目标 | 必须固定或变化的 workload | 记录的 before/after 证据 | 正确性与边界 guard |
| --- | --- | --- | --- |
| real Scheduler 回退 | 保留 real static、custom（callback 不读 public state）、learned path；96-Task mixed-relation、root cap 8 保持可比。 | 原始 batch p50/p95、iterations/sample、派生值、Bun/host/profile；同机 ratio 或预先定义的受控-host budget。 | Scheduler outcome、ordering、callback revalidation 和 output shape 不变。 |
| selection scaling | `T=64/256/1024/4096`，独立、mutex、scope、layered relation graph；分别改变 `D`、`P`、`V`、`r`、`m` 与 `S`。 | candidate、`catalog`、`validateSelection`、`select` 的分层 profile 与多 sample p50/p95；先记录 cold-index 与 warm/index-maintained 的差别。 | primary rejection reason precedence、public catalog order、unknown/non-pending/state-complete rejection 保持完全一致。 |
| forced-block settlement | 独立计时 root select、unsatisfied settle、closure；覆盖 high-fanout 和多层 reverse dependency，记录 `B` 与触及的 reverse edges。 | settlement wall/CPU 与受影响 Task/edge 数的曲线；不得用 post-state catalog row 代替。 | blocked effect 顺序、dependency IDs、Scheduler replay 与 cancellation 语义不变。 |
| branch-search memory | 保留 DFS/BFS 的 branch shape，并补充 cache 形成/释放与 retained branch 数。 | 使用能区分 retained object 与 process-wide GC 噪声的工具；`heapUsed` 仅作为 observation。 | cache private、lazy、有明确生命周期/上界；不把 WeakMap 或同类策略变成 public identity contract。 |
| representation 选择 | 在完整产品语义 workload 中比较 bounded parent+delta、persistent map、dense chunked COW；不再用简化 prototype 的 sub-microsecond row 代表产品路径。 | 同一 command、fixture、runtime、host 下的 profile 与 before/after median/p95；记录 CPU 和 memory 代价。 | immutable predecessor retention、successor branching、schema、error behavior 和 public API 不变。 |

### 边界、未解事项与重新调查条件

1. 若 selection index 通过 parent chain 临时重建，`D` 成本仍在；若每个 branch 强持有完整 catalog/index cache，CPU
   问题可能转为 branch-search memory 问题。两者都需要完整语义 workload 的数据，而非本报告替代选择。
2. 只优化 list/validation 不会移除 settlement 的重复全图扫描；forced-block 需要 reverse dependency queue 与
   unsatisfied/failed prerequisite counter 等局部更新机制才可能接近建议目标。
3. 当前 representation prototypes 只比较简化数据结构。它们可解释为什么 parent+delta 曾适合 predecessor retention，
   不能证明它在完整 Scheduler path 的绝对性能或成为下一轮的默认选择。
4. 本轮没有新的 profiler、large-scale scaling curve、跨主机预算、准确 allocation/retained-object profiler，或
   implementation 后的 before/after measurement；这些缺口限制全部性能因果与收益主张。
5. 若 Task 数、relation density、scope 规则、callback lifecycle、public primary-reason contract 或 benchmark harness
   改变，应重新采集 real-run、scaling 和 fanout 证据，并形成新的复查报告，而不是原地改写本轮形成时认识。
