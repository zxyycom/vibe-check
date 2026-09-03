# Live-policy baseline

## Status and boundary

这是本轮在**当前 live-policy 环境**观察到的 before baseline，不是 frozen prediction A/B、不是候选收益、不是跨主机 budget，也不证明任何候选可采用。当前 live-policy 的重复采集会更新 gitignored local learned history；因此这些数字在每次实际算法比较前都必须更新，且若当前 private seam、fail-fast 或 named capacity 发生改变，也必须重新采集。

本记录没有声称 no-record/isolated state，也没有将现有 local learned history 作为可重放实验输入。未来 A/B 必须另行冻结 prediction，并以 no-record 或 isolated state 防止 variant 相互污染。它也不是 durable/replayable evidence：本次 raw logs 已删除，不能从本记录恢复完整 trace、membership、outcome、candidate receipt 或 outer-wall sample。

## Capture environment

| Fact | Observed value |
| --- | --- |
| Runtime | Bun `1.3.14` |
| Host | Linux WSL2, `x86_64`; AMD Ryzen AI 7 H 450 |
| Parallel processors | `nproc=4` |
| Exact candidate | `0.0.0-local.bcf13cae4f4b` |
| Declarative fingerprint | abbreviated display `4a76afb8…c9079141`; not a complete identity |
| Workload | current live policy, required/full Project Gate profiles |
| Warm-up | each profile warmed once; warm-ups excluded |
| Accepted observations | five sequential observations per profile |

The candidate identifies this capture only; the displayed fingerprint is abbreviated and is not a complete identity. Neither establishes frozen prediction, membership/outcome equality, or comparison validity required for the future strict-baseline/candidate A/B.

## Capture method and evidence retention

This capture used the existing `runProjectGate` test injection and redirected **only** the invocation log to `/tmp`; selection, exact candidate, bound Project Run, `mise`, and profile were unchanged. It was not a formal `bun run verify:vibe-check-workspace:required|full` A/B collection. The `/tmp` raw logs have since been deleted. Consequently this file is orientation/live baseline only, not durable or replayable evidence, and it contains no preserved formal-command outer-wall samples.

A future formal A/B must use `bun run verify:vibe-check-workspace:required` and `bun run verify:vibe-check-workspace:full`, through a Change-local/evidence-only script runner in the target Change exclusive worktree that keeps production learned binding strict and temporarily sets central Gate Definition to strict/candidate experimental custom callbacks over one frozen prediction-derived score table. It changes only `scripts/project/gate/definition.ts` (and a necessary single script assertion), never `src/**` or package inputs, then safely restores verified base bytes/hash in `finally`. It retains raw evidence for every run and uses each command’s outer wall as the primary timing endpoint. `elapsed-to-initial-result` and Scheduler summaries are attribution evidence only; the advisory threshold remains non-budgetary. The runner has no public config/env switch, registry, or hidden runtime selector.

## Gate elapsed-to-initial-result attribution observations

All values are milliseconds. `p50` is the median; `p95` is the nearest-rank fifth value of five. `CV` is reported only as observed local variation, not a budget.

| Profile | Raw initial observations | p50 | p95 | CV |
| --- | --- | ---: | ---: | ---: |
| required | 9552.1, 9198.4, 9586.1, 9604.9, 8894.1 | 9552.1 | 9604.9 | 2.93% |
| full | 16086.6, 15367.4, 15500.3, 15618.3, 15479.4 | 15500.3 | 16086.6 | 1.62% |

These samples are live-environment attribution observations only, not the primary timing baseline. Future A/B uses formal-command outer wall as pre-registered primary, one warm-up per variant/profile, and preserved raw evidence. Its fixed sequence is: odd groups baseline-required→candidate-required→baseline-full→candidate-full; even groups candidate-required→baseline-required→candidate-full→baseline-full. It must not compare a later result directly to these values as a candidate gain.

## Scheduler-summary observations

Values are milliseconds except utilization. `span` is the Scheduler summary span, `util` is root-slot utilization, `wait` is accepted policy wait, and `tail` is completion tail. The columns report the observed median / nearest-rank p95 across the five accepted current-live-policy observations.

| Profile | Span p50 / p95 | Util p50 / p95 | Accepted wait p50 / p95 | Tail p50 / p95 |
| --- | ---: | ---: | ---: | ---: |
| required | 9029.513 / 9061.199 | 0.996207 / 0.996773 | 8909.893 / 8930.252 | 17.512 / 18.317 |
| full | 14916.617 / 15483.082 | 0.997688 / 0.998002 | 14774.031 / 15346.202 | 19.783 / 21.176 |

The scheduler summary is diagnostic evidence. It is not public telemetry, does not replace ordered admission traces or protected-delay assertions, and cannot be summed into CPU/OS utilization or a cross-host performance threshold.

## Re-capture trigger

Before freezing candidate evidence, update this document for the actual comparison environment and, only if deterministic adopt path remains open, run the two formal `bun run verify` commands through the script runner in the fixed sequence. Retain raw logs, formal outer wall, exact reused installed candidate/receipt, script base/variant bytes/hash, base/variant tracked-diff fingerprint, complete experimental custom Definition fingerprint, graph/membership/outcome fingerprints, frozen prediction/score provenance, state isolation/no-record method, ordered trace, scheduler summary, and each pair's timing; restore only when current script bytes match expected variant bytes, then verify base hash, otherwise fail and retain the scene. Re-capture instead of reusing this baseline whenever the candidate, runtime/host, live policy, duration prediction preparation, scheduler/capacity facts, profile membership, current private seam, fail-fast, or named-capacity state differs.
