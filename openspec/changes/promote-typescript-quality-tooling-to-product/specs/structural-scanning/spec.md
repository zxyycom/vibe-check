## ADDED Requirements

### Requirement: Function metrics backend boundary
Structural scanning SHALL 使用现有 product config 解析的 Python/Lizard function-metrics component。Adapter MUST 将 process protocol、CSV output 和 component-private data 限制在 adapter boundary 内，并向 product core 返回 Vibe Check-owned function metrics、diagnostics 或 normalized failure。

#### Scenario: Python/Lizard result 被归一化
- **WHEN** configured Python/Lizard component 扫描 supported input
- **THEN** product core 只接收 Vibe Check-owned normalized function metrics 与 diagnostics
- **AND** product core 不依赖 Lizard CSV record structure

#### Scenario: Component protocol 不是 stable contract
- **WHEN** adapter 保存 Lizard process 或 CSV material 以复现 scanner behavior
- **THEN** raw material 只作为 scanner artifact 使用
- **AND** raw material 不成为 stable product output field

## MODIFIED Requirements

### Requirement: Structural scanner adapter input
Product core SHALL 从 Vibe Check normalized scan scope 运行 structural scanning。function-metrics adapter MUST 只接收已收集的 supported files，MUST NOT 扫描 project root、被 scan scope rules 排除的文件或 product scan scope 判定为 unsupported 的文件。第一版 structural inputs MUST 只包含 TypeScript `.ts`、Go `.go`、Rust `.rs` 和 Python `.py`；`.d.ts` MUST 按 TypeScript supported input 处理。

#### Scenario: 接收 exact supported file paths
- **WHEN** scan scope 包含 supported files `src/app.ts` 和 `src/lib.rs`
- **THEN** function-metrics adapter 接收这两个 exact supported file paths
- **AND** adapter 不通过 project root 重新发现输入

#### Scenario: 不接收 unsupported 或 excluded files
- **WHEN** scan scope 包含 supported file `src/app.ts`、unsupported ordinary file `src/view.tsx`，且 `generated/schema.ts` 已被 scope rules 排除
- **THEN** function-metrics adapter 只接收 `src/app.ts`
- **AND** `src/view.tsx` 与 `generated/schema.ts` 不进入 structural scanner input

#### Scenario: 没有 supported files 时正常完成
- **WHEN** normalized scan scope 不包含 supported files
- **THEN** product core 跳过 function-metrics adapter
- **AND** scan 正常完成，不产生 function warning 或 structural diagnostic

## REMOVED Requirements

### Requirement: ast-grep Rust integration boundary
**Reason**: Rust 产品路径退役后，`ast-grep-core` / `ast-grep-language` Rust API 不再是产品实现边界。

**Migration**: 无。该 requirement 随 Rust 产品删除；上方 Python/Lizard requirement 来自现有 TypeScript/Bun 质量脚本。
