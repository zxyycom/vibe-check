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
[`duplicateDetection`](../checks/duplicate-detection.md) 与 [`secretDetection`](../checks/secret-detection.md)
提供原生 `findingWaivers` option，其 authoring 为 closed `{ identity, reason }`。它们先形成完整、可信的 Finding 集合再对账；waiver 不缩小 scanner/detector input、不删除原 Finding，也不把 `unavailable` 伪装成 audit。其它随包 Check 暂无同名原生 option。

各 Check 指南完整定义自己的 identity grammar、可 waiver scope、Record/message/final-data 与 status effect。`secretDetection` 的 identity 不含 secret 值、message、line 或 hash，且不能豁免 coverage gap 或 `unavailable`；reason 会作为 evidence 发布，不能包含敏感材料。
