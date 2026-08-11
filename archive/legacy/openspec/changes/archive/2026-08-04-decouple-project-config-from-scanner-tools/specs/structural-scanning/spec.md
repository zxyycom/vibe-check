## MODIFIED Requirements

### Requirement: Structural scanner adapter input

Product core SHALL 从 Vibe Check normalized scan scope 运行 structural scanning。Function-metrics adapter MUST 只接收已收集的 supported files，MUST NOT 扫描 project root、被 scan scope rules 排除的文件或 pinned selector 判定为 unsupported 的文件。Current structural inputs MUST 只包含 TypeScript `.ts` 和 Rust `.rs`；`.d.ts` MUST 按 TypeScript supported input 处理。

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
- **THEN** function-metrics capability 不检查 availability 或启动 internal backend
- **AND** capability result 为 `no-input`，且 function metrics 为空

### Requirement: Function metrics backend boundary

Structural scanning SHALL 从 Product-owned scanner dependency snapshot 接收 function-metrics backend execution settings；project config MUST 只提供 `checks.functions` quality semantics，不得选择 backend、executable 或 args。Adapter MUST 将 availability、process protocol、private output 和 component-private data 限制在 adapter boundary 内，并向 product core 返回 Vibe Check-owned `FunctionMetric` records 或 normalized failure。

#### Scenario: Python/Lizard result 被归一化

- **WHEN** resolved internal function-metrics backend 扫描 supported exact input
- **THEN** product core 只接收 Vibe Check-owned `FunctionMetric` records 或 normalized capability failure
- **AND** product core 和 semantic config 不依赖 backend-private record structure

#### Scenario: Component protocol 不是 stable contract

- **WHEN** adapter 保存 process 或 parser material 以复现 backend behavior
- **THEN** raw material 只作为 scanner artifact 使用
- **AND** raw material 不成为 semantic project config 或 stable product output field

#### Scenario: Function thresholds survive backend replacement

- **WHEN** internal function-metrics backend 被 compatible implementation 替换
- **THEN** `checks.functions` 的 complexity、code-line 与 parameter thresholds 继续驱动相同 Vibe Check warning semantics
- **AND** project config 不发生 backend-name 或 executable migration
