# Design

本 active Plan 已完成低风险严格串行优化、测量与独立审核收口；其完成出口是保存 cold gate 未通过的可复核结论，而非把 34.26% penalty 误报为 `<=5%` 通过。用户已授权按该边界归档。

## Context

[`docs/checks/markdown-link-validation.md`](../../docs/checks/markdown-link-validation.md) 与活动 Decision [`enable-explicit-markdown-link-parse-cache.md`](../../docs/decisions/enable-explicit-markdown-link-parse-cache.md) 规定：persistent cache 默认关闭；启用时只复用由当前授权读取的 exact Markdown bytes 决定的 parse facts，且每次 invocation 仍重新收集 source、授权路径并结算当前事实。

用户提供的严格串行临时复测来自 `/tmp/cache-markdown-link-serial-result.json`：同一 1,000 source / 160 target fixture 中，cold baseline `3406.46 ms`、enabled `4637.46 ms`（`+36.14%`）；warm baseline `3491.10 ms`、enabled `2577.58 ms`（`-26.17%`，`913.52 ms`）；incremental baseline `3421.53 ms`、enabled `2555.62 ms`（`-25.31%`，`865.91 ms`）；semantic parity 为 true。该材料是本 Change 的形成时 baseline，不是 after evidence。

## Goals / Non-Goals

目标是保持严格串行和 current-settlement 语义，定位并削减 cache branch 中能够由实现直接证明的冗余成本，并以相同 workload 重新测量。

非目标是恢复 source read-ahead/并发、通过 Git 或 metadata 在读取 source bytes 前跳过内容、改变 cache 默认值或缓存 whole Check settlement、改变 source/target authorization、改变公开 output，或引入 packed cache file。

## Decisions

### Intended Change

已实施的局部调整为：复用 root-contained path containment walk 已获得的最终 endpoint observation；cache hit 跳过 `TextDecoder`，但先以 `isUtf8` 保留 fatal UTF-8 source-byte boundary；successful atomic rename 后不再执行无意义 remove。每项仍不绕过 exact source-byte read、不并发 source I/O，且不改变 cache hit/miss/failure semantic fallback。

用户明确提出的“最后集中写入”不作为当前方案：仅延后多个独立 entry 的写入并不会减少 entry 数量或必需 I/O；单一 packed file 则会引入全量重写、并发合并、损坏域和增长管理复杂度。该项是范围取舍，不是已测量的根因结论。

### Resulting Impacts

- exact bytes 仍须在每个 source 上读取并参与 identity；实现不得以 Git、mtime、size、revision 或其他 metadata 代替 source bytes。
- source read/decode/parse workflow 保持严格串行；优化不得加入 read-ahead、`Promise.all` 或隐式并发。
- cache 默认关闭与 explicit enabled directory contract、caller-owned state、best-effort failure fallback、current endpoint validation 和 terminal settlement 均须保持不变。
- 性能结论必须同时报告 workload、cold/warm/incremental 定义、样本/统计方法与 absolute/relative before-after；只测 warm/incremental 不足以宣称整体优化成功。
- 实现、性能、strict-serial 与 semantic-parity 的 after evidence 已由独立复查报告保存；该报告记录形成时结论和资源，不把它们提升为 current contract 或 cold-gate 通过事实。

## Risks / Trade-offs

最终 enabled absolute medians 均下降，但 disabled/public medians 及 after public MAD 也变化，formal runtime 又没有 physical I/O/parse counters；因此仅可报告候选 absolute 改善，不能将全部差额归因于实现。final cold paired penalty 为 34.26%，仍未达到原 `<=5%` gate；独立审核和 AI-ready/coding-style 收口不改变该性能结论。

保留 per-entry state 仍使 cold cache 具有成本；若要继续优化，应先以新证据判断是否需要独立设计，而非降低 strict-serial、exact-bytes、fatal UTF-8、failure handling、atomicity 或 cache isolation 边界。

## Open Questions

本 Change 没有阻断归档的开放问题。以下仅定义归档后如继续推进时需重新授权和调查的边界：

- 是否继续优化，以及 cold gate 应保持、调整或由新的 consumer evidence 替换；本 Plan 不自行改变它。
- 在不改变公开 contract 的前提下，cold 退化的可归因主导成本是什么；需要新的 instrumentation 或独立设计，现有 aggregate timing 不足以回答。
- 独立 correctness reviewer 已 PASS；后续 AI-ready/coding-style 仅作 RootProbe 精确 union、EndpointProbe 与 ExistingEndpointProbe 类型精化与 UTF-8 forged-hit test 独立化，未改 runtime bytes。这些收口不改变 cold gate 仍未通过的结论。

## Implementation Observations

复查发现 raw JSON 的 `command` 是 inner invocation，且其 active harness path 在最终树不存在；它不能单独复现完整测量。当前可复核步骤是：在 clean cfe715d worktree 确认 `changes/cache-markdown-link-safe-facts/` 不存在；从 `changes/archive/cache-markdown-link-safe-facts/evidence/benchmark.ts` 复制至其原本期望的 `changes/cache-markdown-link-safe-facts/evidence/benchmark.ts`；运行 raw JSON 所列 inner command；随后只清理本次临时创建的 `changes/cache-markdown-link-safe-facts/`。archived harness SHA-256 为 `68afc4b04ce28ee43dc224041d16a900c42ed703f64c8666bc9e33908e729e60`，Git blob 为 `cce26f87c656a8972201e9648146f1d15dd3281d`。

before identity 为 `cfe715d`；final candidate identity 为 `cfe715d` 加后继报告受管 `candidate.patch`。该 patch 从当前树以 `git diff --binary --unified=0 cfe715d -- <six paths>` 重新生成，精确含 6 个本轮 Link/cache source/test 文件（包括 `src/cache/cache-json-by-key.ts`），SHA-256 为 `69806cfe398734c992c90098baa64930b62e5db4057ffe22684cdab51755cc87`；zero-context 避免 patch 被作为仓库文本暂存时的 nested context 空行 trailing whitespace。它不包含 Case owner 文档 `docs/testing/cases/scan-scope.md`、其它 docs、Change artifacts 或 index。已在临时 clean cfe715d tree 以 `git apply --unidiff-zero --binary --check`、apply 与 6 个逐文件 `cmp` 验证。archived harness 只作为历史 evidence input，不是本 Plan 的 current owner。
