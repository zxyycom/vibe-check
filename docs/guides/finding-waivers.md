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

| 能力/Check | 当前入口 | identity owner |
| --- | --- | --- |
| 任意自定义 Finding producer | `reconcileFindingWaivers(...)` | 调用方的 `identify(finding)` |
| [`fileMetrics`](../checks/file-metrics.md) | `findingWaivers` | `{ metric: "code-lines", path }` |
| [`functionMetrics`](../checks/function-metrics.md) | `findingWaivers` | `{ metric, path, functionName, startLine }` |
| [`duplicateDetection`](../checks/duplicate-detection.md) | `findingWaivers` | `{ metric: "duplicate-tokens", locations }` |
| [`secretDetection`](../checks/secret-detection.md) | `findingWaivers` | `{ path, ruleId, structuralClass, ordinal }`；不含 secret 值、message、line 或 hash。 |
| 其它随包 Check | 暂无同名原生 option | 对应 Check 指南；不能据此推断自动支持 |

三个内置指标型 Check（`fileMetrics`、`functionMetrics` 与 `duplicateDetection`）都在完整 metric Finding 形成后
对账，保留 applied Finding Record 与 reason，并把 stale/overbroad authoring 作为 audit evidence；各自完整
identity grammar 见对应 Check 指南。`secretDetection` 同样在完整安全投影 Finding 后对账，但其 waiver 只能匹配
表中的非敏感 identity，不能豁免 coverage gap 或 `unavailable`；reason 也会作为 evidence 发布，不能包含敏感材料。
