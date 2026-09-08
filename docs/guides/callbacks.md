# 按作用位置选择回调（Hook）

当你知道想在“执行前准备”“检查时决定结果”“显示时调整文本”或“结束后处理统计”，却不确定应该使用哪个回调时，从本文选择接入位置。本文按接入位置说明公开回调的分工；字段签名以 installed declarations 为准，项目定义与本次运行的参数归属见 [API 机制](../api-mechanics.md#参数应该放在哪里)。

## 先按三条链路理解位置

- **单项 Check**：被 Scheduler 准入 → `preflight` 准备 options → `execution` 形成结果 → Product 验证并结算。某项准备被阻断时不会继续 execution；不同 Check 可以并发。
- **人读说明**：Check 用 `presentCheckFindings` 将 Finding 转成 messages 并附到自己的结果 → Product 显示明细时用 progress `formatter` 调整预览文本。前者在 Check 生成说明的位置，后者在终端显示的位置，两者都不替代检查结果的判定。
- **调度策略**：graph 准备好后，可选 `prepare` 形成当前 Run 的策略 → Scheduler 调用 `decide` 零次或多次，每次同步返回一个 select / wait proposal → Scheduler 停止准入、等待已启动任务并封闭统计 → `measurementHooks` 观察终态 → 存在 terminal context 时调用可选 `complete`。simple strategy 不经过 `prepare`。

完整 Run 的验证、取消与输出衔接仍由 [API 生命周期](../api-mechanics.md#一次-run-的生命周期)说明。

## 回调的配置位置与权限

先确定要在什么位置做什么，再选择对应字段。下表用于定位，不是一条所有回调都会执行的串行流程：不同 Check 可以并发，progress 也会随运行持续呈现。

| 作用位置与目的 | 写在哪里 | 接收什么、产生什么 | 能改变的范围 |
| --- | --- | --- | --- |
| **调度开始前：准备本次调度策略** | Definition 的 [`scheduler.admissionPolicy.strategy`](scheduling.md#已准备的-custom-strategy) 选择 `kind: "prepared"`，提供 `prepare` | 接收静态 graph，返回本次使用的 `decide` 与可选 `complete` | 准备策略自己的运行状态，不执行 Check。 |
| **调度选择时：决定建议先运行哪项** | [simple strategy 的 `decide`](scheduling.md#自定义准入-policy)，或 `prepare` 返回值中的 `decide` | 接收当前准入 context，同步返回 select / wait proposal | 只提出选择，Scheduler 仍检查依赖、互斥、容量与取消。 |
| **单项 Check 被准入后、执行前：准备 options** | [`preflight`](extending-check-lifecycle.md#preflight准备阻止或带-fallback-继续) | 接收 authored options 和 signal，返回 prepared options、fallback 或阻断结果 | 影响这项 Check 是否继续及其 execution 输入，不是整个 Run 的前置 hook。 |
| **单项 Check 执行时：检查并决定自己的结果** | [`defineCheck({ execution, ... })`](extending-check-lifecycle.md) | 接收 Check context，返回四态 terminal result，可报告 Records | 形成这项 Check 的领域结果；Product 验证并封闭事实，不开放事后改写结果的通用 hook。 |
| **Check 生成 Finding 说明时：选择如何描述发现** | [`presentCheckFindings({ message, omittedMessage, ... })`](presenting-findings.md) | 单项 Finding 或省略集合转成 `CheckMessage`，helper 返回 messages | 由 Check 将说明附到自己的结果；不是终端 renderer，也不负责决定通过或失败。 |
| **终端显示已结算 Check 的明细时：调整预览文本** | Definition 或 Controls 的 [`outputs.progressRendering.formatter`](run-outputs.md#配置-preview-文本) | 接收选中项的默认文本和预算，同步返回替代文本 | 只改变终端预览，不改写完整 Records、messages 或 Check outcome。 |
| **调度停止且已启动任务结束后：观察终态统计** | Definition 的 [`scheduler.measurementHooks`](scheduling.md#观察终态-measurement) | 接收冻结的 graph、settlement observations 与 raw measurement | 消费或保存终态观察，不能重跑任务或改写 Check facts。 |
| **终态观察交付后：完成本次已准备策略** | `prepare` 返回值中的可选 `complete` | 存在 sealed terminal context 时接收该 context，至多调用一次 | 完成策略自己的终态工作；不是保证所有失败路径都会调用的通用 `finally`。 |

## 结算结果与结算后工作

**“结算结果”和“结算后做事”不同。** Check 的 `execution` 与领域 policy 决定本项结果；本次 `checkAggregation` 从已结算状态派生 Run aggregate，它是配置而不是回调。若要根据完整 `RunResult` 决定 CI 退出码或做项目后处理，在项目代码 `await run(...)` 之后处理；这不是 Product 提供的另一组生命周期 hook。

## 回调失败如何反馈

`preflight` / `execution` 的失败由 owning Check 结算。progress formatter、measurement Hooks 与 prepared `complete` 的失败通过对应 output status 反馈，并保留已形成的 Check facts；原本正常完成的 Run 会成为 `kind: "output"`，已有取消或执行失败则保留主结果。完整优先级见[输出状态与失败处理](run-outputs.md#输出状态与失败处理)。
