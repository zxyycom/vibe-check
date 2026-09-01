# Performance Evidence

此文件保存本 Change 对 Project Gate 静态 admission priority 的最小可审计测量。它只记录这次已执行的 workload identity、原始样本、trace 摘要与采用结论，不定义持续的 Gate 性能规则；advisory threshold 的执行 owner 是 `scripts/project/gate/runtime/performance-baseline.ts`。

## 0.2 implementation 前 baseline

在 Linux x64、Bun 1.3.14、root capacity `3`、local exact candidate reuse 条件下，`0.0.0-local.193b2a48e036` 的每个 profile 先 warm-up 一次，再顺序运行五次。Markdown 在 default trace 中为第 `28/36` 个 admitted Task；所有样本 `dep/mutex waits=0`、`root waits=33`。

| Profile | Wall samples (ms) | Wall median / p90 (ms) | Markdown start range (ms) |
| --- | --- | --- | --- |
| required | 8,547.4, 8,385.9, 8,200.3, 8,255.8, 8,064.6 | 8,255.8 / 8,547.4 | 4,498–4,940 |
| full | 13,958.0, 13,873.4, 14,441.5, 15,234.5, 15,660.9 | 14,441.5 / 15,660.9 | 10,310–12,575 |

## 1.5 final Definition paired measurement

所有样本均通过正式 `bun run verify:vibe-check-workspace:<profile>` 入口；该入口进入 `mise` 锁定 scanner environment。候选版本都是 `0.0.0-local.a99d1e2dbc4e`，root capacity 为 `3`，并且每个 profile/variant 均先顺序 warm-up 一次。default 是最终 Gate Definition（不声明 priority，fingerprint `35f41c18d236e833261e413f680747fd59e54a0cbd28d01057e99bccdd9dec2b`）；tuned 仅为 Markdown Check 临时声明 `admissionPriority: 1`（fingerprint `eaa078b85daeb4f934c84334d698814e0205c02dbc724d13d7f89a5946e48de3`）。

未通过该正式入口直接加载 bound run 时，SCC/Lizard 会落到 unavailable executable sentinel，因而产生 `b3676753ed1ac2264c5e5b4c0d9d317bd753ccc46b17a2d8395f6dbc4862054d`；它不是锁定 toolchain workload，未用于比较或 baseline。

Pair order 为 `default→tuned`、`tuned→default`、`default→tuned`、`tuned→default`、`default→tuned`。`wall / elapsed / start / duration` 分别是外层 Gate wall time、afterGate elapsed-to-initial-result、Markdown ready-to-start delay 和 Markdown execution duration，单位均为 ms。

### Required

| Pair | Default wall / elapsed / start / duration | Tuned wall / elapsed / start / duration | Start change |
| --- | ---: | ---: | ---: |
| 1 | 9,469.4 / 9,179.6 / 5,700 / 2,958.6 | 8,245.5 / 7,976.4 / 19 / 2,362.2 | -5,681 |
| 2 | 8,825.5 / 8,558.9 / 5,791 / 2,271.9 | 9,296.6 / 9,013.0 / 19 / 2,475.7 | -5,772 |
| 3 | 8,480.5 / 8,214.5 / 4,725 / 2,998.9 | 8,429.2 / 8,163.3 / 22 / 2,577.0 | -4,703 |
| 4 | 9,381.0 / 9,062.2 / 5,211 / 3,316.9 | 8,669.5 / 8,412.4 / 20 / 2,776.8 | -5,191 |
| 5 | 8,844.9 / 8,539.2 / 4,791 / 3,233.7 | 8,776.2 / 8,427.3 / 28 / 2,926.1 | -4,763 |

required 的 default/tuned 都是 `30 passed, 6 not-applicable`；每项 `dep/mutex waits=0`、`root waits=33`。两种 variant 的 36 个 task ID 集合相同。下列 trace fingerprint 只用于辨认相同的 admission trace，不替代本表的 task/outcome 与 Markdown ordinal 比较：default 为 `071b5b6191b2c514227c07e0548648ea0c85b34ab7360b1066112274da993192`（pairs 1、3–5）和 `abb7eef251836b089d2e22471f3dc330ed1d24ea0283f54e0aa1f2b097eb2ab`（pair 2）；tuned 为 `b74b5e7c1882b6f8a9c472aad64c09e1fe2eddbb0384216dc391869048251715`（pairs 1、3–5）和 `9f91534fa2e5381509212f9b27e6d903f2d2edf446a853ffe9ddd45225dbd04a`（pair 2）。Markdown ordinal 分别为 default `28`、tuned `1`。

### Full

| Pair | Default wall / elapsed / start / duration | Tuned wall / elapsed / start / duration | Start change |
| --- | ---: | ---: | ---: |
| 1 | 15,777.9 / 15,516.6 / 11,809 / 3,153.9 | 14,519.6 / 14,244.9 / 24 / 2,381.7 | -11,785 |
| 2 | 14,295.7 / 14,032.8 / 10,732 / 2,751.3 | 15,866.7 / 15,598.3 / 19 / 2,398.0 | -10,713 |
| 3 | 14,087.0 / 13,831.0 / 11,055 / 2,246.1 | 14,895.5 / 14,635.2 / 20 / 2,687.9 | -11,035 |
| 4 | 13,988.8 / 13,716.9 / 11,021 / 2,143.0 | 19,876.9 / 19,619.0 / 19 / 2,612.3 | -11,002 |
| 5 | 14,138.1 / 13,888.5 / 10,340 / 3,026.7 | 14,686.0 / 14,416.2 / 20 / 2,856.3 | -10,320 |

full 的 default/tuned 都是 `36 passed`；每项 `dep/mutex waits=0`、`root waits=33`，且 task ID 集合相同。default trace hash 一致为 `c790cc658beb70347a9fc191dfddb03dbae1ced7bf4a4405416c854fe107fb4f`；tuned 为 `b74b5e7c1882b6f8a9c472aad64c09e1fe2eddbb0384216dc391869048251715`（pairs 1–3、5）和 `9f91534fa2e5381509212f9b27e6d903f2d2edf446a853ffe9ddd45225dbd04a`（pair 4）。Markdown ordinal 分别为 default `28`、tuned `1`。

## Adoption and final baseline

五项 raw wall samples 的汇总如下；`p90` 按本项目 baseline 的 nearest-rank 规则取五项中的最大值。

| Profile | Variant | Wall median / p90 (ms) |
| --- | --- | ---: |
| required | default | 8,844.9 / 9,469.4 |
| required | tuned | 8,669.5 / 9,296.6 |
| full | default | 14,138.1 / 15,777.9 |
| full | tuned | 14,895.5 / 19,876.9 |

所有配对的 Markdown start delay 均降低，required 的 tuned wall median 也由 `8,844.9ms` 降至 `8,669.5ms`。但 full tuned wall median 从 `14,138.1ms` 增至 `14,895.5ms`。因此未满足“两个 profile tuned median 均不增加”的采用条件，最终 Gate 不声明非零 priority，effective priority 保持 `0`。

最终 default workload 的 afterGate raw samples 重建 checked-in advisory baseline：

| Profile | Raw elapsed-to-initial-result samples (ms) | Median (ms) | p90 (ms) | Advisory threshold (ms) |
| --- | --- | ---: | ---: | ---: |
| required | 9,179.6, 8,558.9, 8,214.5, 9,062.2, 8,539.2 | 8,558.9 | 9,179.6 | 12,839 |
| full | 15,516.6, 14,032.8, 13,831.0, 13,716.9, 13,888.5 | 13,888.5 | 15,516.6 | 20,833 |
