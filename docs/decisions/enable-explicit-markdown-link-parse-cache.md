---
title: 以显式选项启用 Markdown Link parse cache
status: active
alignment: aligned
createdAt: 2026-09-02T08:06:15Z
purpose: 让大型 Markdown corpus 以显式选项复用 parse facts，并保持本次 Check settlement facts。
background: 私有 workload 不可运行；唯一可复现 corpus 的历史组合证据支持采用。当前严格串行临时复测未通过原 cold gate，非当前验收通过证据。
decision: 采用默认关闭、调用方指定目录的 best-effort persistent parse cache 与 invocation-local target memo。
tags:
  - configuration
  - product-contract
relations: []
---

## 目的

- 让大型或频繁增量运行的 Markdown corpus 复用 exact-content parse facts，并在同一 invocation 避免重复 target read/decode/parse；不缓存或重放 whole Check。
- 让调用方明确决定是否启用、使用哪个 local state directory 以及何时删除它，避免 default global cache 或 output-path inference。
- 保持 source/target authorization、current filesystem facts、Findings、Records、work limits 与 terminal settlement 由每次 Check 拥有。

## 背景

- 用户报告过上千 Markdown 文件项目的 Markdown Link validation 约需五秒，但该项目的 path、command、options、revision 和 samples 均不可获得。此报告仅是 product motivation；`cache-markdown-link-safe-facts` 的唯一 reproducible acceptance input 是其 repository-owned deterministic synthetic corpus。
- repository-owned deterministic corpus 先以 prototype 选择 persistent + memo。此前记录的实际 runtime 五组交错 retest：cold `21.74%` faster、warm `61.61%`、single-file incremental `61.78%`，以及 warm/incremental 分别节省 `1925.18 ms` / `1972.73 ms`。这是**历史组合证据**：它测量的是含现已移除的内部 8 路 source read-ahead 的实现，只说明当时支持采用 persistent + memo 的依据，不能用于声称当前严格串行 source 实现满足性能门槛。
- 当前实现的 source read/decode/parse 是严格串行的；同一 harness 的五组**临时复测**结果为 cold `36.14%` slower、warm `26.17%` faster（`913.52 ms`）、single-file incremental `25.31%` faster（`865.91 ms`）。因此，当前串行实现未通过原 cold `<=5%` gate。该复测只更新当前 runtime evidence 的事实状态：它既不重新解释历史组合数据，也不单独构成当前性能验收通过的证据。
- 本 Decision 只拥有已采用的 exact-content persistent cache + invocation-local memo 的长期语义与边界；它不拥有当前 runtime acceptance。formal runtime 不公开 physical read/parse counters，target memo 的 scoped reuse 由直接 resolver test 证明。可复现的 corpus、原始样本、环境、cache footprint、性能门槛及其通过/未通过结论由 Change evidence owner 保存和验收；后续性能验收必须以当时的当前实现和该 owner 的材料为准。
- 已对齐的 caller-keyed JSON cache 只拥有 identity、payload validation 与 atomic publication mechanics；consumer 必须拥有 key、payload、invalidation、failure 与 state lifecycle，Run 不得 replay Check settlement。
- 当前 Markdown parser 输出 Link-private occurrences、raw destinations、headings 和 ranges；resolver 每次重新完成 local destination、containment、endpoint 与 anchor semantics。`targetReadCount` 公开统计 logical endpoint occurrences，而非 physical read count。
- 调用方已确认 cache 只为 performance acceleration，不要求 cache contents confidentiality，并要求 explicit switch/options。

## 决策

- 采用: `cache-markdown-link-safe-facts` 已实施 **persistent + memo**。`markdownLinkValidation` 使用 default-disabled closed cache option，并在每个 invocation 使用 canonical Markdown target 的成功 parsed-heading memo；不实施 memo-only 或 no-adoption 分支。
- 采用: persistent branch 中，省略 `cache` 解析为 `{ enabled: false }`；explicit disabled branch 只接受 `{ enabled: false }`；explicit enabled branch 必须为 `{ enabled: true, directory: <absolute path without U+0000> }`。disabled branch 不得 create/read cache directory。
- 采用: persistent branch 中，cache directory 是调用方信任、可删除且自行管理容量的 local performance state。Product 不提供 confidentiality、secret protection、tamper resistance、quota、TTL/LRU、automatic cleanup、remote sharing 或 default global directory。payload 可以保存 parse reuse 所需的 raw destination、heading slug 和 ranges；consumer docs 必须说明 source-derived material 可能落盘。
- 采用: persistent branch 中，identity 由 exact authorized source bytes 的 content digest、Link parser contract 和 payload version 组成；payload 只保存 strict Link-private parse facts，不保存 path、filesystem probe、target state、options、Finding、Record、message、duration 或 terminal outcome。content、parser 或 payload change 不得 hit 旧 facts。
- 采用: persistent branch 中，cache miss、invalid/hostile payload 和 read/write failure fresh-parse current bytes，且不自动改变 Check message、Record、final data 或 terminal status。cache hit 只替换 parse computation，不能跳过 file selection、containment、endpoint validation、Finding/Record formation 或 current settlement。
- 采用: memo branch 中，同一 invocation 可按 authorized canonical Markdown target 共享 read/decode/parsed-heading snapshot；每个进入 endpoint validation 的 logical occurrence 仍独立消耗 `maxTargetReads` 并计入 `targetReadCount`，不同 anchor 基于 shared headings 分别形成 current resolution。只保留成功 target facts；失败不作为 memo entry 重放。
- 不采用：将该方向扩大为 Run cache manager、public Markdown model、machine cache telemetry 或其他 Check 的 generic cache。persistent cache 与 invocation memo 均受同一 explicit performance-state boundary 约束。
