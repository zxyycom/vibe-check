# Run 人读输出实现

本文拥有 Check console capture、progress presentation 与 diagnostic logging 的内部实现约束，以及 Scheduler summary 的投影定义。
用户配置、公开 readback、输出失败优先级和结果读取由[API 机制](../guides/run-outputs.md#输出状态与失败处理)拥有；
机器文件的生成与验证由[机器输出维护](output-maintenance.md)拥有。修改这些内部组件时，先按下列职责定位对应规则。

| 组件 | 职责 |
| --- | --- |
| `src/project-run/check-execution/**` | callback console 的归属、捕获与 accepted messages 交付。 |
| `src/project-run/progress-rendering/**` | 人读生命周期、终端安全、有限预览和可选 transcript。 |
| `src/project-run/diagnostic-logging/**` | owner-channel 日志、correlation、安全渲染与 writer failure containment。 |
| `src/project-run/task-scheduler/measurement/**` | Scheduler timing 与 summary projection。 |

## Check console capture maintenance

`check-execution/**` 在完整静态 graph 校验后、任何 author preflight/execution 前安装一次 global `console.*`
router，覆盖 flag control 和全部 Check work；所有 Checks 闭合后恢复原 method descriptors。每个 awaited callback
使用独立 async capture context；context 外调用继续使用原方法。缓存的 method reference、自行替换的 console 与
floating work 不在可靠归属范围内。Product 保持 host-wide stdout/stderr 原状；直接 stream 或 inherited child stdio
由调用方转交自己的 file/transcript，避免与 progress TTY cursor updates 交错。

console 使用非彩色 Console formatting：log/info/debug 映射 info，warn 映射 warning，error/trace/failed assert
映射 error。preflight console 先于 preflight author messages，execution console 先于 terminal author messages；
callback throw/cancel/malformed result 仍保留已捕获文本，而非法 author message attachment 整体拒绝。
settlement 后，private lifecycle handoff 将 accepted Records/messages 交给 enabled progress renderer；captured console
以 `console-<method>` code 保留于 `RunResult.checkMessages`，不进入 Check final data 或 machine publication。

## Progress presentation maintenance

renderer 从 settled lifecycle feedback 读取 outcome、duration、Records 与 messages。`attention` 仅省略 passed
且没有 accepted Record/message 的 settled row；它保持 running row 和 accounting ordinal。

### Preview pipeline

公开配置 grammar 与 defaults 由[输出指南](../guides/run-outputs.md)拥有，Definition 验证与声明性投影由 [Project Definition](project-definition.md#progress-preview-配置) 拥有，
单次覆盖由 [Project Run](project-run.md#run-outputs-and-compatibility-boundary) 拥有。renderer 只消费已经解析并冻结的 effective policy，按以下顺序呈现：

1. **选择 detail**：每个 settled block 分别按 `recordPreviewLimit` 和 `messagePreviewLimit` 选取 Records/messages，
   保持 canonical local Record ID 与 accepted message order。`0` 不呈现该类 detail，但仍统计 omitted count；
   settled row 的 attention 判断继续基于 accepted facts，而不是预览数量。
2. **生成正文**：Record 默认文本为 local ID/canonical JSON，message 默认文本为正文。存在 formatter 时，仅对
   selected item 按 Records 后 messages 的顺序调用一次，传入冻结、未 escape/未截断的 `{ kind, text, maxCodePoints }`。
   omitted items、summary、running row 和 TTY refresh 不调用 formatter；空字符串仍是有效正文。
3. **安全呈现**：默认或自定义正文先 escape terminal controls，再按 effective Unicode code-point budget 截断。
   `… [truncated]` marker 计入预算，短预算只显示 marker 前缀；label、顺序和 omitted count 继续由 renderer 拥有。

formatter throw 或非字符串返回使 progress output failed，随后停写，但不改写已接受 facts/Check settlement。
真实 Promise 的 rejection 被观察，任意 thenable 不会被读取或调用。禁用 progress 时不创建 writer、tee、refresh
或 preview，也不调用 formatter。formatter 是 trusted caller code，不是 secret redaction 或 I/O sandbox；
调用方可依赖的输出与敏感信息边界见 [API 机制](../guides/run-outputs.md#check-messages-与受管-progress)。

### Lifecycle 与写入

TTY 使用单一 monotonic elapsed interval 与 heartbeat 维护 running region；plain/dumb target 只追加 settled presentation。每个 visible
settled block 原子写入；level label 按 terminal capability 着色，正文做 terminal escape，message code 保留在
readback 而非终端正文。final summary 展示 execution、counts 和 elapsed。

flag-control barrier 后，renderer 将 Product-created `not-applicable / flag-condition-not-matched`、null duration
且无 Records/messages 的 Checks 合并为一个原因块，按 Definition 顺序列出 escaped display names；dependency-activated
Check 保持 ordinary lifecycle row。该分组与 attention 都只压缩展示，保持所有 terminal facts 和计数。

可选 progress tee 将同一 rendered bytes 先写 terminal、再写 file；file setup/write/close failure 标记 progress
output failed，同时保持 terminal delivery。writer failure 必须可观察，失败后的 writer 不再接收后续 writes。

## Diagnostic logging maintenance

只有 diagnostic logging 或 machine publication 启用时，Invocation 才捕获一次 immutable wall-clock `startedAtUtc`。
machine 将其用于 `invocation.timestamp`；diagnostic logging 在 preflight 前将同一 instant 与 UUID 用于 core/scheduler
默认 `unique` filename；invocation-only `channel` 命名仅选择 `core.log` / `scheduler.log`，不取消时间与 UUID 的生成或 observation correlation。完整命名和非事务 collision 边界见 [Project Run](project-run.md#diagnostic-file-naming)。两项均关闭时不读取/序列化 wall clock。

router 为每次 observation 赋予 invocation-wide sequence、monotonic elapsed 与 invocation ID；renderer 以 filterable
`[]` tags 和 `key=value` facts 生成有界物理行，超长 facts 使用 continuation lines。filename 表达 owner，tags 表达
Run、Check、phase、decision、outcome；已由 tags 表达的 decision `kind`/`taskId` 与 Record `result` 不在 facts 重复。
Scheduler 先记录完整 graph/fingerprint，后续 decisions 只引用 fingerprint 与动态 facts。core start 保留 Check count
而非逐项 catalog；`check.finished` 保留 phase/status/duration/message count，dependency read 保留 producer/status/data
presence，committed Record 保留 `{ checkId, recordId, result }`，rejected reporting 使用有界类别。

diagnostic rendering 使用 descriptor-safe bounded projection，避免触发 accessor、`toJSON` 或 hostile author hooks；
cyclic、过深、过宽和超大值保持有界。policy fault 只记录类别，core flags 使用摘要，final data 与 captured message text
保持在各自事实 owner。诊断不可成为 caller 值或秘密的另一份副本。

每个 non-configuration result path 至多关闭每个 enabled channel 一次；最后的 `run.terminal-before-log-close` 只表明
terminal fact 已写入，随后才尝试 close。先尝试全部 diagnostic closes，再关闭尚未关闭的 progress writer。
channel setup/write/close failure 分别收敛，完整 facts 与其它输出继续闭合；aggregate/per-channel readback 和多 output
失败优先级由[API 机制](../guides/run-outputs.md#输出状态与失败处理)拥有。这些人读行不建立机器 parser 或格式版本契约。

## Scheduler summary projections

diagnostic-enabled Scheduler shell 在 normal、cancelled 或 policy-fault drain 的 terminal path 中，将 summary wrapper
和 caller Hooks 交给同一 ordered runner。wrapper 包含 projection/writer failure；pre-work/planning failure 没有这次
summary。collector 的采样边界与 terminal handoff 由[Scheduler measurement collector](scheduler.md#measurement-collector-与-immutable-context)定义。

summary 分开投影 control path、decision observations、slot·ms/capacity ratio、accepted wait、queue pressure、admission
delay 与 tail；这些投影可重叠，不应相加为 wall time 或 OS utilization。`proposal: null` 的被动 drain 不计 accepted wait。
clock/integral fault 表达 unavailable，合法 zero span 仍是有效测量。

Queue pressure 使用 admission-viable pending 集合：`dependsOn` 全部 completed、`observes` 全部 settled，且 Task 仍
pending；即将 settle-blocked 的 graph-ready Task 不属于该集合。每个 sampled interval 按 mutex conflict → canonical
`canAdmit` false → canonical `canAdmit` true 互斥分为 mutex-blocked、capacity-blocked、admissible-pending；root、scope
与 named-resource shortage 共用 capacity 分类。因此 `mutexBlockedTaskMs + capacityBlockedTaskMs + admissiblePendingTaskMs`
等于 `admissionViablePendingTaskMs`。四类 peak 可来自不同 boundary，不能相加为同一时刻 total 或 decision count。
top-three `topAdmissionDelays` 的各项满足 `mutexBlockedMs + capacityBlockedMs + admissiblePendingMs = admissionDelayMs`；
分类说明等待状态，不推断 policy 选择理由。

Tail active set 是最后一次 admission 的逻辑 post-state，含此前 running Tasks 和新 admitted Task。
`discrete.completionTailActiveTaskCount` 保留全部数量；`topCompletionTailContributors` 取 settlement delta 最大的三个
`{ taskId, settledAfterLastAdmissionMs }`。它描述最后一次 admission 后的尾段，不是 critical path；terminal control 或
observation 可使 tail span 超过最大 contributor delta。

`declarativeFingerprint` 只标识 normalized declarative configuration，沿用 Invocation 值；RunControls、代码、工具、
运行环境、结果和 callback identity 均不进入该标识。timing unavailable 时仍保留 fingerprint、admitted/accepted-wait
counts、max-running、last-settled ID、四类 queue peaks 与 tail active count，省略无法证明的 timing projections。
修改 capacity/hard guards 时同步审查这些 denominator、分类和 boundary，避免解释与实现脱节。
