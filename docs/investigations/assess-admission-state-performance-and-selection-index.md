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

`provide-admission-strategy-simulation` 已在 `ff9b40bc7b650c224a3462048fa7692af93d5957`
对应的工作树中交付并归档。当前实现以 private parent+delta state 让 standalone
`AdmissionGraph`、callback-bound `AdmissionState` 和真实 Scheduler 共用 legality、transition、
forced-block 与 effect 语义；保留 predecessor 不复制完整动态状态。

该 Change 的性能验收有可复现 benchmark，但没有采用跨主机数值预算。归档后复核显示，数据结构原型中
parent+delta 的分支创建成本较低，实际产品实现却在状态查询、candidate 枚举、capacity/mutex/scope
判断和 forced-block 传播中反复扫描 graph 与 delta chain。用户进一步提出：一个 immutable state
边界只有一份 select 合法性事实，list、单项校验和 select 应复用同一份预选结果；多个条件可以按既定
优先级逐层筛选，避免对已经失败的 Task 继续执行无效判断。

## 调查目的

- 从归档 benchmark 和实施前基线恢复当前性能量级，判断是否已有需要继续优化的证据。
- 从当前源码推导主要公开操作和完整 Scheduler Run 的时间、空间增长因素。
- 判断“单一 selection index + 逐条件筛选”是否与 immutable state、primary rejection reason、
  callback hard revalidation 和真实 Scheduler owner 边界相容。
- 明确该方向能解决的成本、不能单独解决的问题，以及下一轮性能 Change 应补充的验证。

本报告只保存本轮形成时认识，不建立实施授权、性能预算或新的 public contract；当前行为仍由源码、测试、
稳定文档和 active + aligned Decision 承接。

## 调查范围与依据

调查以当前实现 commit `ff9b40bc7b650c224a3462048fa7692af93d5957` 为时点，检查：

- [归档 benchmark summary](../../changes/archive/provide-admission-strategy-simulation/readiness/admission-state-benchmark.summary.md)
  及相邻 manifest/raw evidence；环境为 Bun `1.3.14`、Linux WSL2、AMD Ryzen AI 7 H 450，固定 seed
  `20260903`，5 个 warmup sample 和 17 个 measured sample。
- Plan 基线 commit `bc93fe0ca7cbcd310cf187a2a2c2076b57eb6e13` 中同一 benchmark 的
  pre-implementation real-shell rows；当前与基线使用相同 host、fixture、seed 和 batch shape，但形成于
  不同时间，比较只作为同机回退信号。
- 当前 [`admission-core.ts`](../../src/project-run/task-scheduler/admission-core.ts)、
  [`graph-validation.ts`](../../src/project-run/task-scheduler/graph-validation.ts)、
  [`scheduler.ts`](../../src/project-run/task-scheduler/scheduler.ts) 和 execution state；重点检查
  `taskStatusFor`、selection rejection、catalog/inspection、forced-block closure 与 real-shell decision path。
- 已完成的 Full Gate 与 correctness review 证明行为一致性，但 Gate 没有 numeric performance budget，
  因而不能用 Gate 通过推断没有性能回退。

报告中的单次时间由 summary 的 batch p50/p95 除以固定 iterations/sample 得到。复杂度使用：`T` 为 Task
数、`E` 为 relation edge 数、`S` 为 scope 数、`P` 为 pending Task 数、`D` 为 parent+delta chain
深度、`B` 为一次 settlement 连带产生的 forced-block Task 数。未运行新的 profiler；没有把
`heapUsed` delta 当成精确 allocation 或 retained-object 计数。

## 调查结果与边界

### 已确认事实：真实运行路径存在明显回退信号

96 Task、12-wide layered DAG、root capacity 8 的完整 Run，batch 为 4 次：

| 路径 | 实施前 p50/次 | 当前 p50/次 | 同机变化 |
| --- | ---: | ---: | ---: |
| static | 21.7 ms | 36.9 ms | +70% |
| custom（callback 不读 public state） | 41.7 ms | 88.5 ms | +112% |
| learned | 22.9 ms | 36.2 ms | +58% |
| graph compile | 0.194 ms | 0.190 ms | 基本不变 |

三条 real-run 路径的当前 p50 均高于实施前 p95，差值远大于这两次记录中的普通波动；因此它们是需要
继续调查和优化的真实信号。它们仍不是跨环境预算，也没有单独证明某一个函数是全部回退的因果来源。

### 已确认事实：实际 public 操作的当前量级

256 Task layered graph 上，fixed-depth state 经过 8 轮 select/settle，即 16 个 delta：

| 操作 | 当前 p50/次 | 当前 p95/次 | 解释边界 |
| --- | ---: | ---: | --- |
| `inspection` | 26.5 μs | 49.9 μs | 复用预建 depth-16 state |
| initial-state `catalog` | 278 μs | 582 μs | 每次从 initial state 重新投影 |
| depth-16 `catalog` | 329 μs | 554 μs | 名为 warm，但实现没有 catalog cache |
| depth-16 `validateSelection` | 11.8 μs | 18.5 μs | 512 次 batch 的单次换算 |
| 同一 initial predecessor 创建一个 branch | 9.4 μs | 11.9 μs | successor 共享 predecessor |
| 连续一对 `select + settle` | 648 μs | 739 μs | 64 对连续执行，chain depth 持续增长 |
| 构造一个 8 轮 fixed-depth state | 2.96 ms | 3.20 ms | 包含选取 Task 所需的 catalog 读取 |

255 个 retained DFS branch 的 `heapUsed` 观测为约 151 KB；BFS 为负值。该冲突符合 process-wide、
GC-dependent proxy 的已知噪声，因此只能确认 benchmark 保留了 255 个 branch，不能据此承诺每 state
字节数。

当前名为 `high-fanout` 的 timed row复用已经完成 root unsatisfied settlement 和 255 个 forced block 的
state，只测该 post-state 的 catalog/validation；它没有计时触发 255 个 forced block 的 settlement。
所以当前 evidence 尚不能量化最需要关注的 fanout transition 成本。

### 已确认事实：parent+delta 优化了复制，不等于 select 为 O(1)

- `initialState()` 和只保留 predecessor reference 为 O(1)。普通 accepted transition 只新增一个 delta
  node，结构性 successor allocation 为 O(1)；一次产生 `B` 个 forced block 时新增 O(B) nodes。
- `taskStatusFor` 沿 parent chain 查找最近一次 Task 状态，最坏为 O(D)，且当前没有有界 compaction、
  persistent status index 或 memo。
- 单项 `validateSelection` 仍会检查 complete、关系、mutex、running count 和 scope capacity。稀疏且无
  复杂 mutex/scope 时最坏约 O(TD)；mutex reverse lookup 缺失时还会为目标 Task 的每个 mutex 扫描
  graph。
- `select` 复用 validation 后只做 O(1) node allocation，因此整体仍约 O(TD)，不是 O(1)。
- `catalog` 对每个 pending Task 重复执行 selection checks，常见上界约 O(PTD)；当 `P`、`D` 都随
  `T` 增长时接近 O(T³)。输出全部 pending partition 本身至少需要 O(P)。
- `inspection` 的基本 projection 为 O(TD)，但 `nextBoundary` 还可能逐个查找 selectable Task；最坏可
  接近 catalog 的 O(PTD)。
- `settle` 会反复从 graph 尾部扫描 pending Task以形成 forced-block closure。可用
  O((B + 1)(T + E)(D + B)) 描述当前保守上界；稀疏图且 `B,D=O(T)` 时可接近 O(T³)，dense relation
  graph 还会更高。
- graph normalization、map 建立、cycle check 和 public ID sort 通常为 O(T + E + T log T)；scope
  terminal reachability 当前会为 scoped Task 重复 relation traversal，最坏达到 O(T(T + E))。

完整稀疏 Scheduler Run 有 O(T) 级 decision/settlement boundaries，state chain 也增长到 O(T)。当前每个
boundary 的 graph scan 叠加 O(D) status lookup，使完整运行出现接近 O(T³) 的保守增长是合理推断；
本轮没有用多规模 scaling curve 对指数进行实测拟合，不能把该上界误写成所有输入的固定实际曲线。

### 判断：单一 selection index 与筛法方向成立

immutable state 在创建后不会改变，因此同一个 state 边界的 selection facts 可以安全复用。逻辑上应只
形成一份 private selection index，由以下消费者投影，而不是分别重算：

- Scheduler policy candidate list；
- public `AdmissionState.catalog`；
- `validateSelection(taskId)`；
- `select(taskId)` 的最终 legality guard；
- synchronous custom callback 返回后的 Scheduler hard revalidation。

callback 是同步调用；只要 hard guard 持有并核对同一个 immutable core-state identity，就可以复用 callback
开始前的 index，而不会接受过期状态。若边界 identity 不同，必须改用新 state 的 index，不能跨 state
复用。

筛法应严格按当前 primary-reason precedence 工作：先区分 complete / unknown / non-pending，再对 pending
集合依次筛除 `dependsOn`、`observes`、mutex、scope capacity、root capacity。Task 在第一次失败时记录
primary reason，后续阶段不再检查它。这样既减少无效判断，也不会改变公开 rejection reason。

这里的“一份”应解释为**一份语义 index**，而不是强制提前构造完整 public catalog DTO。更合适的边界是：

- 编译期建立 task status slot、reverse dependsOn/observes、mutex members、scope members 和 canonical
  public-order indexes；
- state 中增量维护 running count、held mutex、scope lifecycle，以及局部 relation blocker count；
- capacity 保持全局或分组 gate，不因 root capacity 改变就逐 Task 改写相同 reason；
- selection index 延迟形成并按 immutable state 缓存；catalog 只在读取时序列化完整 O(P) DTO，单项
  validation/select 直接查 index，不构造 catalog array。

在这些条件下，目标复杂度可以收敛为：status lookup O(1)，单项 validate/select legality 接近 O(1) 加
reason payload 大小，catalog O(P) 加输出 payload，settle 接近 O(实际受影响 reverse edges + B)，而不是
反复全图扫描。exact complexity 仍取决于 persistent status/index representation 和 scope capacity 设计。

### 该方向尚未单独解决的事项

1. 如果 selection index 仍通过 parent chain 临时重建，D 成本仍然存在；需要 persistent O(1)/bounded
   status lookup、有限 compaction 或 dense chunked COW 的实测选择。
2. 每个 branch 都强持有完整 catalog/index cache 可能把 CPU 问题变成 branch-search memory 问题；缓存应
   lazy、private，并用 WeakMap 或等价生命周期策略接受实测验证，不能成为 public identity contract。
3. root capacity 是全局条件，scope capacity 是分组条件。它们适合查询时组合 gate，不应为了“预选表完整”
   在每次 running count 变化时重写所有 pending entries。
4. forced-block 需要 reverse dependency queue 和未满足/失败 prerequisite counters；只优化 list/validation
   不会消除 settlement 的重复全图扫描。
5. 当前 benchmark 的 representation prototypes 只比较简化数据结构，不代表完整语义实现的绝对性能；
   后续不能继续用 prototype 的 sub-microsecond 数据推断产品路径成本。

### 建议与重新调查条件

- 将 admission core/index 性能作为独立于 learned scheduling algorithm 的性能 Change。先降低机制本身
  的 per-boundary 成本，再用它承载穷举、lookahead 或新的调度算法，避免算法 benchmark 被基础设施成本
  主导。
- 下一轮先增加 current implementation profile 与 scaling benchmark：至少覆盖 `T=64/256/1024/4096`、
  多个 `D`、independent/mutex/scope/high-fanout graph，并单独计时 forced-block settlement。
- 对比前后必须保留 real static/custom/learned unused-public-state 路径；建议采用同机 ratio 或明确受控
  host budget，不能只保留“无 numeric budget”而让明显回退继续通过。
- 只有 profile 证明 selection/status chain 是主要成本后，才在单一 semantic index 下比较 bounded
  parent+delta、persistent map 与 dense chunked COW；以完整产品语义 workload 选择，而不是再次只看原型。
- 如果 Task 数、关系密度、scope 规则、callback lifecycle 或 public primary-reason contract 改变，应重新
  采集本报告的 scaling、fanout 和 real-run evidence，形成新的复查报告，而不是原地改写本轮认识。
