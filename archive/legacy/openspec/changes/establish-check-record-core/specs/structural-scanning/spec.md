> **核心句：**本 delta 让 structural scanner 只作为 `function-metrics` CheckRunner 的私有 dependency，公共结果由 Check 与 Record contract 表达。

## MODIFIED Requirements

### Requirement: Structural scanner adapter input

Product core SHALL 从 normalized scan scope 为 `function-metrics` built-in check 构造 supported exact inputs。Adapter MUST 只接收已收集的 supported files，MUST NOT 扫描 project root、被 scope rules 排除的文件或 selector 判定为 unsupported 的文件。Current structural inputs MUST 只包含 TypeScript `.ts` 和 Rust `.rs`；`.d.ts` MUST 按 TypeScript supported input 处理。

没有 supported files 时，resolved check invocation MUST 不检查 availability 或启动 backend，并完成为 zero coverage、`CheckResult.verdict = not-applicable`；不得用 execution failure 或 empty record set 隐式表达该状态。

#### Scenario: 接收 exact supported file paths

- **WHEN**scan scope 包含 supported `src/app.ts` 和 `src/lib.rs` 以及 unsupported files
- **THEN**function-metrics invocation 只接收两个 supported exact paths
- **AND**adapter 不通过 project root 重新发现输入

#### Scenario: 不接收 unsupported 或 excluded files

- **WHEN**scope 同时包含 supported `.ts`/`.rs`、unsupported ordinary files 与 excluded generated file
- **THEN**function-metrics invocation 只接收 supported 且未排除的 exact paths
- **AND**unsupported/excluded paths 不能由 adapter 重新加入

#### Scenario: 没有 supported files 时正常完成

- **WHEN**normalized scan scope 不包含 supported files
- **THEN**function-metrics CheckRun completed 且 result 为 not-applicable
- **AND**Product 不检查 availability、启动 backend 或合成 record

### Requirement: Function metrics backend boundary

Structural scanning SHALL 从 Product-owned dependency snapshot 接收 function backend settings；project semantic settings 不得选择 backend、executable 或 args。Adapter MUST 把 availability、process protocol、private output 和 component-private data 限制在 adapter boundary，并只向 `function-metrics` runner 返回 Vibe Check-owned measurement data 或 typed execution failure。Runner SHALL 据此产生 CheckResult 和 catalog-valid QualityRecords；adapter 不得直接创建 public CheckRun、record、gate 或 output。

#### Scenario: Python/Lizard result 被归一化

- **WHEN**resolved backend 扫描 supported exact input
- **THEN**runner 只消费 Vibe Check-owned FunctionMetric data 或 typed failure
- **AND**Core、public records 和 semantic settings 不依赖 backend-private structure

#### Scenario: Component protocol 不是 stable contract

- **WHEN**adapter 保存 process、parser 或 raw reproduction material
- **THEN**这些材料保持 scanner-private
- **AND**不进入 CheckDefinition、QualityRecord 或 semantic project input

#### Scenario: Function thresholds survive backend replacement

- **WHEN**internal backend 被 compatible implementation 替换
- **THEN**existing function semantic settings 继续驱动相同 CheckResult 与 record semantics
- **AND**project input 不发生 backend-name 或 executable migration
