# Scheduler context needs — performance evidence

本文件保存本 Change 的冻结版本性能验收，不是永久 benchmark API。**实施对照**比较相同 legacy 语义的 before/candidate，
**adoption 对照**比较同一 candidate 的 full 与显式需求；两者回答不同问题，分别阅读。

## 适用版本与复核入口

以下表格绑定 2026-10-13 06:17:30–06:19:50 UTC 测量的 **738-file candidate**：当时已完成 Gate 指向的 owner 提取与
私有 fixture contract 修正。[原 736-file 冻结记录](performance-evidence.original-freeze.md)与 `timing.ndjson` 单独保留；
两个版本的 raw 均未覆盖，样本不合并。738-file 验收重跑的是同一完整协议，不是另选有利 cell。

本次文档与等价代码整理发生在上述测量之后；本文件数值不证明整理后源码已重新测量。后续 Gate 或 installed-package
验收属于 correctness/delivery 证据，不构成新增性能样本。

复核材料位于 `/workspace/vibe-check/tmp/optimization-wave-20261013/scheduler-needs-bench/`：
`timing.final.ndjson`、`root-final-measurement.log`、`final-candidate-source-sha256.txt`、
`final-frozen-owner-hashes.json`、`sample-final.sh`、`workload.ts` 与 `measure.ts`。
`mise exec -- bun tmp/optimization-wave-20261013/scheduler-needs-bench/analyze-final.ts` 只重算
`analysis.final.json`，不执行新采样。

| 冻结对象 | SHA-256 |
| --- | --- |
| raw `timing.final.ndjson` | `1f9d07b9c4865f84a2b3ae3c6dab4ed9487d148d7c005acc0a4e25621ea5bcaa` |
| candidate full-source manifest | `39488871be726a7cf1230cc094faebcf3fe6ab0121013f1a1deb2d52ca335ae4` |
| owner manifest | `ba0b9120e87c05509a8633fde59f48422b38192fdfcdf15ca39053241843e1e1` |
| protocol | `5a6e4d0fef8903ccdebf093ba1fce1971617c00428bff744aee68b6061a3e13b` |
| before `/workspace/vibe-check/tmp/optimization-wave-20261013/scheduler-needs-before/source-sha256.txt` | `0706198bd6aed744b8055870c4bd76a6cbb8c4b6fa5252bc59fd6183727dba1d` |

上述 hash 绑定冻结源码、owner 与协议。宿主信息在首次计时后核对：Linux 6.18.33.2-microsoft-standard-WSL2，
AMD Ryzen AI 7 H 450；未采样 memory、power 或 host load，不能用它们解释版本间波动。

## Workload 与采样协议

- 公开路径为 `run(defineConfig(...))`：每次建立 N 个独立同步 passed Checks，wide-independent N=8/128、P=8、
  `maxParallel=8`。machine/progress 关闭；只有 diagnostics-on 启用诊断。custom 选择首个可准入候选。
  terminal none/execution/raw 保留 callback 次数和所需 facts，opt-in 版本有意减少 context 需求。
- before 在首个 needs Product 改动前冻结，以 prepared/local work 为共同背景：
  `/workspace/vibe-check/tmp/optimization-wave-20261013/scheduler-needs-before/node_modules/scheduler-needs-baseline/src`。
  candidate 为非 instrumented 镜像：
  `/workspace/vibe-check/tmp/optimization-wave-20261013/scheduler-needs-bench/node_modules/final-candidate/src`。
  两者都使用公开 Product 入口。
- 主线程独占执行 `sample-final.sh`，Bun 1.3.14，窗口 140 秒、exit 0；其它代理暂停重负载。
  每 lane 使用新进程，3 warm Runs 后 12 timed Runs；第一轮 ABBA、第二轮 BAAB。共 160 batches、
  1,920 timed、480 warm、20 cells。计时包含 Definition 构造与 invariant checks，不含进程 startup/import。
- 每 Run 检查 completed、执行数和 terminal callback 数；execution/raw callback 核对请求的 admitted facts。
  分析另验 terminal/diagnostic statuses、样本数、N/P 和顺序，全部通过。readonly/subset/runtime 契约另由类型与单元测试证明。
- 采样前后 full-source、owner 与 harness identities 一致。738-file 版本提取有序 setup 为 call-once helper，并将
  learned 类型归入其 owner；AST 与局部测试确认移动内容不变，新 runtime 调用边界仍是重新绑定测量的理由。
  instrumented 镜像仅用于计数，不参与计时。

## 统计口径

每 cell 每侧 48 timed 样本。median 取中间两项均值，p95 为 nearest-rank，MAD 为相对 pooled median 的绝对偏差中位数。
百分比为 B/A−1，负数表示更快。paired median/range 来自符合 ABBA/BAAB 的四对相邻异侧 **batch medians**，
wins 计负变化 pair。这些是描述性观察，不是置信区间或显著性结论。

pooled 与 paired 可能方向不同：N8 static pooled +22.93%（+0.839 ms），paired -4.08%，范围
-15.77%…+37.70%，仅 2/4 wins；不能据此断言小图 static 稳定加速。

### 实施对照：相同 legacy 语义，before → candidate

两侧 callback 和需求相同。terminal mode 后缀表示 legacy callback 实际读取的 facts；所有 legacy callback 仍请求 full context。

| N | Mode | Before median / p95 / MAD ms | Candidate median / p95 / MAD ms | Median change (absolute) | Paired median; range | Wins |
| --- | --- | --- | --- | --- | --- | --- |
| 8 | static-off | 3.659 / 10.282 / 0.655 | 4.498 / 10.394 / 1.538 | +22.93% (+0.839 ms) | -4.08%; -15.77% … +37.70% | 2/4 |
| 8 | legacy-custom-off | 4.721 / 11.994 / 0.907 | 4.107 / 9.515 / 0.863 | -13.00% (-0.614 ms) | -16.48%; -28.29% … -7.78% | 4/4 |
| 8 | legacy-terminal-none | 3.866 / 9.262 / 0.574 | 3.394 / 8.467 / 0.597 | -12.21% (-0.472 ms) | -9.88%; -18.58% … -9.08% | 4/4 |
| 8 | legacy-terminal-execution | 3.614 / 9.091 / 0.693 | 3.344 / 7.346 / 0.707 | -7.47% (-0.270 ms) | -1.56%; -25.63% … +16.52% | 2/4 |
| 8 | legacy-terminal-raw | 3.638 / 8.054 / 0.599 | 3.617 / 7.555 / 0.748 | -0.58% (-0.021 ms) | -3.42%; -10.79% … +13.43% | 2/4 |
| 8 | diagnostics-on | 6.494 / 12.125 / 0.968 | 6.928 / 12.719 / 1.516 | +6.68% (+0.434 ms) | -2.58%; -4.88% … +21.41% | 3/4 |
| 128 | static-off | 44.652 / 61.150 / 3.990 | 24.658 / 39.108 / 4.266 | -44.78% (-19.995 ms) | -38.95%; -53.09% … -31.57% | 4/4 |
| 128 | legacy-custom-off | 82.201 / 103.592 / 4.131 | 69.680 / 99.700 / 4.711 | -15.23% (-12.522 ms) | -15.51%; -20.88% … -12.49% | 4/4 |
| 128 | legacy-terminal-none | 65.958 / 78.857 / 3.689 | 54.065 / 62.331 / 3.970 | -18.03% (-11.892 ms) | -19.10%; -22.45% … -14.23% | 4/4 |
| 128 | legacy-terminal-execution | 64.625 / 81.099 / 4.066 | 52.428 / 62.898 / 3.950 | -18.87% (-12.196 ms) | -17.86%; -26.57% … -8.28% | 4/4 |
| 128 | legacy-terminal-raw | 60.974 / 69.278 / 2.428 | 47.563 / 55.043 / 2.380 | -21.99% (-13.411 ms) | -20.61%; -26.73% … -19.78% | 4/4 |
| 128 | diagnostics-on | 127.530 / 144.569 / 3.422 | 131.779 / 153.692 / 4.184 | +3.33% (+4.249 ms) | +3.92%; -0.72% … +6.62% | 1/4 |

### Adoption 对照：同一 candidate，legacy → declared needs

custom 改为 candidates/runtime；terminal 分别改为 none、execution 或 rawMeasurement。每次仍核对 callback 所需的
可观察结果，但这不是相同需求的实现优化。与上表不同的 legacy median 来自独立采集 cell，不能跨表替换。

| N | Adoption pair | Legacy median / p95 / MAD ms | Declared median / p95 / MAD ms | Median change (absolute) | Paired median; range | Wins |
| --- | --- | --- | --- | --- | --- | --- |
| 8 | custom full → candidates/runtime | 2.943 / 8.033 / 0.380 | 2.817 / 7.111 / 0.752 | -4.25% (-0.125 ms) | -6.88%; -39.58% … +64.45% | 2/4 |
| 8 | terminal full → none | 2.669 / 6.616 / 0.465 | 2.511 / 6.062 / 0.478 | -5.91% (-0.158 ms) | -2.05%; -19.95% … +20.08% | 2/4 |
| 8 | terminal full → execution | 3.081 / 7.322 / 0.466 | 2.255 / 6.244 / 0.271 | -26.80% (-0.826 ms) | -30.99%; -39.04% … -19.35% | 4/4 |
| 8 | terminal full → rawMeasurement | 2.689 / 6.525 / 0.439 | 2.911 / 6.917 / 0.482 | +8.26% (+0.222 ms) | +5.15%; -7.47% … +10.38% | 1/4 |
| 128 | custom full → candidates/runtime | 64.270 / 78.565 / 3.946 | 23.272 / 29.343 / 1.746 | -63.79% (-40.998 ms) | -64.25%; -65.09% … -59.43% | 4/4 |
| 128 | terminal full → none | 48.324 / 56.187 / 2.087 | 22.877 / 32.253 / 2.750 | -52.66% (-25.447 ms) | -53.03%; -53.82% … -49.91% | 4/4 |
| 128 | terminal full → execution | 48.702 / 63.217 / 3.342 | 23.342 / 32.856 / 3.054 | -52.07% (-25.360 ms) | -49.95%; -60.48% … -49.09% | 4/4 |
| 128 | terminal full → rawMeasurement | 48.908 / 57.528 / 3.191 | 47.414 / 54.826 / 2.179 | -3.05% (-1.494 ms) | -2.43%; -13.85% … -1.07% | 4/4 |

## 操作量、收益与代价

`operation-counts.final.ndjson` **仅有 N=8/P=8 的 16 行**，不证明多规模时长。完整计数差分在
`before-count-instrumentation.patch` 和 `final-candidate-count-instrumentation.patch`：

- static/off：full inspection 17→0、blocker projection 17→0、candidate observation 8→0；真实 candidate query
  和 guards 保留，不证明整个 R05 或 Run 渐近降阶。
- declared custom candidates/runtime、terminal none/execution：无 full inspection、raw collector 或 raw projection；
  terminal effect 一次成功、八个 Checks 执行。execution 使用可选唯一 admission source 与既有 settlement facts。
- legacy custom 保留 collector，inspection 34→17，省去未消费 terminal raw projection；legacy terminal 保留
  collector/raw projection，inspection 同为 34→17。
- declared raw terminal 保留 raw 工作。diagnostics 两侧完整 inspection=34、collector=1、blocker=17、
  candidate observation=8、raw projection=1，需求不削减诊断证据。

N128 static / legacy custom 实施 median 分别 -44.78% / -15.23%，均 4/4 paired wins，支持薄查询与惰性观察。
同 candidate 的 candidates/runtime、none、execution adoption 分别 -63.79%、-52.66%、-52.07%，均 4/4 wins，
与计数一起支持真实工作避免，而非先生产再隐藏字段。

raw demand 保留采集：738-file N128 raw adoption -3.05%（-1.494 ms），原 freeze 为 +2.44%（+1.118 ms）；
不形成一般 raw-demand 优化结论。N8 raw adoption 为 +8.26%（+0.222 ms），只有 1/4 wins。

不利结果完整保留：N8 static pooled **+22.93%、+0.839 ms**，paired 方向混合；N8 diagnostics pooled
**+6.68%、+0.434 ms**。N128 diagnostics **+3.33%、+4.249 ms**，paired **+3.92%**、
范围 -0.72%…+6.62%、1/4 wins，p95 144.569→153.692 ms。这可能是真实代价，不能直接当作噪声。
两个循环与两个 freeze 均可复核，未进行第三轮择优重测；版本间波动不能归因于未采样的 host load，或直接归因于 owner 提取。

## 采用判断与未覆盖边界

规模与工作量收益支持采用，并按规模取舍 Decision 接受已观察的小输入及可能诊断成本。legacy/full 和完整 diagnostics
保留原需求成本；不设所有 case 更快条件或经验尺寸路由。

证据仅覆盖两种规模、一种独立 shape、同步 Task、单一 runtime/environment、每个冻结 candidate 两轮。
真实 I/O、深依赖/scopes、资源竞争、memory 与其它硬件未测量，不外推 fleet-wide、worst-case、渐近或普遍 latency 保证。
上轮 Gate/installed-package 43/43 与 Decision aligned 属于独立交付证据，见[任务记录](tasks.md#delivery-evidence)。
