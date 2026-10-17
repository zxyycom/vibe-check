---
title: "Scheduler 共享条件与个体状态的惰性组合评估"
id: "261017-evaluate-scheduler-shared-condition-state"
formedAt: "2026-10-17T02:27:44Z"
question: "共享依赖条件与个体状态能否减少 Scheduler 的逐项传播，同时保持就绪发现、结算顺序、统计时点和不可变快照？"
tags:
  - "architecture"
  - "lazy-evaluation"
  - "performance"
  - "scheduler"
relations: []
---

## 形成时背景

用户希望将 Task 的有效状态表示为“共享条件＋个体状态”：同义批量变化只更新共享条件，个体在读取或选出时组合自身差异。目标是减少逐 Task 传播。

当前 Scheduler 已有共享资源准入条件、cohort clocks 和惰性 Task delay。关系尚未满足的 Task 则位于 ready frontier 之外；要进一步共享关系状态，必须让来源变化主动暴露新就绪成员，同时维持 count、结算顺序、统计时点和旧快照。

[增量状态普查](./audit-scheduler-incremental-state-model.md)及其[前序调查](./assess-admission-state-performance-and-selection-index.md)提供表示演进背景。本轮回答新的共享条件问题，独立测量当前基线，直接关系为空。稳定行为仍由 [Scheduler owner](../development/scheduler.md)、[调度指南](../guides/scheduling.md)和[模拟指南](../guides/simulating-admission.md)定义。

## 调查目的

评估两种共享方式的可行性、收益条件与生产化成本：

1. **完整关系签名分组**：相同 typed dependencies/observations 共用关系计数与 gate。
2. **公共条件＋个体残差**：`Task_i.dependsOn = [A, B_i]` 共用 A，分别维护 Bᵢ。

本轮以隔离模型、真实 Core 对照和本机测量支持后续实验取舍；交付为调查报告与证据，Product 保持不变。

## 调查范围与依据

### 基线与行为 owner

形成时为 2026-10-17，`main` HEAD 为 `313c3830aa3af33c76131614776134f6a9dc60a9`。780 个 `src/**` 文件的 source-identity digest 为 `c15611bd51afcdb393155c6a25ecc9d56f2c132d1766322494e9a61d74919629`，起止完整 inventory 逐字节相同。另从 `git show 14a64e5e:changes/restructure-scheduler-incremental-state/evidence/adoption-evidence.md` 恢复上轮采用背景；本轮计时重新取得。

调用关系先用 CodeGraph 的 files/node，再用限定路径检索补足。主要读取：

| owner | 本轮需要保持的行为 |
| --- | --- |
| [admission-core](../../src/project-run/task-scheduler/admission-core/core.ts) 下的 selection-transition、selection-seed、membership-index | reverse fanout 更新关系计数；seed 与 transition 采用相同谓词；membership 支持 count、成员判断与枚举。 |
| selection-index、selection-query、Core effects | relation-ready 要求 dependencies/observations 已 settled；admission-viable 另要求 dependencies 全 completed。失败依赖全部 settled 后立即 forced block，不等 observations；forced 按 descending slot，cancel 按声明顺序，每个 effect 有自己的 post-state。 |
| ready/static frontier、state-query、projection | 两种 tie order、三层选择、active scope、完整有序查询与旧 snapshot/fork 隔离。 |
| [measurement queue](../../src/project-run/task-scheduler/measurement/queue.ts) | 已按 constraint cohorts 累计等待；新增 membership 仍逐项进入 collector，关系共享的收益可能在这里被重新展开。 |

### 原型与样本

两个模型切片均使用 immutable List 和现有 persistent Task queue。**eager 是匹配职责的模型对照，不是当前 Product**：它逐 Task 维护关系计数，将 ready Task 插入 constraint-cell 队列，并按受影响 cell 合批发布 head。比较统一采用 ordinary 的 priority/declaration 顺序；完整 occupancy、scope、DTO、collector 等生产成本属于后续接线范围。

| 切片 | 表示与就绪发现 | 样本 |
| --- | --- | --- |
| 完整签名：eager / shared | 按 typed relation multiset 分组，保留来源类型与重复 occurrence 权重。source 通知关系组；关系组 × constraint group 的非空 cell 预编译成员队列，gate 打开时发布 head。 | 下游 N=32/256/1024；cohort、multi、partition、unique、overlap、cross、split 七种图。 |
| 公共 A：eager / factored | 一个公共 A gate、个体 Bᵢ/source 与 Task 状态；各 constraint cell 维护 residual-ready 队列，A 打开时暴露整条 common root。 | 同样三个 N；A 先完成、最后完成、交错完成 × C=4/C=N，共 18 cohorts/runtime。 |

第一切片中，cohort 共用一个来源；multi 为四个 dependencies＋两个 observations；partition 为八个来源分区；unique 为独有来源；overlap 为三个循环错位来源、各 Task 签名不同；cross/split 共用关系、分别有 N/16 个 constraints。unique/overlap 有 N 个来源，其余图有 8 个来源；前三种图另有 4 个 constraint signatures。第二切片有 N+1 个来源，即 A 与 B₁…Bₙ。跨图总规模与 action 数不同，按各自同条件对照解释。

原型只读 import 生产队列与 Core，源码未复制或替换。资源中的 runner、raw 与 manifest 分别承接实现、完整样本和身份；[资源说明](./_resources/261017-evaluate-scheduler-shared-condition-state/README.md)提供复跑入口。

### 验证与测量

- **正确性**：独立 oracle 全图扫描 statuses 和原始 relation arrays；不复用模型 counters、group keys 或 frontier。第一切片覆盖 failure、observes、cascade、cancel、多来源、非 head 选择和 30 个固定 seed 的随机 22-Task DAG；第二切片覆盖 A/Bᵢ 顺序、失败、取消及交叉 constraints。两者均对照真实 Core 的 action-final candidates、ordinary choice、effect kind/order，并反复读取旧 snapshot。
- **操作量**：从真实 Core accepted select/settle 的 effect-state `lastTransition` 统计 relation counter delta 和 ready adds，再与模型操作量比较。
- **计时**：Node 24.18.0、Bun 1.3.14，Linux x64，AMD Ryzen AI 7 H 450，6 逻辑 CPU；独占窗口内串行运行。每矩阵 3 warmups＋7 samples，变体交替先后，GC 在 span 外。N=32/256/1024 每 sample 分别执行 8/3/1 次，raw 已换算为单流程 ms。轻量 stats 在计时内开启。
- **完整模型 total**：直接测 compile＋seed＋来源 admit/settle＋选尽下游，包含预编译队列成本；另测 compile 和三个消费阶段，不相加各阶段 median。
- **内存**：独立 pass 观察指定保留集合的 post-GC heap/RSS；没有运行 allocation sampling。逻辑 tick delay 只证明总 viable 等待模型，完整 collector 的分类、积分及 binary64 精度另有义务。

## 调查结果与边界

### 核心判断

**共享条件能减少真实的逐 Task 关系写入；收益成立的关键是同时维护可发现的 frontier、即时聚合和个体差异。** 两个模型切片支持继续做有针对性的生产化实验，尚不足以直接替换整个 Scheduler。

完整签名分组适合高复用关系；公共 A＋Bᵢ 表明，即使完整签名数接近 Task 数，仍可能存在有价值的共享因子。两者的证据强度都是有限语义模型与当前 Core 操作对照，生产 Run 的净收益仍待接线测量。

### 共享与个体责任

| 义务 | 可共享部分 | 必须保留的局部或即时工作 |
| --- | --- | --- |
| 关系条件 | 同一 typed signature，或明确的公共因子 | 不同 dependency/observation 语义、重复权重及个体残差。 |
| 就绪发现 | gate/head 事件、cell 队列 | 来源变化时使新工作可发现；仅在 dormant Task 的 getter 中重判会漏掉发现机会。 |
| count 与等待时点 | pending-live mass、cohort 时钟 | 在事件边界更新质量与 viable-entry tick，而非首次读取时补记。 |
| Task 生命周期 | 共享事实作为条件 | status、非 head select/cancel、leave/delay 仍归个体。 |
| forced/cancel | 共享判定与有序 drain | 立即产生 canonical effects；B 个 blocked 输出至少 Ω(B)。 |
| 完整查询与不可变性 | persistent 共享事实、按需投影 | K 项输出至少 Ω(K)；旧 state/fork 读取自身捕获的条件版本。 |

现有 root capacity、mutex、resource fit 继续由共享 occupancy/query gate 承接。异量 claims 和 scope activation 有独立语义，关系共享不能代替这些准入职责。

### 完整签名分组：收益与退化

39 条轨迹、1,324 个边界、47,878 次旧 snapshot 复核通过。N=1024、来源全 satisfied 时：

| shape | Core counter delta / ready adds | shared counter writes | R / H | eager / shared wake cells |
| --- | ---: | ---: | ---: | ---: |
| cohort | 1024 / 1024 | 1 | 2 / 5 | 4 / 4 |
| multi | 6144 / 1024 | 6 | 2 / 5 | 4 / 4 |
| partition | 1024 / 1024 | 8 | 9 / 9 | 8 / 8 |
| unique | 1024 / 1024 | 1024 | 1025 / 1025 | 1024 / 1024 |
| overlap | 3072 / 1024 | 3072 | 1025 / 1025 | 1024 / 1024 |
| cross | 3072 / 1024 | 3 | 2 / 1025 | 1024 / 1024 |
| split | 3072 / 1024 | 3 | 2 / 17 | 16 / 16 |

R 为关系签名数，H 为非空关系 × constraint cells，均含来源 cells；wake 只计来源 settle 阶段的 head 发布。multi 的共享计数写入显著减少；cross 仍需唤醒 1024 个 cell；unique/overlap 的计数写入保持原量级。

设 T 为全部 Task 数，source u 触达 Fᵤ 个 Task、Dᵤ 个关系组。候选把关系通知从 Fᵤ 降为 Dᵤ，另付交叉 cell 发现、persistent 更新、队列推进与个体输出成本。R≈T、H≈T 或完整观察主导时，改善空间收窄。预编译队列把 ready 插入移到 compile；本原型的 `group.cells.includes` 还有 O(T·H) 编译上界，cross 可达二次，已原样计入 total。失效成员由后续 transition 清理，单次 gate 打开也可能处理多个 tombstone。

N=1024 完整模型 total，单位 ms，median（eager → shared）：

| shape | Node | Bun |
| --- | ---: | ---: |
| cohort | 8.202 → 4.340 | 3.200 → 2.191 |
| multi | 8.439 → 3.205 | 4.718 → 2.709 |
| partition | 9.900 → 4.640 | 3.366 → 2.226 |
| unique | 14.843 → 14.608 | 8.373 → 8.874 |
| overlap | 21.132 → 17.720 | 9.715 → 9.426 |
| cross | 9.330 → 6.275 | 4.348 → 4.530 |
| split | 9.883 → 5.365 | 3.517 → 2.502 |

完整样本还保留小规模反例：N=32 unique 的 Node 为 0.373→0.510、Bun 为 0.246→0.281；N=256 cross 的 Node 为 1.595→1.911；N=256 unique 的 Bun 为 1.672→2.275。N=1024 unique 的 Node 范围为 11.575–24.505 / 12.424–19.827，区间重叠。各 runtime 的 84 条 phase rows、21 条 direct-total rows 支持局部取舍，不构成通用加速或统计显著性证明。

### 公共 A＋Bᵢ：完整签名之外的共享

第一切片的 overlap 没有覆盖全局公共 A。设计复核后新增专用 factored 切片，避免把 R=N 误解为无法共享。

A 未完成时，common root 隐藏，已完成 Bᵢ 仍维护 residual-ready 队列。A 完成时整体暴露 root；若 A 先完成，则后续 Bᵢ 的个体事件加入对应 cell。有效 entry tick 为 `max(A 完成 tick, Bᵢ 完成 tick)`，count 为 `baseCount + (A completed ? residualReadyMass : 0)`。A 失败时，仅对 Bᵢ 已 settled 的成员立即输出 blocked，其余由后续 Bᵢ 事件触发；取消仍即时按声明顺序处理。

**影响判断的原型修正：** v1 的正确性检查通过，但 N=1024、C=4 的 Node total 达 443–482 ms，对照为 12–15 ms。原因是 query 局部清理 stale roots 后未将清理结果发布到 successor，后续选择反复支付同一前缀成本。v2 仅将清理后的 base/common roots 交由 transition 发布，保持 query 只读和旧 state 不可变；原 v1 源码与完整 raw 保留。v2 重验 16 条轨迹、3,563 个边界、20,548 次旧 snapshot 均通过，并以相同矩阵重新计时。

N=256 的六个顺序/constraint 对照中，A settle 的真实 Core 与 eager 均有 256 个 dependency delta；factored 只写共享状态 1 次，residual 写入和 ready 插入均为 0。整个来源轨迹仍需 256 次个体 residual-ready 插入；关系写入由 eager 的 512 次变为共享 1 次＋residual 256 次。

v2 的 N=1024 完整模型 total，单位 ms，median（eager → factored）：

| constraints | A 完成顺序 | Node | Bun |
| --- | --- | ---: | ---: |
| C=4 | 先完成 | 16.844 → 11.988 | 9.863 → 6.376 |
| C=4 | 最后完成 | 12.496 → 9.388 | 7.801 → 5.747 |
| C=4 | 交错完成 | 15.337 → 9.722 | 9.002 → 6.376 |
| C=N | 先完成 | 24.845 → 14.098 | 12.080 → 7.797 |
| C=N | 最后完成 | 18.294 → 10.685 | 9.114 → 5.956 |
| C=N | 交错完成 | 18.716 → 10.981 | 9.626 → 6.035 |

该模型由 fixture 指定单公共 dependency A，尚需另行解决自动共享因子选择、多 gate 的 AND 交集及去重发现。测量也有离散：Node C=N、A 先完成的范围为 15.543–43.139 / 11.767–28.946 ms。结果支持这一专用表示的局部价值，不能直接泛化为任意 relation DAG。

### 内存观察

第一版同进程 memory pass 的 Node 出现负值（N=1024 cross eager 为 −5.494 MiB），Bun heap delta 全为 0。行间回收、存活集和 runtime 口径使其不足以判断 retained 收益；signed raw 保留。

补证改为每 row 独立进程，在输入 fixture 建立后读取 before，随后强引用 compiled graph、initial、各 source-settle successor 和 final，三次 GC 后读取 after。第一切片 N=1024 的 Node heapUsed 差值如下：

| shape | eager MiB | shared MiB | 保留 states |
| --- | ---: | ---: | ---: |
| cohort | 0.942 | 0.336 | 9 |
| multi | 1.392 | 0.341 | 9 |
| unique | 5.738 | 6.554 | 1025 |
| overlap | 5.861 | 6.678 | 1025 |
| cross | 1.417 | 0.704 | 9 |
| split | 1.081 | 0.340 | 9 |

该保留集合中，共享 cohort 占用较低，unique/overlap 多约 0.8 MiB。每 row 单样本的 GC 差值包含引擎/分配器影响，且不含 full-read memo 或第二切片。Bun 补证的 heapUsed 差值仍全为 0，RSS after 约 49.6–84.6 MiB；这些进程观察无法换算索引独占大小或精确 allocation。

### 后续实验与适用边界

建议先只读统计代表性真实图的 R、C、H、source F/D 分布、公共因子及实际查询需求，再决定是否投入 relation owner＋group mass delta 的生产隔离候选。完整签名复用高且 H 小，或存在稳定公共因子和可维护残差时，最有继续验证价值；无共享因子、交叉 cell 多且完整观察主导时，保留当前表示更合适。

生产候选的验收需补齐：

1. **完整选择行为**：两种 tie order、tightening/continuation/ordinary 三层及 active scope；本轮只实现 ordinary 的一条排序。
2. **逐 effect 边界**：每个 canonical effect 的中间 post-state、失败/取消中的 readiness 与 viability 差异、pre-admission seed 的首错顺序；本轮 Core 对照停留在 action-final 状态与 effect kind/order。
3. **collector 接线**：用 cohort/cell 质量 delta 在原采样边界更新 counts、peaks 和 entry clock；继续逐项输出 membership added/调用 `#enter` 会重新支付 fanout。精确时间、availability、分类 delay、history 与 terminal 语义仍需完整证明。
4. **真实消费成本**：同 Run trace 下的端到端、custom full/diagnostics、分支保留和安装产物验证。本轮模型计时含轻量 stats，不能作为生产净成本，也不与另一 overlay 实验的绝对时长横比。

本轮完成隔离 oracle、实际 Core 操作对照、Node/Bun 计时与内存观察；Product、正式测试和稳定 owner 未改。完整 Product Gate 与安装验收留待生产接线阶段。

## 随附资源

- [README.md](./_resources/261017-evaluate-scheduler-shared-condition-state/README.md)
- [bun-memory-v2.json](./_resources/261017-evaluate-scheduler-shared-condition-state/bun-memory-v2.json)
- [bun-memory.json](./_resources/261017-evaluate-scheduler-shared-condition-state/bun-memory.json)
- [bun-partial-timing.json](./_resources/261017-evaluate-scheduler-shared-condition-state/bun-partial-timing.json)
- [bun-partial-v2-timing.json](./_resources/261017-evaluate-scheduler-shared-condition-state/bun-partial-v2-timing.json)
- [bun-timing.json](./_resources/261017-evaluate-scheduler-shared-condition-state/bun-timing.json)
- [bun-total.json](./_resources/261017-evaluate-scheduler-shared-condition-state/bun-total.json)
- [evidence-manifest.json](./_resources/261017-evaluate-scheduler-shared-condition-state/evidence-manifest.json)
- [measure-total.mjs](./_resources/261017-evaluate-scheduler-shared-condition-state/measure-total.mjs)
- [measure.mjs](./_resources/261017-evaluate-scheduler-shared-condition-state/measure.mjs)
- [memory-isolated.mjs](./_resources/261017-evaluate-scheduler-shared-condition-state/memory-isolated.mjs)
- [model.mjs](./_resources/261017-evaluate-scheduler-shared-condition-state/model.mjs)
- [node-memory-v2.json](./_resources/261017-evaluate-scheduler-shared-condition-state/node-memory-v2.json)
- [node-memory.json](./_resources/261017-evaluate-scheduler-shared-condition-state/node-memory.json)
- [node-partial-timing.json](./_resources/261017-evaluate-scheduler-shared-condition-state/node-partial-timing.json)
- [node-partial-v2-timing.json](./_resources/261017-evaluate-scheduler-shared-condition-state/node-partial-v2-timing.json)
- [node-timing.json](./_resources/261017-evaluate-scheduler-shared-condition-state/node-timing.json)
- [node-total.json](./_resources/261017-evaluate-scheduler-shared-condition-state/node-total.json)
- [partial-measure-v2.mjs](./_resources/261017-evaluate-scheduler-shared-condition-state/partial-measure-v2.mjs)
- [partial-measure.mjs](./_resources/261017-evaluate-scheduler-shared-condition-state/partial-measure.mjs)
- [partial-model-v2.mjs](./_resources/261017-evaluate-scheduler-shared-condition-state/partial-model-v2.mjs)
- [partial-model.mjs](./_resources/261017-evaluate-scheduler-shared-condition-state/partial-model.mjs)
- [partial-verify-v2.json](./_resources/261017-evaluate-scheduler-shared-condition-state/partial-verify-v2.json)
- [partial-verify-v2.mjs](./_resources/261017-evaluate-scheduler-shared-condition-state/partial-verify-v2.mjs)
- [partial-verify.json](./_resources/261017-evaluate-scheduler-shared-condition-state/partial-verify.json)
- [partial-verify.mjs](./_resources/261017-evaluate-scheduler-shared-condition-state/partial-verify.mjs)
- [source-identity.mjs](./_resources/261017-evaluate-scheduler-shared-condition-state/source-identity.mjs)
- [verify.json](./_resources/261017-evaluate-scheduler-shared-condition-state/verify.json)
- [verify.mjs](./_resources/261017-evaluate-scheduler-shared-condition-state/verify.mjs)
