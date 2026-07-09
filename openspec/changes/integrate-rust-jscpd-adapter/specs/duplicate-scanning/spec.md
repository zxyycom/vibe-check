本 spec delta 定义 `integrate-rust-jscpd-adapter` 需要新增的 duplicate scanner adapter 行为；归档前，主规范仍以当前仓库状态为准。

## ADDED Requirements

### Requirement: Duplicate scanner adapter input
Core scan pipeline SHALL 从 Vibe Check normalized scan scope 运行 duplicate scanning。duplicate scanner adapter MUST 只接收已收集的 supported files，MUST NOT 扫描被 scan scope rules 排除的文件，也不能扫描 Rust CLI supported source set 判定为 unsupported 的文件。

#### Scenario: 接收 supported files
- **WHEN** scan scope 包含 supported files `src/a.rs` 和 `src/b.rs`
- **THEN** duplicate scanner adapter 接收这些 supported file paths 作为 scan input

#### Scenario: 不扫描 unsupported files
- **WHEN** scan scope 包含 supported file `src/lib.rs` 和 unsupported ordinary file `README.md`
- **THEN** duplicate scanner adapter 接收 `src/lib.rs`
- **AND** duplicate scanner adapter 不接收 `README.md`

#### Scenario: 遵守 excluded paths
- **WHEN** generated、vendor、cache、target 或 ignored paths 下的 project files 已被 scan scope collection 排除
- **THEN** 这些 excluded files 不进入 duplicate scanner input

### Requirement: jscpd Rust engine integration boundary
duplicate scanner adapter SHALL 通过 Rust API 接入 jscpd v5 Rust engine。adapter MUST 将 jscpd 或 `cpd-finder` native result types、reporter output 和 private configuration 限制在 adapter boundary 内，并且 MUST 向 Core 返回 Vibe Check-owned duplicate results 或 diagnostics。

#### Scenario: Rust API result 被归一化
- **WHEN** jscpd Rust engine 报告 duplicate clone pair/group
- **THEN** Core 接收 Vibe Check duplicate finding，而不是 jscpd-native result structure

#### Scenario: Reporter output 不是 stable contract
- **WHEN** adapter 使用任何 jscpd reporter 或 raw summary 调试 scanner behavior
- **THEN** raw reporter output 不作为 stable JSON output field 暴露

### Requirement: Normalized duplicate finding model
Duplicate scanner results SHALL 在 warning generation 前归一化为 Vibe Check-owned duplicate finding records。每个 duplicate finding MUST 包含 deterministic group identity、至少两个 project-root-relative locations、每个 location 的 line span，以及 scanner 提供的 token count 或等价 threshold evidence。

#### Scenario: Cross-file duplicate 被归一化
- **WHEN** jscpd 报告跨 `src/a.rs` 和 `src/b.rs` 的 clone
- **THEN** normalized duplicate finding 包含这两个 project-root-relative files 的 locations
- **AND** 每个 location 包含 line span

#### Scenario: Same-file duplicate 被归一化
- **WHEN** jscpd 报告同一个 supported file 内的两个 clone locations
- **THEN** normalized duplicate finding 将两个 locations 保留为独立 spans

#### Scenario: Duplicate finding 顺序确定
- **WHEN** 同一个 project 在源码未变化时重复扫描
- **THEN** duplicate findings 按 normalized location 和 group identity deterministic ordering

### Requirement: Duplicate scanner threshold behavior
duplicate scanner adapter SHALL 在调用 jscpd Rust engine 时应用 Vibe Check-owned duplicate threshold settings。低于 configured minimum token threshold 的 findings MUST NOT 产生 normalized duplicate findings。

#### Scenario: 高于 threshold 的 duplicate 被报告
- **WHEN** 两个 supported files 包含达到或超过 configured minimum token threshold 的 duplicate fragment
- **THEN** duplicate scanner 返回 normalized duplicate finding

#### Scenario: 低于 threshold 的 duplicate 被过滤
- **WHEN** 两个 supported files 包含低于 configured minimum token threshold 的相似文本
- **THEN** duplicate scanner 不为该文本返回 normalized duplicate finding

### Requirement: Duplicate scanner diagnostics
duplicate scanner adapter failures SHALL 显式可见。recoverable duplicate scanner problems MUST 变成 normalized diagnostics，并在仍能产生 report data 时输出 partial report；阻止 report data 产生的 fatal duplicate scanner failures MUST 报告为 scanner fatal errors，MUST NOT 转换成 empty duplicate result。

#### Scenario: Recoverable duplicate scanner issue 产生 partial report
- **WHEN** 一个 supported file 无法执行 duplicate scanning，但其它 scan results 仍可归一化
- **THEN** scan 以 duplicate scanner diagnostic 完成
- **AND** `summary.status` 为 `partial`

#### Scenario: Fatal duplicate scanner issue 不伪装成 clean
- **WHEN** duplicate scanner adapter 无法初始化，或 scan scope collection 之后无法产生 report data
- **THEN** CLI 以 scanner fatal exit code 退出
- **AND** stdout 不包含 human 或 JSON scan report

#### Scenario: Unsupported dependency state 可观察
- **WHEN** 选定的 jscpd Rust dependency 无法编译、初始化，或无法保持 Vibe Check scan scope boundaries
- **THEN** implementation 报告显式 unsupported 或 scanner fatal outcome
- **AND** 不静默报告 zero duplicate findings
