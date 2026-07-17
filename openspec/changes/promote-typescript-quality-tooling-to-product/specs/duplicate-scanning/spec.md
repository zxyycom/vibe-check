## ADDED Requirements

### Requirement: Product-owned jscpd integration boundary
Duplicate scanning SHALL 使用现有 product config 解析的 jscpd component。Adapter MUST 将 process protocol、reporter output 和 private configuration 限制在 adapter boundary 内，并向 product core 返回 Vibe Check-owned duplicate results、diagnostics 或 normalized failure。

#### Scenario: jscpd result 被归一化
- **WHEN** configured jscpd component 报告 duplicate clone pair
- **THEN** product core 接收 Vibe Check-owned duplicate finding
- **AND** product core 不依赖 jscpd reporter result structure

#### Scenario: Reporter output 不是 stable contract
- **WHEN** adapter 保存 jscpd reporter output 以复现 scanner behavior
- **THEN** raw reporter output 只作为 scanner artifact 使用
- **AND** raw reporter output 不成为 stable product output field

## MODIFIED Requirements

### Requirement: Duplicate scanner adapter input
Product core SHALL 从 Vibe Check normalized scan scope 运行 duplicate scanning。jscpd adapter MUST 只接收已收集的 supported files，MUST NOT 扫描被 scan scope rules 排除的文件，也不能扫描 product scan scope 判定为 unsupported 的文件。

#### Scenario: 接收 supported files
- **WHEN** scan scope 包含 supported files `src/a.rs` 和 `src/b.rs`
- **THEN** jscpd adapter 接收这些 exact supported file paths 作为 scan input

#### Scenario: 不扫描 unsupported files
- **WHEN** scan scope 包含 supported file `src/lib.rs` 和 unsupported ordinary file `README.md`
- **THEN** jscpd adapter 接收 `src/lib.rs`
- **AND** jscpd adapter 不接收 `README.md`

#### Scenario: 遵守 excluded paths
- **WHEN** generated、vendor、cache、target 或 ignored paths 下的 project files 已被 scan scope collection 排除
- **THEN** 这些 excluded files 不进入 jscpd input

#### Scenario: 没有 supported files 时正常完成
- **WHEN** normalized scan scope 不包含 supported files
- **THEN** product core 跳过 jscpd adapter
- **AND** scan 正常完成，不产生 duplicate warning 或 duplicate diagnostic

## REMOVED Requirements

### Requirement: jscpd Rust engine integration boundary
**Reason**: Rust 产品路径退役后，jscpd Rust API 不再是产品实现边界。

**Migration**: 无。该 requirement 随 Rust 产品删除；上方 jscpd requirement 来自现有 TypeScript/Bun 质量脚本。
