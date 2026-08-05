> **核心句：**本 delta 让 scanner dependency 只服务所属 built-in CheckRunner，并把 backend failure 归一化为 CheckRun execution evidence 而不是全局质量结论。

## MODIFIED Requirements

### Requirement: Scanner dependency execution is resolved outside project configuration

Product SHALL 从 Product-owned defaults、host platform rules 与明确支持的 operational overrides 构造一次 typed scanner dependency snapshot。Snapshot SHALL 拥有 backend executable、argument list、availability protocol、dependency-specific settings 与 bounded concurrency；project config、schema、starter、examples、dogfood config 和 external fixture MUST NOT 提供或覆盖这些 values。Duplicate backend 的 per-path format detection 留在 adapter 内。

Operational overrides MUST 只影响 internal dependency execution，不得改变 semantic settings、scope、record catalog、CheckResult、report 或 artifact/cache public fields。Supported operational inputs MUST 在 invocation boundary 读取并验证一次；invalid input MUST 在 check、reference、cache 与 artifact work 前产生 actionable runtime error/exit2，不得回退到 project executable。现有 `VIBE_CHECK_LIZARD_CMD`、`VIBE_CHECK_SCC_CMD`、`VIBE_CHECK_JSCPD_CMD` 及 supported args overrides SHALL 保留 current parsing 和 replacement semantics，并不得进入 public CheckDefinition 或 record。

#### Scenario: Project config cannot select an executable

- **WHEN**scan 使用任一 valid current semantic input
- **THEN**built-in scanner executable 与 args 只来自 Product-owned dependency resolution
- **AND**project semantic input 不参与 backend selection 或 availability protocol

#### Scenario: Operational override has one responsibility

- **WHEN**caller 提供 supported operational dependency override
- **THEN**resolver 只在 invocation-private dependency snapshot 采用它
- **AND**public definition、semantic input 与 record provenance 不增加 dependency-specific field

#### Scenario: Malformed operational args do not use project fallback

- **WHEN**caller 提供 malformed supported args override
- **THEN**Product 报告 input name、expected shape 与恢复动作并 exit2
- **AND**resolver 不从 project input 寻找 fallback command/args

#### Scenario: Skipped capability does not hide malformed supplied args

- **WHEN**caller 为 resolved plan 将 skip 的 check 提供 malformed supported override
- **THEN**invocation boundary 仍拒绝 caller input 且不启动 dependency
- **AND**error 保持 operational/runtime 分类而非 project config 或 skipped 状态

### Requirement: Eligibility precedes dependency availability and invocation

Product SHALL 先从 frozen Check catalog、resolved selection 和 built-in exact inputs 形成 `ResolvedCheckInvocation`。未请求 check MUST finalize skipped run 且不检查 availability；已请求但没有 applicable exact input MUST finalize completed run 与 not-applicable CheckResult，且不检查 availability、启动 backend 或解析 result。

有 eligible input 时，execution coordinator SHALL 只向对应 runner/adapter 传递该 check 的 typed dependency settings 与 Product-approved exact inputs。Adapter MUST 隔离 process/protocol/backend-private output，并只返回 Vibe Check-owned data 或 typed execution failure；它不得直接创建 public CheckRun、CheckResult、QualityRecord 或 GateResult。

#### Scenario: Skipped capability does not resolve a runnable dependency

- **WHEN**resolved plan 未请求 duplicate-detection
- **THEN**其 CheckRun 为 skipped
- **AND**Product 不检查或启动 jscpd dependency

#### Scenario: No-input capability does not resolve a runnable dependency

- **WHEN**function-metrics 被请求但没有 supported exact input
- **THEN**其 run completed 且 result 为 not-applicable
- **AND**Product 不检查或启动 function backend

#### Scenario: Eligible adapter receives only owned inputs

- **WHEN**built-in check 冻结为 applicable 并具有 approved exact inputs
- **THEN**adapter 只接收该 check 的 typed dependency settings 与 owned inputs
- **AND**sibling checks、RecordManager、policy 与 Output 不接收 executable 或 args

## REMOVED Requirements

### Requirement: Dependency failures remain normalized capability results

**Reason**: Public capability result 已被 CheckRun、CheckResult 与 QualityRecord 三个明确事实取代。

**Migration**: 使用新增的“Dependency failures become CheckRun execution evidence”。

### Requirement: One dependency snapshot serves current and baseline

**Reason**: `baseline` 不再是唯一 comparison reference，cache unit 也迁移到 check-owned domain work。

**Migration**: 使用新增的“One dependency snapshot serves current and named references”。

## ADDED Requirements

### Requirement: Dependency failures become CheckRun execution evidence

Eligible dependency 的 unavailable、execution、invalid normalized result 与 declared private dependency failure SHALL 分别映射为所属 CheckRun 的 `unavailable`、`execution` 或 `invalid-result` actionable diagnostic。Adapter MAY 在 failure 前让 runner 提交已完成领域 work 的 records；failure MUST NOT 撤销 Core 此前 committed records 或自行决定 public coverage、CheckResult、gate 或 process outcome。

Core SHALL 根据 resolved domain-work plan、finished-work acknowledgements、record sink 与 execution report finalize failed CheckRun。Backend replacement、platform default 或 operational override 不得改变 check/record/policy contract。

#### Scenario: Dependency unavailable is distinguishable

- **WHEN**eligible built-in check 的 dependency 不可用
- **THEN**run 为 failed 并包含 `unavailable` diagnostic 且 result 为 null
- **AND**failure 不伪装成 not-applicable、zero-result success 或 config parse error

#### Scenario: Backend failure preserves completed records

- **WHEN**runner 已有 records 被 Core committed 后 backend execution failed
- **THEN**records 保留且 run 报告 remaining domain coverage
- **AND**dependency layer 不固定 gate 或全局 outcome

### Requirement: One dependency snapshot serves current and named references

一次 Product invocation MUST 解析至多一个 typed scanner dependency snapshot。Current 与全部 resolved named-reference work MUST 复用该 snapshot；各 inventory MAY 独立决定 eligibility 和 adapter invocation，但 MUST NOT 重新读取 environment、project semantic input 或 platform defaults。

Built-in check cache key MUST 只投影 domain work identity、content fingerprint、applicable semantic settings、reference 和 relevant backend/dependency identity。Executable、args、private backend output 与全量 project definition MUST NOT 进入 public check/record snapshots 或成为无关 cache invalidation。

#### Scenario: Multiple references share operational resolution

- **WHEN**同一 invocation 对 current、release 和 branch 运行 built-in check work
- **THEN**三者使用同一 dependency snapshot
- **AND**reference work 不重新读取 operational inputs

#### Scenario: Cache uses relevant inputs only

- **WHEN**domain work、content、check semantic settings、reference 或 backend identity 变化
- **THEN**对应 cache identity 变化
- **AND**report text、acceptance reason 或 sibling setting 不影响它
