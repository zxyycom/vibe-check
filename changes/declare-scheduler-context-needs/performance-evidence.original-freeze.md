# Scheduler context needs — performance evidence

历史记录：下文保留 2026-10-13 首次 736-file freeze 的形成时文本、数据与 hash。其中未来式验收说明只反映当时状态，
不代表当前待办；后续 738-file 验收见[独立性能证据](performance-evidence.md)，样本与 raw 均不合并。本次整理后的源码未在这些表中重新测量。

Change-local acceptance evidence, not a permanent benchmark API or an Investigation/index entry. The implementation comparison and opt-in API adoption comparison answer different questions and must remain separate.

**Source boundary after Gate repair:** the tables below describe the original frozen candidate only. Gate subsequently required a function-valued private workbench contract and genuine learned-types/Scheduler-setup module extraction. Independent AST review proved the moved runtime statements/loop/bodies unchanged, but the new call-once setup boundary still changes source and adds a call; therefore these hashes/results are not final-source acceptance. A distinct 738-file final candidate and same-protocol `sample-final.sh` are frozen for root-controlled validation; old raw is retained, never overwritten or pooled with the final run. Final results will be recorded separately.

## Protocol and identities

- Public API path: `run(defineConfig(...))`; each timed invocation creates N independent synchronous passing Checks, with `maxParallel=8`. Shapes/scales: wide-independent N=8/128, P=8. Machine/progress outputs are disabled; diagnostic logging is enabled only in diagnostics-on. Custom policies select the first admissible candidate. Terminal none/execution/raw variants preserve callback count and requested facts, but opt-in variants intentionally request less context.
- Before was frozen before the first needs Product change, with Prepared/local work as common background: `/workspace/vibe-check/tmp/optimization-wave-20261013/scheduler-needs-before/node_modules/scheduler-needs-baseline/src`. Candidate is the non-instrumented mirror `/workspace/vibe-check/tmp/optimization-wave-20261013/scheduler-needs-bench/node_modules/candidate/src`. Neither uses a benchmark-only Product entrypoint.
- Root exclusively ran `/workspace/vibe-check/tmp/optimization-wave-20261013/scheduler-needs-bench/sample.sh` on 2026-10-13, 05:55:39–05:57:46 UTC, exit 0, Bun 1.3.14. Other agents paused heavy work. Each lane is a fresh process with 3 warm Runs followed by 12 timed Runs; first cycle ABBA, second BAAB. Total: 160 batches, 1,920 timed Runs, 480 warm Runs, 20 comparison cells. Timing surrounds the public workload including Definition construction and invariant checks, not process startup/import.
- Every Run checks completed kind, execution count and terminal callback count; execution/raw callbacks check requested admitted facts. Analysis also validates recorded terminal/diagnostic statuses, sample counts, N/P and ordering. All checks passed. Source types/unit tests separately prove readonly/subset/runtime contracts; timing does not replace those tests.
- Root checked before/candidate full-source manifests and owner/harness identities before/after sampling; candidate full-source manifest covers 736 files. A public type-only reviewer correction preceded the final freeze, and its previous manifest is retained. Instrumented source copies are not timing candidates.

The complete original timing batches, recorded analyses, owner identities and protocol text are now in
[historical acceptance evidence](evidence/historical-acceptance.json), alongside the separate final freeze.
Paths below identify the former workspace only. No temporary directory or replay command remains an execution prerequisite.

Raw SHA256: `3b5610f41f87f7ed9f9933b2c3d4195420f7cb514914c1f0f9f81c5c6892d04c`; candidate full manifest: `501c174c45912e1f2a7c7ad638bd8158032b8b2132ce37c9042c687e5f351f5b`; owner manifest: `5ec5c3f9d55acb3c9bbdedecdf2186b187ddb99a3cad7ab5fa3aef4d7306cfd8`; protocol: `bc55e4915d4f16e17f15ed3cf3b05773a14d06cf42a6410ae631af74024237f4`. Before full manifest `/workspace/vibe-check/tmp/optimization-wave-20261013/scheduler-needs-before/source-sha256.txt`: `0706198bd6aed744b8055870c4bd76a6cbb8c4b6fa5252bc59fd6183727dba1d`. Host inspected immediately after timing: Linux 6.18.33.2-microsoft-standard-WSL2, AMD Ryzen AI 7 H 450; no memory/power/host-load profile was captured.

## Statistics

Each side has 48 timed observations per cell. Median averages the two central observations; p95 is nearest-rank; MAD is median absolute deviation from the pooled median. Percent change is B/A−1; negative means faster. The paired median/range uses four adjacent opposite-lane pairs of **batch medians**, respecting ABBA/BAAB; wins count negative paired changes. These are descriptive observations, not confidence intervals or a significance claim. Pooled medians can overstate stable effects: N8 static is -21.07% pooled but only -5.92% paired median, with -26.08%…+26.55% paired range.

### Implementation: same legacy semantics, before → candidate

All callbacks and requests are identical on both sides. Terminal mode suffix names describe which facts the legacy callback reads; legacy callbacks still request full context.

| N | Mode | Before median / p95 / MAD ms | Candidate median / p95 / MAD ms | Median change (absolute) | Paired median; range | Wins |
| --- | --- | --- | --- | --- | --- | --- |
| 8 | static-off | 2.958 / 6.500 / 0.682 | 2.335 / 6.355 / 0.590 | -21.07% (-0.623 ms) | -5.92%; -26.08% … +26.55% | 3/4 |
| 8 | legacy-custom-off | 3.897 / 8.121 / 0.941 | 3.045 / 7.083 / 0.663 | -21.87% (-0.852 ms) | -11.37%; -30.33% … -3.95% | 4/4 |
| 8 | legacy-terminal-none | 2.539 / 6.514 / 0.276 | 2.641 / 6.719 / 0.422 | +3.98% (+0.101 ms) | -5.00%; -5.99% … +23.80% | 3/4 |
| 8 | legacy-terminal-execution | 2.538 / 6.725 / 0.272 | 2.513 / 6.494 / 0.344 | -1.01% (-0.026 ms) | -1.77%; -4.87% … +0.48% | 3/4 |
| 8 | legacy-terminal-raw | 2.904 / 6.769 / 0.509 | 2.492 / 6.819 / 0.346 | -14.20% (-0.413 ms) | -15.63%; -35.33% … +11.65% | 3/4 |
| 8 | diagnostics-on | 5.717 / 10.268 / 1.117 | 5.373 / 10.067 / 0.558 | -6.02% (-0.344 ms) | -5.10%; -23.57% … +5.46% | 2/4 |
| 128 | static-off | 36.276 / 41.492 / 2.212 | 21.776 / 26.859 / 2.070 | -39.97% (-14.500 ms) | -38.56%; -44.35% … -37.12% | 4/4 |
| 128 | legacy-custom-off | 72.034 / 78.741 / 1.791 | 60.004 / 66.630 / 2.088 | -16.70% (-12.030 ms) | -17.78%; -20.70% … -12.68% | 4/4 |
| 128 | legacy-terminal-none | 61.273 / 72.654 / 3.078 | 46.993 / 62.329 / 1.700 | -23.31% (-14.280 ms) | -22.67%; -26.99% … -21.32% | 4/4 |
| 128 | legacy-terminal-execution | 61.637 / 72.456 / 3.454 | 46.408 / 52.243 / 2.361 | -24.71% (-15.229 ms) | -24.03%; -33.47% … -15.88% | 4/4 |
| 128 | legacy-terminal-raw | 60.755 / 73.831 / 3.426 | 47.636 / 55.581 / 2.504 | -21.59% (-13.119 ms) | -23.70%; -30.14% … -12.84% | 4/4 |
| 128 | diagnostics-on | 129.474 / 137.534 / 4.079 | 129.773 / 142.462 / 3.575 | +0.23% (+0.298 ms) | +0.71%; -3.22% … +1.63% | 1/4 |

### Adoption: same candidate, legacy → declared needs

This compares changing callback demand, not a semantics-identical implementation optimization. Custom opts into candidates/runtime; terminal variants opt into none, execution, or rawMeasurement respectively. The callback's required observable result remains checked. Different legacy medians from the preceding table reflect separately collected cells; they must not be substituted across comparisons.

| N | Adoption pair | Legacy median / p95 / MAD ms | Declared median / p95 / MAD ms | Median change (absolute) | Paired median; range | Wins |
| --- | --- | --- | --- | --- | --- | --- |
| 8 | custom full → candidates/runtime | 2.942 / 7.149 / 0.595 | 2.331 / 5.820 / 0.497 | -20.77% (-0.611 ms) | -24.52%; -32.64% … -12.27% | 4/4 |
| 8 | terminal full → none | 2.846 / 7.384 / 0.492 | 2.638 / 5.893 / 0.427 | -7.31% (-0.208 ms) | -12.24%; -20.90% … +3.00% | 3/4 |
| 8 | terminal full → execution | 2.566 / 6.495 / 0.268 | 2.097 / 5.957 / 0.241 | -18.28% (-0.469 ms) | -21.94%; -24.37% … -0.09% | 4/4 |
| 8 | terminal full → rawMeasurement | 2.441 / 6.685 / 0.346 | 2.423 / 6.446 / 0.260 | -0.74% (-0.018 ms) | -1.98%; -7.85% … +1.77% | 3/4 |
| 128 | custom full → candidates/runtime | 63.217 / 70.390 / 2.344 | 23.927 / 29.919 / 1.651 | -62.15% (-39.290 ms) | -60.92%; -63.62% … -59.95% | 4/4 |
| 128 | terminal full → none | 50.401 / 59.899 / 3.342 | 24.112 / 35.615 / 3.084 | -52.16% (-26.289 ms) | -51.99%; -56.28% … -40.11% | 4/4 |
| 128 | terminal full → execution | 47.659 / 53.867 / 1.865 | 22.353 / 28.057 / 2.904 | -53.10% (-25.306 ms) | -52.70%; -53.83% … -49.90% | 4/4 |
| 128 | terminal full → rawMeasurement | 45.876 / 55.105 / 1.856 | 46.994 / 54.197 / 2.117 | +2.44% (+1.118 ms) | +3.72%; -3.66% … +9.42% | 1/4 |

## Operation evidence and interpretation

`operation-counts.ndjson` contains **16 rows only at N=8/P=8**, not multi-scale timing. Complete source-copy counter differences are retained in `before-count-instrumentation.patch` and `candidate-count-instrumentation.patch`. Counter-only facts:

- Static/off: full inspection 17→0, blocker projection 17→0, candidate observation projection 8→0. Actual candidate query and hard guards remain, so this does not prove whole R05 or whole Run has lower asymptotic order.
- Candidate declared custom candidates/runtime and terminal none/execution: no full inspection, raw collector or raw projection. Terminal effects still ran once and succeeded; eight Checks ran. Terminal execution uses the single optional admission source and existing settlement facts, not a second history index.
- Legacy custom retains its collector; inspection falls 34→17 and unused terminal raw projection disappears. Legacy terminal retains collector/raw projection; inspection falls 34→17.
- Declared raw terminal retains collector/raw work. Diagnostics before/candidate retains complete inspection=34, collector=1, blocker=17, candidate observation=8, raw projection=1. Demand does not weaken diagnostic evidence.

The observed N128 static and legacy non-diagnostic improvements support the thin-query/lazy-observation slice. The larger same-candidate gains for declared candidates/runtime and none/execution support real work avoidance rather than merely hiding fields. Raw terminal cannot omit raw collection and shows **+2.44%, +1.118 ms**, with mixed paired direction; no raw-adoption speedup is claimed. N8 legacy terminal none shows **+3.98%, +0.101 ms**, and small cells are noisy. Diagnostics N128 is effectively unchanged within observed dispersion (+0.23%, +0.298 ms); no diagnostics speedup is claimed.

Adoption is justified by the bounded small-input cost and demonstrated scale/work savings, while preserving legacy/full and complete diagnostics costs. It does not require every case to improve and adds no empirical size-routing threshold. Remaining uncertainty: only two sizes, one independent shape, synchronous tasks, one runtime/environment and two cycles; realistic I/O, deep dependencies/scopes, resource contention, memory and other hardware were not measured. No fleet-wide, worst-case, asymptotic or universal latency claim follows. Gate/installed-package acceptance and Decision alignment remain separate root-owned validation boundaries.

## Historical evidence handoff

2026-10-17 补存：[本切面历史验收材料](evidence/historical-acceptance.json)承接仍需复核的样本、方法、身份与边界。
本页其余 `tmp/`、旧 `.log/` 路径仅标注形成时现场，不再承诺保留、读取或执行；历史 source digest 不等于
可重建当时全部未提交源码。源码镜像、fixture、生成 IO、完整 profile 与一次性工具退出，未重新采样或运行 Gate。
这些材料只解释本 Change 的形成时验收，不是永久 benchmark 或可重跑 SDK。
