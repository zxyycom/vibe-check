---
title: 采用 invocation-scoped custom admission strategy authoring
status: active
alignment: unaligned
createdAt: 2026-09-03T05:59:31Z
purpose: 让 custom 准入作者以 simple 或 prepared 两种明确形态表达一次 Run 的同步选择和可选 completion，而不扩大 Scheduler 的控制或状态边界。
background: 当前 public callback 只有 proposeAdmission；private lifecycle 与 terminal output 各由独立 Decision 承接。
decision: 采用 simple/prepared public grammar、Invocation-owned preparation/completion 和无兼容 authoring migration。
tags:
  - configuration
  - product-contract
  - workflow-policy
relations:
  - type: 拆分
    target: introduce-invocation-scoped-admission-strategy-lifecycle.md
---

## 目的

让 package consumer 以一个 public custom strategy 为一次 Run 定义同步准入选择；prepared strategy 可在 graph-ready 后形成 Run-local state，并在 sealed terminal measurement 存在时接收 completion。Scheduler 继续专注于执行和准入 hard guards。

## 背景

- 当前 public custom branch 是同步 `proposeAdmission(context) → select | wait`，且 callback identity 不进入 declarative fingerprint。
- public authoring 需要表达一次性异步准备、Run-local `decide` 和可选 terminal completion；这些 callback 的 lifecycle 应由 Invocation 管理，而 Scheduler 保持 result-only selection seam。
- terminal pipeline 的顺序、aggregate output 与 failure precedence 由独立 Decision 承接；本记录只定义 prepared authoring 所需的 callback presence、input 和 lifecycle owner。

## 决策

- 采用: closed public grammar：`{ kind: "custom", strategy: { kind: "simple", decide(context) } }` 或 `{ kind: "custom", strategy: { kind: "prepared", prepare(context) } }`。simple `decide` 同步返回精确 `AdmissionProposal`；prepared `prepare` 可 return/resolve Run-local `{ decide(context), complete? }`。strategy kind 进入 declarative snapshot/fingerprint，callback identity/source/closure 留在 runtime state。
- 采用: Invocation-owned lifecycle：每个 graph-ready、未在 pre-work/planning 取消的 Invocation 对 prepared strategy 执行一次 `prepare`，并以 frozen graph-ready view 作为 input。simple/prepared `decide` 复用 detached/deep-frozen `AdmissionPolicyContext` 并同步返回 `select(taskId)` 或 `wait`；optional `complete` 至多一次接收 sealed `SchedulerMeasurementContext`。
- 采用: Scheduler result-only handoff：prepare 返回的 `decide` 进入既有 Scheduler seam；throw、thenable、malformed proposal、illegal `select`/`wait` 继续使用 admission-policy fault 的 stop-new-admission、cancel-pending、drain-started contract。prepare throw/rejection 在 Scheduler start 前形成 `admission-strategy-preparation-failed`；sealed context 形成后按 terminal pipeline delivery `complete`，而 completion failure 归入 terminal output handling。
- 采用: trusted-host boundary：调用方 closure 可持有自己的 host capability；Product 提供 frozen context 和 result-only handoff，以维持 Scheduler state、Task command 与 strategy state 的 owner 边界。
- 不采用 compatibility adapter、additional public authoring forms、async/thenable `decide`、Scheduler-owned prepare/complete、policy registry、generic learning/model/state API、Product-managed host capability injection、callback sandbox/timeout、mutable Scheduler view、imperative Task control、completion-driven rescheduling、per-Task online hook 或 Simulation prerequisite；simple/prepared 是唯一 public authoring form。
