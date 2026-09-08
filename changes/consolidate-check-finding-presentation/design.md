# Design

本 Draft 保存本轮 Finding 呈现审查的可复核结论；审查没有产生已授权的实现工作或 Plan task。

## Context

**授权边界**：本轮只授权读取事实和更新此 Draft；未授权修改运行时代码、测试、稳定文档、Decision、协调文档，或新增、改变、发布公共 API。

`presentCheckFindings` 接受 caller-owned ordered `findings`、`limit` 和两个 mapper（`src/check/finding-presentation.ts:20-25`）；它不排序，只保序 slice 前 `limit` 项、把剩余项及计数交给 overflow mapper，并冻结结果（`:26-48`）。其测试证明 limit、overflow navigation、`limit: 0` 与无效 limit 的边界（`src/check/finding-presentation.test.ts:7-84`）。`appendCheckMessages` 则只无语义地追加 message 数组（`src/check/finding-presentation.ts:51-60`）。

这就是稳定公约数：有界 terminal-message 投影。Finding shape、排序、blocking 推导、秘密安全字段、rejected input、waiver identity/audit wording、完整事实入口和 append 顺序仍归 producing Check。

| 场景 | 输入事实与顺序 | detail / overflow | result 与 waiver 语义 |
| --- | --- | --- | --- |
| file metrics | candidate 按 record ID（path）排序（`src/package-checks/file-metrics/records.ts:87-103`）。 | local `limit: 10`；overflow 看 omitted blocking（`finding-messages.ts:5-28`）。 | actionable findings 后追加 `{ metric, path }` waiver audits（`execution.ts:78-84`, `:98-158`）。 |
| function metrics | metric candidates 按 ID、rejected inputs 按 path 排序（`records.ts:71-89`, `:143-159`）；actionable metric 在 rejected candidate 前。 | local `limit: 10`；detail 分支 rejection，metric 另有最多八个 complexity contributors（`finding-messages.ts:14-62`）。 | 先 aggregate `input-rejected`，再 detail，最后 function-identity waiver audit（`execution.ts:227-263`; `finding-messages.ts:65-94`）。 |
| duplicate detection | content/occurrence-based IDs 排序；locations 有自己的排序和最多两个地点摘要（`records.ts:80-105`, `finding-messages.ts:68-74`）。 | local `limit: 10`；overflow 看 omitted blocking（`finding-messages.ts:10-34`）。 | actionable candidates 后追加 location-identity waiver audit（`execution.ts:108-123`, `finding-messages.ts:36-65`）。 |
| markdown link validation | selected paths 排序，eligibility partition 保序；source 与 occurrence 依其顺序遍历（`project-files/collection.ts:42-44`, `:145-150`; `input-eligibility.ts:7-20`; `execution.ts:175-187`, `:227-297`）。normal presentation 先 link 后 rejected path。 | local `limit: 10`；detail 仅用 safe source/range/reason，overflow 只在 omitted blocking link 时为 error（`finding-messages.ts:5-47`）。 | normal path 无 waiver；rejected input 在 normal result 为 detail，在 unavailable/cancelled 路径为 aggregate message（`execution.ts:203-218`）。 |
| secret detection（反例） | issue 经 secret-safe identity reconciliation，只发布 safe finding 与 coverage-gap Records（`src/package-checks/secret-detection/execution.ts:96-135`）。 | 不调用 `presentCheckFindings`；最多两个 count-only messages，绝不格式化 raw secret material（`:161-184`）。 | 仅复用 `appendCheckMessages`；waiver wording 保持 local（`:145-158`, `:187-217`）。 |

因此 secret detection 不是第五个 presenter consumer。四个 consumer 同写 `10` 只是 local constants；function/markdown 已用同一 presenter 表达不同 rejected-input 生命周期，不能由数字或代码形状推导共同排序、安全或 waiver policy。

## Goals / Non-Goals

**Goals**

- 判定现有 helper 之后是否还有受证据支持的共同职责。
- 记录保持 Check-owned policy 的最小结论和验证边界。

**Non-Goals**

- 不统一排序、Finding fields、input rejection、waiver identity、blocking policy 或 secret safety。
- 不触及 progress preview、renderer 或其 formatter；当前行为由 [API 机制](../../docs/api-mechanics.md#check-messages-与受管-progress)与[人读输出实现](../../docs/development/human-output.md#progress-presentation-maintenance)拥有。
- 不新增或改变 public API、global option 或 preset。

## Decisions

### Intended Change

**已确认（仅限本轮工程审查）：不实施额外 consolidation。**保持现有 shared `presentCheckFindings` 与四个 Check-local mappers。helper 已承接已确认的共同算法（保序、有界投影、overflow context 与冻结结果）；未发现其之外稳定的共同义务，新增 private helper/preset 的收益不足以证明其维护成本。

`presentCheckFindings` 已由 package root 导出（`src/index.ts:110`）。现状并非未知；未知且未获授权的是是否需要**新的或改变后的**公共 presentation contract。仓库中没有四个 package Check 之外的 consumer outcome 证明此需求。

### Resulting Impacts

- 本 Change 保持 Draft，不生成 `tasks.md`，不改源码、测试或 stable owner；实施性结论为“无需实施”。
- 若以后有独立 consumer outcome，候选 private helper 只能接收已完成排序、过滤、identity 与安全判断的 presentation-neutral facts；不得接管这些判断。
- 任一改变 export、declaration、Check option 或 terminal message contract 的候选都须获得独立授权，并审查 Check guides、package public inventory/consumer evidence 与行为测试。

## Risks / Trade-offs

维持 local mapper 保留表面重复，但这比把不同 rejected-input 生命周期、overflow level、waiver identity 或 secret-safe 表达封装成伪共同 policy 的风险小。将 `10` 提为共享 default 或让 presenter 接收 raw Finding 都会扩大这个风险。

## Open Questions

无。本轮“是否应继续收敛”的工程审查已闭合为不实施；出现新的真实内部 Check 消费场景、明确的外部 consumer outcome，或足以显示现有维护成本的问题时，才重新审查。

## Verification

本轮读取了 shared helper、其单元测试、四个真实 call site、相关 execution/records paths、secret-detection 反例、package root export 与现有 stable owners。未运行产品测试：本轮没有修改 `src/**` 或测试；未以历史 Gate 成功当作本结论的证明。完成 Draft 编辑后运行本 Change 的 mechanical check。
