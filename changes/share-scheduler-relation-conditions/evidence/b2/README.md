# B2：有界修正，仍不采用

B2 只在 B1 的同一共享模型内减少重复成本：canonical signature/atom 编译消重、singleton 质量复用 status、
sole-active root 清理复用、仅在实际 viable-entry 捕获 delay baseline。没有新增旧 route、开关、overlay 或依赖。
`candidate.patch` 含全部实现/测试、直接 owner/Case 和 4 个新文件；身份见 `identity.json`、`build-manifest.json` 和同范围 source inventories。
补丁载体为 `candidate.patch.gz`；复现先在隔离目录解压回 `candidate.patch`，原 identity/恢复证明仍指解压后的 bytes，压缩记录见上级 `patch-compression-manifest.json`。

## 结果与停走判断

**不采用 B2，停止本方向调参。** 小矩阵改善 exact multi Core，但大图 A+Bi/unique/deep 的 total、真实 Run 和保留内存仍不能支撑净价值。
以下是本轮同条件 A/B1/B2 的 median ms；不是把前轮绝对数当作 B2 before/after，也不是统计显著性结论。

| runtime、N1024 完整轨迹 | A | B1 | B2 |
| --- | ---: | ---: | ---: |
| Node Core multi + delay | 35.24 | 35.14 | 32.74 |
| Node Core A+Bi + delay | 51.52 | 63.42 | 61.19 |
| Node Core unique + delay | 55.50 | 62.54 | 61.95 |
| Node Core deep + delay | 26.47 | 34.35 | 34.54 |
| Node public Run multi static / measured | 123.22 / 151.51 | 122.70 / 153.35 | 118.99 / 152.44 |
| Node public Run A+Bi static / measured | 204.93 / 270.17 | 226.41 / 289.57 | 223.00 / 289.22 |
| Bun Core multi + delay | 46.41 | 45.93 | 39.56 |
| Bun Core A+Bi + delay | 74.87 | 95.35 | 90.47 |
| Bun Core unique + delay | 74.61 | 96.77 | 93.80 |
| Bun Core deep + delay | 31.41 | 47.11 | 47.95 |
| Bun public Run multi static / measured | 134.32 / 162.80 | 132.60 / 162.46 | 135.79 / 157.91 |
| Bun public Run A+Bi static / measured | 247.55 / 305.60 | 284.81 / 341.83 | 266.52 / 337.12 |

最小 fresh-process 内存（N1024、post-GC heap delta，MiB，单次观察）也未消除规模代价：
Node multi source snapshots 3.09→2.49、A+Bi 10.82→13.05、unique 11.40→15.52；deep current 1.91→3.27。
Bun 对应 snapshots 8.08→6.40、18.82→22.47、19.50→25.36；deep current 4.84→7.51。
这是 A→B2，不是精确对象大小或峰值推断；原始 signed memory、RSS、外部内存等均保留。

## 已验证与未运行

- pinned Bun 1.3.14 显式目录 Scheduler 测试 74/74（31 files），日志 `scheduler-tests-b2.log`；product type/lint、全树 Case 752/752 entities、185 Cases 通过。
- Node 24.18.0 / Bun 1.3.14 各 214 同条件语义 cohorts，通过每 effect 投影、精确 queue、preseed/failure/cancel、旧状态和独立 fork 对照。
- 每 runtime 24 timing cohorts：N32/N1024 × 4 形状 × delay/none 的 16 Core，及两规模 × multi/A+Bi × static/measured 的 8 public Run。
  3 warmups、6 samples，A/B1/B2 六种排列平衡先后；GC 在 span 外，digest 在计时外比较；关闭 instrumentation/profile。
  total 直接包括 compile/seed、collector、完整执行和声明读侧，不相加分段 median。
- 每 runtime 16 fresh-process memory rows：4 形状 × current/source-snapshots × A/B2；仅作停走所需最小检查，未重复采样或测 B2 forks/full-read 内存。
- **未运行 B2 完整性能矩阵、独立计数/profile、独立产品审查、最终候选优化或完整 Gate**。因为已经拒绝候选，不继续花费验证资源。
  B1 审查只证明 B1；已通过的恢复后 Gate 只证明实际保留 tree，不补成 B2 采用验收。本轮对保留文档的最终整理也不是 B2 候选代码优化或审查。

## 复现与恢复

先按上级[复现入口](../README.md#复现入口)确认补丁与隔离要求。冻结脚本采用与 B1 相同的专属 tmp 布局；先在应用 B1 完整补丁的独立 c45 工作区构建 B1，
再把其 B bundle 放在 B2 工作区的 `tmp/scheduler-shared-condition-implementation/b1/B.mjs`。
另在应用 B2 完整补丁的 c45 工作区构建 `A.mjs` / `B.mjs`，串行用 pinned Node（`--expose-gc`）及 Bun 运行复制到 tmp 的 `verify.mjs`、`small-b2.mjs`、`memory-b2.mjs`。
正式测量必须重新协调独占窗口，输出不能覆盖此处冻结证据。
root 已按 `restore-targets.json` 完成当前 Product 的基线恢复；候选补丁可恢复性另见上级 `restoration-verification.json`，两者不是同一份证明。
