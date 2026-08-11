# scan-completeness Specification

## Purpose

定义 current measurement capability 的完成状态、失败诊断与 overall completeness，使调用者能够判断质量结果是否可信。

## Requirements
### Requirement: Current capabilities produce one final result

Product core SHALL 使用稳定 IDs `file-metrics`、`function-metrics` 与 `duplicate-detection` 表达 current measurement responsibilities。Core MUST 在 normalized input 与 capability-specific eligibility 确定后，为每项 capability 产生且只产生一个 final result，状态为 `skipped`、`no-input`、`succeeded` 或 `failed`。

`skipped` MUST 表示当前 profile 未请求该 capability；`no-input` MUST 表示 profile 已请求但没有 eligible input；两者 MUST NOT 解析或启动 component。`succeeded` MUST 表示全部 eligible work 已完成并得到有效 normalized result，且 zero findings MUST 保持为 `succeeded`。

`failed` MUST 表示 required work 未完整完成，并包含 `kind`、`message` 与 `action`。`kind` MUST 为 `unavailable`、`execution` 或 `invalid-result`；component、phase 和其它 backend metadata MAY 作为诊断信息，但 MUST NOT 改变 capability identity 或 completeness 规则。

#### Scenario: Quick profile skips duplicate detection

- **WHEN** scan 使用 quick profile
- **THEN** duplicate-detection final result 为 `skipped`
- **AND** product 不解析或启动 duplicate component

#### Scenario: Requested capability has no eligible input

- **WHEN** profile 请求某项 capability，但 normalized scope 没有对应 eligible input
- **THEN** final result 为 `no-input`
- **AND** product 不解析、检查或启动对应 component

#### Scenario: Successful measurement can produce zero findings

- **WHEN** capability 有 eligible input，measurement 正常完成并产生 zero findings
- **THEN** final result 为 `succeeded`
- **AND** zero findings 不被重新分类为 `no-input`

#### Scenario: Required component is unavailable

- **WHEN** capability 有 eligible input，但 required component 无法解析或启动
- **THEN** final result 为 `failed` 且 failure kind 为 `unavailable`
- **AND** diagnostic 说明原因和恢复动作

#### Scenario: Measurement execution or result validation fails

- **WHEN** capability measurement 启动后发生 execution failure，或 normalized result 无效
- **THEN** final result 为 `failed`，kind 分别为 `execution` 或 `invalid-result`
- **AND** 任何部分结果不能使该 capability 变成 `succeeded`

### Requirement: Overall completeness controls result trust

Product core SHALL 只从 final capability results 计算 current overall completeness。任一 capability 为 `failed` 时，overall MUST 为 `failed`；没有 failure 且至少一项 capability 为 `succeeded` 时，overall MUST 为 `complete`；没有 capability 成功或失败时，overall MUST 为 `empty`。`skipped` MUST NOT 降低 completeness。

#### Scenario: Succeeded and no-input capabilities form a complete result

- **WHEN** 本次 scan 至少一项 capability `succeeded`，其余 capability 为 `succeeded`、`no-input` 或 `skipped`
- **THEN** overall completeness 为 `complete`
- **AND** scan 可以继续计算可信质量结论

#### Scenario: No capability performs measurement

- **WHEN** 本次 scan 的 capability results 只包含 `skipped` 或 `no-input`
- **THEN** overall completeness 为 `empty`
- **AND** scan 不声称质量通过

#### Scenario: Any required measurement fails

- **WHEN** 任一 capability final result 为 `failed`
- **THEN** overall completeness 为 `failed`
- **AND** 其它 capability 的成功数据不能把 overall 提升为 `complete`
