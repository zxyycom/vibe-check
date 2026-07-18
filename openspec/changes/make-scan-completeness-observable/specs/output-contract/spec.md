本 delta 起草 completeness 在所有输出层的一致投影；当前 change 仅在 `openspec/changes/make-scan-completeness-observable/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## ADDED Requirements

### Requirement: Completeness is visible across output surfaces

Output layer SHALL 从 product core 的同一 capability plan 与 overall completeness 投影 console summary、`metrics.json` 和 `report.md`。每项 capability 的 ID、planned state、input count、component identity、status 与 normalized failure MUST 在 machine artifact 中可用；human output MUST 区分 profile skip、no-input、unavailable、failed 与 succeeded。

#### Scenario: Complete scan reports succeeded capabilities

- **WHEN** scan 的 planned capabilities 全部成功
- **THEN** machine artifact 和 human summary 表达相同的 complete state
- **AND** capability input counts 与最终 metrics 一致

#### Scenario: Profile skip remains intentional

- **WHEN** quick profile 将 duplicate detection 标为 `not-planned`
- **THEN** output 表达 profile skip
- **AND** 不把它显示为 dependency unavailable、zero finding 或 failure

#### Scenario: Unavailable measurement prevents a green conclusion

- **WHEN** planned capability 状态为 `unavailable`
- **THEN** console、report 和 machine artifact 都显示 overall failed
- **AND** completion text 不包含可信 `passed` 结论
