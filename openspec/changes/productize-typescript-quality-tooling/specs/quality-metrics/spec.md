本 delta 将现有 TypeScript quality engine 的完整 metrics、baseline/cache、warning、accepted-warning、gate 和 report-data pipeline 确立为正式产品实现，并继续使用 scc、Lizard/Python 与 jscpd 的既有 normalized model。

## ADDED Requirements

### Requirement: Existing TypeScript engine owns the complete quality pipeline
Vibe Check 的 TS product core SHALL 继续拥有现有 quality engine 已实现的 scan planning 之后全部业务行为：file/function/duplicate metrics、code-area aggregation、baseline/cache comparison、warning generation、accepted-warning handling、gate calculation 和 report/artifact data construction。Scanner adapters MUST 只返回 normalized observations、provenance 或 failures；不得独立定义 product policy。

#### Scenario: 固定 scanner results 进入现有 pipeline
- **WHEN** scc、Lizard/Python 与 jscpd 完成扫描
- **THEN** adapters 返回 Vibe Check-owned normalized observations
- **AND** TS product core 使用现有 aggregation、baseline、warning、accepted-warning、gate 和 report pipeline 处理结果

#### Scenario: Product source migration 保持行为
- **WHEN** 同一 config、inputs 和 normalized scanner outputs 分别由产品化基线与迁入后实现执行
- **THEN** code-area aggregates、warning channels、accepted reasons、gate status 和 artifacts 满足同一产品化前回归基线

### Requirement: Fixed scanner metrics remain product-owned models
Product core SHALL 继续使用现有 TS model 表达固定检测栈的结果：scc 产生 file metrics 与 language aggregates；Lizard/Python 产生 function NLOC、cyclomatic complexity、parameter count、name 和 source range；jscpd 产生 duplicate fragments、locations、line/token counts 与 code-area association。Component-native rows、CSV/JSON reporter shape 和 command output MUST 停留在 adapter/raw diagnostic boundary。

#### Scenario: Lizard metrics 进入统一模型
- **WHEN** configured Lizard 为 supported function 返回 NLOC、CCN、parameter count、name 和 range
- **THEN** adapter 将它们映射为 Vibe Check-owned `FunctionMetric`
- **AND** product core 不消费 Lizard CSV row type

#### Scenario: jscpd findings 进入统一模型
- **WHEN** configured jscpd 报告 duplicate fragment
- **THEN** adapter 将 fragment 与 locations 映射为 Vibe Check-owned duplicate model
- **AND** product warning/gate logic 不解析 jscpd reporter JSON

### Requirement: Existing baseline and cache behavior is retained
TS product core SHALL 保留现有 current/baseline scan、fingerprint、baseline materialization、cache identity、comparison status 和 trend calculation behavior。Cache identity MUST 包含 result-affecting scanner、product config 和 scan input identity；baseline comparison MUST 只比较这些 identities 与 input semantics 兼容的 observations。

#### Scenario: 相同 scanner identity 可以比较 baseline
- **WHEN** current 与 baseline scans 使用兼容 scanner identity、config 和 input semantics
- **THEN** product core 复用现有 comparison/trend pipeline

#### Scenario: Scanner identity 变化阻止错误比较
- **WHEN** component、固定参数、parser 或 normalization 变化使旧 observations 不再兼容
- **THEN** product core 不把旧 cached result 或 baseline observations 当成等价数据
- **AND** comparison state 记录明确的不兼容原因或 diagnostic

### Requirement: Existing warning accepted-warning and gate behavior is retained
TS product core SHALL 保留现有 threshold、absolute/delta comparison、warning channel、accepted-warning matching、verification status 和 gate calculation behavior。Repository-specific thresholds、code-area policy 和 accepted-warning records SHALL 通过 typed consumer config 提供；output projection MAY 按 output owner 映射 rule identity 和字段，但 MUST NOT 在 scanner adapter 中重新计算 policy。

#### Scenario: Accepted warning 仍由 product core 处理
- **WHEN** normalized finding 匹配 consumer config 中具有 reason 的 accepted-warning record
- **THEN** product core 在 warning data 中保留 accepted reason
- **AND** verification status 使用现有 accepted-warning semantics

#### Scenario: Scanner component 不决定 gate
- **WHEN** 任一固定 scanner 返回 metric 或 duplicate finding
- **THEN** product core 根据 typed config 生成 warning 与 gate status
- **AND** scc、Lizard/Python 或 jscpd exit/output 不直接决定 product gate
