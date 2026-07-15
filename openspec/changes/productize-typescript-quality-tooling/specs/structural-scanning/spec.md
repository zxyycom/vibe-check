本 delta 把函数结构扫描从固定 Rust ast-grep 实现改为 TS/Bun 产品管理的版本化 function-metrics backend；本文只在本 change 下形成待审计临时计划，不影响现有其它文档或主规范。

## ADDED Requirements

### Requirement: Function metrics backend boundary
Structural scanning SHALL 由内建 `function-metrics` backend capability 提供。第一版 production profile MUST 使用随包 Lizard 与 bundled Python runtime；adapter MUST 把 Lizard output 归一化为 Vibe Check-owned metrics。Rust sidecar MAY 作为独立 experimental profile 运行，但 MUST NOT 在没有显式 profile 变更和 fixture 证据时替换 production backend。

#### Scenario: 第一版函数指标扫描
- **WHEN** production profile 扫描 TypeScript、Go、Rust 或 Python supported input
- **THEN** product core 调用便携目录中的 Lizard/Python backend
- **AND**只消费 Vibe Check-owned normalized function metrics

#### Scenario: Sidecar spike 不改变生产结果
- **WHEN** Rust function-metrics sidecar spike 与 production scan 并行比较
- **THEN** sidecar result 记录在实验验证材料中
- **AND**production profile、baseline 和正式 artifact 仍使用 Lizard backend

## MODIFIED Requirements

### Requirement: Structural scanner adapter input
Product core SHALL 从 Vibe Check normalized scan scope 运行 structural scanning。function-metrics adapter MUST 只接收已收集的 supported files，MUST NOT 扫描 project root、被 scan scope rules 排除的文件或 product control plane 判定为 unsupported 的文件。第一版 structural inputs MUST 只包含 TypeScript `.ts`、Go `.go`、Rust `.rs` 和 Python `.py`；`.d.ts` MUST 按 TypeScript supported input 处理。

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

### Requirement: Normalized stable-named function metrics
Function-metrics backend results SHALL 在 warning generation 前归一化为 Vibe Check-owned `FunctionMetric` records。每条 record MUST 至少包含 project-root-relative `/` path、stable lowercase language、stable function identity or display name、source location、function NLOC、cyclomatic complexity 和 normalized parameter count。Backend 私有字段 MAY 保留在 raw diagnostic artifact，但 MUST NOT 成为 Core metric contract。

第一版 production semantic profile MUST 明确 TypeScript、Go、Rust 和 Python 的 supported function forms、exclusions、position mapping 和三个 metric 的计算规则；同一 profile 对相同输入 MUST 产生确定性结果。

#### Scenario: 四种 supported language 产生 normalized metrics
- **WHEN** TypeScript、Go、Rust 和 Python fixtures 分别包含 production profile 支持的 function forms
- **THEN** adapter 返回包含 normalized path、language、identity/location、NLOC、cyclomatic complexity 和 parameter count 的 `FunctionMetric`

#### Scenario: Backend 私有字段被隔离
- **WHEN** Lizard 或 experimental sidecar 返回其原生 function record
- **THEN** adapter 只把已批准的 normalized fields交给 product core
- **AND**backend 私有结构不进入 warning/gate owner

#### Scenario: Profile 排除的函数形态
- **WHEN** supported source 包含 production semantic profile 明确排除的 declaration 或 anonymous form
- **THEN** adapter 不为该 form 产生 normalized function metric
- **AND**排除行为由 profile fixtures 证明

### Requirement: Cross-language parameter count semantics
`FunctionMetric.parameter_count` SHALL 按当前 function-metrics semantic profile 的明文规则归一化。Profile MUST 声明 receiver、static method、default/optional、destructured、rest/variadic 和 compound parameter forms 的计数方式；第一版 production profile 在这些规则写入 owner 文档并由四语言 fixtures 证明前 MUST NOT 发布。

#### Scenario: 同一 profile 的参数计数稳定
- **WHEN** 同一四语言 parameter fixture 使用相同 semantic profile 重复扫描
- **THEN** normalized parameter count 保持一致

#### Scenario: 参数语义变化创建新 profile
- **WHEN** receiver 或 compound parameter 的计数规则发生不兼容变化
- **THEN** function-metrics capability 使用新的 semantic profile identity
- **AND**旧 baseline/cache 不被视为等价结果

#### Scenario: Production profile 有完整证明
- **WHEN** 第一版 Lizard production profile 进入 release acceptance
- **THEN** fixtures 明确证明四种语言中已支持 parameter forms 的 normalized count

## REMOVED Requirements

### Requirement: ast-grep Rust integration boundary
**Reason**: 正式 structural scanning 不再固定绑定 Rust `ast-grep-core` / `ast-grep-language`；产品采用实现语言无关的 function-metrics backend，第一版 production backend 为 Lizard + bundled Python。

**Migration**: 将现有 ast-grep adapter 仅作为 Rust sidecar spike 的可复用实现材料；product core 改为消费新的 backend-neutral `FunctionMetric` contract 和 semantic profile。
