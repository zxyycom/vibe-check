> **核心句：**本 spec 定义 Check 的可序列化身份、独立执行绑定、增量进度和最终结果；Core 不理解具体 runner 或 Task，却能从统一 report 与受控 ports 唯一恢复每项检查的终态。

## Purpose

让内置检查和后续项目自定义检查共享稳定身份、运行生命周期、覆盖与质量结论，同时允许不同执行实现通过一个不泄露 Task 或 backend 细节的私有 contribution seam 接入。

## ADDED Requirements

### Requirement: Public CheckDefinition and private execution binding are separate

Product SHALL 在任何 check work 前解析本次 invocation 的完整 Check catalog。每个可序列化 `CheckDefinition` MUST 提供全局唯一 ASCII lower-kebab `checkId`、公共 result contract 与其 QualityRecord type catalog；它 MUST NOT 包含函数、module、command、backend object、TaskPlan 或其它 executable binding。

Private execution registry MUST 为每个 resolved definition 关联且只关联一个 `CheckExecutionBinding`。Binding SHALL 从 frozen `ResolvedCheckInvocation` 产生 binding-owned opaque payload；CheckManager 把该 payload 封入 foundation-owned `CheckExecutionContribution` envelope，并添加 immutable `checkId` 与 `checkRunId` correlation。完整 contribution batch 由 execution coordinator 消费并返回 foundation-owned `ExecutionReport[]`。Current direct `CheckRunner` 只是把函数包装成 contribution/report 的一个 private adapter，不是所有 definition 或 invocation 必须携带的公共形状。

Definitions 与 bindings 可以由内置注册或后续上游 resolver 贡献，但 Core 只消费已经解析的两张表，不负责加载 module、命令或远程 provider。Definition catalog 按 `checkId` canonicalize 并计算只覆盖公共 metadata 的 fingerprint；private binding/contribution 变化不得进入 public catalog 或 fingerprint。Duplicate/invalid definition、missing/duplicate binding 或 catalog/binding ID mismatch MUST 在 execution 前失败。

#### Scenario: Different execution adapters share one Check contract

- **WHEN**一个 built-in check 使用 direct runner binding，后续另一个 check 使用 task-orchestration binding
- **THEN**两者发布同形的 CheckDefinition 并通过 opaque contributions 进入同一 coordinator batch
- **AND**CheckManager 不读取 runner 函数或 TaskPlan payload

#### Scenario: Catalog conflict fails before work

- **WHEN**resolved candidates 含 duplicate checkId、无效 record catalog 或非一对一 binding
- **THEN**Product 以 definition-resolution failure 拒绝 invocation
- **AND**不启动 contribution 或发布可信 scan artifacts

### Requirement: Resolved selection and applicability precede execution

Core SHALL 先为每个 frozen definition 解析 selection。未请求 definition MUST 产生 `selection = skipped`，不解析 applicability、不创建 execution contribution 且不调用 binding。Requested definition MUST 在 execution 前冻结 `applicability = not-applicable | applicable`；applicability resolver 只消费 resolved invocation inputs，不得在 runner work 开始后反转结论。

`not-applicable` MUST 携带 safe non-empty summary，不进入 execution coordinator；Core 直接 finalize completed CheckRun 与 `CheckResult.verdict = not-applicable`、zero domain-work coverage。`applicable` MUST 进入 binding/coordinator，即使其 frozen domain-work handle set 为 empty；zero work 不得被 Core 自动推断为 not-applicable、passed 或 failed。

#### Scenario: No applicable input bypasses execution

- **WHEN**requested function-metrics definition 的 resolved input 不含 supported files
- **THEN**applicability 在 execution 前冻结为 not-applicable，且不创建 contribution 或检查 backend availability
- **AND**Core 产生 completed/not-applicable result 而不是 skipped 或 failed run

#### Scenario: Applicable zero-work check still executes

- **WHEN**一个 requested check 明确冻结为 applicable 但 domain-work handles 为空
- **THEN**其 binding 仍贡献 execution 并返回领域 CheckResult
- **AND**Core 不根据 zero planned work 替 runner 选择 verdict

### Requirement: Check execution and quality verdict are independent

每个 final `CheckRun` MUST 使用 `status = skipped | completed | failed` 表达执行事实。`skipped` 只表示 definition 未被请求；`completed` 表示 not-applicable 被 Core 闭合，或 applicable execution 返回 valid `CheckResult`；`failed` 表示 applicable execution、dependency、result validation 或 record protocol 未正常结束。

`CheckResult` MUST 使用 `verdict = passed | failed | not-applicable` 表达最终领域结论，并包含 safe non-empty summary。`passed` 与 `failed` 都可以拥有 zero records；`not-applicable` 只来自 pre-execution applicability 结论。Completed run MUST 拥有且只拥有一个 result；skipped 或 failed run MUST 使用 null result。Record level、record count 或 execution failure MUST NOT 由 Core 推断为 result verdict。

#### Scenario: Zero-record check can fail its quality condition

- **WHEN**applicable execution 正常返回 failed CheckResult 且没有提交 record
- **THEN**CheckRun 为 completed 并保留该 failed verdict
- **AND**Core 不把 zero records 改写成 passed 或 not-applicable

#### Scenario: Runner exception is not a quality verdict

- **WHEN**direct runner throw 且 adapter 返回 execution-failed report
- **THEN**CheckRun 为 failed 且 result 为 null
- **AND**Product 不伪造 failed CheckResult 或 synthetic QualityRecord

### Requirement: ExecutionReport is exhaustive and terminal

Execution coordinator SHALL 为每个 applicable contribution 返回且只返回一个与 Core-issued `checkRunId` 关联的 terminal `ExecutionReport`。Report MUST 是 closed union：`returned` 携带一个 CheckResult candidate；`unavailable` 携带 safe actionable dependency diagnostic；`execution-failed` 携带 safe actionable execution diagnostic。Contribution 正常 return、throw/rejection 和 dependency unavailable MUST 在 private adapter boundary 分别归一化成这三个 variants，不能以 missing report 表达。

完整 report set MUST 与 applicable contribution set 在 `checkRunId` 上 exactly equal；unknown、missing 或 duplicate report，以及 coordinator 无法 settle 完整 batch，属于 Product execution-integrity failure 并阻止可信 final model，而不是任一 runner 可以覆盖的 CheckResult。Report 一旦交付即 terminal，不得追加 result、diagnostic 或 progress。

#### Scenario: Throw becomes one terminal report

- **WHEN**direct CheckRunner 在提交 records 和 acknowledgements 之后 throw
- **THEN**direct adapter 仍返回 exactly one execution-failed report
- **AND**CheckManager 可以使用此前 manager-owned progress 与 sink state finalize 唯一 failed run

#### Scenario: Missing report invalidates the batch

- **WHEN**coordinator 没有为一个 applicable contribution 返回 terminal report
- **THEN**Product 拒绝 final execution snapshot 并映射为 runtime failure
- **AND**不得把该 check 静默改写为 skipped、not-applicable 或 zero-result success

### Requirement: Incremental acknowledgement is manager-owned

每个 applicable invocation SHALL 在 execution 前冻结 invocation-private opaque domain-work handles。CheckManager SHALL 向 binding 提供受控 incremental acknowledgement port；首次 `ack(handle)` 把当前 run 拥有的 unprocessed handle 原子转为 finished，同一 handle 的重复 ack 为幂等 no-op。Unknown、foreign 或 terminal-seal 后的 handle ack MUST 被拒绝并记录 execution-protocol violation。

Binding 只能在对应 domain work 完整成功后 ack；attempt、start、partial output、Task settlement 中的 non-success 或 completion/lifecycle work 不得 ack。后续 task adapter MAY 静态把一个 task 关联到 zero 或多个 domain-work handles，但 Task identity/count/result 始终 private，且只有完整 task success 才能调用同一 port。

Progress state 由 CheckManager 持有，不依赖 runner 最终 return。Record sink state 独立由 RecordManager 持有；因此 returned、throw、unavailable 或 execution-failed report 到达后，Core 都能恢复同一组 finished/unprocessed handles 和 committed records。

#### Scenario: Successful work survives later throw

- **WHEN**runner 完整处理并 ack 两个 domain-work handles，随后第三项 work throw
- **THEN**final coverage 保留两个 finished handles 并把其余 handles 保持 unprocessed
- **AND**execution-failed report 不清空或重新声明 progress

#### Scenario: Partial task does not acknowledge domain work

- **WHEN**后续 task adapter 启动一个关联 handles 的 task 但 task 未 fulfilled
- **THEN**它不调用 ack port 且这些 handles 保持 unprocessed
- **AND**Task 自身 settlement 不成为 public coverage unit

### Requirement: CheckManager finalization has one precedence

CheckManager SHALL 创建 invocation 内唯一且 immutable 的 `checkRunId`，并把它绑定到 definition、progress port 和 record sink。Final run coverage MUST 包含 non-negative integer `planned`、`finished`、`unprocessed` 与 `committedRecordCount`，满足 `planned = finished + unprocessed`；planned 来自 frozen domain-work handles，finished 来自 manager-owned acknowledgements，record count 来自 RecordManager unique committed set。

Finalization MUST 按固定优先级产生唯一 terminal mapping：identity-integrity conflict 先使整个 final model 无效且不发布；否则 record protocol violation 产生 failed/`invalid-record`；acknowledgement 或 execution-report protocol violation 以及 invalid CheckResult 产生 failed/`invalid-result`；合法 `unavailable` report 产生 failed/`unavailable`；合法 `execution-failed` report 产生 failed/`execution`；合法 `returned` report 产生 completed 及其 validated result。更低优先级事实 MAY 进入 safe secondary diagnostics，但不得改变 primary status/kind。Skipped 和 not-applicable 规则在 contribution 前闭合，不进入该 report precedence。

#### Scenario: Record violation outranks later throw

- **WHEN**runner 先提交 invalid record candidate、随后 throw
- **THEN**Core 保留此前 valid records 并 finalize failed/invalid-record run
- **AND**execution failure 只能作为 secondary diagnostic，不能制造 arrival-dependent primary kind

#### Scenario: Coverage cannot be declared by a binding

- **WHEN**binding 返回 terminal report 并尝试携带自报 planned 或 record counts
- **THEN**Core 忽略或拒绝非 contract fields 并只使用 manager-owned states
- **AND**public coverage 不依赖 runner、Task 或 completion order
