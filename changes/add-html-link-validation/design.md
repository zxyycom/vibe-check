# Design

本设计将 HTML link-bearing attributes 保持为独立 future Check，并把 parser、source、attribute 与 target 语义留在真实 consumer 到来后的 Draft 收敛阶段。

## Context

[`docs/scan-scope.md`](../../docs/scan-scope.md) 规定当前 Markdown Link source occurrences 不包含 HTML attribute；[`adopt-low-level-markdown-link-parser-architecture.md`](../../docs/decisions/adopt-low-level-markdown-link-parser-architecture.md) 也将现有 parser facts 和 resolver 保持为 Link-private implementation。活动且已对齐的 [`keep-format-aware-check-capabilities-independent.md`](../../docs/decisions/keep-format-aware-check-capabilities-independent.md) 要求不同格式风险保持独立 Check owner，并要求未来能力只在有新的真实 consumer、风险证据或明确优先级时重新基线化；它不决定本 Draft 的 public identity 或精确 contract。

当前没有要求实现 HTML 校验的命名 consumer。用户只确认 `<a href="docs/a.md">` 可以作为未来校验内容，当前不需要。

## Goals / Non-Goals

**Goals**

- 未来以 standards-aware parser 识别明确的 HTML link-bearing attributes，而不是扫描任意 path-like prose。
- 让 HTML occurrence、local target、fragment 与 failure semantics 由 owning Check 负责。
- 与当前 Markdown Link occurrence owner 保持互斥，并沿用 Product 的 ordinary Check、safe Record 与四态结果边界。

**Non-Goals**

- 当前不实现、导出或加入首次公开 release gate。
- 不把 raw HTML attribute 静默加入现有 `markdownLinkValidation`。
- 不校验普通 prose/inline-code path，不执行 JavaScript、CSS、browser navigation 或 network reachability。
- 不预先承诺所有 URL-bearing attributes、HTML dialect 或 renderer/browser compatibility。

## Decisions

### Intended Change

1. **保持独立 occurrence owner。** Future Check 只消费自己 parser 识别的 HTML attributes；现有 Markdown link/image/reference/autolink 继续由 `markdown-link-validation` 拥有。同一 source occurrence 不产生两份 Records。
2. **先固定 source 与 grammar。** 恢复前用真实 corpus 决定 standalone `.html`/`.htm`、Markdown raw HTML nodes 或两者是否属于 source，并从最小 `a[href]` 开始评审 supported attributes。不得以 regex 或通用 path detector 替代 HTML parsing。
3. **只做有界 direct local validation。** External schemes 只分类，不访问网络；local resolution、root containment、target reads、fragment lookup、limits 与 unavailable folding 必须形成 Check-owned closed policy。现有 Markdown Link private resolver 不是可直接复用的 shared contract。
4. **安全发布。** Records 只携带 source-relative navigation、closed occurrence/reason 与获准的 root-relative target facts；raw query/userinfo、root 外路径、target bytes 与 parser diagnostics 不进入公共或持久 surface。

### Resulting Impacts

- 恢复实施会影响 `docs/configuration.md`、`docs/scan-scope.md`、`docs/quality-metrics.md`、`docs/output.md`、`src/package-checks/**`、`src/index.ts`、package dependency/license materials 与 semantic Cases。
- Source selection、HTML decode/parser failure、malformed markup、duplicate attributes、`<base>`、fragment ID/name、directory 与 root-external policy需要在 Plan 前闭合。
- 若 Markdown raw HTML 进入范围，必须证明 parser ownership 与 occurrence 去重，而不能建立公共 AST、跨 Check snapshot 或 shared resolver。

## Risks / Trade-offs

HTML parsing、URL resolution 与 browser semantics 比单个 `a[href]` 更宽；过早支持 `<base>`、`srcset`、template dialect 或 renderer-specific behavior 会放大依赖、误报和兼容成本。只支持极窄 attribute 集合则可能不足以证明独立 public Check 的价值，因此恢复必须由真实 consumer 和 corpus 决定最小有用范围。

## Open Questions

- 首个真实 consumer 是否需要 standalone HTML、Markdown 内 raw HTML，还是两者。
- 最小 supported attributes 是否只有 `a[href]`，以及 `img[src]`、`link[href]`、`script[src]`、`source[srcset]` 是否有独立价值。
- 是否支持 `<base>`、same/cross-document fragment、HTML `id`/legacy `name` 与哪些 malformed markup recovery 语义。
- 哪个 parser、dependency/license 组合和 corpus 能证明 Bun compatibility、范围准确性与可接受误报率。
