---
title: 配置受管 preview 与 quiet-pass progress presentation
id: 260914-configure-progress-previews-and-quiet-pass-presentation
status: active
alignment: unaligned
createdAt: 2026-09-14T08:11:59Z
purpose: 让调用方配置有界 progress preview 和 quiet-pass row 省略，同时保留完整事实与终端安全责任。
background: 旧 attention 只隐藏 settled row，编号仍推进；现有 preview、writer 与 failure 边界继续有效。
decision: 保留受管 preview 契约，并以显式单向字段统一 quiet-pass running、settled row 与双计数呈现。
tags:
  - configuration
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: 260907-configure-bounded-progress-previews-with-text-formatter
    summary: 以显式 quiet-pass policy 修订 attention 行为
---

## 目的

- 让任意 Check 的 accepted Records 与 messages 由唯一 Product progress owner 提供独立、可配置的有界预览，不要求 producer 制造重复 message。
- 让 Check author 显式选择 quiet-pass row 省略：长运行仍有 TTY feedback，安静通过不保留结果行，其它终态和带 detail 的 pass 仍可诊断。
- 保持完整 canonical Check/Record/message facts、全局 progress accounting、RunResult 与 machine contract 不因预览、formatter 或 row 省略而被截断或改写。

## 背景

- 已对齐的前序 Decision 建立了 progress preview 的数量、文本预算、同步 formatter、terminal escaping、writer failure 和事实隔离边界；这些判断仍适用。
- 形成此修订时，`visibility: "attention"` 只隐藏既无 accepted Record 也无 message 的 passed settled row，TTY running row 仍显示普通 `[n/total]`。settlement 后行消失而全局 completion accounting 继续推进，读者容易把编号跳跃理解为漏跑或结果丢失。
- Definition 在 Run 开始前已持有全部 normalized executable Checks，execution lifecycle 已向 renderer 交付 started/settled facts；renderer 因而能在不增加 public progress event、RunResult 或 machine 字段的前提下呈现静态配置数、无编号 row 和实际省略数。
- `0.0.x` patch 间不承诺 package-level compatibility，仓库内现有 `visibility` 用法可以原子迁移。保留旧字段 alias 会给同一行为建立第二个长期事实源，而当前没有第三种 row policy 或兼容期的现实需求。
- Producing Check 继续拥有安全字段、message 内容和完整事实的真实入口。renderer 的 escaping 不是 redaction，trusted formatter 也不是 sandboxed code。

## 决策

- 采用: progress output 在 Definition 与 RunControls 中使用同型的独立 Record/message 数量、文本 code-point 限制及可空同步 formatter。默认保持 5／5／240 与 null；数量为非负安全整数，文本预算为正安全整数，不新增无依据的固定硬上限。0 只关闭该类 detail，仍准确提示 omitted count，不改变 quiet-pass 判定。
- 采用: 按 Product defaults、Definition、RunControls 的逐字段优先级解析 preview policy；旧直接 Definition 的 `{ enabled }` 继续合法并规范化默认值。override omission/undefined 不覆盖，formatter null 显式清除；即使 disabled 也校验，invocation 配置冻结且不回写 caller。
- 采用: formatter 每次同步接收冻结的 `{ kind, text, maxCodePoints }`，仅处理 count-selected item；Record text 是 local ID 加 canonical JSON，message text 是正文，均为未转义、未截断的默认文本。依序逐项调用一次，不接收原始对象、label、writer 或 Check context，不调用 omitted、summary、running row 或 refresh 的 formatter。
- 采用: formatter 只返回替代正文；空字符串仍算 presented。renderer 继续拥有 label、排序、omitted counts、terminal-control escaping 与 code-point bounding，marker 计入预算，短预算只容纳 marker 的前缀。完整 facts 不被写回或改造。
- 采用: formatter throw 或非字符串返回立即使 progress output failed，不静默回退，不等待 Promise/thenable，也不在其完成后补写。对误返的真实 Promise 观察 rejection，避免该返回值产生未处理 rejection；不读取或调用任意 thenable。随后沿 terminal failure containment 停止后续渲染，并保持其它 output、Check settlement、完整 facts、close 和主结果优先级。
- 采用: formatter 是 trusted caller code；它可见 selected item 的完整默认文本，文本预算不是输入访问控制。Product 不承诺拦截其自行使用宿主权限、detached work、独立 I/O 或阻塞行为。
- 采用: declarative output projection 只包含规范化数值和 formatter 的 default/custom 种类，函数、identity、source 与 closure 均不进入 snapshot/fingerprint，RunControls 继续不进入。省略和显式默认等价，不同 custom callback identity 等价；不把该 identity 当作行为或缓存等价证明，也不承诺新增字段后跨版本旧 fingerprint 不变。
- 采用: Core session 只关闭完整 Check facts；execution 通过 private lifecycle handoff 向 enabled renderer 交付 normalized row policy、started identity 和 settled outcome/duration/accepted Records/messages，不增加 public Check callback 字段、machine 字段或 preview readback。`RunResult.outputs.progressRendering` 保持 enabled/status。disabled progress 不创建 writer、tee、refresh 或 preview，也不调用 formatter。
- 采用: executable Check 使用单向 `omitQuietPassedRow?: true`，省略或 runtime own `undefined` 规范化为 false，显式 true 规范化为 true；该字段不继承，normalized boolean 进入 Check declarative snapshot/fingerprint。直接删除 `visibility`，不提供 alias、warning、双读或兼容期，也不为假想的第三种策略建立 enum。
- 采用: policy-enabled Check 的 TTY running row 和所有 retained settled rows 始终无 `[n/total]`；plain/dumb target 不新增 running row。quiet pass 精确为 passed 且完整 accepted Records/messages 均为空，其 settled row 被省略；final data、preview limits、formatter 空文本与截断不参与判定。failed、not-applicable、unavailable 和带 accepted detail 的 pass 保留无编号 row，并沿用 duration、reason、preview、escaping、color、tee 与 writer-failure pipeline。
- 采用: renderer 对所有 settlement 继续推进 completion accounting，普通 row 的 `[n/total]` 因而允许跨越未保留的 quiet-pass row。flag-condition-not-matched 继续优先进入既有分组并推进 accounting，不计为 quiet-pass omission。
- 采用: 仅在至少一个 normalized executable Check 启用策略时，header 使用 `total <total> checks · <configured> configured for quiet-pass omission`，final summary 在 elapsed 前增加 `quiet-pass rows omitted: <actual>`；零配置 terminal/tee bytes 保持不变。configured 包含 flag-disabled declaration，actual 只统计 renderer 实际省略的 policy-enabled quiet pass，两者不得混作同一数量。
- 采用: 保留 Native Gate adapter 的 owner-safe Record projections、unsafe-input fail-closed、独立 focused-command message 和 private transcript；不恢复 diagnostic-to-message preview 或失效 presentation payload。external process command-failure Record 仍只发布 basename command label，完整 executable path、arguments 与 child output 继续由 Check-owned transcript 保存。
- 不采用: 让 Core settlement 写 terminal、在 RunResult/machine 中保存 preview 或 row policy、让 renderer 推断任意 Record 领域字段、让 formatter 接管安全字段或完整事实、提供 async formatter、通用终端 plugin system、兼容双字段或无现实变体的 presentation enum。
