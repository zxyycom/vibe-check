本 delta spec 将 capability completeness 改为 registry-owned final-result membership；它是临时 change artifact，尚未完成实现前审计。

## MODIFIED Requirements

### Requirement: Current capabilities produce one final result

Product core SHALL 从 Product-owned descriptor registry 取得本 revision 的完整稳定 capability ID 集合；该集合至少包含 `file-metrics`、`function-metrics` 与 `duplicate-detection`，并由独立 feature change 注册后续 content/security IDs。Core MUST 在 normalized input 与 descriptor-owned eligibility 确定后，为 registry 中每项 capability 产生且只产生一个 final result，状态为 `skipped`、`no-input`、`succeeded` 或 `failed`。Unknown、duplicate 或 missing registry ID MUST 使 final core/machine validation 失败。

`skipped` MUST 表示当前 profile 或显式执行政策未请求该 capability；`no-input` MUST 表示 capability 已请求但 selector 没有 eligible exact input；两者 MUST NOT 解析、检查或启动 component，且 observations/findings 均为空。`succeeded` MUST 表示全部 eligible work 已完成并得到有效 normalized result，且 zero findings或zero observations MUST保持为`succeeded`。

`failed` MUST 表示 required work 未完整完成，并包含 `kind`、`message` 与 `action`。`kind` MUST 为 `unavailable`、`execution` 或 `invalid-result`；component、phase 和其它 backend metadata MAY 作为诊断信息，但 MUST NOT 改变 capability identity 或 completeness 规则。

#### Scenario: Quick profile skips duplicate detection

- **WHEN** scan 使用 quick profile
- **THEN** duplicate-detection final result 为 `skipped`
- **AND** product 不解析或启动 duplicate component

#### Scenario: Requested capability has no eligible input

- **WHEN** execution policy 请求某项 registered capability，但 descriptor selector 没有 eligible exact input
- **THEN** final result 为 `no-input`
- **AND** product 不解析、检查或启动对应 component

#### Scenario: Successful work can produce zero findings or observations

- **WHEN** capability 有 eligible input，工作正常完成并产生 zero findings，且其contract MAY产生zero observations
- **THEN** final result 为 `succeeded`
- **AND** zero findings/observations 不被重新分类为 `no-input`

#### Scenario: Required component is unavailable

- **WHEN** capability 有 eligible input，但 required component 无法解析或启动
- **THEN** final result 为 `failed` 且 failure kind 为 `unavailable`
- **AND** diagnostic 说明原因和恢复动作

#### Scenario: Measurement execution or result validation fails

- **WHEN** capability 启动后发生 execution failure，或 normalized result 无效
- **THEN** final result 为 `failed`，kind 分别为 `execution` 或 `invalid-result`
- **AND** 任何部分 findings 或 observations 不能使该 capability 变成 `succeeded`

#### Scenario: Registry membership is complete

- **WHEN** final results 缺少 registered capability、包含 unknown ID 或重复 ID
- **THEN** core 与 machine validation 拒绝该 result set
- **AND** array presentation order 不改变按 ID 验证的 verdict
