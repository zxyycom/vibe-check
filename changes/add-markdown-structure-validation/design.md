# Design

本设计以一个最小、package-private 的 Markdown parser boundary 支撑标题结构检查；共享实现只承接已被 Structure 与 Link 共同需要的解析事实，规则、Records、final data 和 verdict 始终由 Structure Check 自己拥有。

## Context

当前 Product 已有 ordinary Check callback、closed Check-owned options、global exact file scope、Record reporter 和四态 settlement；当前 direct defaults 只有 `duplicateDetection`、`fileMetrics` 与 `functionMetrics`，并没有 Markdown parser。Core 与 output 不解释 Markdown，也不应接收 dependency AST、raw source bytes 或 parser-private payload。

[`complete-first-release-check-set-before-publication.md`](../../docs/decisions/complete-first-release-check-set-before-publication.md) 已将 `markdownStructureValidation` 选入首次公开 package 前必须完成的五项 ordinary Checks，并限定首版 Markdown structure 只承接确定性标题规则。`add-markdown-link-validation` 在 portfolio 中排在 Structure 之后；二者可复用实现模块，但 Product 没有 invocation-private cross-Check material channel，因此“共享”不得表示共享一次运行的 parse result、Check dependency 或 public contract。

已知事实与尚待选择的内容应分开处理：当前 owner 文档定义 Check/options/scope/Record/output 的稳定边界；本 Change 定义尚未实现的 Markdown 语义与实现步骤；parser package、front matter grammar、public defaults、resource bounds 和 data shape 在以下问题关闭前都不是已确认事实。

## Goals / Non-Goals

**Goals**

- 用维护良好、可审计且能在 Bun runtime 中运行的 CommonMark + GFM parser，而不是正则表达式，得到可测试的 heading facts 和 source ranges。
- 为 Structure 定义小而确定的标题规则、四态结果、safe Records 与 final counts。
- 让 Structure 成为 Link 所需 parser module 的第一个真实消费者，同时避免推测性共享数据模型或 runtime coupling。
- 让 public API、稳定 owner docs、semantic Cases、package material 和 installed consumer evidence 同步闭合。

**Non-Goals**

- 不公开 AST、parser provider、parser identity、parse cache 或 Markdown document API。
- 不发布 prose measurements、通用 lint、formatter、content-quality score 或自动修复。
- 不实现链接、本地路径、网络、HTML attribute 或 plain-prose URL 语义。
- 不让 Structure Check 执行或依赖 Link Check，不建立 shared file-policy、comparison/reference 或 second file collector。

## Decisions

### Intended Change

1. **Execution and input owner — confirmed.** `markdownStructureValidation` 是拥有完整 options 和 direct execution 的 ordinary Check。它只从已分配的 global exact inputs 过滤 `.md` / `.markdown`；adapter 不以 project root 重新发现文件，任何范围或 protocol failure 都由 owning Check 受控地结算。
2. **Parser boundary — confirmed constraints; v1 facts pending D3.** 一个 package-private module 负责 `bytes -> normalized document facts | controlled failure`。它封装 dependency AST，返回 immutable data；Structure 只消费 heading facts。共享模块不缓存、不会将 raw Markdown 或 parse result 传给另一个 Check，也不创建 public parser contract。
3. **Dialect — partially confirmed.** 首版目标使用 CommonMark core 加 GFM tables、task lists、strikethrough 与 autolinks。heading recognition 必须由 fixture corpus 固定，至少涵盖 ATX/Setext heading、code span/fence、HTML、tables、lists 和 Unicode。front matter 与 invalid UTF-8 的精确语法/失败语义尚未确定（D2），不能靠某个 dependency 的隐式行为形成产品契约。
4. **Rule grammar — confirmed except defaults.** `requireSingleH1` 要求恰有一个 level-1 heading；`requireFirstHeadingH1` 仅在文档至少有一个 heading 时要求第一个 heading 为 level 1；`forbidDepthSkips` 禁止当前 heading 相对前一个 heading 向下跨越一个以上 level；`maximumDepth` 独立限制允许 level 的最大值，`false` 关闭这条规则。每条 rule 都独立产生 violation；它们的 default values 由 D1 决定。
5. **Result ownership — confirmed constraints; DTO pending D4.** Structure 只报告 heading-rule violations。正常 execution 的 issue count 决定 `passed` 或 `failed`；无 eligible input 为 `not-applicable`；input read/decode、parse、limit、cancellation 或 Product protocol failure 为 `unavailable`。Record identity 不使用 parser node ID 或当前 line/column；line/column 仅为可选导航信息。
6. **Resource behavior — confirmed fail-closed direction; values pending D4.** byte、parsed-node、issue 和必要的 parser-work limits 由 Check-owned implementation 固定。触及任意上限必须停止该次 Check 并返回可辨认的 `unavailable` reason，不能静默跳过文件、截断 finding 后声称 `passed`，也不能把 limits 扩展为 public tuning options。
7. **Public closure — confirmed.** 默认 value、options runtime validation、exports、README/JSDoc/examples、dependency/license material、owner docs、semantic Cases 与 isolated installed-Bun candidate 在同一 Change 交付。Link 的 public value、options、resolver、slug 与 security semantics 不在本 Change 内实现。

### Resulting Impacts

- Structure 与 Link 的真正公约数是 package-private parse operation、统一的 dialect fixture corpus和 source-range semantics；Record shape、heading policy、link classification/resolution、final data 与 verdict 存在稳定差异，必须保留在各自 Check。
- 若 D3 选择“Structure-first facts only”，Link 在其 Change 中按实际需要扩展 private model 和 shared corpus；若选择“v1 同时含 link facts”，必须在 Structure 实施前精确定义每项 fact、ownership、failure and source-range semantics，并在两个 Change 中同步。两种选择均不产生 runtime handoff。
- 新 public default 会改变 package 的 exported Check inventory 和 generated/public examples；其 documentation、runtime validation、package candidate 和 semantic Case 证据必须与源码一起修改。

## Risks / Trade-offs

- **Default noise:** 当前 repository quality scope 内存在使用 YAML front matter 后直接以 H2 开始的有效 Decision records。把 H1 rules 默认开启会把这类既有有效格式判为失败；过度关闭又会让 default Check 缺少直接价值。D1 需要以真实 corpus 和明确产品取舍关闭。
- **Dialect drift:** CommonMark、GFM 和 GitHub renderer 的细节不完全相同；front matter 尤其不应由 dependency 版本的偶然行为定义。fixture corpus 是 Product dialect 的权威执行证据。
- **Speculative sharing:** 现在输出 Link 或未来 Path Check 才会消费的 visible-text/occurrence facts，会使 Structure 承担无消费者的稳定性成本；保持 Structure-first model 会使 Link 后续需要一个兼容性扩展步骤。
- **Unsafe or unstable output:** heading text、source location 和 parser errors 若直接进入 Record ID、final data 或 diagnostics，可能产生不稳定、过大或不可安全投影的 output。D4 必须固定最小安全 DTO、normalization 和 limit reasons。
- **Dependency lifecycle:** parser selection 会增加 production dependency、license、Bun compatibility 和升级 fixture-maintenance 负担；没有通过 selection matrix 和 installed candidate 前不得加入 package。

## Open Questions

| ID | 必须关闭的问题 | 所需证据与 owner | 阻塞点 |
| --- | --- | --- | --- |
| D1 | 四项 rules 的公开 default values 是什么？当前推荐基线为 `requireSingleH1: false`、`requireFirstHeadingH1: false`、`forbidDepthSkips: true`、`maximumDepth: false`：它在不把有效 H2-first Decision records 误判为失败的前提下提供低噪声结构检查；需要 H1 policy 的 consumer 以 native composition 显式开启。若仍要让 H1 rules 默认开启，必须同时确认全局 scope 或 file-level policy 的产品取舍。 | 产品 owner 确认；本次对当前 dogfood scope 的探索性扫描中，116 份候选有 53 份会因 H1 policy 失败、没有一份存在 depth skip。以该数据、Configuration docs 和 public example 审核。该选择形成稳定 public behavior。 | 1.2、1.3 |
| D2 | Product dialect 如何处理 UTF-8 decoding 与 front matter？需定义前导 BOM/blank、delimiter、closing delimiter、malformed front matter，以及 invalid UTF-8 是 parser input、ordinary issue 还是 `unavailable`。 | parser fixture spike；implementation owner 将结果写回本 Design 与 shared fixtures。 | 1.1、2.1 |
| D3 | 当前 v1 private model 是只输出 Structure 已消费的 heading facts，还是同时固定 link occurrences 与 visible text segments？当前唯一明确的 Structure consumer 是 headings、Link 明确需要 headings/occurrences、没有现有 consumer 需要 visible text segments。推荐前者，并让 Link 按其已定义的真实 consumer 扩展。 | Structure/Link Change owners复核；common-denominator matrix 和 fixture requirements。 | 1.1 |
| D4 | parser dependency/版本、source-range unit 和 base、Record ID grammar、Record/final-data fields、计数口径，以及 byte/node/issue limits 和 unavailable reason codes 分别是什么？ | Bun/license/installed-candidate selection matrix、current Record/output owner、fixtures和 runtime-validation tests。实现 owner 可在既有产品边界内选择，但必须在 1.2 前写回计划。 | 1.2、1.3、2.1 |

这些问题没有关闭前，Plan 仍是结构有效的实施计划，但不应直接开始 1.1/1.2 的产品实现；可以开始 0.3 的只读 evidence spike。

## Implementation Observations

2026-08-24 已按当前 module owners 重置本 Change；旧 `src/product/**`、TaskPlan、named reference、comparison/cache、measurement catalog 与 shared file policy 都不属于本 Change。此观察只说明已移除的范围，不是当前产品实现或验证证据。

同日的本地探索性 heading scan 只用于 D1 风险判断：它按当前 repository quality 的 `docs/**/*.md` / `changes/**/*.md` 包含范围、archive exclusion 和简单 fence/front-matter 处理，得到 116 份候选、53 份 H1 policy 失败、0 份 depth skip。它不是选定 parser 的 conformance test、也不是未来 Check result；0.3 仍必须用选定 parser 和 exact resolved scope 重做证据。
