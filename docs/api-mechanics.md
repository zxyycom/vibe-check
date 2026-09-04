# 深入理解 Vibe Check API 机制

本文说明 package 的通用 invocation lifecycle：自定义 Check 如何经过 Definition validation、options preflight、execution 与 settlement，以及一次 Run 如何形成 dependency data、aggregation、outputs 和可判别结果。首次集成先阅读[package README](../README.md)；随包 Check 的 options、业务效果和安全边界由各自指南说明；单个 public 字段与函数签名以 installed declarations 为准。

## 一次 Run 的生命周期

以下顺序描述责任与数据流；箭头表示当前阶段成功形成下一阶段的输入：

    ordinary Check values
      │ defineConfig: fill Definition defaults
      ▼
    Project Definition
      │ run: validate Definition + RunControls, then normalize the Check tree
      ▼
    declarative snapshot + fingerprint + complete static graph validation
      │ if not cancelled before execution: private effective strategy prepares once
      │   (duration prediction + frozen selection policy when learned)
      │ invocation control barrier: cancellation + normalized flag conditions
      ▼
    initial control settlements + complete static Task graph
      │ Scheduler applies direct relations, mutex and parallel scheduling
      ▼
    task-local preflight / Product-owned blocked unavailable outcomes
      │ admitted Checks continue to author callback
      ▼
    author execution + terminal settlement
      ▼
    snapshot + messages + durations
      │ terminal measurement Hooks settle; if terminal context exists, prepared strategy completes once
      │ optional aggregation + enabled output completion
      ▼
    RunResult

Run 在 author work 前验证包含全部可执行 Check 的静态 task graph，再处理 invocation cancellation precedence，并按 Definition 顺序完成 invocation flag control。flag 条件不匹配的 Check 先结算为 `not-applicable / flag-condition-not-matched`，并作为同一张 Scheduler graph 的 pre-admission non-passed Task result；它不会再次 admission，其 `dependsOn` dependent 在 preflight 前结算为 `unavailable / dependency-not-passed`，`observes` consumer 仍可等待并读取该终态。其余 Check 被 Scheduler admission 后在自己的 task 中执行 preflight，随后才执行 author callback；没有互相约束的 preflight 可以并行。Run snapshot 保存 Check facts；progress rendering 呈现 execution lifecycle；machine publication 在 terminal snapshot 形成后写入 machine files；optional aggregate 也在 terminal facts 结算后计算。

这里的 private strategy lifecycle 不能扩大 public authoring contract：Invocation 在 graph ready 后对 effective strategy 调用一次
`prepare`，Scheduler 只接收其完整 frozen policy 并同步 `decide` 零次或多次；Scheduler 停止 admission、drain、seal terminal
measurement 并完成既有 Hooks 后，只有 resolved execution 返回 terminal context，Invocation 才调用一次 `complete`。normal、
cancelled 和 admission-policy-failed Run 只要返回该 context 都遵循这个顺序；pre-terminal task-engine failure 不调用
`complete`。`complete` 的数据只能成为后续 Run 的 preparation input，不能回流到同一 Run 的 decision。

## Definition 与 invocation 的责任

- `defineCheck(value)` 保留 literal `checkId`、options 和 typed-provider parser 的 TypeScript inference。它与同 shape 普通 Check object 具有相同 runtime 语义。
- `defineConfig(value)` 形成带默认 `apiVersion`、outputs 和 scheduler policy 的 Project Definition。
- `defineAdmissionPolicy(value)` 只保留 closed admission policy literal、特别是 custom strategy 的 inference；它与同形 inline policy value 等价。
- `run(definition, controls?)` 拥有 invocation validation 与 normalization：它关闭递归 Check grammar，detach / canonicalize authored options，并形成 declarative snapshot 与 fingerprint。

fingerprint 使用 normalized declarative fields；preflight、execution 与 custom admission callbacks 都保持为执行行为。scheduler fingerprint 区分 `static`、`custom` 与 `learned-critical-path`；后者包含 `stateDirectory`，custom 仍绝不包含 callback identity、source 或 closure。同一份 Definition 可以重复调用，每次 Run 都从 authored input 派生自己的 project context、prepared options、terminal facts 和 output statuses。

### custom admission policy

`scheduler.admissionPolicy` 省略时与 `{ kind: "static" }` 相同。custom 只有两种 exact authoring form：

- `{ kind: "custom", strategy: { kind: "simple", decide(context) } }`：每个 admission cycle 直接使用同步 `decide`；
- `{ kind: "custom", strategy: { kind: "prepared", prepare({ graph }) } }`：每个 graph-ready Run async-capable
  `prepare` 一次，并返回该 Run 的 `{ decide, complete? }`。

simple 的 `decide` 和 prepared 返回对象的 `decide` 都必须同步返回精确
`{ kind: "select", taskId }` 或 `{ kind: "wait" }`。`defineAdmissionPolicy(...)` 只改善这些 literal 的 TypeScript
inference，inline object 与 helper 的运行语义完全相同。declarative snapshot/fingerprint 记录 custom 的 strategy kind，
但不记录 callback identity、source 或 closure。Compatibility hard cut 只接受这两种 form：retired
`proposeAdmission`、unknown authoring fields 和 thenable `decide` 都不构成合法 authoring。

Invocation 在静态图 ready 且未于 pre-work/planning 取消后，解析该 Run 的 custom strategy。simple 立即形成 Run-local
selection closure；prepared 恰好调用一次 `prepare(Object.freeze({ graph }))`，其 return 或 resolved exact
`{ decide, complete? }` 也只属于该 Run。重叠 Runs 不共享 returned object 或 closure。成功准备后，Scheduler 只接收 frozen
synchronous `decide`；有 sealed terminal context 时，Invocation 在 generic terminal Hooks 返回后至多一次交付 optional
`complete`。

每次实际 decide 都收到独立、deep-frozen 的 `AdmissionPolicyContext`：`graph` 以 canonical arrays 提供完整 normalized tasks、
scopes 及每个 Task 的 relation arrays，Task metadata 是 topology 和 `admissionPriority` 的唯一来源；该
`SchedulerGraphSnapshot` 在 invocation 内一次冻结并由所有 decision context 共享。dynamic facts 提供 relation/mutex
candidates 的 `{ taskId, canAdmit }`、capacity、running/settled/active-scope IDs、最小 cancellation runtime 状态以及
决策边界 measurement。完整 Scheduler state、Check data、Records、messages 与 Task control 保持在 Product owner 内。

callback 是调用方 trusted host code。调用方 closure 保有自己的 host capability；Vibe Check 只提供 frozen context 和
result-only handoff，不把 private Scheduler inspection 或真实 Task command 变成 custom strategy API。Scheduler 在 callback 后独占
readiness、mutex、capacity、cancellation、Task start/await/settlement，以及 selected Task 仍 pending、属于本轮 candidate 和
`wait` 可 drain 的验证。

custom callback 在每次**实际**调用前获得 shared graph 和已 flush 的 `measurement`。`cumulative` 投影 bounded
scalar/discrete/peak facts，完整 per-Task table 只属于 terminal raw measurement；`measurementCount` 与
`measurementAt(index)` 是 context 创建时捕获 end-count 的 synchronous reader。available timing 才包含数值 contribution；
合法 zero span 仍是 available，而 clock/integral fault 形成 unavailable timing。该 observation 描述 action 后 state，
不把时段解释为 action causality、critical path 或 CPU 归因。

### AdmissionGraph simulation

`createAdmissionGraph({ graph, maxParallel })` exact-validates its input record, validates the supplied
`SchedulerGraphSnapshot` and positive safe-integer root cap, then compiles one private graph for the returned `AdmissionGraph`
handle. `initialState()` creates an immutable standalone seed; each actual custom callback receives the same `AdmissionState`
contract as its live `context.admissionState` seed.

state 的 `catalog` 将所有 pending Task 按 Unicode `taskId` 顺序分为 selectable IDs 或一个 primary rejection；`inspection` 同样
使用 canonical order。`validateSelection` 不构造 catalog，且与 `select` 使用相同 precedence：complete、unknown、not-pending、
depends-on-pending、observes-pending、mutex-held、scope-capacity-reached、root-capacity-reached。`settle` 先拒绝非二值 outcome，
再检查 complete、unknown 和 non-running。

accepted `select` 只产生 hypothetical running successor；binary `settle` 释放其 mutex/capacity，并把 direct unsatisfied
dependent 以 private forced-block microsteps 结算到下一 public boundary。`completed` 是 satisfied，现有
`prerequisite-unsatisfied` 与 `failed` 是 unsatisfied；private blocked/cancelled settlements 不进入 public settled list。
scope 在 activation Task 开始后 active，并在 terminal Task 结算后 closed。所有 handles、results 与 DTO 都 frozen；state
没有 constructor、serialization、cancel/effect/executor action 或 mutable storage。

live seed 的 branch 从不 reservation 或启动真实 Task；callback 仍只能返回原有 exact proposal，Scheduler 在返回后重新执行
lifecycle、candidate、capacity 与 cancellation hard guard。static/custom/learned path 未读取 `admissionState` 时不构造 public
catalog/search projection；private compiled graph、parent+delta node、reducer/effects 和 real shell 共同承接 transition，
Task/Promise/signal/diagnostic/measurement/RunResult 仍只属于 real shell。

| 触发点 | owner 与处理 | 对调用方可见的结果 |
| --- | --- | --- |
| prepared `prepare` throw/reject 或不能形成 exact closure | Invocation 在 Scheduler start 前结束该 Run。 | `kind: "execution"` / `admission-strategy-preparation-failed`；没有 complete delivery。`outputs.measurementHooks` 仍只由 configured generic Hooks 决定是 disabled 或 enabled/`not-run`。 |
| `decide` throw、thenable、malformed proposal、illegal `select` 或 undrainable `wait` | Scheduler 停止新 admission、取消 pending，并 drain 已启动 Task。 | `kind: "execution"` / `admission-policy-failed`；若 drain seal 出 context，prepared `complete` 仍在 generic Hooks 后交付。 |
| pre-terminal task-engine failure | task engine 形成 primary execution result。 | 没有 sealed context 或 complete delivery；已 enabled 的 measurement output 保持 `not-run`。 |
| generic Hook 或 public `complete` throw/reject | Scheduler 让余下 generic Hooks 获得调用机会；Invocation 汇总 terminal participant settlement。 | `outputs.measurementHooks.status` 为 `failed`；正常 completed Run 映射为保留 sealed facts 的 `kind: "output"` / `scheduler-measurement-hooks-failed`，已有 primary outcome 不被覆盖。 |

### learned-critical-path 准入

`scheduler.admissionPolicy: { kind: "learned-critical-path", stateDirectory }` 是无 callback 的 opt-in local optimization。
每次 Run 在完整 static graph 就绪后，由 invocation 的 private effective strategy 一次 prepare：duration model 读取 local
history 并形成 immutable prediction，pure critical-path algorithm 形成 frozen Scheduler-facing `select|wait` policy。Scheduler
只消费该 private policy；它不接触 prepare/complete，调用方也不获得 lifecycle、provider 或 model API。正常、取消和
admission-policy-failed Run 若形成 terminal measurement context，会先完成既有 terminal Hook delivery，再由 invocation 一次
complete；该 commit 只为后续 Run prepare 提供输入，不能修改同一 Run 已经作出的 selection。

`stateDirectory` 必须是非空、无 U+0000 string；relative text 从 effective `projectRoot` 解析，absolute text 直接作为
caller target。它是 Definition declarative identity，因此同目录的 State policy 与其它目录不能共享 fingerprint；它不是
RunControls、output、remote store、sandbox、锁、清理或 secret-management capability。v1 不接受 `expectedDurationMs` 或其它
Check-level duration grammar。

在 author preflight/execution 前，Product 从该目录尝试读取一个 closed history envelope；不存在、malformed、版本不兼容或
read failure 都只得到空 history，仍按 learned policy 的 cold/project prior 继续。每个 executable Task 的 identity 是 model version、Check ID、canonical authored options
和 normalized effective flags 的 digest，state 只保存 digest 而不保存原 values。当前 implementation 对同 identity 使用最多
32 个 admitted-to-settled duration samples 的 arithmetic mean 作为 `estimatedDurationMs`；同一有序窗口的 nearest-rank `p90`
与 sample count 是当前内部 prediction statistics，但不参与 score。没有该 identity 时使用本次 Run 已知 estimates 的 median，若仍没有 prior 则
用 cold `1`。它最多保留最近更新的 4096 identities。该 envelope、上限、statistics 和 heuristic 是当前实现描述，非跨版本
storage/model compatibility promise，也不承诺跨版本、环境或 Run 得到相同顺序或性能结果。

Product 用 frozen estimates 在完整 static graph 的 `dependsOn` 与 `observes` directed edges 上计算 score；pure Scheduler
仍按现有 tightening、constrained-continuation 和 ordinary candidate layers运行，只在同一 layer 内按 score 降序选择。只有
score 相同时才比较 existing effective `admissionPriority`，再按 canonical Task ID；relation、mutex、capacity、cancellation、
Task start、settlement 和 drain hard guard 完全不变。history、estimate 和 score 不进入 custom callback context、Check
context、Check/Record facts、machine output、progress 或 public `RunResult`。

在 Scheduler 已停止 admission、完成 started work drain、seal terminal measurement 并交付既有 terminal Hooks 后，Product 才从
private terminal occupancy measurement 记录可用 duration sample，随后以 same-directory temporary file / atomic replacement 尝试写回。unavailable timing 不产生 sample。failure 的
分流按阶段固定：上述 history read 的空/无效结果仍形成 learned cold/project-prior prediction；无法形成 canonical prediction input，
或 local setup、prediction 或 score-table construction 失败时，该 invocation 的 selection 回退为 static；Scheduler drain 后的
record/write failure 只会丢失未来 Run 可用的优化样本。三类情况都只在启用 diagnostic logging 时形成有界 human diagnostic，不会改变
invocation 的 quality result、`RunResult.kind`、output schema 或 machine bytes。本能力没有 parser、schema、event-stream、
retention/discovery API 或 auto-tuning contract。

## options preflight 与 execution

可执行 Check 可以提供 `preflight(options, signal)`，在 author execution 前准备本次 invocation 使用的 options。authored 与 prepared options 同形时可以直接使用 authored options；两种 shape 不同时，TypeScript 要求提供 preflight。

preflight 返回以下三种 closed result 之一：

| 结果                                                                     | execution 输入与 Check outcome          |
| ------------------------------------------------------------------------ | --------------------------------------- |
| `{ status: "success", preparedOptions, messages? }`                      | 使用 `preparedOptions` 进入 execution。 |
| `{ status: "failure", action: "block", reason, messages? }`              | owning Check 以 `unavailable` 结算。    |
| `{ status: "failure", action: "continue", reason, fallback, messages? }` | 使用 `fallback` 进入 execution。        |

Run 先验证完整 static task graph并完成 invocation flag control；Scheduler 在 direct relation、mutex 与 capacity 允许后 admission 单个未结算 Check，并在该 Check 的 author callback 前执行其 task-local preflight。互不约束的 preflight 可以并行，不形成按 Definition 顺序的全局 preflight barrier。preflight throw、malformed result 或 noncanonical prepared value 把 owning Check 结算为 `unavailable`；其 `dependsOn` dependent 因此不会开始 author work。prepared options 与 fallback 都会成为 detached、deep-frozen 的 invocation-local value；preflight messages 与后续 terminal outcome 共同呈现 preparation 结果。`enabledByFlags` 的公开 authoring grammar 见 [README 的 Check 定义](../README.md#定义-check)。

Package root 的 `defaultProjectFileSelection` 只是 file-selecting constructor 共用的可组合、深冻结 baseline；spread 该
value 不会建立跨 Check global config。部分 constructor 原样物化它，具有更窄文件类型能力的 constructor 从相同
source/exclude 派生精准默认 include；显式 `include` / `exclude` 数组始终由 owning Check 视为完整替换。每项实际默认与
selected-but-rejected 行为由对应 Check 指南说明。

## terminal result、Records 与 messages

每个可执行 Check 返回一个 terminal result：`passed` / `failed` 带 Check-owned object final data；`not-applicable` / `unavailable` 以 reason 表示本次调用的数据边界。settlement 会 detach、canonicalize 并关闭 final data；callback throw、malformed result 或 noncanonical data 对应 `unavailable` outcome。

`records.report({ id }, data)` 在 owning Check namespace 内追加 supplemental Record。每个 `id` 非空且在该 Check 内唯一，Record data 使用 canonical JSON object；无效或重复 Record 把 owning Check 结算为 `unavailable`。settlement 保留此前已经接受的 Records。

`messages?` 是 owning Check 可选的有序人读说明；consumer 必须先按 outcome 处理事实，不能用 message presence 推断状态。final data、Records 和 messages 分别承载主要事实、补充事实和人读说明。随包 Check 的额外 message 保证由各自指南说明。

### Check 输出与受管 progress

Check execution 与 Product progress 在调用方的同一个 runtime 中运行。默认 progress 在可用 TTY 上维护临时 running
region，并在同一个 terminal 上移动光标。Product 先完成静态 Check graph 校验，再在任何 author preflight 或 execution
之前安装一次全局 `console.*` router；router 贯穿 invocation flag control、task-local preflight 与 Check execution，所有 Check 闭合后统一恢复原
method descriptors。每个 awaited preflight/execution 只建立独立 async capture context：当前 Check 的调用先进入自己的
内存数组，settlement 后再与该 Check 的 row 连续呈现，并以 `console-<method>` code 保留在
`RunResult.checkMessages`。并发 Check 的数组互不混合；没有 Check capture context 的 host console 调用继续走原方法。

- `console.log` / `info` / `debug` 等普通输出映射为 `info`，`warn` 映射为 `warning`，`error` / `trace` / failed
  `assert` 映射为 `error`。Product 使用非彩色 Console formatting，并在最终 renderer 中转义 terminal controls。
- preflight console 排在 preflight author messages 前；execution console 排在 terminal author messages 前。callback
  随后 throw、取消或返回 malformed result 时，已经捕获的 console 文本仍保留，非法 author message attachment
  仍按原规则整体拒绝。
- 捕获只覆盖通过当前全局 `console` 发起、且属于 callback 已等待 async work 的调用。预先保存的 method reference、
  callback 自行替换全局 console，以及未等待的 floating work 不在可靠归属边界内。
- `process.stdout.write` / `process.stderr.write` 直接写入 process stream，不经过 global console methods，因此绕过 console
  router。Product 不 patch 这些 host-wide streams：它们同时承载 Product、宿主和第三方输出，raw writes 也没有稳定的
  console-call 边界；全局接管会扩大副作用且仍不能可靠覆盖 inherited child-process stdio。直接写入 progress 使用的
  terminal stream 时，文本可能与 TTY cursor update 交错，造成内容被覆盖或遗留 running row。
- 直接 stream write、高容量、流式或 child-process 输出必须写入 Check-owned file、transcript 或独立 logger；不要让它
  继承受管 terminal stream。console capture 不进入 final data、Records、Check facts 或 machine output，也不替代可持久
  诊断材料。

`diagnosticLogging` 默认关闭；调用方显式启用后，`check.finished` diagnostic 会像其它 settled messages 一样包含 captured
console 内容。因此 console 不应写入 secret；只需要内存 readback 时保持 diagnostic logging disabled。

需要稳定补充说明时仍优先在 terminal result 返回结构化 `messages`；console capture 是对常见 author logging 的安全
兼容边界，不是新的 live observer 或 Check logger API。在 `run(...)` 返回后由调用方打印汇总不受 running region 约束。

## Caller-keyed JSON cache

`cacheJsonByKey(...)` 是 package root 的 standalone local-storage helper，不属于 `ProjectDefinition`、`RunControls`、`CheckExecutionContext` 或 Run settlement。调用方提供 absolute `directory`、非空 `namespace`、payload `version`、opaque `key`、同步 `parse` 与同步/异步 `compute`。`key` 必须覆盖所有会改变 computation 结果的输入、实现版本、options、toolchain 与声明的外部状态；helper 不分析依赖，也不判断 key 是否完整。

helper 对固定 API version、namespace、version 和 key 的 canonical structure 计算 SHA-256 identity，并只以 digest 命名 entry。raw key 不进入文件名、envelope、result 或 helper-owned diagnostics。磁盘 entry 在 closed envelope、identity、canonical object payload 与同步 parser 都成功前不可信；只有全部通过才是 hit。miss、invalid payload 或 read failure 后，helper 恰好调用一次 `compute`，并让 computed payload 经过相同的 detached canonical-object/parser boundary。

返回的冻结 result envelope 表示本次调用，而非 Check 结算：hit 为 `{ source: "cache", read: "hit", write: "not-attempted" }`；computed 为 `{ source: "computed", read: "miss" | "invalid" | "failed", write: "stored" | "failed" }`。compute 或 parser failure 直接传播且不写 entry；storage failure 不改变已接受的 computed value，也不自动创建 Check message、Record 或 terminal status。parser 返回的 domain value 由 parser owner 决定是否进一步冻结。

写入在 caller directory 内经 unique temporary file 和 atomic rename 发布。并发 miss 可以重复 computation，但 target 只作为完整有效 entry 读取；helper 不提供 lock、single-flight、global mutable cache、cleanup 或 whole-Check replay。directory 是 caller 信任且可删除的本地 state，不提供 containment、remote sharing、authenticity 或 secret protection；不得将 secret、token 或低熵敏感材料放入 key。consumer 自己决定是否把 observation 转换为 Check 事实。

## Finding presentation

`presentCheckFindings(...)` 是 package root 的通用 presentation helper。它不规定 Finding shape 或完整明细位置；producing
Check 必须提供稳定排序的 `findings`、非负安全整数 `limit`、单条 `message` hook，以及超限时的
`omittedMessage` hook：

```ts
import { presentCheckFindings } from "@zxyycom/vibe-check";

const messages = presentCheckFindings({
  findings,
  limit: 20,
  message: (finding) => ({
    code: "finding-detail",
    level: finding.blocking ? "error" : "warning",
    message: `${finding.path}:${finding.line} ${finding.summary}`,
  }),
  omittedMessage: ({
    omittedCount,
    omittedFindings,
    presentedCount,
    totalCount,
  }) => ({
    code: "findings-omitted",
    level: omittedFindings.some((finding) => finding.blocking)
      ? "error"
      : "warning",
    message: `${omittedCount} more of ${totalCount} findings; inspect reports/my-check.json after the first ${presentedCount}.`,
  }),
});
```

helper 只调用前 `limit` 项的 `message` hook；超限时再调用一次 `omittedMessage`。超限 context 同时给出完整计数和
原 `omittedFindings` references，因此 Check 可以决定省略项等级，并明确告诉 consumer 去 Records、artifact、transcript
或其它实际位置深入查看。返回值只是已冻结 `CheckMessage[]`；Check 仍需把它附加到自己的 terminal result，并自行保存
完整 Finding facts。四项随包质量 Check 使用该通用机制但各自选择 `limit: 10` 和安全字段。

## Finding waiver reconciliation

`reconcileFindingWaivers({ findings, identify, waivers })` 是 package root 提供的独立 helper，供 custom Check 或其它
finding producer 在**完整** finding 候选集合形成后对账。`identify(finding)` 对输入顺序中的每个原 finding 接收完整
finding；调用方自行选择稳定的语义 identity，例如 path、function name 和 metric 的组合。`identify` 的结果与
`waiver.identity` 都必须可安全 materialize 为 canonical JSON，helper 按 canonical JSON 的结构而非对象引用匹配。

每项 waiver 的 identity 必须唯一且 reason 为非空 string。重复 canonical identity、无法 canonicalize 的 finding 或
waiver identity、无效 reason，或 malformed / hostile waiver authoring 都抛出 `TypeError`。每个 configured waiver 都在完整
集合上获得 audit：`0` 次匹配是 `unused`，`1` 次是 `applied`，`>1` 次是 `overmatched`；过宽 waiver 不会豁免任一 finding。

输出 `findings` 保持输入顺序，并在每项结果中保留同一个原 finding reference。applied waiver 附带的 evidence 是 detached、
deep-frozen 的 canonical materialization，因此调用方之后修改 authored identity 或 reason 不会改变结果。helper 只返回
finding disposition 和 waiver audit；它不发布 Record、message 或 terminal outcome。采用它的 Check 自己决定如何发布证据及
如何结算 actionable finding。

随包的 [`fileMetrics`](checks/file-metrics.md)、[`functionMetrics`](checks/function-metrics.md)、
[`duplicateDetection`](checks/duplicate-detection.md) 与 [`secretDetection`](checks/secret-detection.md) 已在各自 options 中原生接入该 helper；它们共享上述 reconciliation，
但 identity、Record、message 与 settlement 仍由各自指南拥有。其它随包 Check 没有自动获得 `findingWaivers` 字段；尤其 `secretDetection` 的 waiver 只能匹配其不含敏感值的安全 identity，不能豁免 coverage gap 或 unavailable。

## 递归组合与继承

带 `execution` 的节点形成自己的 outcome；没有 `execution` 的节点只组织子 Check 和 scheduling scope。普通对象字段表示显式 replacement；`inherit({ add, remove })` 只用于在父 `dependsOn`、`observes` 或 `mutex` collection 上增删。解析后，每个可执行节点拥有自己的 effective options、passed prerequisites、terminal observations、mutexes、visibility、parallel budget 与 admission priority。

## 类型化依赖数据

producer 同时声明 `execution` 与 `parseData`，从而拥有 final-data contract。需要其成功 data 才能工作时，consumer 先声明 direct `dependsOn`，再用非泛型 `dependencies.get(checkId)` 读取 canonical data、收窄 `ok`，最后调用 producer 的 parser。需要在每个 observed upstream 各自结算后，根据任意 terminal outcome 审计或制定 policy 时，改声明 direct `observes`；两类 relation 的 union 才是 dependency reader 的授权范围。

### 完整运行示例

```ts
import { defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

const CHANGED_FILES_DATA_VERSION = 1 as const;

type ChangedFilesData = Readonly<{
  readonly files: readonly string[];
  readonly version: typeof CHANGED_FILES_DATA_VERSION;
}>;

const changedFiles = defineCheck({
  checkId: "changed-files",
  displayName: "Changed files",
  parseData(data): ChangedFilesData {
    if (
      data.version !== CHANGED_FILES_DATA_VERSION ||
      !Array.isArray(data.files) ||
      !data.files.every((value): value is string => typeof value === "string")
    ) {
      throw new TypeError("Unsupported changed-files data");
    }
    return { files: data.files, version: data.version };
  },
  execution() {
    return {
      status: "passed",
      data: { files: ["src/index.ts"], version: CHANGED_FILES_DATA_VERSION }
    };
  }
});

const analyzeChangedFiles = defineCheck({
  checkId: "analyze-changed-files",
  displayName: "Analyze changed files",
  dependsOn: [changedFiles.checkId],
  execution({ dependencies }) {
    const read = dependencies.get(changedFiles.checkId);
    if (!read.ok) return { status: "unavailable", reason: { code: read.error.code } };

    const data = changedFiles.parseData(read.data);
    return { status: "passed", data: { analyzedFileCount: data.files.length } };
  }
});

const definition = defineConfig({
  checks: [changedFiles, analyzeChangedFiles],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
```

dependency reader 为两类 relation union 中、具有 `passed` / `failed` final data 的 direct provider 返回 `ok: true`，并保留 upstream status；其它读取返回包含原因的 `ok: false`。上例的 `dependsOn` 已保证 callback 只在 provider `passed` 后开始，因此它不会把 upstream `failed` 继续传播为自己的结果；`!read.ok` 仍保留为 boundary defense。producer parser 负责 shape、invariant 和 compatibility validation，consumer 显式调用它恢复 provider data。八个随包 Check 都提供 `parseData` 和同实现的 package-root parser；名称与类型见各自指南。

### 批量审计 direct outcomes

当 consumer 需要批量审计自己的全部 direct upstream outcomes，而不是读取一个成功 prerequisite 时，先声明 `observes`，再使用
`dependencies.list()`。它没有参数，返回按 normalized effective direct dependency ID 的稳定顺序排列的冻结
`{ checkId, outcome }[]`；每项及其 Core-owned `outcome` 都是冻结的完整四态 `CheckOutcome`。因此
`not-applicable` 和 `unavailable` 是正常的可观察 terminal facts，不是 `get` 的 read error；两类 relation 各自继承得到的
direct ID 在去重 union 中只出现一次。列表不读取 ambient executed Checks、scheduler history、transitive 或 undeclared Checks。
以下 Check 只能据此形成自己的 summary、I/O、Records、messages 和 terminal result，不能修改、取消、重跑或重结算 producer：

```ts
const auditChangedFiles = defineCheck({
  checkId: "audit-changed-files",
  displayName: "Audit changed files",
  observes: [changedFiles.checkId, analyzeChangedFiles.checkId],
  execution({ dependencies }) {
    const observations = dependencies.list();
    const readable = observations.filter(
      ({ outcome }) =>
        outcome.status === "passed" || outcome.status === "failed",
    );
    const changedFilesObservation = readable.find(
      ({ checkId }) => checkId === changedFiles.checkId,
    );
    if (changedFilesObservation === undefined) {
      return {
        status: "unavailable",
        reason: { code: "changed-files-data-unavailable" },
      };
    }

    const data = changedFiles.parseData(changedFilesObservation.outcome.data);
    return {
      status: "passed",
      data: {
        directDependencyCount: observations.length,
        changedFileCount: data.files.length,
      },
    };
  },
});
```

`list()` observations preserve Core-owned frozen outcomes. `passed` / `failed` data must still be passed to
the producer parser; `not-applicable` / `unavailable` keep their original reason. The owning consumer may
only use the observations for its own I/O, Records, messages and terminal result; it cannot write back to
upstream facts.

## RunControls 与 Check aggregation

`RunControls` 只作用于一次 `run(definition, controls)`：

- `projectRoot` 决定项目相对路径的解析根。
- `flags` 成为 callback 可读的 normalized project context。
- `checkArtifactBaseDirectory` 是可选、invocation-only 的 Check artifact base；它使用非空且无 U+0000 的受信任 directory grammar，relative text 从 effective `projectRoot` 解析，absolute text 直接作为 target。它不进入 Definition fingerprint，不创建 output status，也不授予 Check 读取 base、sibling directory、machine/diagnostic output 或 cross-Run state 的能力；没有配置时 callback 的 `artifactDirectory` 为 `null`。
- `progressLogFile` 是可选、invocation-only 的 terminal-progress tee target，使用同一非空且无 U+0000 target grammar；它不会改变 Definition outputs、Definition fingerprint 或 Check callback capability。
- `signal` 供 preflight 与 execution 协作取消；取消结果记录对应 phase。
- `outputs` 覆盖本次 diagnostic logging、machine publication 或 progress rendering。
- `checkAggregation` 选择 `checks`，并以 `all` / `any`、`unavailable`、`notApplicable` 与 `empty` policy 形成 invocation aggregate。

aggregation 是 terminal outcomes 之外的 invocation-level fact。它在完整 terminal facts 结算后产生 `passed`、`failed`、`not-applicable` 或 `unavailable`；未配置 policy 时 `aggregate` 为 `null`。consumer 需要调用级结论时显式选择 policy，同时保留每项 Check outcome。

Check-specific invocation facts 由 owning Check 的 options 或 producing Check 的 final data 承载。多个 Checks 共享且必须成功的事实时，producer 负责 acquisition policy 与 data shape，下游通过 direct `dependsOn` 读取；需要处理任意 settled outcome 的 policy 则使用 `observes`。上面的 typed dependency 示例聚焦前者 data handoff。

## outputs 与 RunResult 边界

Definition outputs 提供 diagnostic logging、machine publication 与 progress rendering 三项独立 default；RunControls 可以只覆盖当前调用需要的部分。`scheduler.measurementHooks` 不属于这组三项配置：它是 Definition-owned terminal side effect，不能由 RunControls 注入或覆盖。machine publication 与 diagnostic logging 各自的 `directory` 都是受信任调用方选择的非空、无 U+0000 target：relative text 从 effective `projectRoot` 解析，absolute text 直接作为 target；没有 containment 或 sandbox 语义，两个 output 也不因同目录而合并。configuration 成功后的职责如下：

- 只有 diagnostic logging 或 machine publication 至少一项启用时，Run 才在创建 invocation 阶段捕获一次 immutable wall-clock `startedAtUtc`；两项都禁用时不读取或序列化 wall clock。
- 启用的 diagnostic logging 在 preflight 前以同一 instant 和 UUID 形成 owner-first `core-<suffix>.log`、`scheduler-<suffix>.log`，以及只对 learned-critical-path 生效的 `learned-admission-<suffix>.log`。它不是通用 event bus：三个 explicit owner channel 分别写自身事实，router 在每次委托前赋予跨 channel 的 sequence、monotonic elapsed 和 invocation ID。每个事件以这些 correlation fields、可筛选的 `[]` 标签和 event name 开始；普通事实使用 `key=value`，超出当前主行容量的事实进入有界 continuation line。owner 已由 filename 表达，行标签只突出 Run、Check、phase、decision 和 outcome 等阅读轴；Scheduler decision 的顶层 `kind` / `taskId` 与 Record observation 的顶层 `result` 已由标签完整表达时，不在 facts 中重复。
- Scheduler channel 先记录一次完整 graph 和 SHA-256 fingerprint；每个 decision 仅引用该 fingerprint 并保留本轮 `select`/`wait`、hard-guard 和其它动态 facts，不重复 graph。它不记录 policy wait reason、reservation/sticky target、公平/饥饿 state 或 policy timing telemetry。admission-policy fault 只记录有界 category，不能泄漏 callback 原值、stack 或 caller data。
- learned-critical-path 在启用 diagnostic logging 时在 learned-admission channel 记录有界的 local history read、prediction availability、selected admission、record/write observation；它不记录 raw authored options、effective flags、identity input、sample 或 local-state bytes。static/custom policy 不创建该 file；history unavailable 仍保留 enabled channel 并记录有界 history-read availability。state I/O/prediction failure 仍只是 optimization observation，不改写 `RunResult`、Check facts 或 machine publication。
- effective diagnostic logging enabled 时，private Scheduler shell 在实际进入后于 normal、caller-cancelled 或 admission-policy-fault drain 的 terminal path，将有界 `scheduler.summary` internal default Hook 与 caller Hooks 交给同一 ordered runner。summary wrapper 自行包含 writer failure，Scheduler 不作 summary 特调。它分开记录 shell control path、decision observation、slot·ms/capacity ratio、accepted policy wait、admission queue pressure、admission delay 与 tail；clock/integral fault 明确形成 unavailable timing 而不伪造零值，合法 zero span 与之不同。各 projection 允许重叠，不能相加为 wall/CPU/thread/OS utilization；`proposal: null` 的被动 drain 不计 accepted wait。pre-work/planning failure 没有这条 summary，writer failure 也不改写 Run 结果。
- broader graph-ready 只要求全部 directed relations settled；Queue pressure 使用更窄的 admission-viable pending universe：每个 `dependsOn` 必须 `completed`，每个 `observes` 必须 settled，且 Task 仍 pending。即将因 failed prerequisite 走 `settle-blocked` 的 graph-ready Task 不在其中。每个 sampled interval 按 mutex conflict → canonical `canAdmit` false → canonical `canAdmit` true 的顺序互斥分类为 mutex-blocked、capacity-blocked 或 admissible-pending，分别形成 `mutexBlockedTaskMs`、`capacityBlockedTaskMs`、`admissiblePendingTaskMs`；三者之和是 `admissionViablePendingTaskMs`。`peakAdmissionViablePendingTaskCount`、`peakMutexBlockedTaskCount`、`peakCapacityBlockedTaskCount` 与 `peakAdmissiblePendingTaskCount` 是可能来自不同 boundary 的离散峰值，分类峰值不能相加为同一时刻的 total，也不是 decision 计数。top-three `topAdmissionDelays` 中每项的 `mutexBlockedMs + capacityBlockedMs + admissiblePendingMs` 精确构成该项 `admissionDelayMs`；这些事实不推断 policy 的选择理由。
- Tail active set 是最后一次 admission boundary 的逻辑 post-state snapshot，包含此前仍 running 的 Tasks 与新 admitted Task；`discrete.completionTailActiveTaskCount` 保留完整数量，`topCompletionTailContributors` 只保留其中 settlement delta 最大的三个 `{ taskId, settledAfterLastAdmissionMs }`。它解释 last-admission-to-terminal span 的活跃成员，不是 critical path；terminal control/observation 可能使 tail span 大于最大的 contributor delta。`declarativeFingerprint` 原样来自 invocation，只是 declarative-configuration matching signal；它覆盖 normalized declarative Definition，但不包含 `RunControls`、code/candidate/tool/runtime/host、terminal outcome 或 custom callback identity/source/closure。timing unavailable 仍精确保留 fingerprint、admitted count、accepted-wait count、max-running、last-settled Task ID、四个 queue peaks 与 tail active count，但省略不能证明的 task·ms、delay breakdown、tail delta 及其它 time-valued projection。
- 启用的 machine publication 将同一个 instant 投影为 `run.json` 的 `invocation.timestamp`，所以 timestamp 不是 publication 完成时间；两项同时启用时，日志文件名与 machine timestamp 必须共享该一次捕获。
- progress rendering 呈现人读 lifecycle；final feedback 总是逐项呈现 canonical `checkDurations`，包括 `null`。若 caller 提供 `progressLogFile`，同一 rendered bytes 先写 terminal、再写 file；file setup/write/close failure 标记 progress output failed，但不得吞掉 terminal。machine publication、progress rendering、diagnostic logging 与 configured measurement hooks 都由 Run 调度，并分别保留 status；measurement hooks 不因它们与前三项一同 readback 而成为 `outputs` configuration。

这些 diagnostic 行不建立可解析 schema。Run 结束前最后一条可写 diagnostic event 是 `run.terminal-before-log-close`：它只证明 terminal fact 已写入、logger close 尚未确认，随后才尝试关闭日志。

只有 non-configuration `RunResult` 具有有效 output configuration 与 `outputs` readback。此时
`outputs.diagnosticLogging` 的形状为 `{ enabled, status, channels }`；`channels` 是显式
`core`、`scheduler`、`learnedAdmission` map，每项为 `{ enabled, status, file }`，且 `status` 都使用
`"disabled" | "not-run" | "succeeded" | "failed"`。aggregate `status` 在任一 enabled channel failed 时为
`failed`，仅全部 enabled channel succeeded 时为 `succeeded`。禁用 channel 的 `file` 为 `null`；已启用 channel 即使文件创建失败也保留
`path.relative(projectRoot, resolvedFile)` 的预先计算 readback。root 外 target 因此可含 `..`；跨卷时平台可以返回绝对路径。static/custom
Run 的 learned-admission channel 是 disabled，learned Run 即使 history unavailable 仍可启用它。无效 Definition、controls 或 aggregation
selection 直接返回 configuration diagnostic，不创建诊断日志。

`outputs.measurementHooks` 的形状为 `{ enabled, status }`，使用同一 closed status set。其 authority、participant 和
readback 如下；内置 `scheduler.summary` writer 不属于此 output。

| 条件 | `enabled` / `status` |
| --- | --- |
| normalized `scheduler.measurementHooks` 非空，或 successful prepared custom result 实际含 `complete` | `enabled: true`。 |
| 两者都没有 | `enabled: false`，`status: "disabled"`。 |
| enabled Run 没有 sealed terminal sequence | `status: "not-run"`。prepare failure 因此在无 generic Hooks 时 disabled、有 generic Hooks 时 enabled/`not-run`。 |
| sealed sequence 中，actual generic Hooks 与 optional public `complete` 全部成功 | `status: "succeeded"`。 |
| sealed sequence 中任一 generic Hook 或 complete throw/reject | `status: "failed"`；后续 complete success 不会覆盖已记录的 generic failure。 |

Scheduler 按配置顺序让所有 generic Hooks 获得调用机会；Invocation 随后才调用 public complete，并汇总这些实际
participants 的 settlement。仅当 primary Run 正常完成时，measurement-hook failure 才把结果映射为保留 facts 的
`kind: "output"` / `scheduler-measurement-hooks-failed`；cancellation 或 execution diagnostic 保持原有 primary result，
failure 仍在该 output status 可见。

diagnostic logging 只服务当前人工诊断：它没有 parser、schema/version、跨版本格式兼容、`latest`、retention 或跨 invocation
discovery contract，也不替代 Check final data、Record、terminal message 或 Check/process adapter 自有的 transcript。logging
单个 channel 的 setup/write/close failure 只令该 channel 与 aggregate diagnostic output 为 failed，不改写已形成的 Check/Record facts，也不阻断其它 channel、progress rendering 或 machine publication 的
闭合。多个 output 都失败时，`RunResult.outputs` 保留每项 status；仅当 primary Run 已正常完成时，`kind: "output"` 依次选择
progress rendering、machine publication、diagnostic logging、measurement hooks 的第一个 failed output。故
`scheduler-measurement-hooks-failed` 表示 Hook output failed 且没有更高优先级的 output failure 被选作 diagnostic；它不覆盖
cancellation 或 execution diagnostic。diagnostic logging 不进入 machine v4；其 machine-field 排除见
[机器输出契约](output.md)。Check final-data parser 只处理已经取得的单个 data object，不替代该契约。

因此 `scheduler.summary` 不进入 `RunResult`、Check/Record facts、machine v4、progress、warning、autotune 或任何 public API；它不获得 parser/schema/version、跨 invocation discovery 或 retention contract，也不是 CPU、memory、thread、process 等 OS telemetry。以后若 fail-fast 或 named-resource capacity 改变 Scheduler capacity/hard guard，必须重新审阅 summary 的 capacity denominator、queue classification、boundary 与 wait 解释，而不是静默重用旧 projection。

progress rendering 在 TTY 中维护 running region，在 plain output 与 `TERM=dumb` 中只追加 settled presentation。每个 final summary 还以 canonical Check order 列出每项 duration（未执行项为 `null`）；可选 `progressLogFile` 仅镜像这份终端 presentation。invocation flag control barrier 结束时，因 `enabledByFlags` 未匹配而没有启动的 Checks 不逐项呈现完整 settled row；renderer 写一个原因说明块，并按 Definition 顺序列出这些 Checks 的 `displayName`。该分组只识别 Product 形成的 `not-applicable / flag-condition-not-matched`、`durationMs: null` 且无 messages 的事实；preflight failure、dependency blocking、cancellation、其它 `not-applicable` / `unavailable` 和带 messages 的 Check 仍各自呈现。`visibility: "attention"` 继续只隐藏无 author/captured messages 的 passed settled row。两种压缩都不改变 accounting ordinal、outcome、Records、machine output、dependency、aggregation 或 `RunResult`；accepted author message 与 captured console code 都保留在 `RunResult.checkMessages`，终端只呈现 level 与正文。renderer failure 进入对应 output status，不改写已形成的 Check facts。

```text
  The following 2 checks did not run because the run flags did not match their conditions:
    - Deep audit
    - Dependency audit
```

按 `RunResult.kind` 和 cancellation phase 读取结果：

| 分支                                              | 可用 facts 与处理方式                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `completed`                                       | 完整 `snapshot`、`checkDurations`、`checkMessages`、`outputs` 与可选 `aggregate`；继续读取单项 Check outcome。                                                                                                                                                                                                                          |
| `output`                                          | 完整 Check facts 与 output failure diagnostic；消费 facts 并处理失败的 output。`scheduler-measurement-hooks-failed` 只在正常 completion 且 measurement Hooks 是按 output 顺序选中的第一个 failed output 时出现；所有 configured generic Hooks 已获调用机会，且至少一个 generic Hook 或 public prepared `complete` throw/reject。已有 cancellation 或 execution failure 时主 result 保留，Hook failure 仅表现为 `outputs.measurementHooks.status: "failed"`。 |
| `cancelled` / `phase: "execution"`                | 取消时关闭的 snapshot、durations 与 messages；按 cancellation result 处理。                                                                                                                                                                                                                                                             |
| `cancelled` / `phase: "pre-work"` 或 `"planning"` | invocation metadata 与 cancellation phase；按 phase 结束调用。                                                                                                                                                                                                                                                                          |
| `configuration`                                   | Definition、controls 或 aggregation selection diagnostic；project callback 执行数为零。                                                                                                                                                                                                                                                 |
| `planning`                                        | task-graph diagnostic 与 invocation metadata。                                                                                                                                                                                                                                                                                          |
| `execution`                                       | Product execution-settlement diagnostic 与 invocation metadata。`diagnostic.code === "admission-policy-failed"` 表示 custom policy 已停止 admission、取消 pending 并 drain started work；它不是 Check terminal status，也不携带 partial snapshot。                                                                                      |

Check `failed` 是已结算的业务 outcome；Run `execution` 是 invocation infrastructure diagnostic；Run `output` 是完整 Check facts 附带的 diagnostic logging、publication 或 rendering failure diagnostic。
