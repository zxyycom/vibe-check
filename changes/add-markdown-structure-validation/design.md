# Design

本设计先建立一个最小 parser-neutral Markdown document boundary，再让 Structure Check只拥有标题规则和结果。

## Context

当前 Product没有 Markdown parser。Check callback已经拥有 global file scope、closed options、Record reporter、signal和 four-state settlement；Core/output不理解 Markdown。首版排序由 [`complete-first-release-check-set-before-publication.md`](../../docs/decisions/complete-first-release-check-set-before-publication.md) 确认，并明确不把旧 measurement catalog 带入首版。

Structure 与 Link场景的真实公约数只有一次 bytes→normalized document解析：heading text/level/range、link occurrence、visible text segment和 parser failure。标题政策、本地目标解析、Records与 verdict仍稳定不同，因此只共享 private document model，不共享 Check或 public options。

## Goals / Non-Goals

**Goals**

- 以维护良好且可审计的 GFM parser取代正则标题识别。
- 固定足以支撑 Structure/Link 的最小 private document model与 source ranges。
- 只交付低噪声、确定性的 heading rules。

**Non-Goals**

- 不公开 AST/parser/provider API或把 parser identity写入 Records。
- 不发布 prose measurements、通用 lint、formatter或 content quality score。
- 不让 Structure Check执行链接/path/network语义。

## Decisions

### Intended Change

1. **Private document boundary。** Readiness 比较 parser候选的 Bun、license、CommonMark/GFM conformance、source ranges、front matter和 link extraction；adapter只输出 immutable normalized headings/links/text segments，不暴露 dependency AST。
2. **Dialect固定且有测试。** 首版使用 CommonMark core与 GFM tables、task lists、strikethrough、autolinks；front matter被识别为 metadata而不是 headings/prose。Parser升级必须重跑共同 fixture corpus。
3. **Rule grammar保持小。** `requireSingleH1`要求恰有一个 H1；`requireFirstHeadingH1`只在存在 heading时要求首个 level=1；`forbidDepthSkips`只禁止后一个 heading比前一个向下跳过一级以上；`maximumDepth`独立限制 level且 `false`关闭。
4. **Records只表达 violations。** Data包含 source path、closed rule、heading semantic ordinal、actual/expected与可选 line/column。ID由 path、rule、normalized heading ancestry/ordinal组成，不用 current location或 parser ID。没有 measurement Records。
5. **Resource bounds与失败。** Check-owned options/implementation设置 byte、node和issue上限；超限/parse/read故障返回受控 `unavailable`，不能静默跳过。正常 issues>0为 `failed`，否则 `passed`；无 inputs为 `not-applicable`。
6. **Public closure。** 新 value/options/runtime validation、exports/contract、README/JSDoc/examples、parser production dependency/license、semantic Cases与 isolated Bun candidate一起交付。

### Resulting Impacts

- Markdown Link Check复用同一 private parse函数与 normalized headings/links，但不会依赖 Structure Check是否注册、执行或通过。
- 共同 boundary变化必须同时运行 Structure与Link fixture tests；这只是实现耦合，不形成新的 public contract。

## Risks / Trade-offs

- GitHub/其它 renderer 的细节并不完全相同；首版只承诺经 fixtures固定的 Product dialect。
- Semantic heading identity在插入同名 heading时可能改变后续 ordinal；这是真实内容结构变化，优于用 line作为身份。
- 减去 prose measurements会降低通用分析范围，但显著减少 Record噪声和主观默认政策，后续真实消费者可另立 Change。

## Open Questions

无。Parser package是 Readiness 中的 private实现选择。

## Implementation Observations

2026-08-24 已按当前 module owners重置；旧 `src/product/**`、TaskPlan、named reference、comparison/cache、measurement catalog与 shared file policy均不再属于本 Change。
