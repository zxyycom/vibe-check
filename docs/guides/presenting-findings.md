# 呈现 Check Finding

`presentCheckFindings(...)` 把 producing Check 已经形成且稳定排序的 Finding 投影为有限的 `CheckMessage[]`。它适用于需要在 terminal result 中给出人读摘要、同时由 Check 在 Records、artifact、transcript 或其它实际位置保留完整事实的场景。

## 最小用法

```ts
import { presentCheckFindings } from "@zxyycom/vibe-check";

const findings = [
  { blocking: true, line: 12, path: "src/config.ts", summary: "Missing required value" },
  { blocking: false, line: 8, path: "src/legacy.ts", summary: "Deprecated option" }
];

const messages = presentCheckFindings({
  findings,
  limit: 1,
  message: (finding) => ({
    code: "finding-detail",
    level: finding.blocking ? "error" : "warning",
    message: `${finding.path}:${finding.line} ${finding.summary}`
  }),
  omittedMessage: ({ omittedCount, omittedFindings, presentedCount, totalCount }) => ({
    code: "findings-omitted",
    level: omittedFindings.some((finding) => finding.blocking) ? "error" : "warning",
    message: `${omittedCount} more of ${totalCount} findings after the first ${presentedCount}`
  })
});

if (messages.length !== 2 || messages[1]?.code !== "findings-omitted") {
  throw new Error("Expected one Finding message and one overflow message");
}

const terminalResult = { status: "failed" as const, data: { findings }, messages };
void terminalResult; // The producing Check attaches these messages to its terminal result.
```

## 输入与投影

调用方提供稳定排序的 `findings`、非负 safe-integer `limit`、为每个呈现项生成 message 的 hook，以及存在省略项时生成汇总 message 的 hook。helper 只调用前 `limit` 项的 `message` hook；超限时调用一次 `omittedMessage`。后者收到完整计数、`presentedCount` 与原 `omittedFindings` references，因此 producing Check 可以按省略项的实际等级选择 summary，并明确完整明细的位置。

`limit: 0` 只产生省略汇总；空 Finding 数组返回空 messages。无效 limit 在任何 hook 执行前抛出 `TypeError`。

返回数组及其中的 message 对象均被冻结。producing Check 把它附到自己的 terminal result，并继续拥有 Finding shape、完整事实位置和 terminal outcome；helper 不保存或发布 Finding facts。

## 随包 Check 的采用

[`fileMetrics`](../checks/file-metrics.md)、[`functionMetrics`](../checks/function-metrics.md)、
[`duplicateDetection`](../checks/duplicate-detection.md) 和
[`markdownLinkValidation`](../checks/markdown-link-validation.md) 自动使用相同的 presentation helper，并在各自实现中固定
`limit: 10`；调用方不能通过这些 Check 的 options 调整该值。因而每个 Check terminal result 最多包含十条 Finding detail
messages；Finding 超过十条时另有一条 `findings-omitted` summary。完整 Finding facts 仍由各 Check 的 Records 承载。
启用 Run progress 后，renderer 默认另行最多预览五条 messages 和五条 Records，可通过 Definition 或本次 Controls 配置；这是展示限制，
不会改写 terminal result 或完整 facts，详见 [Check messages 与受管 progress](run-outputs.md#check-messages-与受管-progress)。
各 Check guide 只说明自己的 Finding shape、detail 字段、排序和 terminal policy。
