---
title: "Markdown Link 缓存合并前性能分析"
formedAt: "2026-09-03T08:18:29+00:00"
question: "在保持当前 Markdown Link cache 语义与严格串行约束的前提下，现有 per-entry cache 的直接 API profile 与 storage-mechanics microbenchmark 是否支持下一步正式 runtime 评估有限 shard packing；当前证据能和不能决定什么？"
tags:
  - "cache-design"
  - "markdown-link-validation"
  - "performance"
  - "storage-mechanics"
relations:
  - type: "补充"
    target: "evaluate-markdown-link-serial-io-optimization.md"
---

## 形成时背景

[`evaluate-markdown-link-serial-io-optimization.md`](./evaluate-markdown-link-serial-io-optimization.md) 已保存正式 Markdown Link Check 的 strict-serial before/after 复查：final formal runtime 的 cold enabled-vs-disabled penalty 为 `34.26%`，未达到原 `<=5%` gate。该报告也确认 source bytes、fatal UTF-8、default-disabled cache 和 current settlement 边界不能因性能工作而绕过。

本轮只获得性能分析授权。没有修改 Product、活动 Decision 或新建 Change 的授权；本报告和随附资源只保存形成时的诊断与建议，不把 storage experiment 变成产品格式、并发模型或性能验收结论。

与前序的关系为 **补充**：本报告加入当前 cache API 与可替代 storage layout 的不同层级证据，未修正或推翻前序正式 Check 基线的结论。

## 调查目的

区分三种不可互换的测量：

1. 已有的正式 Check 历史基线；
2. 当前 cache API 的直接 profile，及其独立 syscall-stage 对照；
3. 固定 payload shape 的 packing storage-mechanics microbenchmark。

据此判断“有限 shard packing 是否值得进入正式 runtime 测试”，同时明确当前材料不足以决定产品格式、并发/损坏恢复或增长策略，也不足以宣布 cold gate 通过。

## 调查范围与依据

### 正式 Check 历史基线（非本轮重跑）

前序复查的 formal runtime 使用同一 `executeMarkdownLinkValidation` envelope、1,000 source / 160 target fixture、每组 5 samples 与 median。其 final cold disabled median 为 `2858.92 ms`、enabled 为 `3838.41 ms`，即 `+34.26%`。这是唯一可用于判断该时点 formal cold gate 的证据；本轮没有重跑或替换它。

### 当前 cache API direct profile（非正式 Check）

随附的 `direct-cache-api-profile.ts` 在当前 workspace source 上直接调用 parser/cache API，使用 1,160 synthetic documents 和 strictly serial loops；它没有执行 Project/Check runtime、source collection、endpoint validation、Records 或 settlement。`cache-syscall-stage-profile.ts` 另行测量 1,160 次 842-byte payload 的 missing `readFile`、existing recursive `mkdir`、exclusive `writeFile` 与 `rename`。原始的四个临时 JSONL 已合并为一个受管 JSON 资源，避免零散 artifacts；这些 profile 原始记录没有 formal candidate revision，因此只能说明形成时环境下的直接机制。

7 个 `cache-only-cold` raw values 的 median 为 `755.72 ms`（精确 `755.721428 ms`）；没有把任一 round 当作代表。它约为历史 formal cold enabled-disabled gap `979.49 ms` 的 `77.15%`，但这是跨 benchmark 的量级比较，不是归因，也不能替代 formal Check。独立 stage median（`129.25 + 118.24 + 196.39 + 140.62 = 584.50 ms`）约为 direct median 的 `77.34%`；它们来自不同 profile/run，不能相加为因果分解，却支持“每 entry 的 missing/read/mkdir/write/rename 机械成本是重要候选”的诊断。direct `cache-only-warm` median 为 `181.64 ms`；direct `fresh-parse` median 为 `809.34 ms`，也都不是正式 Check wall time。

### Packing storage-mechanics microbenchmark（非端到端）

随附 `benchmark.ts` 使用 archived deterministic fixture 的 seed、1,000 guides、160 targets 和 1,160 个真实 parser payload；payload preparation、目录准备、warm prepopulation 与 footprint 统计都在计时外。每个被测 scenario 的 lookup 与 publication 在计时区间内严格串行，partial lookup 必须读/parse 其完整 containing pack。每个 raw sample 的 `processMaxRssBytes` 是 scenario 后读取的 `process.resourceUsage().maxRSS`，即整个 benchmark 进程生命周期的累计 high-water；它不是 per-sample/timed-interval memory 或 delta，也不用于任何优化或内存结论。该实验不调用 `executeMarkdownLinkValidation`，不测 source collection、target work、Check settlement 或 physical counter seam；因此表中数据**不能**宣布 formal cold gate 通过。

5-sample median wall times（ms）为：

| entries per storage file | cold population | warm full | warm 1 | warm 100 | one-file incremental |
| ---: | ---: | ---: | ---: | ---: | ---: |
| entry (`1`) | 661.33 | 209.28 | 0.24 | 18.47 | 0.59 |
| about `16` | 54.30 | 43.47 | 0.28 | 15.32 | 0.91 |
| about `64` | 24.95 | 31.16 | 0.40 | 9.44 | 1.12 |
| about `256` | 13.51 | 26.59 | 0.68 | 6.94 | 2.21 |
| single file | 10.64 | 26.74 | 2.93 | 4.58 | 8.06 |

该 corpus 中，entry-file cold 的 1,160 次 empty lookup、`mkdir`、temporary write 与 rename 合计写入 `976,502 B`；约 16 entries/file 形成 73 个 non-empty files，同类操作各为 73 次、写入 `898,968 B`。约 16 entries/file 的 warm one-file lookup 读约 `7,704 B` pack，而 entry file 为 `579 B`；约 64 entries/file 为 19 files，one-file lookup 约 `55,439 B`。single file 进一步减少 cold publication operations，但每次 partial lookup/read-modify-write 面积更大。

## 调查结果与边界

### 确认事实

- formal Check 的 cold gate 仍未通过；direct API 与 microbenchmark 都不是替代验收。
- direct profile 的独立 stage 对照和 microbenchmark 都显示，严格串行 per-entry file operation 数会形成显著机械成本；有限 shard 在该 storage-only corpus 中显著降低 cold population 与 warm full-scan 时间。
- packing 的收益具有 workload trade-off：粒度越大，cold publication 和 100-file scan 越低；warm full 总体显著低于 entry layout，降至约 256 entries/file 后 single file 略回升；warm one-file 与 one-file incremental 的 read/parse/rewrite 成本则上升。

### 建议（基于当前证据的推断）

- **支持的方向：** 进行 bounded shard packing 的正式 runtime 评估已有充分动机；这不是产品格式选择或实施授权。
- **下一步测量：** 约 `16` entries/pack 只是 formal runtime 的首测候选，不是选定格式；应与 `32`、`64` 比较，并使用与历史 formal baseline 相同的 cold/warm/incremental protocol 和语义验证。`32` 尚未出现在此 microbenchmark 中，属于待测比较点，不能从表中直接推断胜出。
- **尚不能决定：** 不选择 single global pack；也不决定 pack schema、atomic publication/merge 规则、corruption fallback、quota/TTL/compaction、无限增长或跨进程 writer semantics。concurrent writers、corruption 和 growth 尚未被测量；naive whole-pack last-writer-wins rename 可能丢失另一个 writer 的新增 entry。

### 重新调查条件

若正式 runtime 测量改变 cold gate 结论、出现真实 concurrent/cache-corruption workload，或拟议公开/持久化 pack format，则必须形成新的调查并先取得相应产品设计与实施授权。

## 随附资源

- [resource reproduction and scope notes](./_resources/analyze-markdown-link-cache-packing/README.md)
- [storage microbenchmark script](./_resources/analyze-markdown-link-cache-packing/benchmark.ts)
- [isolated syscall-stage profile script](./_resources/analyze-markdown-link-cache-packing/cache-syscall-stage-profile.ts)
- [merged direct cache API profile results](./_resources/analyze-markdown-link-cache-packing/direct-cache-api-profile-results.json)
- [direct cache API profile script](./_resources/analyze-markdown-link-cache-packing/direct-cache-api-profile.ts)
- [storage microbenchmark raw results](./_resources/analyze-markdown-link-cache-packing/raw-results.json)
