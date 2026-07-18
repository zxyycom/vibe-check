# duplicate-scanning Specification

## Purpose
Define how Vibe Check scans normalized supported files for duplicate code, normalizes pairwise clone results, and reports deterministic warnings and scanner failures.
## Requirements
### Requirement: Duplicate scanner adapter input
Product core SHALL 从 Vibe Check normalized scan scope 和 configured code areas 运行 duplicate scanning。jscpd adapter MUST 只接收该 code area 已收集且未被 scan scope rules 排除的 exact paths，MUST NOT 扫描 project root 或自行扩大输入。每个至少包含两个 exact paths 的 code area SHALL 使用 configured minimum-token value；format mapping 为字符串时 SHALL 传给 jscpd，值为 `null` 时 SHALL 省略 format override，而不是跳过该 code area。

#### Scenario: 接收 configured code-area exact paths
- **WHEN** configured code area 包含已收集 paths `src/a.rs` 和 `src/b.rs`
- **THEN** jscpd adapter 接收这两个 exact paths 作为该 area 的 scan input
- **AND** adapter 使用该 area 的 configured minimum-token value

#### Scenario: Null format 保留自动检测
- **WHEN** configured code area 至少包含两个 exact paths 且 format mapping 为 `null`
- **THEN** jscpd adapter 仍为该 area 建立 scan task
- **AND** jscpd invocation 省略 format override

#### Scenario: 遵守 excluded paths
- **WHEN** generated、vendor、cache、target 或 ignored paths 下的 project files 已被 scan scope collection 排除
- **THEN** 这些 excluded files 不进入 jscpd input

#### Scenario: Code area 输入不足时正常跳过
- **WHEN** configured code area 少于两个 exact paths
- **THEN** product core 不为该 area 启动 jscpd invocation
- **AND** 该 area 正常完成且不产生 duplicate fragment

### Requirement: Product-owned jscpd integration boundary
Duplicate scanning SHALL 使用现有 product config 解析的 jscpd component。Adapter MUST 将 process protocol、reporter output 和 private configuration 限制在 adapter boundary 内，并向 product core 返回 Vibe Check-owned `DuplicateCodeFragment` records 或 normalized failure。

#### Scenario: jscpd result 被归一化
- **WHEN** configured jscpd component 报告 duplicate clone pair
- **THEN** product core 接收 Vibe Check-owned `DuplicateCodeFragment`
- **AND** product core 不依赖 jscpd reporter result structure

#### Scenario: Reporter output 不是 stable contract
- **WHEN** adapter 保存 jscpd reporter output 以复现 scanner behavior
- **THEN** raw reporter output 只作为 scanner artifact 使用
- **AND** raw reporter output 不成为 stable product output field
