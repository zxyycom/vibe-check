# 临时 Δ 覆盖层：证据导航与复跑

[调查报告](../../evaluate-scheduler-delta-overlay-materialization.md)承接结论和适用条件。本目录保存实际 Core 隔离实验的 adapter、runner、样本与身份，用于复核当次行为和观察；adapter 的支持范围限定于本实验使用的 API。

## 按复核任务读取

| 复核任务 | 文件 | 内容 |
| --- | --- | --- |
| 输入、构建与覆盖实现 | `source-manifest.json`、`build.ts`、`overlay.ts` | 23 个 Product 源文件、四个 runtime import 重绑入口、两个 bundle 身份；覆盖复制、消去、枚举和批量固化。 |
| 正确性 | `driver.mjs`、`concurrent-oracle.mjs`、`adapter-oracle.ts`、`oracle-results.txt` | Core 差异 oracle、并发/拒绝/cancel/preseed 切片、native 容器参考及 PASS 输出。 |
| 计时 | `timing-v2.mjs`、`timing-v2-*.json`；`timing-*.json` | v2 六全排列平衡取样；v1 固定顺序样本独立保留。v1 入口位于 `driver.mjs`。 |
| 操作量 | `driver.mjs`、`metrics-node.json` | 独立 instrumentation 的写入、Δ 复制、固化和外部读取计数。 |
| 内存 | `memory-driver.mjs`、`memory-{node,bun}.json`；`memory-isolated*.mjs`、`memory-isolated-*.json` | 初次同进程观察，以及每 cohort/variant 独立进程的补证。 |
| 采样分配 | `memory-driver.mjs`、`allocation-node-trees.json` | Node 4096B 采样的完整 head 树、原 sample count/sizeSum 与原 raw 哈希。冗长 sample ID/ordinal 数组留在 tmp 原始文件中。 |

### Helper 来源

`oracle-results.txt` 仅将文件末尾空白规范为一个 LF；原始哈希和处理方式记录在 manifest 的 `resourceFormatting` 中，结果行保持原样。

v1→v2 timing 的 graph/initial/workload helper 逐字复用，workload SHA-256 见 manifest。
memory helper 是其中 wide/fanout、point/branches 的语义等价切片，省略其它形状与读取分支；fresh-process worker 沿用切片并增加测量隔离。
已执行的 `memory-driver.mjs` 首行“workloads copied verbatim”范围过宽；runner 保留执行原字节，以本说明限定其来源主张。

## 工作量与指标

### 计时

24 cohorts 为 N32/256/2048 × 8 种组合：wide、G=N、deep、fanout、occupied 的 point 轨迹，以及 wide 的 full/readheavy/branches。

- point：逐 Task 按 static 选择后立即 settle。
- full：每个 selected 状态完整查询 catalog＋inspection，推进 min(N,128) 步。
- readheavy：每个 selected 状态额外 32 次 validate＋32 次 static 查询，推进 min(N,256) 步。
- branches：共享 root 的 8 条独立路径，各 min(N,128) 步；逐步保留 settled state，计时尾部仅枚举各分支最终 settled members。正确性 oracle 另对旧 state 逐一反向完整查询。

v2 使用 2 warmups＋6 samples，六种全排列让每个 variant 在每个位置出现两次。compile/seed/GC 位于 span 外，声明的查询与 assert 位于 span 内；instrumentation/profile 关闭。v2 显式使用 Node global.gc/Bun.gc(true)；v1 仅使用 global.gc?.()，两轮 GC 口径分别解释。结果 digest 一致只用于同工作量核对，语义证据由 oracle 承接。

### 操作量、分配与内存

| 指标 | 含义与边界 |
| --- | --- |
| copies / copiedEntries | Δ 首次实际写入的 native Map 复制次数 / 复制的旧条目数。 |
| flushes / flushedEntries | 固化次数 / 固化条目数；maxDelta 为所有容器中的最大 distinct 覆盖数。阈值在发布时检查，大 batch 可超过阈值。 |
| writes / seedOperations | 前者为实际净变更，含 batch；seed 单独记录。 |
| gets / baseReads | 只计外部 view.get，不含 batch 内与枚举内部 base 读；baseline Immutable 节点未计数。 |
| Node allocation sampling | 4096B 间隔，包含 major/minor GC 已回收对象；单次估计。完整 head.selfSize 与原 samples.sizeSum 分别保留、分别解释，协议字段差异未归因。 |
| memory before / end / postGC | 已 seed root 并 GC 后 / run 结束时 / 显式 GC 后。holder 保留 root/result；采样树会影响 profile 模式内存，因此 retained 依据取非 sampler 模式。 |
| maxRSS | 进程累计高水位，不是某个 variant 的瞬时峰值。 |

初次同进程负值及 Bun end=postGC 原样保留。fresh-process 补证中，Node point 负值仍未完全解释；Bun 在事件循环刷新后另读 `bun:jsc` heapStats。两 runtime 指标各自比较，heap/RSS 观察不能换算精确对象大小。分支 memory 场景保留 1024 个 states；point 不保留完整轨迹。

## 复跑步骤

前提是工作区 Product digest、依赖版本与 manifest 一致，并已授权构建和测量。
将本目录的脚本放入 `tmp/scheduler-delta-overlay-investigation/`；先核对该目录已有内容，保留未知工作。
build 在此精确目录写 entry、两个 bundle 和 manifest，其余命令按下面路径写样本；源码只读。

```sh
mise exec -- bun run tmp/scheduler-delta-overlay-investigation/build.ts
mise exec -- node --expose-gc tmp/scheduler-delta-overlay-investigation/driver.mjs oracle
mise exec -- bun run tmp/scheduler-delta-overlay-investigation/driver.mjs oracle
mise exec -- node --expose-gc tmp/scheduler-delta-overlay-investigation/concurrent-oracle.mjs
mise exec -- bun run tmp/scheduler-delta-overlay-investigation/concurrent-oracle.mjs
mise exec -- bun run tmp/scheduler-delta-overlay-investigation/adapter-oracle.ts
mise exec -- node --expose-gc tmp/scheduler-delta-overlay-investigation/timing-v2.mjs timing both tmp/scheduler-delta-overlay-investigation/timing-v2-node.json
mise exec -- bun run tmp/scheduler-delta-overlay-investigation/timing-v2.mjs timing both tmp/scheduler-delta-overlay-investigation/timing-v2-bun.json
mise exec -- node --expose-gc tmp/scheduler-delta-overlay-investigation/driver.mjs metrics both tmp/scheduler-delta-overlay-investigation/metrics-node.json
mise exec -- node --expose-gc tmp/scheduler-delta-overlay-investigation/memory-driver.mjs tmp/scheduler-delta-overlay-investigation/memory-node.json
mise exec -- bun run tmp/scheduler-delta-overlay-investigation/memory-driver.mjs tmp/scheduler-delta-overlay-investigation/memory-bun.json
mise exec -- node --expose-gc tmp/scheduler-delta-overlay-investigation/memory-driver.mjs tmp/scheduler-delta-overlay-investigation/allocation-node.json profile
mise exec -- node --expose-gc tmp/scheduler-delta-overlay-investigation/memory-isolated.mjs tmp/scheduler-delta-overlay-investigation/memory-isolated-node.json
mise exec -- bun run tmp/scheduler-delta-overlay-investigation/memory-isolated.mjs tmp/scheduler-delta-overlay-investigation/memory-isolated-bun.json
```

各阶段在同机独占窗口串行运行，timing、metrics 与 profile 分开。复跑结果写 tmp，形成时资源保持原样。

## 材料归属与保留

本目录随报告保留。`tmp/scheduler-delta-overlay-investigation/` 中的 bundle、entry、原始完整 profile 和工作旁注用于本轮审计；核对正式资源齐全后，可在覆盖该精确目录的删除授权下清理。报告不新增正式测试 Case 或长期 benchmark 维护义务。

## v2 完整局部计时

单位ms，单sample为该cohort全部推进与声明读取；每格median [min, max]。小差异与区间重叠不表示显著性。全部原始6samples见各runtime raw，v1另存而不混并。

### Node

| N / shape / read / steps | baseline | Δ8 | Δ32 |
| --- | ---: | ---: | ---: |
| 32 / wide / point / 32 | 0.955 [0.639, 1.190] | 1.110 [0.912, 1.464] | 0.911 [0.775, 1.322] |
| 32 / groups / point / 32 | 0.839 [0.558, 1.239] | 0.951 [0.881, 1.197] | 0.985 [0.832, 1.160] |
| 32 / deep / point / 32 | 0.866 [0.490, 1.148] | 0.864 [0.745, 1.031] | 1.013 [0.816, 1.527] |
| 32 / fanout / point / 32 | 0.527 [0.511, 0.642] | 0.886 [0.730, 1.249] | 0.994 [0.708, 1.023] |
| 32 / occupied / point / 32 | 0.632 [0.528, 1.579] | 1.189 [0.888, 1.548] | 1.224 [0.832, 1.866] |
| 256 / wide / point / 256 | 3.439 [2.708, 3.764] | 5.348 [4.883, 5.562] | 5.770 [5.394, 7.268] |
| 256 / groups / point / 256 | 3.976 [3.506, 6.121] | 5.996 [5.484, 6.548] | 6.587 [6.191, 8.293] |
| 256 / deep / point / 256 | 3.953 [3.055, 5.077] | 6.025 [5.423, 7.075] | 5.996 [5.609, 9.626] |
| 256 / fanout / point / 256 | 4.170 [2.989, 5.337] | 6.715 [4.703, 7.165] | 6.722 [5.874, 8.014] |
| 256 / occupied / point / 256 | 5.066 [4.215, 5.998] | 6.648 [5.940, 7.835] | 7.660 [6.876, 8.068] |
| 2048 / wide / point / 2048 | 22.793 [21.294, 27.410] | 34.660 [27.600, 42.712] | 36.815 [32.083, 55.907] |
| 2048 / groups / point / 2048 | 34.588 [32.069, 37.103] | 46.985 [38.943, 50.636] | 53.915 [48.152, 58.087] |
| 2048 / deep / point / 2048 | 25.762 [17.483, 29.067] | 34.936 [24.166, 46.983] | 36.712 [34.102, 51.131] |
| 2048 / fanout / point / 2048 | 26.442 [23.091, 31.499] | 41.578 [27.801, 53.842] | 46.498 [34.266, 52.901] |
| 2048 / occupied / point / 2048 | 32.270 [26.013, 49.235] | 43.440 [40.230, 55.397] | 55.874 [45.454, 70.276] |
| 32 / wide / full / 32 | 1.026 [0.932, 1.577] | 1.707 [1.033, 2.663] | 1.922 [1.313, 2.452] |
| 32 / wide / readheavy / 32 | 1.374 [1.047, 1.892] | 1.673 [1.337, 1.948] | 1.877 [1.386, 2.872] |
| 32 / wide / branches / 32 | 1.904 [1.863, 2.116] | 3.634 [2.720, 3.911] | 4.255 [3.206, 4.880] |
| 256 / wide / full / 128 | 9.545 [8.101, 10.748] | 15.618 [13.086, 16.979] | 16.168 [12.649, 19.441] |
| 256 / wide / readheavy / 256 | 7.061 [5.398, 7.551] | 8.683 [6.088, 11.115] | 8.923 [8.296, 11.727] |
| 256 / wide / branches / 128 | 7.702 [5.529, 8.369] | 9.013 [8.464, 11.859] | 10.789 [9.347, 14.376] |
| 2048 / wide / full / 128 | 59.338 [57.988, 62.574] | 87.005 [83.021, 116.182] | 83.534 [80.978, 91.259] |
| 2048 / wide / readheavy / 256 | 8.749 [6.220, 9.762] | 11.311 [8.022, 13.239] | 10.125 [8.434, 13.181] |
| 2048 / wide / branches / 128 | 9.751 [6.823, 10.589] | 14.101 [12.534, 38.241] | 15.928 [15.053, 19.838] |

### Bun

| N / shape / read / steps | baseline | Δ8 | Δ32 |
| --- | ---: | ---: | ---: |
| 32 / wide / point / 32 | 1.239 [0.967, 2.630] | 1.536 [1.070, 2.088] | 1.301 [1.040, 3.426] |
| 32 / groups / point / 32 | 1.306 [1.082, 1.652] | 1.425 [1.203, 2.040] | 1.281 [1.061, 2.256] |
| 32 / deep / point / 32 | 1.080 [0.853, 1.631] | 1.172 [0.847, 1.502] | 1.188 [1.052, 1.390] |
| 32 / fanout / point / 32 | 0.810 [0.741, 1.258] | 1.036 [0.879, 1.318] | 0.984 [0.898, 1.517] |
| 32 / occupied / point / 32 | 1.160 [0.948, 1.846] | 1.243 [1.080, 1.534] | 1.258 [1.123, 1.921] |
| 256 / wide / point / 256 | 5.892 [5.052, 6.932] | 6.925 [6.251, 9.035] | 6.618 [6.214, 8.313] |
| 256 / groups / point / 256 | 6.430 [5.597, 7.944] | 7.184 [6.080, 10.496] | 7.725 [6.790, 9.317] |
| 256 / deep / point / 256 | 6.200 [5.112, 6.744] | 9.216 [6.772, 10.508] | 7.974 [6.430, 11.433] |
| 256 / fanout / point / 256 | 9.229 [4.826, 11.935] | 6.968 [6.273, 9.536] | 7.087 [6.078, 9.256] |
| 256 / occupied / point / 256 | 8.069 [7.029, 9.375] | 8.291 [7.306, 9.839] | 8.591 [7.475, 9.101] |
| 2048 / wide / point / 2048 | 77.525 [49.042, 129.609] | 120.361 [57.476, 239.848] | 77.576 [58.304, 226.613] |
| 2048 / groups / point / 2048 | 102.015 [76.115, 131.298] | 100.544 [91.570, 147.238] | 120.703 [92.639, 136.245] |
| 2048 / deep / point / 2048 | 101.769 [82.391, 135.553] | 105.574 [71.610, 307.966] | 113.267 [85.318, 137.630] |
| 2048 / fanout / point / 2048 | 68.471 [59.489, 84.781] | 76.013 [74.971, 82.415] | 81.529 [76.008, 101.139] |
| 2048 / occupied / point / 2048 | 97.535 [74.392, 105.952] | 107.402 [82.186, 122.548] | 103.203 [94.930, 121.425] |
| 32 / wide / full / 32 | 2.409 [1.499, 7.035] | 3.061 [2.004, 6.446] | 3.274 [1.844, 8.584] |
| 32 / wide / readheavy / 32 | 1.840 [1.212, 2.168] | 2.225 [1.814, 2.633] | 1.908 [1.442, 2.460] |
| 32 / wide / branches / 32 | 5.526 [5.088, 7.690] | 7.052 [4.482, 7.550] | 7.339 [5.312, 7.757] |
| 256 / wide / full / 128 | 43.765 [37.051, 66.763] | 53.449 [37.274, 58.726] | 46.697 [44.845, 54.816] |
| 256 / wide / readheavy / 256 | 10.499 [8.008, 14.712] | 11.817 [9.210, 16.960] | 11.488 [9.791, 12.609] |
| 256 / wide / branches / 128 | 19.702 [15.051, 29.401] | 23.167 [17.680, 35.620] | 29.007 [22.061, 46.279] |
| 2048 / wide / full / 128 | 527.277 [470.967, 874.952] | 587.106 [482.115, 729.042] | 595.659 [484.221, 695.212] |
| 2048 / wide / readheavy / 256 | 10.358 [9.580, 12.691] | 11.382 [11.097, 15.195] | 12.935 [11.191, 14.255] |
| 2048 / wide / branches / 128 | 23.042 [17.744, 26.688] | 30.686 [24.696, 33.884] | 27.209 [24.120, 38.782] |
