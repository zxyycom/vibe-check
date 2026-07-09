本 spec delta 定义 `integrate-rust-jscpd-adapter` 需要新增的 duplicate-code fixture 增量；归档前，主规范仍以当前仓库状态为准。

## ADDED Requirements

### Requirement: Duplicate code fixture coverage
checked-in project fixture suite SHALL 为 Rust CLI duplicate scanner 提供 deterministic duplicate-code proof targets。duplicate-code fixtures MUST 手写、提交到仓库、无需 network access 或 language package installation 即可运行，并且默认只覆盖 supported Rust CLI source inputs；只有测试明确证明 unsupported 或 excluded inputs 时才例外。

#### Scenario: Cross-file duplicate fixture 存在
- **WHEN** CLI contract test 需要验证跨文件 duplicate detection
- **THEN** fixture suite 包含至少两个 checked-in supported source files，并带有达到或超过 configured threshold 的 intentional duplicate fragment

#### Scenario: Same-file duplicate fixture 存在
- **WHEN** adapter test 需要验证 same-file duplicate normalization
- **THEN** fixture suite 包含一个 checked-in supported source file，并带有两个 intentional duplicate spans

#### Scenario: Excluded duplicate fixture 不产生 warning
- **WHEN** duplicate-looking code 只存在于 generated、vendor、cache、target 或 ignored fixture paths 下
- **THEN** fixture-backed tests 证明这些 paths 不产生 duplicate-code warnings

#### Scenario: Duplicate fixture proof targets 有文档记录
- **WHEN** duplicate-code fixture-backed tests 被新增或修改
- **THEN** 对应 test case entry 或 `@case` marker 标识 duplicate scanner proof target 和 fixture responsibility
