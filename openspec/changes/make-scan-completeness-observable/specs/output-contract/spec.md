## ADDED Requirements

### Requirement: Completeness is visible across output surfaces

Output layer SHALL 从 product core 的同一 final capability results 与 overall completeness 投影 console summary/completion、`metrics.json` 和 `report.md`，MUST NOT 重新计算 capability status 或 overall。

Machine artifacts SHALL 提供 overall completeness、每项 capability 的 ID/status，以及 failed result 的 normalized diagnostic。Human output SHALL 区分 profile skip、no input、successful zero findings 与 failure。稳定 schema identity、最终 field naming/nesting、compatibility 和 examples 由后续 machine-output change 定义。

#### Scenario: Complete scan reports succeeded capabilities

- **WHEN** scan overall completeness 为 `complete`
- **THEN** machine artifact 和 human summary 表达相同的 complete state
- **AND** human completion 可以根据 normalized quality warnings 显示 passed 或 warning

#### Scenario: Empty scan is visible as warning

- **WHEN** scan overall completeness 为 `empty`
- **THEN** machine artifact 表达 `empty`，human completion 显示 warning
- **AND** human text 说明没有 eligible input、质量未评价，不显示绿色通过

#### Scenario: Capability states retain product meaning

- **WHEN** quick profile skip、no input 与 successful zero findings 出现在 capability results 中
- **THEN** output 分别表达 `skipped`、`no-input` 与 `succeeded`
- **AND** 不把任何一种状态显示为 component failure

#### Scenario: Failed measurement writes actionable evidence

- **WHEN** capability result 为 `failed`
- **THEN** 在 failure model 可验证且 artifacts 可写时，console、report 和 machine artifact 都显示 overall failed 与 normalized diagnostic
- **AND** human completion 显示 capability、原因与恢复动作，不包含可信 `passed` 结论
