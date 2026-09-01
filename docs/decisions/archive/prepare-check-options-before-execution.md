---
title: 在执行前准备普通 Check options
status: archived
alignment: aligned
createdAt: 2026-08-26T05:00:24Z
purpose: 让普通 Check 可选地在 invocation 内准备 options，并在任何 execution 前以统一 barrier 结算准备失败。
background: Definition validator 无法表达 fallback、准备消息与 invocation-local preparation。
decision: Definition 只闭合 authored options；可选 preflight 以 block/continue 判别结果准备或结算 Check。
tags:
  - configuration
  - product-contract
relations:
  - type: 替代
    target: validate-ordinary-check-options-before-execution.md
---

## 目的

- 让普通 custom Check 可省略 preflight；需要 invocation-local options preparation 的 Check 以自身逻辑决定成功、阻断或携带 fallback 继续。
- 保持 Definition 只负责普通 grammar、canonical authored options 与 declarative fingerprint，绝不解释 Check-local options 的业务有效性。
- 在任何 author execution 前完成所有 preflight，并让阻断结果立即成为四态 `unavailable` Check fact，不增加第五个终态或新的 `RunResult.kind`。

## 背景

- `validateOptions` 把合法 Definition 的领域 policy 失败提升为 configuration failure，且无法同时表达 preparation messages、继续执行的 fallback 与 per-invocation prepared value。
- 随包 Check 的 options 仍需要自身完整 shape 和执行内部防护，但该责任不应令 Product Definition 识别包 Check、注册 validator 或拒绝 ordinary authored JSON。
- 已有 Task graph、四态 Core fact、dependency readback、duration、progress 和 aggregation 可以承接 blocked Check；不可把 preflight 伪装成 author execution 或另建结果类别。

## 决策

- 采用：executable ordinary Check 可选地声明双泛型 `preflight<AuthoredOptions, PreparedOptions>(options, signal)`。它接收 Definition canonical authored options 与同一次 invocation 的 cancellation signal，并返回 closed 判别结果：`success` 必须带 `preparedOptions`；`failure/block` 必须带 reason 且绝不带 fallback；`failure/continue` 必须同时带 reason 与 fallback。两类 failure 都可附 ordered messages；continue 的 reason 是 Check-owned diagnostic identity，当前可观察表面是 messages 与后续 outcome；不再有静态 `onIssue` policy。
- 采用：Run 在 Task admission 前按定义顺序顺序执行完整 global preflight barrier。preflight throw、malformed result、非法 reason/messages 或不能 canonicalize/freeze 的 prepared/fallback 都直接把 owning Check 结算为 `unavailable`；block 的 owning reason 原样成为 outcome reason，且 callback 不运行。
- 采用：preflight 收到 callback 同一 AbortSignal 并应协作退出；barrier 期间或结束时已取消的 invocation 显式闭合 execution phase 为既有 `cancelled` RunResult，不依赖空 scheduler graph 推断取消，也不以 `Promise.race` 遗留 preparation work。
- 采用：blocked Check 在 barrier 后立即关闭 Core scope，故没有 `started` lifecycle fact、duration 为 `null`，但仍有 settled/progress、messages、snapshot row、aggregation 与 dependency readback。依赖 blocked Check 的 ready task 读取既有 unavailable fact；scheduler 只等待仍需 execution 的 dependencies。
- 采用：success prepared value 或 continue fallback 是 detached canonical deeply frozen invocation-local value；它只传给本次 callback，既不回写 Definition，也不改变 authored options 的 declarative fingerprint。preflight function 同 execution 一样不进入 fingerprint、Core 或 machine output。
- 采用：preflight messages 总在 execution terminal messages 之前；execution throw 或 malformed terminal 仍保留已接受的 preflight messages。ordinary four-state terminal parsing仍只处理 execution result。
- 采用：所有 package-provided Checks 与 `maintenanceReminders` 提供 block preflight，并与其 direct execution 入口复用 Check-local options validation helper；普通 custom Check 没有提供 preflight 的义务。
- 不采用：Definition-owned Check-local validation、package ID registry、未界定并行 preflight、将 block 伪装为 execution started、在 block 分支容纳 fallback、在 continue 分支省略 fallback/reason、第五种 Check status 或新的 RunResult kind。
