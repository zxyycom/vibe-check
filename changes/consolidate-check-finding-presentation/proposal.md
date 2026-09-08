# Proposal

本 Draft 记录一次受限的证据审查：四个随包 Check 的 Finding message 呈现是否还应在现有 `presentCheckFindings` 之上继续收敛。它不预设共享 preset、全局 option 或新的公共 API。

## Why

`fileMetrics`、`functionMetrics`、`duplicateDetection` 和 `markdownLinkValidation` 都调用同一个有界、回调式 presenter；它保留调用方已确定的顺序，只切出 `limit` 内的 detail，并把 overflow wording 与等级继续交给调用方。这是实际的四个 `presentCheckFindings` call site，而不是先前假定的更大集合。

四者虽都在本地写了 `limit: 10`，但输入序列、rejected-input 的位置、blocking 推导、overflow 等级与 waiver audit 都是各 Check 的结果契约。`secretDetection` 不是第五个 presenter consumer：它只用 `appendCheckMessages` 附加安全的计数/coverage 摘要与自己的 waiver messages，不能把其安全边界当成通用 Finding formatter 的输入。

## Outcome

本轮工程审查的结论是**保持现有 shared `presentCheckFindings` 与四个 Check-local mappers，不新增 helper/preset**。现有 helper 已承接已确认的共同义务（保序、有界投影、overflow context 与冻结结果）；未发现其之外稳定的共同义务，新增抽象的收益不足以证明其维护成本。

本轮授权仅覆盖事实审查和本 Draft 的更新；未授权修改 `src/**`、测试、稳定文档、Decision 或公共 API。`presentCheckFindings` 本身已由 package root 导出，但没有证据或授权支持新增/改变面向消费者的 presentation API、global option 或 preset。若未来出现独立的外部 consumer outcome，应另立 proposal 并先审查 package public surface 与兼容性。

当前稳定事实 owner 仍是 [`docs/guides/presenting-findings.md`](../../docs/guides/presenting-findings.md)、[`docs/development/check-results.md`](../../docs/development/check-results.md)、四个 Check guide、`src/check/finding-presentation.ts` 及相邻测试。本 Draft 只链接这些 owner，不改写它们；progress preview 的当前行为由 [API 机制](../../docs/api-mechanics.md#check-messages-与受管-progress)与[人读输出实现](../../docs/development/human-output.md#progress-presentation-maintenance)拥有，既不是本结论的依赖，也不在本 Draft 范围内。
