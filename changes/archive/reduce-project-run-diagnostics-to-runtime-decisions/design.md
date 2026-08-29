# Design

本设计用一个单文件、低噪声的人读 diagnostic log 记录 Product core 已知事实，并将 scheduler 的选择集中为纯 `SchedulerDecision`；现有 imperative shell 只应用该 decision 并执行 effects。

## Context

- [`docs/architecture.md`](../../docs/architecture.md) 和 `src/project-run/**` 拥有 validation 后的 invocation、Check preparation/execution、generic task scheduling、settlement、aggregation 与 output closure。日志只能在这些 owner 形成事实时写入，不能从 final snapshot、progress 或 process transcript 反推时序。
- [`docs/api-mechanics.md`](../../docs/api-mechanics.md) 拥有 `RunResult.outputs` readback。file path 是可返回 output fact；日志正文不是 parser、schema、稳定 vocabulary 或跨版本格式契约。machine publication 继续由 [`docs/output.md`](../../docs/output.md) 拥有，不吸收 diagnostics。
- [`add-ephemeral-project-run-diagnostic-logging.md`](../../docs/decisions/add-ephemeral-project-run-diagnostic-logging.md) 已确认一次性、core-owned output 与 logging-failure containment，并排除 Check logger/observer/parser/verbosity。 [`choose-implementation-style-by-problem-shape.md`](../../docs/decisions/choose-implementation-style-by-problem-shape.md) 要求无状态选择用纯函数，Promise、Abort、settlement 和 drain 留在结构化 effect workflow。
- archived [`add-project-run-diagnostic-logging`](../archive/add-project-run-diagnostic-logging/) 只解释形成时背景，不是当前规范；本 Change 以 active owner、当前代码和当前 tests 为准。

AI consumption contract：实施者或 reviewer 从本 design 可恢复四件事：哪些事实有唯一 observation owner；normal/exceptional data 何时完整或摘要；decision 如何同时成为执行和日志输入；哪些 stable/public surfaces 不得扩张。proposal 定义结果与边界，tasks 给出已完成的实现和验证顺序；archive 与旧日志格式不参与当前判断。

## Goals / Non-Goals

### Goals

- 每次 invocation 保留一个可辨识日志，足以恢复 Run、Check、Record、dependency 与 scheduler admission 因果链。
- 删除重复状态扫描和 normal-path payload dump，保留异常边界所需的完整安全值。
- 同一 scheduler decision 被一次计算、一次记录、一次应用，并能独立测试。
- 保持 generic task scheduler、Check authoring surface、RunResult/output semantics 与故障/取消边界。

### Non-Goals

- 不把 filename、sequence、event 名、details JSON 或排版变成 machine protocol、稳定兼容承诺或 cross-invocation index。
- 不增加 public observer、Check/preflight logger、parser/schema/NDJSON、verbosity/level/filter、多文件、远程传输、rotation、retention、cleanup 或 `latest`。
- 不改变 four-state Check result、final data、Record、message、dependency getter、aggregation、progress、machine publication、cache owner 或 logging output priority。
- 不把 scheduler 改写为 immutable Promise state machine、通用 effect system 或 Check-specific engine。

## Decisions

### Intended Change

1. **一个可人工定位的日志文件。** validation branches 被排除后，invocation 生成 `run-<UTC compact timestamp>-<UUID>.log`。timestamp 使用完整 UTC ISO 时间去除 `-` 与 `:`（保留 `T`、毫秒与 `Z`）；UUID 避免同一时间粒度碰撞。文件继续由 `RunResult.outputs.diagnosticLogging.file` 以 project-root-relative 路径返回；无可信 output configuration 的 branches 不创建 logger。

2. **header + 单条安全 details continuation。** logger 同步分配 sequence，使用 monotonic elapsed，并把一个完整 buffer 追加到单一文件。每项 observation 实际写成一条 header；有 details 时紧随一条 `│ details=<safe JSON>` continuation：

   ```text
   #000071 +587.2ms [SCHEDULER] scheduler.decision Scheduler made a task-graph decision
   │ details={"capacity":{"effectiveMaxParallel":3,"maxParallel":3,"running":2},"kind":"admit","reason":"canonical-order","taskId":"prepared-external-package-consumer",...}
   ```

   details 由 descriptor-safe、有限 renderer 产生；control characters 被转义，append 保持完整 buffer，任何 create/render/append/close fault 只失败 diagnostic output。强制中断可以留下未完成最后一项；读取者只把 newline-terminated record 视为完整。该文本只服务人工阅读，不能按上述示例建立 parser。

3. **按事实 owner 收敛 event 与 data。**

   | Owner | Normal observation | Data rule |
   | --- | --- | --- |
   | Run | start、planning/aggregation/cancellation（发生时）、closing summary | 不输出每个 catalog entry 或重复 static summary；closing 仅报告 `diagnosticLogging: "pending-close"`，close status 仍由 RunResult 回读。 |
   | Check | preflight start/finish、`check.started`、`check.finished` | owning final Check 对 accepted data 输出一次 safe shape/keys/items/UTF-8-byte summary。 |
   | Dependency | `dependency.read` | success 只记录 producer、status 和 `hasData: true`；不复制或重新测量 producer data。 |
   | Record | `record.reported` | 每次 report 记录 identity、commit/reject result 与一次完整安全 Record data。 |
   | Exceptional boundary | malformed/contained/cancelled/throw result | 在对应最终异常 event 记录一次 safe raw value（可用时）和 reason/outcome。 |

   `check.finished` 是 normal callback/settlement 的唯一 final lifecycle projection。raw 与 normal summary 不互相替代：前者只属于异常边界，后者只属于 owning final Check。

4. **Pure decision core + imperative shell。** shell 把 mutable `SchedulerState` 投影为 immutable snapshot，并提供 explicit trigger；`decideScheduler(snapshot, trigger)` 只返回 discriminated `SchedulerDecision`。shell 先以该 value 写一个 `[SCHEDULER] scheduler.decision`，再应用它：

   ```text
   mutable state -> snapshot -> decideScheduler -> SchedulerDecision
                                             ├-> diagnostic observation
                                             └-> apply admission / blocked settlement / cancellation / await-drain / complete
   ```

   `admit` 保存 taskId、policy、capacity、eligible count 与 reservation update；`await-running` 保存 applicable capacity/blocker/stop reason；`settle-blocked` 保存 taskId/dependency IDs；`cancel-pending` 保存 pending task IDs；`complete` 保存 cancellation state。core 不读 clock、logger、Promise、Abort listener 或 mutable state，也不启动 work；shell 不重算选择理由。triggers 说明事实边界：abort 首次观察形成 `cancellation-observed`，cancel application 后的 waiting/drain 使用 `cancellation-applied`，普通 completion 使用 `task-settled`。

5. **不改变失败/输出语义。** disabled/no trusted configuration 不做 logging I/O。logger failure 保留 partial file 并只改变 diagnostic output；四态 facts、direct dependency availability、cancellation closure、progress/machine status 与 existing output priority 仍由原 owner 形成。public docs 只说明 observable filename/readback，不说明正文 grammar。

### Resulting Impacts

1. **Renderer/data safety：** bytes 是 logger safe JSON rendering 的 UTF-8 bytes，不是 author serialization 或 raw object size。safe summary/render 不能调用 getter、proxy、function 或 author hook；无法安全读取时写 unavailable reason。
2. **Scheduler invariant：** decision 不暴露 shell 可变 collections；shell 只按 chosen task ID/reservation/settlement application mutation。snapshot/state 不一致是 task-engine invariant failure，不能 silent reselection。
3. **Lifecycle placement：** preflight blocked、callback throw/malformed、accepted callback、Record report、dependency getter、unstarted cancellation 与 running task settlement各有一个 observation owner；normal final Check 只在 outcome/messages/duration 完整后记录。
4. **Public material：** filename 是 public readback，故 stable docs、consumer tests 和 Case evidence 同步；event text 保持 Product-private，未生成 schema、example 或 compatibility material。
5. **Evidence：** scheduler 是 correctness-critical owner，故同时需要 pure-decision cases、actual recorder sequence/field assertions 和 invocation integration；required/full Gate 追加 cross-owner assurance。

## Risks / Trade-offs

- pure core 增加 snapshot/decision types，但把 policy、capacity 与 cancellation reason 从多个 mutation 点收敛为一次计算、一次执行、一次观察；effect shell 仍是唯一 Promise/Abort owner。
- normal data 不能再从日志复制完整 payload；final Check facts 仍是权威结果，Record/exception 保留各自完整安全排障材料。
- 多行记录在 abrupt termination 时可能部分写入；不承诺 fsync/crash consistency。
- filename 含 wall-clock UTC time；tests 证明形状和 UUID suffix，不依赖特定时刻。

## Open Questions

无。当前实现、tests 与 verification 已闭合本 Change 的范围；若后续需要 public observer/parser/verbosity/multiple outputs，必须建立新的 Change 并先审阅相关 Decision。
