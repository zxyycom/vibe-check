## Purpose

集中拥有 scanner dependency 的 operational resolution、eligible invocation、adapter handoff 与 normalized failure，使 project configuration 和其它 product consumers 只依赖稳定的 Vibe Check 语义。

## ADDED Requirements

### Requirement: Scanner dependency execution is resolved outside project configuration

Product SHALL 从 Product-owned defaults、host platform rules 与明确支持的 operational overrides 构造一次 typed scanner dependency snapshot。该 snapshot SHALL 拥有 backend executable、argument list、availability protocol、dependency-specific execution hints 与 bounded concurrency；project config、generated schema、starter、examples、dogfood config 和 external fixture MUST NOT 提供或覆盖这些 values。

Operational overrides MUST 只影响 internal dependency execution，不得改变 semantic config、scope、thresholds、accepted-warning policy、report 或 artifact/cache fields。Invalid operational input MUST 产生可行动 boundary error，不得静默回退到 project-provided executable。

#### Scenario: Project config cannot select an executable

- **WHEN** scan 使用任一 valid semantic project config
- **THEN** dependency executable 与 args 只来自 Product-owned internal resolution
- **AND** project document 不参与 command selection、platform fallback 或 availability protocol

#### Scenario: Operational override has one responsibility

- **WHEN** caller 提供 supported operational dependency override
- **THEN** resolver 在 invocation snapshot 中采用该 override
- **AND** resolved semantic config 与其 public provenance 不增加 dependency-specific field

#### Scenario: Invalid operational input does not use project fallback

- **WHEN** operational override 的 shape 或 value 无效
- **THEN** Product 报告 override name、expected shape 与修复动作，并在对应 dependency invocation 前失败
- **AND** resolver 不从 project config 寻找 command/args，也不静默采用未知 executable

### Requirement: Eligibility precedes dependency availability and invocation

Product core SHALL 先按 resolved profile、semantic config 与 normalized exact inputs 决定 capability eligibility。未请求 capability MUST 返回 `skipped`；已请求但没有 eligible input MUST 返回 `no-input`。这两种情况 MUST NOT 检查 availability、启动 backend 或解析 backend result。

有 eligible input 时，orchestrator SHALL 只向对应 adapter 传递该 capability 的 typed dependency settings 与 Product-approved exact inputs。Adapter MUST 隔离 process/protocol/backend-private output，并只返回 Vibe Check-owned model 或 normalized capability failure。

#### Scenario: Skipped capability does not resolve a runnable dependency

- **WHEN** selected profile 未请求某项 capability
- **THEN** capability result 为 `skipped`
- **AND** Product 不检查或启动该 capability 的 backend

#### Scenario: No-input capability does not resolve a runnable dependency

- **WHEN** profile 请求某项 capability，但 normalized scope 没有 eligible exact input
- **THEN** capability result 为 `no-input`
- **AND** Product 不检查或启动该 capability 的 backend

#### Scenario: Eligible adapter receives only owned inputs

- **WHEN** capability 具有 eligible exact input
- **THEN** adapter 接收 Product-approved paths、semantic scan settings 与它自己的 internal dependency settings
- **AND** sibling adapters、warning generation、scope collection 与 report rendering 不接收 executable 或 args

### Requirement: One dependency snapshot serves current and baseline

一次 Product invocation MUST 解析至多一个 scanner dependency snapshot。Current 与 baseline measurement MUST 复用该 snapshot；它们 MAY 按各自 revision 的 eligibility 分别执行 availability check 和 adapter invocation，但 MUST NOT 重新读取 environment、project config 或 platform defaults。

Cache identity MUST 同时区分影响 normalized result 的 semantic config fingerprint 与 relevant internal dependency identity。它 MUST NOT 依赖 caller-editable project config version 作为唯一 invalidation signal，也不得把 executable/args 回写到 public project config。

#### Scenario: Current and baseline share operational resolution

- **WHEN** invocation 同时运行 current 与 baseline measurement
- **THEN** 两个 revision 使用同一个 dependency settings snapshot
- **AND** baseline 不重新读取 operational override 或 project document

#### Scenario: Revision eligibility remains independent

- **WHEN** current revision 对 capability 无输入而 baseline revision 有 eligible input
- **THEN** baseline 可以使用 invocation snapshot 解析并运行自己的 eligible adapter
- **AND** current 仍保持 `no-input`，不因 baseline execution 被改写

#### Scenario: Cache identity separates semantics from backend identity

- **WHEN** semantic check value 或 normalized-result-relevant dependency identity 变化
- **THEN** 对应 cache identity 变化
- **AND** 不相关的 report text 或 project-level executable field 不存在且不能影响该 identity

### Requirement: Dependency failures remain normalized capability results

Eligible dependency 的 unavailable、execution 与 invalid normalized result MUST 分别映射为 `unavailable`、`execution` 与 `invalid-result` diagnostic，并包含可行动恢复信息。Backend replacement、platform default 或 operational override 不得改变 shared capability result、overall completeness、gate 或 process-outcome semantics。

#### Scenario: Dependency unavailable is distinguishable

- **WHEN** eligible capability 的 resolved dependency 不可用
- **THEN** adapter 返回 `failed` / `unavailable` 与 actionable diagnostic
- **AND** failure 不伪装成 `no-input`、successful zero result 或 config parse failure

#### Scenario: Execution and invalid result stay distinct

- **WHEN** eligible backend 分别发生 process failure 或返回 invalid result
- **THEN** adapter 分别返回 `failed` / `execution` 与 `failed` / `invalid-result`
- **AND** backend-private stdout、stderr 或 report shape 不成为 public config contract

#### Scenario: Backend replacement leaves semantic config unchanged

- **WHEN** internal scanner implementation 被替换但仍履行相同 Vibe Check capability contract
- **THEN** semantic project config schema、starter 与 accepted-warning check IDs 保持不变
- **AND** replacement 只需在 internal dependency/adapter boundary 处理 execution difference
