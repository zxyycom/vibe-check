> **核心句：**本 delta 定义 private Check execution binding 如何在 foundation opaque contribution seam 中构造静态 TaskPlan 并共享调度；Task 不成为公共 Check、Record、coverage 或 policy 对象。

## Purpose

让内置与自定义 Check 能用原生异步函数声明简单任务图，并在一次 Vibe Check 调用内共享可验证的 selection dependency、并发、资源、失败和进度治理。

## ADDED Requirements

### Requirement: Check dependencies close requested selection before applicability

Task orchestration SHALL 为 resolved private execution bindings 提供可选 `requiresChecks` 声明。Product MUST 在 selection freeze 前，从 caller/policy 初始 requested check IDs 计算完整 transitive closure；closure 中的每个 prerequisite MUST 变为 requested，且后续才能按 foundation contract 冻结 applicability。Unknown check ID、self dependency 或 Check dependency cycle MUST 在 applicability、contribution、record 和 artifact work 前失败。

`requiresChecks` 只表达执行生命周期前置条件，不表达质量政策。Applicable prerequisite 必须返回 foundation validator 接受的 valid `CheckResult` 才满足 dependency；`verdict = passed | failed` 均可解锁 dependent Check。Foundation 已在 pre-execution 闭合的 `not-applicable` 是 valid completed result，也 SHALL 满足 dependency 而不进入 scheduler；如果 dependent 真正需要领域输入，其 applicability resolver 必须表达该条件，不能让 scheduler 解释 verdict。

Prerequisite `unavailable`、`execution-failed` 或 invalid returned result MUST 使 dependent applicable contribution 不启动任何 function，并最终产生 foundation `execution-failed` report 与 safe dependency diagnostic。Dependency failure MUST NOT 由 scheduler 伪造成 `CheckResult.failed`。

#### Scenario: Requested selection includes transitive prerequisites

- **WHEN**初始 request 只包含 Check `c`，且 `c requiresChecks b`、`b requiresChecks a`
- **THEN**Product 在 applicability 前冻结 requested closure `a, b, c`
- **AND**三项 Check 仍分别拥有自己的 applicability、execution report 与 quality result

#### Scenario: Failed quality verdict still satisfies Check dependency

- **WHEN**prerequisite applicable Check 正常返回 valid `verdict = failed`
- **THEN**dependent Check 可在其它 prerequisites 满足后进入 ready 状态
- **AND**scheduler 不把 quality failure 当作 execution failure 或 gate signal

#### Scenario: Not-applicable prerequisite does not enter scheduler

- **WHEN**requested prerequisite 在 pre-execution 冻结为 not-applicable
- **THEN**foundation 直接产生 completed/not-applicable result 且不创建其 execution contribution
- **AND**该 valid completed result 满足 `requiresChecks` 生命周期前置条件

#### Scenario: Check dependency graph is rejected before work

- **WHEN**`requiresChecks` 包含 unknown ID 或 cycle
- **THEN**Product 在 applicability 与 binding planning 前拒绝 invocation
- **AND**没有 Check function、Task、record sink 或 artifact work 启动

### Requirement: Applicable bindings build and freeze TaskPlans before execution

Task orchestration SHALL 实现一种 private `CheckExecutionBinding`。该 binding 只为 foundation 冻结为 applicable 的 `ResolvedCheckInvocation` 贡献 opaque payload；skipped 或 not-applicable Check MUST NOT 调用 TaskPlan planner 或进入 scheduler。

TaskPlan planner SHALL 在每次 invocation 内接收 foundation-approved immutable planning context 与该 Check 的 opaque domain-work handles，再构造本次 TaskPlan。Planning context MUST NOT 包含 record sink、acknowledgement port、manager、output writer 或运行中 registration port。Product MUST 在启动任一 scheduler-managed function 前收集全部 applicable contributions，将 direct-runner adapter work 与 TaskPlans 一起完成全量验证并冻结；module load-time composition 不是最终 TaskPlan，runner/Task execution 期间也不得增加、删除或改写 Task。Planner throw、rejection 或 invalid plan return MUST 作为 pre-execution planning failure 终止完整 batch，不能启动合法 plan 子集。

每个 Task MUST 有 owning Check 内唯一的 ASCII lower-kebab local ID，并 MAY 静态关联它在 fulfilled 后 acknowledge 的零个或多个 owned domain-work handles。Plan MUST 拒绝 duplicate Task ID、unknown/foreign/duplicate/missing handle association、unknown Task prerequisite、cross-Check Task reference、Task cycle、invalid/duplicate resource claim 和 invalid scheduler policy。Task prerequisite 只可引用同一 Check 内的 local Task ID；跨 Check 关系必须使用 `requiresChecks`。

Applicable invocation 的 domain-work handle set 和 Task list 均可为空。Empty TaskPlan MUST 仍运行 owning Check completion binding 并由其返回 `passed | failed` candidate；Product 不得从 zero tasks、zero handles 或 zero records 推断 not-applicable 或 quality verdict。

#### Scenario: Planner uses invocation-approved work

- **WHEN**applicable custom Check 的 binding 收到本次 resolved context 与三个 opaque work handles
- **THEN**planner 可以把 handles 静态分配给本次 TaskPlan 中的 0..n Tasks
- **AND**另一次 invocation 或 module-load-time value 不能替换这些 foundation-owned handles

#### Scenario: Invalid TaskPlan prevents every scheduler function

- **WHEN**任一 applicable contribution 产生 duplicate Task ID、foreign handle 或 Task dependency cycle
- **THEN**完整 plan validation 失败且 shared scheduler 不启动 direct runner、Task 或 completion
- **AND**failure 不以 missing per-Check report 伪装成可信 partial execution snapshot

#### Scenario: Planner failure does not launch a valid subset

- **WHEN**一个 applicable binding 的 TaskPlan planner throw 而其它 bindings 可生成合法 plan
- **THEN**pre-execution planning 整体失败且任一 scheduler-managed function 都不启动
- **AND**Product 不为合法 subset 发布 ExecutionReports、records 或 artifacts

#### Scenario: Applicable empty plan runs completion

- **WHEN**Check 冻结为 applicable 且其 TaskPlan 没有 Task 和 domain-work handle
- **THEN**shared scheduler 仍 admit 该 Check 的 completion binding
- **AND**completion 的 valid passed/failed candidate 通过 foundation `returned` report 交付

### Requirement: One scheduler owns managed-function concurrency and exclusive resources

一次 Product invocation MUST 使用一个 shared scheduler 与一个 positive global `maxParallel`。该 limit 只统计 scheduler 已调用且尚未 settled 的 direct-runner adapter function、显式 Task function 和 TaskPlan completion function；Check 或 Task declaration MUST NOT 创建或扩大另一个 scheduler budget。

`maxParallel` MUST NOT 被描述为对 Task/runner 内部自行创建的 Promises、threads、worker 或 subprocesses 的限制。Check 作者只有把 function 显式拆入 TaskPlan，才能获得本能力的跨 Check admission 与 resource 治理。

Task MAY 声明零个或多个 ASCII lower-kebab、invocation-global named exclusive resources。Scheduler SHALL 只在全部 claimed resources 同时空闲且存在 global slot 时原子 admit function，MUST NOT 先持有部分 resource 再等待其余 resource。共享任一 resource identity 的 functions 不得重叠；resource claim 不改变 Check/Task identity、dependency、acknowledgement 或 quality semantics。

多个 functions 同时 ready 时，scheduler SHALL 按 frozen plan 的 discriminated canonical work key 考虑 admission；key 必须区分 direct work、Task 与 completion，并在 Task key 中包含 `(checkId, taskId)`。Resource-blocked 的前一 candidate 不得阻止后续 compatible candidate 使用空闲 slot。

#### Scenario: Global limit spans scheduler-managed functions

- **WHEN**多个 Checks 共有十个 ready scheduler-managed functions 且 `maxParallel = 3`
- **THEN**任一时刻由 scheduler 调用且尚未 settled 的 functions 不超过三个
- **AND**任一 Check 不能通过局部声明获得额外 scheduler slot

#### Scenario: Internal Promise fan-out is outside the limit

- **WHEN**一个 admitted Task function 内部自行启动十个 Promises
- **THEN**scheduler 只把该 Task function 计为一个 active slot
- **AND**Product 不声称 `maxParallel` 限制这十个 private operations

#### Scenario: Multiple exclusive resources are acquired atomically

- **WHEN**ready Task 同时 claim `git-index` 与 `artifact-dir` 且只有一个 resource 空闲
- **THEN**scheduler 不启动该 Task，也不为它预占空闲 resource
- **AND**其它 resource-compatible ready work 仍可被考虑

### Requirement: Task success produces incremental acknowledgements and opaque completion values

Task function SHALL 接收 owning Check 的 foundation-bound execution context 与 record sink；Task MAY 逐条提交 final record candidates，但不得直接取得 acknowledgement port、CheckManager、RecordManager、scheduler state 或 sibling Check state。Task identity MUST NOT 成为 CheckDefinition、QualityRecord、comparison、policy 或 machine identity。

Task `needs` SHALL 只表示 successful-fulfillment prerequisite。一个 Task 只有在全部 `needs` Tasks fulfilled 后才能 ready；任一 prerequisite throw 时，该 Task 不执行并形成 private dependency-blocked outcome。Dependent Task MUST NOT 读取 prerequisite opaque return value。

Task adapter SHALL 在 Task function fulfilled 后，才对其静态关联的每个 domain-work handle 调用 foundation incremental acknowledgement port。一个 Task MAY 关联 0..n handles；throw 或 dependency-blocked Task 不得 ack。Acknowledgement 一经 manager 接受，即使 later sibling Task 或 completion 失败也必须保留。Task count、Task ID、settlement 和 completion function 本身不得直接成为 public coverage。

Scheduler SHALL 把每个 fulfilled Task 的 return value 作为 invocation-memory-only opaque value 保存；只有 owning Check completion binding 可以在全部 Tasks fulfilled 后读取 readonly value map。Scheduler MUST NOT parse、compare、serialize、cache、cross-Check 共享或用 opaque value 决定 CheckResult、record level、DecisionPolicy 或 gate。

#### Scenario: Fulfilled Task acknowledges multiple domain units

- **WHEN**一个 Task 关联两个 owned handles 并正常 fulfilled
- **THEN**adapter 对两个 handles 分别调用 foundation ack port 并保留 opaque return value 供 completion 读取
- **AND**Core 从 frozen handles 与 manager-owned ack state 计算 coverage，而不是使用 Task count

#### Scenario: Later Task failure preserves progress and records

- **WHEN**Task `a` fulfilled、ack handles 并提交 valid records，随后 independent Task `b` throw
- **THEN**`a` 的 acknowledgements 与 valid committed records 继续保留
- **AND**owning Check 最终仍因 TaskPlan execution failure 得到 null CheckResult

#### Scenario: Dependent Task cannot consume predecessor value

- **WHEN**Task `b needs a` 且 `a` fulfilled 并返回 private object
- **THEN**`b` 只因 `a` fulfilled 而 ready，不取得该 object
- **AND**只有 owning completion binding 能读取 `a` 的 opaque value

### Requirement: TaskPlan execution maps exhaustively to foundation ExecutionReports

Scheduler SHALL 捕获单项 Task throw 而不 reject 整个 batch，并继续 admit 与该 failure 无 Check/Task dependency 的 ready functions。Task failure、CheckResult `verdict = failed` 和 selected policy MUST NOT 隐式启用 global fail-fast。

TaskPlan 全部 Tasks fulfilled 后，scheduler SHALL 运行其 completion binding。Completion 正常 return 一个 candidate 时，task-orchestration binding MUST 返回 foundation `ExecutionReport.returned(candidate)`；同一个 foundation-owned CheckResult validator 既用于 `requiresChecks` readiness，也用于 Core finalization，scheduler 不得建立第二套合法性规则。任一 Task throw、Task dependency-blocked、required Check 未 execution-complete、completion throw 或 completion rejection MUST 使 owning binding 返回 exactly one `ExecutionReport.execution-failed` 与 safe actionable diagnostic。Binding-owned dependency/backend 在 function admission 前不可用时 MAY 按 foundation contract 返回 `unavailable`。Scheduler 不得产生 CheckRun、CheckResult verdict 或自报 coverage/counts。

完整 scheduler result MUST 为每个 applicable contribution 返回且只返回一个 foundation-owned terminal report。Unknown、missing、duplicate report 或无法 settle 完整 batch 继续属于 foundation Product execution-integrity failure。TaskPlan internal outcomes MAY 供 diagnostic 与 completion 使用，但不得序列化为公共 run/record evidence。

并发 Task 提交同一 record identity 时，scheduler MUST 不按 arrival order 选择 winner。Byte-equivalent replay 与 same-ID different-body conflict 都交给 foundation RecordManager；conflicting duplicate 阻止可信 final model/publication，而不是普通 partial record 或 Task failure。

#### Scenario: Task throw becomes execution-failed report

- **WHEN**一个 Task 在其它 Tasks 已提交 records 和 acknowledgements 后 throw
- **THEN**owning binding 返回 exactly one execution-failed report 且 independent Checks 继续运行
- **AND**foundation 使用已保存 progress 与 sink state finalize failed run/null result

#### Scenario: Failed quality result remains a returned report

- **WHEN**全部 Tasks fulfilled 且 completion 正常返回 valid `CheckResult.verdict = failed`
- **THEN**binding 返回 `returned` report 而不是 execution-failed
- **AND**Core finalize completed CheckRun，是否阻断只由 selected DecisionPolicy 决定

#### Scenario: Completion throw is not a quality verdict

- **WHEN**全部 Tasks fulfilled 并 acknowledge work 后 completion throw
- **THEN**binding 返回 execution-failed report 且既有 acks/records 保留
- **AND**scheduler 不伪造 failed CheckResult 或 synthetic record

#### Scenario: Conflicting records are not first-arrival wins

- **WHEN**并行 Tasks 提交相同 record identity 但不同 canonical body
- **THEN**RecordManager 形成 identity-integrity conflict 并阻止可信 publication
- **AND**scheduler completion order 不选择其中一条作为有效 winner

### Requirement: Fatal scheduler admission failure drains started functions without public cancellation

第一版 task orchestration MUST NOT 提供 caller cancellation、public `AbortSignal`、Task timeout 或 hard termination contract。普通 Task/Check failure 只按前述 dependency 与 report 规则处理，不停止 unrelated admission。

只有 scheduler 自身发生无法继续安全 admit 的 fatal invariant/admission failure 时，scheduler SHALL 停止 admit 新 functions，等待所有已经由 scheduler 启动的 functions 实际 settle，再向 foundation 报告 Product execution-integrity failure。该 internal drain 不得把 pending work 伪造成 cancelled report，也不得发布不完整 report set 为可信 final model。

同进程 async function 可能永不 settle；本能力 MUST NOT 承诺 bounded drain latency、通过 `Promise.race` 实现的伪 timeout 或强制终止。Non-settling function 会让 coordinator 无法完成 batch，调用方必须依赖未来独立的 process/isolation contract 才能获得 hard deadline。

#### Scenario: Fatal admission failure waits for owned running work

- **WHEN**scheduler fatal invariant failure 发生时两个 scheduler-managed functions 正在运行
- **THEN**scheduler 停止 admit 新 functions 并等待两个 functions 实际 settle
- **AND**drain 后 invocation 以 Product execution-integrity failure 结束，不发布可信 partial reports

#### Scenario: Non-settling function has no false timeout

- **WHEN**已启动的 same-process Task 从不 settle
- **THEN**scheduler 不声称该 Task 已 cancelled、timed out 或 drained
- **AND**本 change 不提供强制结束该 function 的 surface

### Requirement: Live observation and final ordering remain separate

Scheduler MAY 按实际观察到的 start 与 settlement 顺序提供 invocation-local progress events；arrival order 只用于实时观察，不构成 Task、Check、record identity 或 canonical artifact order。

Private Task outcomes SHALL 按 frozen canonical work key 索引。Scheduler MUST NOT 使用 Task completion order、concurrent record submission order 或 event sequence 生成稳定 identity；public CheckRun、QualityRecord 与 machine artifacts 继续完全遵循 foundation owners 的 canonical ordering 和 integrity 规则。

#### Scenario: Completion race changes events but not identities

- **WHEN**同一 frozen plan 运行两次且并行 Tasks 以不同顺序 settle
- **THEN**两次 live progress MAY 反映各自 arrival order
- **AND**private Task keys、public Check/Record identities 与 canonical artifact order 保持相同
