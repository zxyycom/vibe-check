## ADDED Requirements

### Requirement: Function metrics backend boundary
Structural scanning SHALL 使用现有 product config 解析的 Python/Lizard function-metrics component。Adapter MUST 将 process protocol、CSV output 和 component-private data 限制在 adapter boundary 内，并向 product core 返回 Vibe Check-owned `FunctionMetric` records 或 normalized failure。

#### Scenario: Python/Lizard result 被归一化
- **WHEN** configured Python/Lizard component 扫描 supported input
- **THEN** product core 只接收 Vibe Check-owned `FunctionMetric` records
- **AND** product core 不依赖 Lizard CSV record structure

#### Scenario: Component protocol 不是 stable contract
- **WHEN** adapter 保存 Lizard process 或 CSV material 以复现 scanner behavior
- **THEN** raw material 只作为 scanner artifact 使用
- **AND** raw material 不成为 stable product output field

## MODIFIED Requirements

### Requirement: Structural scanner adapter input
Product core SHALL 从 Vibe Check normalized scan scope 运行 structural scanning。function-metrics adapter MUST 只接收已收集的 supported files，MUST NOT 扫描 project root、被 scan scope rules 排除的文件或 pinned TypeScript selector 判定为 unsupported 的文件。首次产品化的 structural inputs MUST 只包含 TypeScript `.ts` 和 Rust `.rs`；`.d.ts` MUST 按 TypeScript supported input 处理。

#### Scenario: 接收 exact supported file paths
- **WHEN** scan scope 包含 supported files `src/app.ts` 和 `src/lib.rs`
- **THEN** function-metrics adapter 接收这两个 exact supported file paths
- **AND** adapter 不通过 project root 重新发现输入

#### Scenario: 不接收 unsupported 或 excluded files
- **WHEN** scan scope 包含 supported file `src/app.ts`、unsupported ordinary files `src/view.tsx` 和 `src/main.go`，且 `generated/schema.ts` 已被 scope rules 排除
- **THEN** function-metrics adapter 只接收 `src/app.ts`
- **AND** `src/view.tsx`、`src/main.go` 与 `generated/schema.ts` 不进入 structural scanner input

#### Scenario: 没有 supported files 时正常完成
- **WHEN** normalized scan scope 不包含 supported files
- **THEN** function-metrics adapter 不启动 Python/Lizard process
- **AND** scan 正常完成且 function metrics 为空

## REMOVED Requirements

### Requirement: ast-grep Rust integration boundary
**Reason**: Rust 产品路径退役后，`ast-grep-core` / `ast-grep-language` Rust API 不再是产品实现边界。

**Migration**: 无。该 requirement 随 Rust 产品删除；上方 Python/Lizard requirement 来自现有 TypeScript/Bun 质量脚本。

### Requirement: Normalized stable-named function metrics
**Reason**: 该 requirement 固定 ast-grep Rust adapter 的 function kind、binding inventory 和 source-range model，不属于现有 TypeScript/Lizard parser contract。

**Migration**: 无。现有 TypeScript `FunctionMetric` shape 与 parser behavior 随 pinned source 原样上移。

### Requirement: Cross-language parameter count semantics
**Reason**: 该 requirement 固定 ast-grep 的四语言 receiver、parameter slot 和 grammar mapping，不是 Python/Lizard component 的现有行为来源。

**Migration**: 无。上移不把 Rust grammar semantics 移植到 TypeScript 产品。

### Requirement: Structural result ordering remains deterministic
**Reason**: 该 requirement 固定 ast-grep source column、kind 和 display-name ordering；现有 TypeScript core 使用自己的 Lizard normalization 与 ordering。

**Migration**: 无。迁移保持 pinned TypeScript ordering，不采用 Rust adapter ordering contract。

### Requirement: Structural scanner diagnostics
**Reason**: 该 requirement 定义 ast-grep parse-tree partial diagnostics、Rust invariants 和 Rust CLI exit behavior，不是现有 TypeScript/Lizard failure contract。

**Migration**: 无。现有 TypeScript fatal issue、console、artifact 和 status behavior 随 pinned source 原样上移。
