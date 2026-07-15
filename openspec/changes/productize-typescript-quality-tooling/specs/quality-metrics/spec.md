本 delta 确立现有 TS quality engine 对产品 metrics pipeline 和 backend-neutral function metrics 的所有权；本文只在本 change 下形成待审计临时计划，不影响现有其它文档或主规范。

## ADDED Requirements

### Requirement: TypeScript quality engine owns the product metrics pipeline
Vibe Check 的 TypeScript product core SHALL 拥有 normalized scanner results 之后的 metrics aggregation、baseline/cache comparison、warning generation、accepted-warning handling、gate calculation 和 report data construction。Scanner backend 与现有 Rust CLI MUST NOT 独立定义这些产品 policy。

#### Scenario: Backend 只返回测量结果
- **WHEN** LOC、duplicate 或 function-metrics backend 完成扫描
- **THEN** backend 返回 Vibe Check-owned normalized observations 或 diagnostics
- **AND**TS product core 生成 warnings、gate 和 report data

### Requirement: Function metric dimensions
Product core SHALL 接收 backend-neutral normalized function metrics，第一版维度 MUST 包含 function NLOC、cyclomatic complexity 和 parameter count，以及定位和稳定 identity 所需的 path、language、name/location metadata。每个维度的正式语义 MUST 归属于当前 function-metrics semantic profile，而不是 backend 原生输出格式。

#### Scenario: Lizard metrics 进入统一模型
- **WHEN** Lizard production backend 为 supported function 返回 NLOC、cyclomatic complexity 和 parameter count
- **THEN** adapter 把三个维度映射到 Vibe Check-owned function metric
- **AND**product core 不消费 Lizard 私有 record type

#### Scenario: Experimental sidecar 使用相同边界
- **WHEN** Rust sidecar spike 扫描同一 fixture
- **THEN** sidecar adapter 也生成同一 Vibe Check-owned function metric shape
- **AND**差异通过 semantic profile 和 comparison evidence 表达

### Requirement: Metric behavior follows semantic profile identity
Baseline、cache、warning comparison 和 artifact metadata SHALL 能识别产生 metric 的 semantic profile。不同 profile 的 function metrics MUST NOT 在没有显式兼容规则时作为同一语义序列比较。

#### Scenario: Function backend profile 改变
- **WHEN** scan 从 Lizard production profile 切换到语义不等价的 Rust sidecar profile
- **THEN** product core 不复用旧 profile 的等价 cache result
- **AND**baseline comparison 明确识别 profile difference
