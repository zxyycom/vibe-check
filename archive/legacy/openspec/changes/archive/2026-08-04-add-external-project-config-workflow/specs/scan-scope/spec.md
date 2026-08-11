## ADDED Requirements

### Requirement: Every project scan uses one complete selected config

Scan scope SHALL 消费 Product Config 选出的唯一完整 config。Default、explicit 与 discovered source
SHALL 共用同一套 normalization、collection、classification 和 exact-input pipeline；selection
source 只影响 provenance。

#### Scenario: Neutral default covers supported project files

- **WHEN** ungated scan 选择 neutral default
- **THEN** 既有 Git/fallback collection 应用 `**/*`、default exclusions 与 `project` area
- **AND** supported eligible files 进入常规 scanner exact-input pipeline

#### Scenario: Materialized default preserves scope

- **WHEN** 同一 neutral value 先以内存 default、再以 initialized discovered document 参与 scan
- **THEN** 两次 invocation 产生相同 normalized scope、code areas 与 scanner exact inputs
- **AND** provenance 分别表达实际 selection source

#### Scenario: File-backed policy controls scope

- **WHEN** explicit 或 discovered config 定义 include、exclude 与 code-area values
- **THEN** collection 和 classification 使用该完整 selected value
- **AND** current、baseline 与 Git-failure fallback 共享同一 scope policy
