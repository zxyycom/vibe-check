---
title: "测量 SCC fileMetrics 分批传输的冷启动与 ceiling 曲线"
id: "260914-measure-scc-file-batch-transport-performance"
formedAt: "2026-09-14T08:30:44Z"
question: "在固定约 620 个小 TypeScript 文件、34,941 个相对路径字符的 corpus 和当前 Linux host 上，stock SCC 4.0.0 的单进程、冷启动、显式 batch-size 与 Windows argv ceiling 曲线是否能按 Change 规则选择一个兼顾启动开销和传输裕量的私有 production ceiling？"
tags:
  - "file-metrics"
  - "performance"
  - "process-boundaries"
  - "scc"
relations:
  - type: "补充"
    target: "260912-diagnose-file-metrics-scc-windows-argument-limit"
    summary: "以 Linux 曲线补足分批 ceiling 选择"
---

## 形成时背景

[Windows argv 根因调查](diagnose-file-metrics-scc-windows-argument-limit.md)已确认约 620 条 exact paths、合计约 34,941 字符会令当前单 SCC process 在 Windows 上越过进程创建边界；它推荐由 file-metrics SCC adapter 私有地分批传输、逐批验收、最后全有或全无汇合。本轮先落实 Change `batch-file-metrics-scc-exact-input` 的 Implementation 1.1/1.2：用 stock SCC 4.0.0 的实际曲线选择私有 ceiling，随后在 runtime 实现后对同一 corpus 执行最终复测，避免只因“分批一定较慢”或“越大越好”作无数据的取舍。

> **权威性与边界：** 本报告保存 2026-09-14 形成时的性能 observations、ceiling 选择依据和可复现资源；它不拥有当前 runtime 行为。当前行为由 [file-metrics Check 指南](../checks/file-metrics.md) 与 [scanner dependency owner](../development/scanner-dependencies.md)拥有，实现证据由当前代码和测试承接，已完成 Change 的任务历史只通过 Git 恢复。没有 Windows runner 的端到端 stock-SCC acceptance 仍是非阻断未验证边界。

计划已固定 hard maximum `28,000` UTF-16 code units、candidate ceilings `8,000/12,000/16,000/20,000/24,000/28,000`，以及优先安全裕量的规则：以 candidate 中最低 median 的条件为最快条件，选择 median 不超过其 `110%`、p95 不超过其 `115%` 的**最小** ceiling。当前 runner 是 Linux x64 WSL2，不是 Windows runner；本报告只能测量此 host 的 SCC process startup 和分批曲线，不能把它表述为 Windows `CreateProcessW` 验收。

## 调查目的

1. 在固定、可复现的 small-TypeScript exact-path corpus 上建立当前单进程 SCC baseline 和 single-file fresh-process cold-start 观察。
2. 对九档显式 batch sizes 和六档 Windows argv ceilings 记录完整 logical scan 的 wall-time、invocation count、raw rounds 与 p95，确认较小 batch 的冷启动代价曲线。
3. 对每个计数和 warm-up logical scan 验证 SCC CSV 仍只含批准的 exact paths，并与对应的 normalized measurement digest 相等。
4. 严格应用 Change 的选择规则；在 runtime 实现后以同一 workload 复测私有 production ceiling，确认 invocation count、measurement identity 与已选 ceiling 仍一致，再完成语义审核与发布。

## 调查范围与依据

**实现与环境。** 初始曲线形成于 2026-09-14 08:30:44Z、Change Plan baseline `8e2260ed82d0126db0713aa7d4f6d90e7148062a` 上，尚未改动 `src/**`；最终 runtime condition 是后续在已实现 SCC adapter 上的独立复测。实际 binary 是 mise 解析的 `/home/dev/.local/share/mise/installs/go/1.26.4/bin/scc`，输出 `scc version 4.0.0`；运行时 Bun `1.3.14`、Linux x64、kernel `6.18.33.2-microsoft-standard-WSL2`、AMD Ryzen AI 7 H 450、4 logical CPUs。SCC 每次直接收到固定协议 `--no-config --by-file --format csv <exact relative paths...>`；没有 shell、glob、目录 discovery、config 或 wrapper 参与 measurement。

**Corpus。** harness 为每次执行在 host temporary directory 创建 620 个确定性的 TypeScript 文件，随后清理。文件路径均是 relative exact paths，合计恰为 34,941 ASCII/UTF-16 code units；path digest 为 `f790b67942eb21f8980b22865c655bbba6d3db044750be2cc9e5217bef30c218`，文件 body digest 为 `b4091ceb3d9449597183540df28a714ed59b5ce3c24c77c82860b5bd312ad3c0`。这模拟调用方的文件数与路径量级，但不是调用方 repository 的真实内容、文件大小、语言混合或 Windows path prefix。

**方法。** 每个 condition 串行运行 2 次未计时 warm-up，再运行 10 次保留的计数 rounds；`process.hrtime.bigint` 围住一次 logical scan 的全部 SCC child process 和 harness 内 CSV normalization/digest guard。median 为排序后中位数；p95 为 nearest-rank `ceil(0.95 × n)`，在 n=10 时是最大计数样本；不删除 outlier。baseline 是 620 paths 的一进程 Linux call（其保守 Windows 估算为 71,927，故不能在 Windows 上作为 transport）；cold-start condition 只测第一个 exact path 的 fresh SCC process，因 scope 不同而有独立 digest。显式 batch size 条件按输入顺序切片；ceiling 条件使用 Plan 的保守上界：terminal NUL 加每个 executable、fixed argument 与 path 的 `2 × length + 2`，再加每个非首 argument 的一个 separator。每个 warm-up 与计数 scan 均要求完整 CSV header、每个预期 path 恰一 row、无重复，且 normalized row digest 等于该 condition 的预期值。

**初始曲线材料（选择依据）。** [initial-curve-harness.ts](./_resources/260914-measure-scc-file-batch-transport-performance/initial-curve-harness.ts)是初始实际执行 harness 的**字节一致快照**：其 blob 为 `a30cdf15d86268a99309d6d35acf926fece9d8dc`，仅直接 spawn stock SCC、内置初始 planner 和 CSV guard，完全不 import `src/**`，故可在 `8e2260e` source state 执行。它保留当时的同目录输出目标；为不覆盖受管证据，重跑时须先将该单文件复制到新的临时目录或干净 worktree resource directory，再从 workspace root 执行 `mise exec -- bun <copied-harness>`。 [initial-raw-samples.csv](./_resources/260914-measure-scc-file-batch-transport-performance/initial-raw-samples.csv)是初始 17 条 conditions × 10 rounds 的原始行；[initial-terminal-output.txt](./_resources/260914-measure-scc-file-batch-transport-performance/initial-terminal-output.txt)是初始逐轮 stdout；[initial-summary.json](./_resources/260914-measure-scc-file-batch-transport-performance/initial-summary.json)是在分离资源时由这些保留 observations 重建的可读统计/plan 摘要；[initial-batch-size-curve.svg](./_resources/260914-measure-scc-file-batch-transport-performance/initial-batch-size-curve.svg)与[initial-ceiling-curve.svg](./_resources/260914-measure-scc-file-batch-transport-performance/initial-ceiling-curve.svg)只绘制这 17 条初始 observations。

**最终 runtime 材料（验证，不参与选择）。** [runtime-remeasure-harness.ts](./_resources/260914-measure-scc-file-batch-transport-performance/runtime-remeasure-harness.ts)是随后实际运行的 final-runtime harness；它 import `scanWithScc` 和 `planSccBatches`，所以**不能**在 `8e2260e` baseline 运行，也不得被作为初始曲线的 source。其历史运行会生成混合输出，故同样只能在新的临时 resource directory 重放。[runtime-raw-samples.csv](./_resources/260914-measure-scc-file-batch-transport-performance/runtime-raw-samples.csv)保留该运行的第 18 条 `runtime-production-ceiling-28000` condition 的 10 个原始 rows；[runtime-summary.json](./_resources/260914-measure-scc-file-batch-transport-performance/runtime-summary.json)只总结这一 runtime condition。 [corpus-manifest.json](./_resources/260914-measure-scc-file-batch-transport-performance/corpus-manifest.json)是两轮共用、相同 fixture identity 的受管说明。

## 调查结果与边界

**初始输出等价已确认。** 初始轮的 34 次 warm-up 和 170 次计数 logical scans 均通过 initial harness 的 CSV header、batch-local exact-path、无重复和 normalized digest guard；full-scope baseline、全部 batch-size 与全部 ceiling conditions 的 digest 均为 `f4afbe623636ffdf7a4dde158cc723dace0ac5e4a2861324910602a3b4dfc7a8`。single-file cold-start 的独立 scope digest 是 `481ad69433ed818fe82844494a57428ad5ac256d3332976318ff11394e7b913a`。这只证明 stock SCC 对此 generated corpus 的 by-file CSV output 在不同分批方式下等价；它不证明未来 adapter 的 CSV parser、failure handling、deadline、output accounting 或 final Product result merge。

**冷启动与 batch-size 曲线（ms，10 rounds）。** 当前单进程 baseline 的 median/p95 是 `19.087/28.992`，single-file fresh-process cold start 是 `9.881/11.492`。显式 batch sizes 的完整 logical scan 如下：

| batch size | invocations | median | p95 |
| ---: | ---: | ---: | ---: |
| 1 | 620 | 4,959.687 | 5,450.507 |
| 5 | 124 | 1,023.835 | 1,071.792 |
| 10 | 62 | 532.394 | 1,272.717 |
| 25 | 25 | 212.483 | 253.249 |
| 50 | 13 | 132.163 | 191.735 |
| 100 | 7 | 67.041 | 75.494 |
| 200 | 4 | 39.468 | 42.119 |
| 310 | 2 | 21.385 | 22.113 |
| 620 | 1 | 14.141 | 15.874 |

曲线显示进程数主导这个 small-file workload；620 one-file processes 的 median 约为单进程 batch-size-620 的 351 倍。batch-size-310 的 argv 估算已是 `36,277/35,835`，超过 Windows limit，所以它只说明 Linux process-cost 曲线，不能作为 Windows-safe configuration。

**ceiling 曲线与选择。** 所有 ceiling condition 都保持 full-scope digest；batch count 与 wall time 为：

| ceiling | invocations | median | p95 | 结论 |
| ---: | ---: | ---: | ---: | --- |
| 8,000 | 10 | 88.707 | 95.285 | 不满足门槛 |
| 12,000 | 7 | 66.969 | 77.799 | 不满足门槛 |
| 16,000 | 5 | 56.593 | 61.543 | 不满足门槛 |
| 20,000 | 4 | 41.666 | 47.432 | 不满足门槛 |
| 24,000 | 4 | 41.986 | 44.819 | 不满足门槛 |
| 28,000 | 3 | 29.149 | 30.601 | **选择** |

最快 candidate 是 `28,000`（median `29.149`、p95 `30.601`）；因此门槛分别是 `32.064 ms` 和 `35.191 ms`。只有 `28,000` 同时合格，故按预先声明的“合格者中最小”规则，production private ceiling 应为 **`28,000` UTF-16 code units**。这不是“因性能而取消安全留白”：`28,000` 仍是 Change 已固定的 hard maximum，并相对于 32,767 command-line ceiling 留出 4,767 code units；结果只说明在此特定 host/corpus 上，较小 candidates 的额外 SCC cold-start 成本超过既定门槛。

**最终 runtime 复测。** 后续 runtime harness 在同一 host、Bun、mise-resolved stock SCC、620-file corpus、fixed protocol、2 次 warm-up 与 10 个计数 rounds 上运行唯一的第 18 条 `runtime-production-ceiling-28000` condition，直接调用最终 `scanWithScc`。它以同一 private `28,000` planner 得到 `3` 个 batches（`238/241/141` paths；估算 `27,997/27,900/16,400`），并对 scanner 返回的按 path、code lines、decision tokens 归一 payload digest 做完整 expected-value guard。10 个 runtime rounds 的 median/p95 是 **`37.585/45.186 ms`**，payload digest 为 `b4abd7f5703bae07fee30b88fc2fec20027b3bb78b90c11b0f5fc9d20f86f037`。这个 digest 的字段形状不同于初始 direct-CSV guard `f4af…`，但它验证了同一 620 path 的 `code=1`、`decisionTokens=0` 结果；三次调用、path coverage 和 `28,000` partition 与已选择 ceiling 一致。runtime condition 包含 production parser、batch-local scope acceptance、aggregate uniqueness/sort、shared resource accounting 与 process runner，故 wall time 不与仅直接 spawn/CSV-normalize 的初始 ceiling timing 逐毫秒等同；它不重新定义已经按 predeclared six-ceiling curve 得出的 `28,000` 选择。

**未验证边界。** 没有 Windows runner；因此不证明 Windows executable/path quoting、`CreateProcessW` 或真实 consumer file mix。当前 Linux runtime、fake-SCC adapter tests 与 stock-SCC performance data 不能替代真实 Windows acceptance。真实 Windows stock-SCC 超预算 exact-path acceptance 仍是非阻断但必须明示的未验证边界。

## 随附资源

- [corpus-manifest.json](./_resources/260914-measure-scc-file-batch-transport-performance/corpus-manifest.json)
- [initial-batch-size-curve.svg](./_resources/260914-measure-scc-file-batch-transport-performance/initial-batch-size-curve.svg)
- [initial-ceiling-curve.svg](./_resources/260914-measure-scc-file-batch-transport-performance/initial-ceiling-curve.svg)
- [initial-curve-harness.ts](./_resources/260914-measure-scc-file-batch-transport-performance/initial-curve-harness.ts)
- [initial-raw-samples.csv](./_resources/260914-measure-scc-file-batch-transport-performance/initial-raw-samples.csv)
- [initial-summary.json](./_resources/260914-measure-scc-file-batch-transport-performance/initial-summary.json)
- [initial-terminal-output.txt](./_resources/260914-measure-scc-file-batch-transport-performance/initial-terminal-output.txt)
- [runtime-raw-samples.csv](./_resources/260914-measure-scc-file-batch-transport-performance/runtime-raw-samples.csv)
- [runtime-remeasure-harness.ts](./_resources/260914-measure-scc-file-batch-transport-performance/runtime-remeasure-harness.ts)
- [runtime-summary.json](./_resources/260914-measure-scc-file-batch-transport-performance/runtime-summary.json)
