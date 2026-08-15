---
title: 在 Task admission 边界协作式取消运行
status: active
alignment: unaligned
createdAt: 2026-08-15T08:14:41Z
purpose: 让一次 invocation 的取消由唯一 Task engine 停止新 admission，同时保留已经形成的 Check 与 Record 事实。
background: Check 与 Record 在执行中逐步形成，回滚事实、强杀项目代码或把取消混同依赖阻断都会破坏可解释的终态。
decision: Task engine 在 admission 边界观察 AbortSignal，停止新 Task、收尾已启动 Task，并将未完成 Check 关闭为 cancelled。
relations: []
---

## 目的

- 让 programmatic Run 的取消由唯一 Task engine 拥有明确且可线性化的生效边界，不在 Check、adapter 或调用方中复制调度状态。
- 让取消保留已经提交的 QualityRecord 和已经结算的 Core Check，并为仍未完成的 Check 形成可消费的终态。

## 背景

- Package Run 接受调用方提供的 `AbortSignal`；项目 CLI、service、editor 或 CI 可以自行把 Ctrl+C、超时或用户停止动作映射到该 signal，Product 不提供独立取消命令。
- QualityRecord 在 RecordSink 接受时提交，Core Check 在 trusted terminal path 关闭时结算。它们是执行期间逐步形成的事实，不应因 invocation 后来取消而整体回滚。
- 同一 Bun runtime 中的 project functions 可能不协作取消；Task engine 无法在不引入独立进程或 worker contract 的情况下安全抢占或强制终止它们。
- 取消、依赖阻断和普通执行失败具有不同原因与恢复含义；把三者压成同一 terminal state 会让 Check outcome、Run result 和调用方处理失真。

## 决策

- 采用: `AbortSignal` 是 invocation-scoped Run control，不是 Product command。Task engine 在每次 Task admission commit 前观察 signal；一旦观察到 aborted，本次 graph 不再产生新的 admission。若 graph 已在观察前完成 terminal commit，Run 保持 completed。
- 采用: 尚未 admitted 的 Tasks 以私有 `cancelled-before-start` settlement 退出，不执行 user work。dependency `blocked` 只表示 prerequisite 无法满足，不用于表达 invocation cancellation。
- 采用: 已 admitted Tasks 获得同一个 signal 并协作式收尾；engine 不抢占、不强杀，也不承诺 non-cooperative project code 的取消延迟。Task 正常完成时保留其已形成事实；只有明确响应取消的 Task 才使用 running-cancelled settlement，普通 failure 仍按自身 failure 语义处理。
- 采用: abort 被 graph 观察后，已结算的 Core Check 与已提交的 QualityRecord 保持不变。所有已 admitted Tasks settle 后，graph-owned trusted finalizer 将仍未关闭的 applicable Checks 单次关闭为 `unavailable`，safe diagnostic category 为 `cancelled`；RecordSink 随之关闭，late capability 调用被拒绝。
- 采用: execution-phase cancellation 只有在全部 Check scopes 已关闭、可保留 Core facts 已冻结后才返回 `kind: "cancelled"` 的 Run result。pre-work cancellation 可以在尚未形成 Resolved Checks 时直接返回，不伪造空 Core facts。
- 采用: Core 可以在执行期间提交或交付已经成立的 Check/Record facts，最终 snapshot 是这些事实的闭合投影，不是事实首次成立的时点。canonical machine files 是否增量可见、何时成为完整可信 set 由 Output contract 独立决定，本决策不把半成品 artifact 声明为有效 publication。
- 不采用: 新增 Product cancel command、把 Ctrl+C 直接建模为 Product contract、abort 后回滚已提交事实、用 dependency blocked 表达取消、强制终止同 runtime project code，或在 scope 尚可被 late mutation 时返回 cancelled result。
