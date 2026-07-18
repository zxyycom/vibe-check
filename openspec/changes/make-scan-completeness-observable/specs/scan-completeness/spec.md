本 spec 起草 scanner capability planning 与结果完整性的长期 contract；当前 change 仅在 `openspec/changes/make-scan-completeness-observable/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## ADDED Requirements

### Requirement: Capability plan records every measurement responsibility

Product core SHALL 在 normalized scope 构造后建立本次 scan 的 capability plan，使用稳定 IDs `file-metrics`、`function-metrics` 与 `duplicate-detection`。每项 capability MUST 记录 profile 是否计划、eligible input 数量、component identity，以及封闭状态 `not-planned`、`no-input`、`succeeded`、`unavailable` 或 `failed`。

#### Scenario: Quick profile plans only enabled capabilities

- **WHEN** scan 使用 quick profile
- **THEN** file metrics 与 function metrics 按 input 进入 plan
- **AND** duplicate detection 状态为 `not-planned`，而不是 `no-input` 或 `unavailable`

#### Scenario: Planned capability has no eligible input

- **WHEN** profile 启用某项 capability但 normalized scope 没有 eligible input
- **THEN** capability 状态为 `no-input`
- **AND** product 不检查或启动对应 component

#### Scenario: Planned component cannot be resolved

- **WHEN** capability 有 eligible input且 component availability check 失败
- **THEN** capability 状态为 `unavailable`
- **AND** record 保留 component、phase、reason 与可行动 error

### Requirement: Overall completeness controls result trust

Product core SHALL 从 capability records 计算 overall completeness。所有 planned capabilities 均为 `succeeded` 或 `no-input` 时，overall SHALL 为 `complete`；全部 planned capabilities 都为 `no-input` 时 SHALL 为 `empty`；任一 planned capability 为 `unavailable` 或 `failed` 时 SHALL 为 `failed`。`not-planned` MUST NOT 降低 completeness。

#### Scenario: Every planned capability succeeds

- **WHEN** 本次 scan 的所有 planned capabilities 都成功或合法 no-input
- **THEN** overall completeness 为 `complete`，或在全部 no-input 时为 `empty`
- **AND** scan 可以继续计算 `passed` 或 `warning`

#### Scenario: Required measurement is unavailable

- **WHEN** 任一有 eligible input 的 planned capability 状态为 `unavailable`
- **THEN** overall completeness 为 `failed`
- **AND** scan 不得把缺失 measurement 表达为可信 zero 或 `passed`

#### Scenario: Component starts and then fails

- **WHEN** planned component 发生 execution、report、parse 或 normalized validation failure
- **THEN** capability 与 overall completeness 均记录 failure
- **AND** 该 capability 的部分 records 不参与可信 result
