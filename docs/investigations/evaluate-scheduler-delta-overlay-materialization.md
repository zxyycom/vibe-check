---
title: "Scheduler 临时增量覆盖层与按需固化评估"
id: "261017-evaluate-scheduler-delta-overlay-materialization"
formedAt: "2026-10-17T02:27:50Z"
question: "在当前持久化状态外增加可合并的临时增量覆盖层，能否降低稀疏变化成本，并在高变化时安全固化且不损害查询与分支隔离？"
tags:
  - "immutable-state"
  - "performance"
  - "scheduler"
  - "state-representation"
relations: []
---

## 形成时背景

用户提出在当前 materialized backing `B` 上保留可合并的临时增量 `Δ`：稀疏变化先以 `B＋Δ` 查询，达到阈值后批量 apply 为 `B′`。逻辑 successor 仍是独立不可变视图，底层 List/Set/Map 的发布则可推迟；固化必须保持旧 snapshot 和分支隔离。

当前 Scheduler 使用 persistent 局部复制。[260903 调查](./assess-admission-state-performance-and-selection-index.md)与[261015 普查](./audit-scheduler-incremental-state-model.md)提供此前 parent+delta、索引和变化传播的背景；本轮评估的是当前 backing 外的临时覆盖策略，直接关系为空。

稳定语义由 [Scheduler owner](../development/scheduler.md)、[模拟指南](../guides/simulating-admission.md)和[immutable state Decision](../decisions/provide-immutable-admission-graph-state.md)承接。本轮交付调查报告与证据，Product 保持不变。

## 调查目的

1. 在当前真实 reducer/query 链上验证合并覆盖、批量固化与多路径 fork。
2. 比较稀疏/重复写入、完整查询、读多写少与分支保留下的总成本，识别底层发布减少与覆盖层自身开销的取舍。
3. 判断是否值得继续生产接线，以及后续实验应缩小到哪类容器或写入模式。

## 调查范围与依据

### 基线与物化边界

调查基于 2026-10-17 的 `main` HEAD `313c3830aa3af33c76131614776134f6a9dc60a9`。780 个 `src/**` 文件的 source-identity digest 为 `c15611bd51afcdb393155c6a25ecc9d56f2c132d1766322494e9a61d74919629`，起止核对一致。另从 `git show 14a64e5e:changes/restructure-scheduler-incremental-state/evidence/adoption-evidence.md` 恢复最近采用背景；全部性能比较重新取得当前 baseline。

调用关系先用 CodeGraph 的 node/files/callees，再以限定 Core 路径检索容器消费者。

| 状态 / 消费 | 当前义务 | 本候选的处理 |
| --- | --- | --- |
| status、关系计数、occupancy、scope lifecycle | List 点读取得最新逻辑值；counter 事务已有 `withMutations` 合批。 | List 覆盖支持点读、同 key 合并与回到 base 时消去。 |
| pending/running/settled、relation-ready | Set 的 size/has 参与合法性、容量和完成判断。 | add/delete 覆盖同时维护逻辑 size；当前事务 delta 仍立即产生。 |
| ready group Map、static revision Map | 非 head 移除、两种 tie order、三层选择和 revision liveness。 | Map 加覆盖，head/revision 仍按原算法更新。 |
| persistent Task queues、active-scope ordered array | 有序队列与 scope 生命周期。 | 保留原物理表示与即时局部复制。 |
| catalog/inspection、ordered members、measurement | 有序投影、immutable identity memo、相邻 boundary 的 delta。 | 新 view 有独立 identity；枚举合并覆盖，collector 继续使用原事务 delta。 |

### 覆盖层原型

baseline 与候选经同一 Bun bundler、entry 和依赖构造，执行真实 compile/reducer/effects/query。候选仅将 selection-index、selection-seed、ready-frontier、static-frontier 四个文件的 runtime Immutable imports 重绑到 adapter，其余源码字节不变；manifest 保存实际加载的 23 个 Product 源文件、四个重绑入口和两个 bundle 身份。

每个容器 view 为 `(immutable base, coalesced native Map Δ, logical size)`：

1. 查询先查 Δ，再回退 base；删除用 sentinel，写回 base 值则移除覆盖。
2. successor 首次实际写入复制旧 Δ 一次；同一 `withMutations` batch 使用其私有副本。
3. batch 发布时，若 `|Δ| ≥ T`，用 base 的 `withMutations` 批量固化并清空 Δ。
4. 旧 snapshot/fork 保留各自的 base/Δ，读取操作不改变表示。

T=8/32 是实验参数。adapter 承接当前切片使用的 List get/set/size/batch、Set membership/iteration/filter/some/batch、Map lookup/iteration/batch；任意 undefined Map value、List resize 和 Immutable 的其它通用契约在其支持范围之外。Core 已用值域和有序公开投影不依赖这些能力。

### 验证与测量

环境为 Node 24.18.0、Bun 1.3.14、Linux WSL2 6.18.33.2、AMD Ryzen AI 7 H 450、6 logical vCPUs。各阶段在协调的独占窗口内串行执行，timing、metrics 与 memory/profile 分离，源与 bundle 哈希保持不变。

| 证据 | 覆盖与结果 |
| --- | --- |
| 初次 Core oracle | 补齐遗漏的 Set.filter/some 并重建后，Node/Bun 各通过 5,352 个 effect boundaries、2,508 个 retained snapshots 反向查询。覆盖 48-task wide、G=N、deep、fanout、mutex/resource、scopes，T=1/8/32、成功/失败及共享 root 的 8 条独立 48 步分支。 |
| 并发/拒绝 probe | Node/Bun 各通过 456 checks、69 retained views；覆盖同时 running、重复 mutex、resource/root/active-scope 饱和、拒绝、64 项 pending cancellation 的 effectStates、pre-admission unsatisfied seed 与 forced reconciliation。 |
| 独立 adapter 参考 | Bun 通过 768 个快照；native Array/Set/Map 对照点读、增删、逻辑 size、batch 跨阈值、覆盖消去与旧视图。 |
| v2 timing | 24 cohorts/runtime：N=32/256/2048 × 5 种 point 图＋full/readheavy/8fork。2 warmups＋6 samples，六种 variant 全排列平衡位置；compile/seed/GC 在 span 外，instrumentation/profile 关闭，声明的查询与 assert 在 span 内。 |
| 操作量与内存 | 独立 instrumentation；Node inspector 4096B allocation sampling；两 runtime 的独立 memory pass 与 fresh-process 补证。 |

Core oracle 比较 effects、effectStates、delta、catalog、inspection 和 static candidate，并检查 status partition 与 ready⊆pending。它提供有限轨迹的差异证据，独立 adapter 参考补充容器不变量。

计时的 full/readheavy 分别只推进 min(N,128)/min(N,256)，8fork 为各 min(N,128) 步并保留快照；计时尾部只枚举各分支最终 settled members。逐快照反向完整查询属于正确性 oracle。全部 timing cohort 的结果 digest 一致。

**2026-10-17 现场生命周期补记（非新增观测）：**随附资源继续保存完整 timing、memory、操作量和 profile.head 树/原raw身份；原完整 allocation samples 数组、bundle/entry 与工作旁注作为可删除现场退场，不影响本文已声明的采样估计及未归因边界。
原资源中的路径继续作为形成时来源坐标；复测需要新授权及独占工作区，不保证旧临时命令在当前版本可执行。

## 调查结果与边界

### 核心判断

**覆盖层在所测语义下可行，但当前 native Map 原型缺少净收益依据。** 它减少了 List/Set/Map 的底层发布，却增加 Δ 复制、覆盖探测、枚举合并和新 view identity 成本。建议保留当前 persistent baseline；后续只有在真实写入分布或更低开销的局部表示能改变取舍时继续实验。

此结论针对本 adapter 和所测 Core 轨迹。它不否定其它覆盖表示，也不等同于真实 Run 的退化比例。

### 局部计时：多数场景增加成本

v1 按 baseline→Δ8→Δ32 固定顺序取 5 samples。为减少位置偏差，另建 v2，逐字复用 graph/initial/workload helper，以六全排列重新取样；v1 原字节/raw 保留。v2 显式 Node/Bun GC 均在 span 外；v1 的 Bun GC 口径不同，两轮样本分别解释。

下表为 v2 单 cohort 的 median ms，每格为 **baseline / Δ8 / Δ32**。完整 24 cohorts 的 min/median/max 在[资源说明](./_resources/261017-evaluate-scheduler-delta-overlay-materialization/README.md)。

| workload | Node | Bun |
| --- | ---: | ---: |
| N32 wide point | 0.955 / 1.110 / 0.911 | 1.239 / 1.536 / 1.301 |
| N256 wide point | 3.439 / 5.348 / 5.770 | 5.892 / 6.925 / 6.618 |
| N2048 wide point | 22.793 / 34.660 / 36.815 | 77.525 / 120.361 / 77.576 |
| N2048 G=N point | 34.588 / 46.985 / 53.915 | 102.015 / 100.544 / 120.703 |
| N2048 deep point | 25.762 / 34.936 / 36.712 | 101.769 / 105.574 / 113.267 |
| N2048 fanout point | 26.442 / 41.578 / 46.498 | 68.471 / 76.013 / 81.529 |
| N2048 occupied point | 32.270 / 43.440 / 55.874 | 97.535 / 107.402 / 103.203 |
| N2048 full，128 步 | 59.338 / 87.005 / 83.534 | 527.277 / 587.106 / 595.659 |
| N2048 readheavy，256 步 | 8.749 / 11.311 / 10.125 | 10.358 / 11.382 / 12.935 |
| N2048 8fork×128 步 | 9.751 / 14.101 / 15.928 | 23.042 / 30.686 / 27.209 |

24 cohorts 中，Node 的 Δ8/Δ32 各只有 1 项 median 较低，Bun 各 2 项。例外包括 Node N32 deep Δ8 的 0.864 vs baseline 0.866，以及 Bun N256 fanout 的 9.229→6.968/7.087 ms。6 samples、同一 host 的观察仍受 JIT/GC/调度影响，小差异与区间重叠不构成显著性证据。

### 成本来源：覆盖层自身复制与读取

N=2048 wide 的两个阈值均有 18,432 次逻辑实际写入/Δ 复制：

| 阈值 | 固化次数 | 被复制的旧 Δ 条目 |
| --- | ---: | ---: |
| T=8 | 1060 | 43724 |
| T=32 | 258 | 166786 |

提高阈值减少固化，却扩大每步 Δ 复制。8fork×128 的 7,204 次写入也出现相同方向：T=8/32 分别复制 19,764/80,516 条旧 Δ，固化 528/128 次。

fanout batch 有 26,621 次实际写入、20,485 次 Δ 复制，说明 batch 内未逐 key 重复复制；但两个阈值的 maxDelta 都达 2,047。**T 是发布时的固化触发值，不是 batch 内的硬内存上限。** full128 的 518,464 次外部 view.get 中，约 515,000 次仍回读 base；该计数不含 batch 内与枚举内部读取，也没有直接计数 baseline 的 Immutable 节点。

令 W 为跨事务写入数、D 为相对 base 的 distinct 覆盖数、K 为 batch 实际变化数。native Map successor 复制为 O(D)；逐个新 key 积至 T 时，一个窗口的条目复制和为 O(T²)，长期约 O(WT)。重复 key 或回到 base 可减小 D；大 batch 则可能先形成 O(K) 覆盖再固化。全枚举仍需读 base 并合并 Δ，旧快照与多路径保留还会延长旧 base/Δ 的存活。

### 分配与保留内存

单次 Node inspector 采样启用 major/minor GC 已回收对象统计，间隔为 4096B。对完整 profile.head 树的 selfSize 求和：

| N2048 sampled allocation，十进制 MB | baseline | Δ8 | Δ32 |
| --- | ---: | ---: | ---: |
| wide point | 37.02 | 55.70 | 73.66 |
| fanout point | 40.80 | 63.44 | 81.34 |
| 8fork×128 | 15.37 | 22.06 | 32.72 |

adapter 的 edit/Map/iterator 栈有显著采样分配，与旧 Δ 条目复制量共同支持“覆盖层自身有成本”的解释。这是采样估计，尚未取得 CPU 因果归因或精确逐对象字节；Bun 未运行 allocation sampling。原 samples 数组 sizeSum 与 head 总和略异（wide baseline 为 37.27 vs 37.02 MB），资源分别保留，差异未归因。

内存口径经历一次补证：初次同进程 9 cohorts 的 Node/Bun 出现负值或 end=postGC；改为每 cohort/variant 独立进程后，保留以下观察：

| 运行时与指标 | 1024 个分支快照：baseline / Δ8 / Δ32 | 解释边界 |
| --- | --- | --- |
| Node heapUsed，postGC−before | +2.52 / +1.74 / +3.22 MB | point 仍约 −1.7～−2.1 MB，阶段/运行时存活影响尚未完全解释。 |
| Bun `bun:jsc` heapSize 变化 | +6.49 / +8.02 / +17.48 MB | 事件循环刷新后读取；point 约 +0.04～0.06 MB，指标与 Node 不同。 |

Node Δ8 的局部保留观察较低，但同时存在计时、采样分配及 Bun 保留代价。end-memory 是结束时采样，maxRSS 是进程累计高水位；本轮无法据此推导瞬时 peak、精确 retained 对象数或普遍省内存。

### 适用条件与后续实验

更可能受益的形状是：同一容器短窗口内少量重复 key、查询少、derived memberships/heads 不同时产生大量 distinct 写入，或一次 batch 能复用足够多底层路径。monotonic status、多 membership、G=N revision、完整 DTO 查询和多路径保留会削弱这些条件。

下一步可二选一：取得真实消费者的 distinct/重复写比例与读写分布；或比较固定小 tuple、专用稀疏数组等避免 native Map 全复制的局部候选。仅缓冲 occupancy 与统一缓冲全部 Core 应分别评估，并继续使用同一真实 Core 差异 oracle 和完整读侧。

本轮尚未覆盖全部 rejection precedence、任意 running seed、所有 graph shapes、完整 collector/clock/terminal、真实 shell 并发和 installed package。生产接线阶段再完成 public Run、diagnostics、正式测试与完整 Gate；当前隔离 probe 不替代这些验收。图、runtime/library、状态表示或查询消费者变化时，应重新比较。

## 随附资源

- [实验方法、完整min/median/max与复跑边界](./_resources/261017-evaluate-scheduler-delta-overlay-materialization/README.md)
- [独立Array/Set/Map参考probe](./_resources/261017-evaluate-scheduler-delta-overlay-materialization/adapter-oracle.ts)
- [采样完整调用树与原raw身份](./_resources/261017-evaluate-scheduler-delta-overlay-materialization/allocation-node-trees.json)
- [同条件隔离bundle构造](./_resources/261017-evaluate-scheduler-delta-overlay-materialization/build.ts)
- [并发、拒绝、取消与preseed差异probe](./_resources/261017-evaluate-scheduler-delta-overlay-materialization/concurrent-oracle.mjs)
- [冻结v1与Core oracle、独立metrics入口](./_resources/261017-evaluate-scheduler-delta-overlay-materialization/driver.mjs)
- [memory-bun.json](./_resources/261017-evaluate-scheduler-delta-overlay-materialization/memory-bun.json)
- [独立memory与allocation入口](./_resources/261017-evaluate-scheduler-delta-overlay-materialization/memory-driver.mjs)
- [memory-isolated-bun.json](./_resources/261017-evaluate-scheduler-delta-overlay-materialization/memory-isolated-bun.json)
- [memory-isolated-node.json](./_resources/261017-evaluate-scheduler-delta-overlay-materialization/memory-isolated-node.json)
- [fresh-process强引用与JSC观测](./_resources/261017-evaluate-scheduler-delta-overlay-materialization/memory-isolated-worker.mjs)
- [fresh-process内存编排](./_resources/261017-evaluate-scheduler-delta-overlay-materialization/memory-isolated.mjs)
- [memory-node.json](./_resources/261017-evaluate-scheduler-delta-overlay-materialization/memory-node.json)
- [metrics-node.json](./_resources/261017-evaluate-scheduler-delta-overlay-materialization/metrics-node.json)
- [两runtime实际PASS输出](./_resources/261017-evaluate-scheduler-delta-overlay-materialization/oracle-results.txt)
- [可合并覆盖与批量固化adapter](./_resources/261017-evaluate-scheduler-delta-overlay-materialization/overlay.ts)
- [源身份、四入口变换、bundle与资源哈希](./_resources/261017-evaluate-scheduler-delta-overlay-materialization/source-manifest.json)
- [timing-bun.json](./_resources/261017-evaluate-scheduler-delta-overlay-materialization/timing-bun.json)
- [timing-node.json](./_resources/261017-evaluate-scheduler-delta-overlay-materialization/timing-node.json)
- [timing-v2-bun.json](./_resources/261017-evaluate-scheduler-delta-overlay-materialization/timing-v2-bun.json)
- [timing-v2-node.json](./_resources/261017-evaluate-scheduler-delta-overlay-materialization/timing-v2-node.json)
- [六全排列平衡计时入口](./_resources/261017-evaluate-scheduler-delta-overlay-materialization/timing-v2.mjs)
