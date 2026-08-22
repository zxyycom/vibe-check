---
title: 取消 Task admission 并收尾已启动工作
status: active
alignment: aligned
createdAt: 2026-08-15T10:28:59Z
purpose: 让一次 invocation 的取消在唯一 Task engine 停止新 admission，同时按普通 Task 语义收尾已启动工作并闭合 Check facts。
background: 同 runtime 项目函数无法被安全抢占，也没有可靠通用方式从抛错判断它是否“主动取消”；新增 running-cancelled settlement 会制造未定义协议。
decision: engine 观察 AbortSignal 后停止新 admission、drain 已启动 Tasks，并按普通 settlement 闭合 Check；不推断 running-cancelled。
tags:
  - product-contract
relations:
  - type: 修订
    target: cooperatively-cancel-task-graphs.md
---

## 目的

- 让 programmatic Run 的取消由唯一 Task engine 拥有明确的 admission cutoff，不在 Check、adapter 或调用方中复制调度状态。
- 保留已经提交的 supplemental Record、已经关闭的 Core Check 和 abort drain 期间形成的普通 execution evidence，再为仍未完成的 Check 形成可消费终态。

## 背景

- Package Run 接受调用方提供的 `AbortSignal`；CLI、service、editor、CI、Ctrl+C 或 timeout 是否映射到它由调用方决定，Product 不提供独立取消命令。
- Record 在 RecordSink 接受时提交，Core Check 在 trusted terminal path 关闭时结算。它们是执行期间逐步形成的事实，不能因 invocation 后来取消而整体回滚。
- 同一 Bun runtime 中的 project functions 可能忽略 signal，Task engine 无法安全抢占或强制终止。普通 return、throw/rejection 与“响应取消”也没有跨任意项目函数可信的通用判别方式；把某类 Error 名称提升为 engine settlement 会引入可伪造且不完整的协议。
- 取消、依赖阻断和普通 execution failure 具有不同原因。abort 发生后，已启动 Task 仍可能正常完成或普通失败；这些 settlement 应保留，而不是被全局取消原因覆盖。

## 决策

- 采用: `AbortSignal` 是 invocation-scoped Run control，不是 Product command。Task engine 在每次 Task admission commit 前观察 signal；一旦观察到 aborted，本次 graph 不再产生新的 admission。若 graph 已在观察前完成 terminal commit，Run 保持 completed。
- 采用: 尚未 admitted 的 Tasks 以私有 `cancelled-before-start` settlement 退出，不执行 user work。dependency `blocked` 只表示 prerequisite 无法满足，不用于表达 invocation cancellation。
- 采用: 已 admitted Tasks 获得同一个 signal并协作式 drain；engine 不抢占、不强杀，也不承诺 non-cooperative project code 的取消延迟。它们继续按普通 `completed` 或 `failed` settlement 关闭；engine 不从 Error 名称、返回值或 timing 推断 `running-cancelled`。
- 采用: abort drain 后，trusted finalizer 先保留并映射已经成立的 contained execution、Record 与 protocol evidence，再固定点传播 dependency-unavailable；只有仍未关闭且未被更具体原因解释的 applicable Checks 才单次关闭为 `unavailable(cancelled)`。已经关闭的 Checks 与已提交的 Records 保持不变。
- 采用: execution-phase cancellation 只有在全部 admitted Tasks settled、全部 Check scopes 关闭、RecordSink 关闭且可保留 Core facts 冻结后，才返回 `kind: "cancelled"` 的 Run result。pre-work cancellation 可以在尚未形成 Resolved Checks 时直接返回，不伪造空 Core facts。
- 采用: Core facts 可以在执行中逐步成立；最终 snapshot 是它们的闭合投影。canonical machine files 的完整可信边界由 Output contract 独立决定，本决策不把半成品 artifact 声明为有效 publication。
- 不采用: Product cancel command、把 Ctrl+C 直接建模为 Product contract、abort 后回滚已提交事实、用 dependency blocked 表达取消、强制终止同 runtime project code、从普通错误推断 running-cancelled，或在 scope 尚可被 late mutation 时返回 cancelled result。
