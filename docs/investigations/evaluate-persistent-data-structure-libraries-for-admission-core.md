---
title: "Admission core 持久数据结构库评估"
formedAt: "2026-09-03T13:52:58Z"
question: "在 optimize-admission-core-selection-index 的 immutable admission state 中，成熟库能否替代 persistent indexed vector、max-priority frontier 与密集 reverse-index/counter，且是否值得进入 Vibe Check 的 public runtime candidate？"
tags:
  - "admission-scheduling"
  - "implementation-libraries"
  - "performance"
  - "persistent-data-structures"
relations:
  - type: "补充"
    target: "functional-utilities-and-data-structures.md"
---

## 形成时背景

`optimize-admission-core-selection-index` 的暂存 B (`chunked-cow`) 实现已经把动态状态表示为：以 64
slot leaf 为单位、根到 leaf path-copy 的私有 balanced `ChunkTree`；同一结构用于 status 和多个数值
counter；以及一个按 task slot 取 max 的持久 leftist heap。compiled graph 的 reverse dependency /
observation / mutex occurrence 索引则是一次构造后冻结的普通数组。每个 immutable successor 必须让
predecessor 可继续读取；forced settlement 还必须保留 task-slot 的准确优先级、重复 relation 的 public
payload 语义与 effect-state 顺序。

本调查由用户明确要求对通用结构优先审查有规模、生态、维护和兼容性证据的成熟库；仅在能力缺失或
库不能满足该具体契约时保留项目自实现。它补充
[`functional-utilities-and-data-structures.md`](functional-utilities-and-data-structures.md)：该前序报告把
Mnemonist 列为按需专用结构能力，但没有判定它能否表示 immutable predecessor 或覆盖当前 admission
frontier。

项目 public runtime 从 `src/index.ts` 进入；package candidate 的 production dependency 名称和精确版本由
`scripts/package/package-contract.ts` 的 `CANDIDATE_DEPENDENCIES` 固定，candidate artifact audit 会拒绝
额外或不匹配的生产依赖。因此任何在 `src/project-run/**` 使用的新 runtime library 都不是仅加一个
`devDependency`：它会进入 public candidate，并需要 package / license / external-consumer verification。
本报告本身不修改产品、Change、Decision、manifest 或 lockfile。

## 调查目的

分别回答而不把「immutable」当成一个笼统能力：

1. persistent indexed vector/array 是否提供 random `get`、bounded path-copy `update` 与 branch sharing；
2. persistent max-priority queue 或 ordered set 是否能在 insert/pop-max 时不复制整个 frontier，并保持当前
   task-slot priority 和 ready-slot 去重语义；
3. dense counter、bitset 与 compile-time reverse index 是否应继续由项目原生 `Array`/`Map`/`Set`（未来有
   证据时再单独测量 `TypedArray`）承担；
4. 在 Bun 1.3.14、项目目标 Node 24、TypeScript、ESM/package exports 和 public candidate 约束下，是否有
   足够理由新增 production dependency。

本轮给出可实施的依赖选择建议与复查条件；不把 isolated benchmark 当成完整 Scheduler 或产品收益，
也不因此授权重写当前 Change。

## 调查范围与依据

本地读取了 `AGENTS.md`、本报告固定契约、performance-optimization skill、编码规范、前序调查、活动
Change 的 proposal/design/tasks/readiness workload，以及暂存的
`src/project-run/task-scheduler/admission-core.ts`。特别核对了 `ChunkTree` / `NumberStore` / `StatusStore` 的
64-slot root-path copy、`withNumberDeltas` 的按 leaf 聚合，和 `mergeForcedTaskQueues` 的 persistent leftist
max-heap。现有 benchmark 的形状包括 T=64/256/1024/4096、branch retention 和 root→80→80 forced cascade；
本轮没有声称重新运行它的完整 Scheduler semantic oracle。

外部数据于 2026-09-03T13:52:58Z 取得，且只使用官方 npm registry version manifest、npm download-count
API、GitHub repository / latest-commit / release API、以及随包 README、declaration 和 LICENSE。版本、最近
npm 发布、license、依赖、unpacked size、file count、module/types/exports 和 engines 来自 npm manifest；star
和 2026-08-04 至 2026-09-02 的下载只作采用信号，不证明正确性或性能。完整可复查快照、端点和原始
字段见[上游快照](./_resources/evaluate-persistent-data-structure-libraries-for-admission-core/upstream-snapshot.json)。

候选以能力而非数量筛选：已安装的 [Mnemonist 0.40.4](https://registry.npmjs.org/mnemonist/0.40.4)、
成熟的 [Immutable.js 5.1.9](https://registry.npmjs.org/immutable/5.1.9)、搜索发现且确实提供 persistent
vector 的 [@rimbu/list 2.1.10](https://registry.npmjs.org/%40rimbu%2Flist/2.1.10)，以及提供 persistent
ordered set 的 [@rimbu/sorted 2.1.10](https://registry.npmjs.org/%40rimbu%2Fsorted/2.1.10)。用
[@datastructures-js/priority-queue 6.4.0](https://registry.npmjs.org/%40datastructures-js%2Fpriority-queue/6.4.0)
复核流行 mutable queue 的边界；`functional-red-black-tree`、`persistent-vector` 与
`@prelude/rb-tree` 只用于否定性筛选：前两者缺失当前 TS/ESM 或维护证据，后者的实际 `insert` / `shift`
会原地改写 tree，不能因 registry 描述而当作 persistent queue。

在 `/tmp/admission-core-library-spike` 创建隔离临时 package，未改工作区依赖。Bun 1.3.14 和由
`mise exec node@24` 提供的 Node 24.18.0 都成功 ESM import `immutable`、`@rimbu/list` 和
`@rimbu/sorted`，并完成 `List.get/updateAt`、`List.get/set` 和 `SortedSet.max/remove` predecessor
检查。对 Mnemonist root `MaxHeap` 的 `push`、以及 datastructures-js `enqueue`，别名观察证明为原地
mutation；Mnemonist 的 `mnemonist/heap.js` subpath 在 Bun 和 Node 24 ESM 都被其 exports map 拒绝，只有
root ESM import 可用。类型检查使用项目 TypeScript 后运行了同一 spike。可复现源码和结果分别见
[spike](./_resources/evaluate-persistent-data-structure-libraries-for-admission-core/spike.ts)、
[spike 复现](./_resources/evaluate-persistent-data-structure-libraries-for-admission-core/spike-reproduction.md) 与
[spike 输出](./_resources/evaluate-persistent-data-structure-libraries-for-admission-core/spike-output.json)。

## 调查结果与边界

### 结论与建议

**建议：本 Change 不立即新增 production dependency，也不把现有自实现当成「已有库仍不必比较」的
永久结论。** `immutable@5.1.9` 是唯一同时具有高采用、近期维护、零 production dependency、内置 TS
和 ESM 的合格 generic persistent-vector 候选；它应成为将来若继续演进这块 generic vector 时的唯一
library baseline。它能替代 status / numeric store 的 `get` / `set` structural-sharing 层，但本轮 isolated
结果不能代替 Change 要求的完整 semantic-oracle、A/B/C workload、retained branch 和 public candidate
验收，故不足以现在把它提升为 production dependency。

对于 forced frontier，没有发现达到相同成熟门槛、并直接提供 persistent `push` + `pop-max` predecessor
pair 的 JavaScript/TypeScript priority-queue package。Rimbu 的 `SortedSet` 是真实的 persistent ordered-set
替代：用 task slot 作唯一 comparator key 时 `max` / `remove` 能维持当前 ready-slot 去重和精确 max；但它
不是 atomic priority-queue API、会引入五个直接 runtime dependencies，且同形 microbenchmark 慢于当前
leftist heap。故应保留很小的 project-owned leftist heap；它唯一拥有的领域条件是 task-slot max、effect
顺序和已去重 ready slot，relation duplicates 仍在编译索引与 public payload materialization 层处理。

静态 reverse index、occurrence array 和密集 counter 不应换成通用 collection library：它们需要的不是
新的 collection API，而是 primitive slot、一次冻结、精确 occurrence order 和按受影响 slot 的 delta。
继续使用项目原生 `readonly number[]` / `Array`、`Map`、`Set`；只有 profile 证明固定宽度、bitwise
batch 或 GC/retention 是瓶颈时，才以同一 full workload 单独比较 `TypedArray`。不要为「bitset」把可变
Mnemonist BitSet 放入 immutable state。

所以目前**不值得无条件新增生产依赖**；但也不应以这份报告为由禁止未来 library candidate。若下一轮要
保留或推广 generic `ChunkTree`，先实现一个只替换 vector storage 的 `immutable.List` development candidate，
在不改变 public DTO、effect/order、duplicate payload 和 callback hard guard 的前提下重跑完整 gate。只有它
同时通过 exact oracle、shared workload 与 retained branches，且 package candidate / license / external
consumer 验收通过，才将 `immutable@5.1.9` 加为精确 production dependency；否则现有 64-slot tree 才有
完整的保留证据。

### 能力与采用对照

| 候选 | 2026-09-03 当前证据 | API 与 immutable predecessor | 安装/打包边界 | 判断 |
| --- | --- | --- | --- | --- |
| `immutable@5.1.9` | 2026-06-29 发布；2026-09-02 default-branch commit；30 日 175,107,327 downloads、33,035 stars；MIT；0 production deps；726,090 bytes/8 files；内置 TS 与 ESM module。 | `List.get` / `set` 返回新 List；官方说明 persistent collections 使用 structural sharing。可覆盖 indexed status/counter 的 generic 层；不提供 priority queue，`OrderedSet` 是 insertion order 而非 priority order。 | 无 `exports` / `sideEffects` declaration，只有 root ESM module；tree-shaking 取决于 consumer bundler。当前 root `dependencies` 和 public candidate 均没有它。 | **唯一 qualified vector baseline；条件性采用。** isolated vector row 快，不足以跳过完整 representation gate。 |
| `@rimbu/list@2.1.10` | 2026-01-20 发布，repo 2026-08-28 有 push；30 日 21,943 downloads、143 stars；MIT；内置 TS、ESM/CJS exports；923,263 bytes/186 files，5 直接 deps。 | README/declarations 明示 persistent tree、`get` / `updateAt` 为 O(logB(N))；spike 保留 predecessor。 | 具 root/custom subpath，但未声明 `sideEffects`；Bun/Node 24 import 成功。其 transitives 约 4.5 MiB on-disk，进入 candidate 的面明显大于 Immutable。 | **不采用。** 功能合格但采用/安装面远弱于 Immutable，不能同时作为 vector 和 frontier 的更小替代。 |
| `@rimbu/sorted@2.1.10` | 与 Rimbu 同一维护信号；MIT；内置 TS、ESM/CJS `./set` subpath；759,688 bytes/134 files，5 直接 deps。 | `SortedSet.add` / `max` / `remove` persistent；相等 task slot 去重符合 core enqueue 前的 `Set`。对相等 priority 而不同 item 必须由 comparator 纳入 stable secondary key；没有 atomic pop pair。 | Bun/Node 24 import 成功；同样无 `sideEffects` declaration、transitive 面大。 | **不采用。** 真实 ordered-set fallback，而不是专业 persistent priority queue；适配层仍需拥有 pop/effect 语义，且 frontier spike 较慢。 |
| `mnemonist@0.40.4`（已安装 devDependency） | 2026-04-30 发布/commit；30 日 62,977,178 downloads、2,434 stars；MIT；types、root ESM、`sideEffects:false`；依赖 `obliterator`。 | `Heap` / `MaxHeap.push` 原地改写；static heap helper 也传入并改写 Array。因此任何 retained predecessor 会被改变。 | root ESM 在 Bun/Node 24 可执行；subpath 只给 `require`，`mnemonist/heap.js` 被 Bun/Node 24 ESM exports 拒绝。它也不在 public `CANDIDATE_DEPENDENCIES`。 | **不用于 immutable admission state。** 前序报告的「按需专用可变结构」结论仍适用于非 branching local work。 |
| `@datastructures-js/priority-queue@6.4.0` | 2026-07-30 发布/commit；30 日 1,301,038 downloads、682 stars；MIT；TS；15,204 bytes/12 files，依赖 `@datastructures-js/heap`，无 ESM entry。 | `enqueue` / `dequeue` mutate receiver；不能保持 immutable predecessor。 | 即使 runtime resolver 能桥接 CJS，仍需将依赖带入 public candidate。 | **不采用。** 下载和小包体不是 persistence 证据。 |
| `functional-red-black-tree@1.0.1`、`persistent-vector@0.0.8`、`@prelude/rb-tree@1.0.1` | 前两者最新 npm 发布分别为 2014、2017，缺内置 TS/modern ESM，后者虽 2026-08 发布、Node >=22 和 TS/ESM，但仅 355 downloads、1 star。 | 前两者维护/compatibility 证据不足；`@prelude/rb-tree` 的 package source `insert` / `shift` 直接写 `tree.root`。 | 都不能构成比上表更低风险的 public dependency。 | **不采用。** 不把 package description 的「persistent」替代 API/alias 实测。 |

上表下载与 stars 仅是横向健康信号；其版本、发布、license、exports、dependencies 与 GitHub activity 的逐项
官方来源均可由随附快照的 `sourceUrls` 重取。Immutable 官方也明确将 `List` 列为 persistent collection
并说明 structural sharing；Rimbu 官方 README 明确列出 Bun/Node 和 persistent list/sorted set：
[Immutable.js repository](https://github.com/immutable-js/immutable-js)、
[Rimbu repository](https://github.com/rimbu-org/rimbu)、
[Mnemonist repository](https://github.com/Yomguithereal/mnemonist)。

### 隔离测量的含义

spike 采用当前 workload 的数量级，而非短 smoke：T=4096、512 arbitrary point transitions、保留 513
个 vector branch；frontier 先有 4096 slots，再保留 64 个 branch，每 branch insert/pop-max 80 slots（对应
root→80→80 cascade 的 fan-out 形状）。每 row 5 warmup、15 measured sample、每 sample 8 次 operation，
在 Bun 1.3.14 Linux 得到：

| isolated batch | wall p50 ms | wall p95 ms |
| --- | ---: | ---: |
| current-derived 64-slot chunk vector | 63.537 | 70.364 |
| Immutable.js List vector | 9.947 | 16.089 |
| Rimbu List vector | 10.627 | 15.500 |
| current-derived leftist max-heap frontier | 19.296 | 25.648 |
| Rimbu SortedSet max/remove frontier | 53.604 | 59.960 |

这些行证明同一 contract assertions 通过，并给出「应把 Immutable 纳入下次 vector gate」的信号；它们**不**
计入 graph compile、reverse-delta、多 store update、public payload sorting/serialization、Scheduler callback
hard guard 或 package bundle，不能宣称 end-to-end speedup、allocation/retained-byte 改善或发布预算。p50/p95
是每 batch 的量，不是单 operation SLA。

### 复查条件与未知

1. 若 `immutable.List` integration candidate 通过完整 oracle + representation gate，并且 package candidate
   的 exact dependency / license / external consumer 验收没有新增不可接受面，则创建后续调查并把 vector
   结论从「条件性」升级为实际采用；若失败，记录失败边界后保留 64-slot tree。
2. 若 forced frontier 改为允许同 priority 多个不同 item、decrease-key、merge 或外部 priority key，重新寻找
   直接提供 immutable pop pair 的维护中库；当前 task-slot unique ready set 不能外推到这些语义。
3. 若 profile 显示 static dense counter 或 reverse occurrence storage 是 allocation/retention hot path，以现有
   complete workload 比较 `TypedArray`，并验证 overflow、freeze/exposure、branch sharing与 exact duplicates；
   本轮没有 `TypedArray` allocation/retention 数值。
4. 当前环境实际验证的是 Bun 1.3.14 与 Node 24.18.0 import/contract smoke，不是浏览器 bundle、supply-chain
   security scan、跨平台 benchmark 或完整 product candidate。package manifest 未声明 engines 的候选也不能仅据
   import smoke 断言未来 Node/Bun 版本兼容。

## 随附资源

- [spike-output.json](./_resources/evaluate-persistent-data-structure-libraries-for-admission-core/spike-output.json)
- [spike-reproduction.md](./_resources/evaluate-persistent-data-structure-libraries-for-admission-core/spike-reproduction.md)
- [spike.ts](./_resources/evaluate-persistent-data-structure-libraries-for-admission-core/spike.ts)
- [upstream-snapshot.json](./_resources/evaluate-persistent-data-structure-libraries-for-admission-core/upstream-snapshot.json)
