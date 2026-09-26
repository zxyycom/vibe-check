# 对账 Finding waiver

`reconcileFindingWaivers({ findings, identify, waivers })` 是 package 预提供的可选工具：当 custom Check 或其它 Finding
producer 已形成**完整** Finding 候选集合，并需要保留原始证据地审计 waiver 时调用它。它不会按
message 过滤、在扫描前排除输入或删除 Finding；采用方仍拥有 Records、messages 和 terminal outcome。

## 最小用法

```ts
import { reconcileFindingWaivers } from "@zxyycom/vibe-check";

const reconciled = reconcileFindingWaivers({
  findings: [{ metric: "api-compatibility", symbol: "createClient" }],
  identify: ({ metric, symbol }) => ({ metric, symbol }),
  waivers: [
    {
      identity: { metric: "api-compatibility", symbol: "createClient" },
      reason: "兼容窗口保留到下一个 major release。"
    }
  ]
});
```

## identity 与 audit

`identify(finding)` 对输入顺序中的每个原 finding 接收完整 finding。调用方自行选择稳定的语义
identity，例如 path、function name 和 metric 的组合。`identify` 的结果与 `waiver.identity` 都必须可安全
materialize 为 canonical JSON，helper 按 canonical JSON 的结构而非对象引用匹配。

每项 waiver 的 identity 必须唯一且 reason 为非空 string。重复 canonical identity、无法 canonicalize 的
finding 或 waiver identity、无效 reason，或 malformed / hostile waiver authoring 都抛出 `TypeError`。每个
configured waiver 都在完整集合上获得 audit：`0` 次匹配是 `unused`，`1` 次是 `applied`，`>1` 次是
`overmatched`；过宽 waiver 不会豁免任一 finding。

输出 `findings` 保持输入顺序，并在每项结果中保留同一个原 finding reference。applied waiver 附带的 evidence
是 detached、deep-frozen 的 canonical materialization，因此调用方之后修改 authored identity 或 reason 不会改变
结果。helper 只返回 finding disposition 和 waiver audit；它不发布 Record、message 或 terminal outcome。

## 随包 Check 的采用边界

[`fileMetrics`](../checks/file-metrics.md)、[`functionMetrics`](../checks/function-metrics.md)、
[`duplicateDetection`](../checks/duplicate-detection.md)、[`secretDetection`](../checks/secret-detection.md)
与 [`markdownLint`](../checks/markdown-lint.md)
提供原生 `findingWaivers` option，其 authoring 为 closed `{ identity, reason }`。它们先形成完整、可信的 Finding 集合再对账；waiver 不缩小 scanner/detector input、不删除原 Finding，也不把 `unavailable` 伪装成 audit。其它随包 Check 暂无同名原生 option。

各 Check 指南完整定义自己的 identity grammar、可 waiver scope、Record/message/final-data 与 status effect。`secretDetection` 的 identity 不含 secret 值、message、line 或 hash，且不能豁免 coverage gap 或 `unavailable`；reason 会作为 evidence 发布，不能包含敏感材料。

## 为 Markdown lint 声明精确例外

人工确认某条 lint Finding 是可接受的例外后，将其公开 Record data 的 `path`、`rule`、完整 `range` 复制到 identity，再说明接受原因。下例 Record 值仅作示意；实际应复制本次检查的证据，不应动态豁免所有扫描结果。

```ts
import {
  markdownLint as lintWithWaivers,
  type MarkdownLintRecordData,
  type MarkdownLintFindingWaiver
} from "@zxyycom/vibe-check";

// 示例：已人工复核的一条 Record data，实际使用时复制自己检查得到的值。
const reviewedFinding: MarkdownLintRecordData = {
  kind: "lint-finding",
  path: "docs/legacy.md",
  rule: "fenced-code-language",
  range: { start: { line: 8, column: 1 }, end: { line: 8, column: 1 } }
};
const { path, rule, range } = reviewedFinding;
const acceptedException: MarkdownLintFindingWaiver = {
  identity: { path, rule, range },
  reason: "此处演示未指定语言的原始围栏，保留例外并继续检查其它 Finding。"
};
const lintWithAcceptedException = lintWithWaivers({
  findingPolicy: "blocking",
  findingWaivers: [acceptedException]
});
// 将 lintWithAcceptedException 加入项目 checks；不是删除原 Finding。
void lintWithAcceptedException;
```

将返回的 Check 放入项目的 `checks` 后，完整 lint 才会对账。唯一匹配保留 Finding 并附 waiver reason，未匹配或多匹配产生可见 audit；行列漂移不会自动迁移配置。计数、缓存组合及失败边界由 [Markdown lint 指南](../checks/markdown-lint.md#精确-finding-waiver)完整定义。
