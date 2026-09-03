---
title: "Markdown Link 严格串行 I/O 优化复查"
formedAt: "2026-09-03T07:27:03+00:00"
question: "在相同 1,000 source / 160 target 严格串行 workload 中，最终的 Markdown Link parse-facts cache 优化相对 cfe715d 基线实际改变了什么；是否通过 cold gate，并保持了哪些语义边界？"
tags:
  - "markdown-link-validation"
  - "performance"
  - "serial-io"
relations:
  - type: "复查"
    target: "measure-markdown-link-serial-cache-overhead.md"
---

## 形成时背景

本报告以“复查”关系复查 [`measure-markdown-link-serial-cache-overhead.md`](./measure-markdown-link-serial-cache-overhead.md) 的严格串行 cache 开销基线。该前序报告确认 cache enabled 的 cold relative regression 为 36.14%，未达到当时记录的 cold `<=5%` gate；同时明确 aggregate timing 不能归因于单一 I/O 或 parser 操作。

本轮实现继续遵守活动 Decision [`enable-explicit-markdown-link-parse-cache.md`](../decisions/enable-explicit-markdown-link-parse-cache.md) 和 Markdown Link owner：每次 source 仍读取 exact bytes；cache 默认关闭；hit 不得跳过 current authorization、endpoint validation 或 settlement。用户明确禁止通过 Git/revision/metadata 跳过 source bytes，并要求保持 source I/O 严格串行。

本报告形成时实现已完成且其 before/after raw results 已作为本报告 owner 的受管资源保存。此前尝试过动态 buffer 候选，但其测量表现异常，已撤回；本报告不把它计为最终方案或性能证据。

## 调查目的

以同一 benchmark protocol 对比 cfe715d 前的实现和最终实现，区分可确认的绝对 timing 变化、每份运行内部 enabled-vs-disabled 对比、已证明的语义边界与不能严格归因的差额；判断是否可以声称 cold 性能验收成功。

本报告只拥有本轮形成时的测量认识与受管资源；当前 contract 由 Markdown Link owner、长期方向由活动 Decision、实施进度由 active Change Plan 分别拥有。本轮不改变其中任一 owner，也不将环境波动、Plan stage 或一组绝对 median 表述为完整因果解释。

## 调查范围与依据

- **实现范围：** 最终实现保留 root-contained path 在 containment walk 已取得的最终 endpoint observation，避免重复 endpoint probe；cache hit 跳过 `TextDecoder`，但以 `isUtf8` 继续执行 fatal UTF-8 source-byte boundary；成功 atomic rename 后不再执行无意义的 remove。代码仍按 source 逐项 `await`，不使用 read-ahead 或 source I/O 并发。correctness reviewer 通过后，code-style optimizer 只作 RootProbe 精确 union、EndpointProbe 与 ExistingEndpointProbe 类型精化和 UTF-8 forged-hit test 独立化；这些是 type-only/test-structure 收口，未改 runtime bytes。
- **明确未采用：** digest memo、packed cache、deferred/background write 与动态 buffer 均未保留。多独立 entry 的延后写入并不减少 entry 数量或必需 I/O；packed storage 仍会引入全量重写、并发合并、损坏域与增长管理，未作为本轮低风险优化。
- **环境和 workload：** 两个 raw JSON 都记录 Bun `1.3.14`、Linux x64、AMD Ryzen AI 7 H 450（6 CPU），fixture seed `1592639710`、1,000 sources / 160 normal targets（normal corpus 1,160 Markdown files）、512/2,048/8,192-byte source sizes，以及每 source deterministic 1..5 target links。每组 5 samples，以 median wall time 汇总；cold 清空 application cache directory，但不强制丢弃 OS page cache。
- **比较材料：** before 资源产生于 `2026-09-03T07:09:53.628Z`，对应 cfe715d 版本；after 资源产生于 `2026-09-03T07:22:07.393Z`，对应最终 hit/UTF-8 优化。二者均比较同一 formal runtime direct `executeMarkdownLinkValidation` envelope 的 disabled 与 enabled，且 public-run observation 不作为 gate comparator。
- **harness 与完整复现：** 当前树中 active path `changes/cache-markdown-link-safe-facts/evidence/benchmark.ts` 不存在；实际使用的是明确授权读取的 archived input `changes/archive/cache-markdown-link-safe-facts/evidence/benchmark.ts`。形成时其 SHA-256 为 `68afc4b04ce28ee43dc224041d16a900c42ed703f64c8666bc9e33908e729e60`，working tree、`HEAD` 与 `cfe715d` 的 Git blob identity 均为 `cce26f87c656a8972201e9648146f1d15dd3281d`。在 clean cfe715d worktree 中，先确认 active Change path 不存在；执行 `mkdir -p changes/cache-markdown-link-safe-facts/evidence`，把 archived harness 复制为 `changes/cache-markdown-link-safe-facts/evidence/benchmark.ts`，再执行 raw JSON 的 inner invocation `bun changes/cache-markdown-link-safe-facts/evidence/benchmark.ts --output changes/cache-markdown-link-safe-facts/evidence/results/latest.json`；完成后只在该路径最初不存在的前提下执行 `rm -rf changes/cache-markdown-link-safe-facts` 清理这次临时创建的目录。raw JSON 的 `command` 字段只记录第三步 inner invocation，**不**记录复制或清理。
- **candidate identity 与受管资源：** before 可以以 `cfe715d` 恢复；after 以同一 base 加本报告的 `candidate.patch` 恢复。该 patch 由当前树相对 cfe715d 重新生成，只含 6 个本轮 source/test 文件：`src/cache/cache-json-by-key.ts`、`filesystem-probes.ts`、`local-resolution.ts`、`parse-facts-cache.ts`、`parse-facts-cache.test.ts` 与 `resolver-engine.ts`；不含 Case owner 文档 `docs/testing/cases/scan-scope.md`、其它 docs、Change artifacts 或 index；SHA-256 为 `69806cfe398734c992c90098baa64930b62e5db4057ffe22684cdab51755cc87`。它以 `git diff --binary --unified=0 cfe715d -- <six paths>` 生成，避免 nested unified-diff 的 context 空行触发仓库 trailing-whitespace gate；因此在临时 clean cfe715d tree 以 `git apply --unidiff-zero --binary --check`、apply，并逐文件 `cmp` 这 6 个路径与当前工作树一致。`after-final-hit-utf8.json` 的 SHA-256 为 `023b5672b4a93100941dd596490cbeb8bc8ab54f7fba2238482faf93f245fca1`；`before-old-cfe715d.json` 的 SHA-256 为 `f4332def08fbd5efc67aabd176d130b30f730aec713c57d60b2cea820a0d05e2`。资源包含完整 samples、summary、comparison 与 semantic sections；formal runtime 不公开 physical I/O / parse counters。

## 调查结果与边界

### 已确认的实现和语义事实

- 最终代码保留 strict serial source I/O 和 exact-source-byte identity；cache hit 虽可不 decode Markdown string，仍以 `isUtf8(bytes)` 拒绝非法 UTF-8，因而不绕过 fatal source boundary。
- 两份 raw JSON 的 semantic sections 未出现 `false`。它们覆盖 result/record order、logical target-read limit、cancellation、source-too-large、target-unavailable、nonempty finding、invalid payload、cache I/O failure、exact-byte mutation、hostile payload 和 parser-version invalidation 的 parity；这证明所列边界在该 harness 中保持一致，不替代全量产品证明。
- maxRSS 由 harness 作为累计的 max observed peak 报告，before 约 `997 MiB`、after 约 `988 MiB`；它不是每 sample 隔离内存测量，不能归因于最终优化或用作内存改善结论。
- 独立 correctness reviewer 已对实现、测试、benchmark 与 evidence 整体 PASS；后续 AI-ready/coding-style 收口未改变 runtime bytes。最新 Test Evidence check 为 `383/383` current test entities mapped by `96` semantic Cases；更新的 `docs/testing/cases/scan-scope.md` 是 Case owner evidence，不进入 performance candidate patch。

### 绝对 enabled median 的候选改善

| workload | before enabled median | final enabled median | 差异 |
| --- | ---: | ---: | ---: |
| cold | 4225.98 ms | 3838.41 ms | -9.17% |
| warm | 2495.00 ms | 2114.07 ms | -15.27% |
| incremental | 2475.27 ms | 2092.82 ms | -15.45% |
| high-reuse | 3994.64 ms | 3307.17 ms | -17.21% |

这些 absolute medians 与最终方案减少局部重复工作相一致，但不是严格的全部归因证据：两次 run 的 disabled medians 也明显变化（例如 cold `3086.64 -> 2858.92 ms`、warm `3488.73 -> 2857.57 ms`），且 public observation 从 `3172.92` 升至 `3287.68 ms`（`+3.62%`），after MAD 为 `338 ms`。因此不能把 absolute 差额全部声称为实现导致的收益。

### 每份 run 内的 enabled-vs-disabled 结果和验收结论

- cold penalty 从 before 的 `36.91%` 降为 final 的 `34.26%`，但仍远高于原 `<=5%` gate；**cold 性能验收未通过**，不得称整体验收成功。
- warm improvement 从 `28.48%` 变为 `26.02%`；incremental improvement 从 `23.77%` 变为 `27.02%`。
- high-reuse enabled 相对 disabled 的 penalty 从约 `28.95%` 变为约 `30.86%`；这一 workload 未显示 paired relative 改善。

结论是混合证据：最终 enabled absolute medians 在四个测量 workload 上下降，且列出的语义 parity 未出现 false；但 disabled/public medians 与 variance 也变化，formal runtime 又没有 physical counters，所以无法将全部差额严格归因。cold gate 仍失败，整体性能目标未完成。

### 后续边界

若继续优化，应保持本轮 strict-serial、exact-byte、fatal UTF-8、default-disabled 与 current-settlement 不变量，并以新的完整复查报告保存实质新证据。若要改变 per-entry cache layout、并发模型、source-byte identity 或性能 gate，需要先进行独立设计/授权，而不能从本报告的候选 absolute 改善直接推导。

## 随附资源

- [after final hit utf8 raw benchmark](./_resources/evaluate-markdown-link-serial-io-optimization/after-final-hit-utf8.json)
- [before old cfe715d raw benchmark](./_resources/evaluate-markdown-link-serial-io-optimization/before-old-cfe715d.json)
- [candidate source and test patch](./_resources/evaluate-markdown-link-serial-io-optimization/candidate.patch)
