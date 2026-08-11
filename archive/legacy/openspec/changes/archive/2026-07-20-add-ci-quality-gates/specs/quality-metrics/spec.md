## ADDED Requirements

### Requirement: Gate evidence evaluation

Quality core SHALL 从 normalized gate request、final overall completeness 与 final comparison status 产生一次 gate state，并使用固定优先级：omitted request 产生 `disabled`；`failed` completeness 产生 `not-evaluated: scan-incomplete`；`empty` completeness 产生 `not-evaluated: no-eligible-input`；`changed` / `regressions` 且 comparison 为 `baseline-unavailable` 时产生 `not-evaluated: comparison-unavailable`；其余 request 进入 warning evaluation。`input-unchanged` MUST 视为有效 comparison evidence。

#### Scenario: Omitted request is disabled

- **WHEN** scan 没有 gate request
- **THEN** gate status 为 `disabled`
- **AND** completeness 或 warnings 不改变 disabled state

#### Scenario: Empty measurement cannot certify a requested gate

- **WHEN** overall completeness 为 `empty` 且请求任一 policy
- **THEN** gate result 为 `not-evaluated: no-eligible-input`
- **AND** empty warning channel 不被描述成 passed gate

#### Scenario: Failed measurement cannot run a requested gate

- **WHEN** overall completeness 为 `failed`
- **THEN** gate result 为 `not-evaluated: scan-incomplete`
- **AND** completeness failure 不被分类为 evaluated gate failure

#### Scenario: Comparison policy requires comparison evidence

- **WHEN** complete scan 请求 `changed` 或 `regressions`
- **THEN** `compared` 或 `input-unchanged` 进入 warning evaluation
- **AND** `baseline-unavailable` 产生 `not-evaluated: comparison-unavailable`

### Requirement: Gate warning selection

For an evaluable gate, quality core SHALL 使用 policy descriptor 选择且只选择一个 final warning channel：`all` 选择 resolved profile 的 `warnings.all`，`changed` 选择 `warnings.changed`，`regressions` 选择 `warnings.regressions`。Evaluation MUST 在 accepted-warning reasons 应用后执行；具有非空 `acceptedReason` 的 warning MUST 保留在 channel 与 evaluated count 中，但 MUST NOT 进入 blocking set。Evaluator MUST 保留 selected-channel identity 与 ordering，不得修改 warning records、channel membership、profile capability results 或 quality status。Blocking set 为空时 gate MUST 为 `passed`，否则 MUST 为 `failed`。

#### Scenario: All gate evaluates the resolved profile

- **WHEN** complete scan 使用 `all` policy
- **THEN** gate 只评价 resolved profile 的 `warnings.all`
- **AND** profile-skipped capabilities 保持可见

#### Scenario: Comparison gate evaluates its selected channel

- **WHEN** complete scan 具有有效 comparison evidence，并使用 `changed` 或 `regressions`
- **THEN** gate 只评价 descriptor 指定的 channel
- **AND** empty blocking set 通过，non-empty blocking set 失败

#### Scenario: Accepted warnings remain visible but non-blocking

- **WHEN** selected channel 同时包含 accepted 与 unaccepted warnings
- **THEN** 所有 warnings 保持原 identity、ordering 与 evaluated membership
- **AND** 只有 unaccepted warnings 进入 blocking set

### Requirement: Gate result invariants

`QualityMetrics` SHALL 包含一个 normalized、status-discriminated `GateResult`：`disabled` result 只记录 `policy = null` 与 status；`passed` / `failed` result 记录 closed policy、descriptor-selected `evaluatedChannel`、`evaluatedWarningCount`、`blockingWarningCount` 与 `blockingWarnings`，且不记录 reason；`not-evaluated` result 只记录 closed policy、status 与 `scan-incomplete` / `no-eligible-input` / `comparison-unavailable` 之一的 `reasonCode`。Evaluated count MUST 等于 selected channel 长度，blocking count MUST 等于 blocking list 长度，zero/non-zero blocking count MUST 分别对应 `passed` / `failed`。Validation MUST reject unknown enum、状态不拥有的 extra/missing field、negative or non-integer count、count/list mismatch、policy/channel mismatch 与 status/count mismatch。

#### Scenario: Disabled result has no evaluated placeholders

- **WHEN** gate request 被省略
- **THEN** result 不包含 evaluated channel、counts、blocking list 或 reason
- **AND** consumer 只需按 `status = disabled` 判断未启用 gate

#### Scenario: Evaluated result preserves warning identity and order

- **WHEN** selected channel 包含 accepted 与 unaccepted warnings
- **THEN** evaluated count 等于 channel 长度，blocking list 按 channel 原顺序包含 unaccepted warnings
- **AND** blocking count 等于 blocking list 长度

#### Scenario: Invalid result combination fails validation

- **WHEN** GateResult 不满足 status-specific fields、enum、count/list 或 policy/channel invariants
- **THEN** metrics validation 返回 path-aware error
- **AND** invalid result 不得形成可信 gate 或 process outcome
