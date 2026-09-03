# Design

本 Draft 以“没有真实 consumer 即不扩张”为默认结论；只有用户选择的单一、closed Product outcome 才能进入同一 Change 的后续实现与验收。

## Context

当前 `functionMetrics` contract 只消费每函数 NLOC、standard CCN 和 parameter count。每项已发布 metric 都有 closed option/limit、Finding metric、stable waiver identity、Record/message/final-data/docs 与 Product adapter DTO mapping。translated port 是 Check-private source-aligned closure；它既不是 public parser 也不是 extension registry，façade 的 Lizard-domain DTO 不得泄漏为 Product contract。

报告 [`assess-lizard-extension-adoption-value.md`](../../docs/investigations/assess-lizard-extension-adoption-value.md) 保存了 20 项 optional extension bodies 的形成时评估：19 个 legacy concrete bodies 在 1.24 unchanged，Halstead 是 1.24 新增的三文件 body；上游测试或可翻译性都不能代替 Product consumer、language contract、threshold、performance budget 或实施授权。当前 stable rules 仍以相应 owners/Decisions 为准。完整 Change 名 `sync-lizard-typescript-port-to-1-24-0` 独立承担 source identity/parity/provenance baseline；本 Change 可先收集选择证据，但任何具体 capability 的 runtime implementation 与 acceptance 硬依赖其 1.24 stable commit 已进入实施基线。

## Goals / Non-Goals

Goals:

- 以真实 consumer 决策，而不是 upstream extension inventory，选择 `none` 或一个最小 closed Product outcome。
- 对被选择项闭合 input/options/limits、Finding/waiver/Record/message/docs、adapter DTO、parity、language support、resource/cancellation/determinism 与 performance evidence。
- 若结果为 `none`，保存该不扩张结论并完成本 Change，不修改 Product runtime。

Non-Goals:

- 不公开 extension names、string array、extension loader、generic plugin/parser API 或跨 Check scanner framework。
- 不把 baseline sync 误作自动 capability adoption；不在 1.24 stable source identity 之前实施 runtime。
- 不把 CCN modifiers 作为并行 metrics，不将跨文件 aggregation、CLI/stdout/browser/report behaviors 塞入 `functionMetrics`，也不让 `complextags` 新增独立 settlement。

## Decisions

### Intended Change

默认选择是 **`none`**，直到用户提供会改变实际质量决策的 consumer、候选与可接受边界。完整 inventory 的处理是：

- **Shortlist：** `complextags` 只能作为既有 CCN Finding 的有界 contributor/line explanation；`nd` 是最大嵌套候选，语义包含 `?` 和条件中第一个 `&&`/`||`（例如 `if (a && b)` 的 ND 为 2）；Halstead 先就其 Python-specific classifier、其它语言 generic approximation、float semantics、threshold、performance 和 language promise 取证后再决定。
- **Product policy distinction：** `ns` 不是 `nd` 的同义替代；若消费者需要纯结构 nesting，二者二选一是避免重叠 Finding 的 Product 去重 policy。`modified`、`mccabe`、`nonstrict`、`ignoreassert` 仅是互斥的 `complexityCounting` policy candidates，绝不作为默认并行 extension metrics。
- **Conditional only：** `exitcount` 和 `gotocount` 仅在明确、language-limited 的 legacy C-family coding-rule consumer 下再评估；不能泛化到 55 suffixes。
- **No-adopt / other owner：** `boolcount`、`cpre`、`dumpcomments`、`duplicate`、`duplicated_param_list`、`dependencycount`、`io`、`outside`、`statementcount`、`wordcount` 默认不采用；它们分别是 project/global output、input semantics、CLI/report side effect、已有 duplicateDetection owner、cross-file/API/dependency/graph owner、pseudo-function identity 或与 NLOC 重叠，必须由真实不同 owner 重新提出。

如果用户选择 metric，后续 Plan 必须将该项形成 closed Product capability：明确 consumer 和 supported languages/unsupported behavior；封闭 options 与 per-metric limits；若可 gate，则新增封闭 Finding metric、waiver identity、Record data、human message、final data 和 docs；adapter DTO 只传递必要值；更新 source/provenance/lifecycle parity corpus；给出 exact-input、resource/cancellation、determinism 和 performance proof。若选择 `complextags`，它只能补充既有 CCN Finding/Record/message，不新增 metric、limit、waiver identity 或独立 settlement。

本 Draft 不创建 `tasks.md`、不运行 `plan`，不表示对任何 runtime implementation 的授权。选择 evidence 可以先做；实施只能在 `sync-lizard-typescript-port-to-1-24-0` 的 stable 1.24 commit 成为本 Change 实施基线后开始。

### Resulting Impacts

- **Consumer selection：** 需要可复核的真实 consumer、候选、语言范围、threshold/limit、发布方式和成功判据；缺少其中会改变结果的事实时，保留 `none`，不以推测填补。
- **Public contract closure：** 任何 metric adoption 影响 options validation、limits、Finding identity、waiver reconciliation、Record/final data/message/docs、adapter mapping 与 integration tests；不能只从 port internals 读取字段。
- **Parity and performance:** 被选能力需要按承诺 reader/language 验证数值、line/identity、function/anonymous boundary、malformed input 和 lifecycle。Halstead 另须覆盖 Python/generic classifier 分歧、floating-point expectations 与 performance/resource budget。
- **Policy boundary：** `nd`/`ns` 二选一是 Product duplication policy；CCN modifiers 必须闭合为互斥 policy；`exitcount`/`gotocount` 必须语言受限。其它 inventory 项保持不采用或交给不同 owner。
- **Dependency and completion:** source baseline sync 与 Product capability 有不同 Outcome；`sync-lizard-typescript-port-to-1-24-0` 不依赖本 Change。若选择 concrete capability，本 Change 的 runtime implementation/acceptance 等待其 1.24 stable commit；若选择 `none`，该硬依赖不阻塞以无 runtime 改动完成。

## Risks / Trade-offs

先暴露 generic extension mechanism 会把 upstream internals 变成不受控 public compatibility burden；closed capability 的代价是每项都要完整闭合 Product contract，但可保持 private façade/adapter boundary。`nd` 的条件复杂度语义和 `ns` 的结构语义都可能被误读，故消费者选择和明确文档先于阈值。Halstead 的 cross-language approximation、floating values 与额外分析成本风险最高；没有性能预算和语言 precision expectation 时不能默认采用。

等待 1.24 stable sync 避免 capability implementation 建在过期 source identity 上；代价是 adoption runtime 不能与 sync 并行。选择 `none` 是有效的、最小风险的完成结果，而非未完成的实现。

## Open Questions

只有以下用户决定尚未闭合；其余 inventory 结论已由本 Draft 的 default `none`、shortlist 与 non-goals 处理。

1. 维持 `none`，还是选择一个会改变具体用户质量决策的 closed outcome？若选择，候选只能是 `complextags` 的 CCN 解释、`nd`/`ns` nesting limit、Halstead expression-complexity，或有明确 language-limited legacy C-family consumer 的 `exitcount`/`gotocount`；一次只选一个。
2. 对所选 outcome，支持语言与不支持行为、limit/threshold、waiver/settlement、performance budget（以及 nesting 时的 `nd` 或 `ns` 二选一语义）是什么？这些事实和对进入 Plan/runtime implementation 的明确授权缺一不可。
