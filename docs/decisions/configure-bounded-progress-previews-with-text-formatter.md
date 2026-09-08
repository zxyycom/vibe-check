---
title: 提供可配置且受管的 progress 文本预览
id: 260907-configure-bounded-progress-previews-with-text-formatter
status: active
alignment: aligned
createdAt: 2026-09-07T10:30:45Z
purpose: 让调用方调整 Record 与 message 预览并定制文本，同时保留完整事实和终端安全责任。
background: 固定数量与长度不能满足不同终端摘要需求，而 renderer 已拥有统一呈现和独立失败边界。
decision: 由 progress output 配置独立限制和同步文本 formatter，回调结果继续转义限长且不进入事实或指纹。
tags:
  - configuration
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: 260904-render-record-and-message-previews-in-product-progress
---

## 目的

- 让任意 Check 的 accepted Records 与 messages 由唯一 Product progress owner 提供独立、可配置的有界预览，不要求 producer 制造重复 message。
- 允许项目保存展示 policy，并按一次 Run 的终端需求覆盖；formatter 只重写预览文本，不取得 Check、Record 或输出 writer 的责任。
- 保持完整 canonical Record facts 和 messages 在各自 snapshot、RunResult 与 machine contract 中不被截断或改写。

## 背景

- 当前统一 progress 已拥有 writer、TTY 重绘、tee 和失败隔离；固定 5／5／240 能作为默认值，但无法承接调用方调整数量、长文本摘要和局部文本变换的需求。
- 用户要求 formatter 只接收默认文本、Record/message 类型和文本预算，不需要 raw Record/message 对象。继续把 metadata-only hook 当作截断 formatter 不能兑现该结果。
- Definition 已保存 output defaults，RunControls 已逐字段覆盖；将同一展示 policy 拆成独立配置体系没有已证明的价值。Definition 的 declarative snapshot 必须继续 callback-free。
- Producing Check 仍拥有安全字段、message 内容和完整事实的真实入口。renderer 的 escaping 不是 redaction，trusted callback 也不是被 sandbox 的代码。

## 决策

- 采用: progress output 在 Definition 与 RunControls 中使用同型的独立 Record/message 数量、文本 code-point 限制及可空同步 formatter。默认保持 5／5／240 与 null；数量为非负安全整数，文本预算为正安全整数，不新增无依据的固定硬上限。0 只关闭该类 detail，仍准确提示 omitted count，不改变 settled row 的可见性判断。
- 采用: 按既有 Product defaults、Definition、RunControls 的逐字段优先级解析；旧直接 Definition 的 `{ enabled }` 继续合法并规范化默认值。override omission/undefined 不覆盖，formatter null 显式清除；即使 disabled 也校验，invocation 配置冻结且不回写 caller。
- 采用: formatter 每次同步接收冻结的 `{ kind, text, maxCodePoints }`，仅处理 count-selected item；Record text 是 local ID 加 canonical JSON，message text 是正文，均为未转义、未截断的默认文本。依序逐项调用一次，不接收原始对象、label、writer 或 Check context，不调用 omitted、summary 或 refresh 的 formatter。
- 采用: formatter 只返回替代正文；空字符串仍算 presented。renderer 继续拥有 label、排序、omitted counts、terminal-control escaping 与 code-point bounding，marker 计入预算，短预算只容纳 marker 的前缀。默认 formatter 不存在时保持既有输出；完整 facts 不被写回或改造。
- 采用: formatter throw 或非字符串返回立即使 progress output failed，不静默回退，不等待 Promise/thenable，也不在其完成后补写。对误返的真实 Promise 观察 rejection，避免该返回值产生未处理 rejection；不读取或调用任意 thenable。随后沿既有 terminal failure containment 停止后续渲染，并保持其它 output、Check settlement、完整 facts、close 和主结果优先级。
- 采用: formatter 是 trusted caller code；它可见 selected item 的完整默认文本，文本预算不是输入访问控制。Product 不承诺拦截其自行使用宿主权限、detached work、独立 I/O 或阻塞行为。
- 采用: declarative output projection 只包含规范化数值和 formatter 的 default/custom 种类，函数、identity、source 与 closure 均不进入 snapshot/fingerprint，RunControls 继续不进入。省略和显式默认等价，不同 custom callback identity 等价；不把该 identity 当作行为或缓存等价证明，也不承诺新增字段后跨版本旧 fingerprint 不变。
- 采用: Core session 只关闭完整 Check facts；execution 通过 private lifecycle handoff 在 settlement 后向 enabled renderer 交付 accepted Records/messages，不增加 public Check callback 字段、machine 字段或 preview readback。`RunResult.outputs.progressRendering` 保持 enabled/status。disabled progress 不创建 writer、tee、refresh 或 preview，也不调用 formatter。
- 采用: attention 的 passed Check 只要有 accepted Record/message 就仍呈现 settled block；无事实时继续隐藏。维持每个 block 先 Record 后 message 与既有 terminal/tee、输出失败优先级。
- 采用: 保留 Native Gate adapter 的 owner-safe Record projections、unsafe-input fail-closed、独立 focused-command message 和 private transcript；不恢复 diagnostic-to-message preview 或失效 presentation payload。external process command-failure Record 仍只发布 basename command label，完整 executable path、arguments 与 child output 继续由 Check-owned transcript 保存。
- 不采用: 让 Core settlement 写 terminal、在 RunResult/machine 中保存 preview、让 renderer 推断任意 Record 领域字段、让 formatter 接管安全字段或完整事实、提供 async formatter 或通用终端 plugin system。
