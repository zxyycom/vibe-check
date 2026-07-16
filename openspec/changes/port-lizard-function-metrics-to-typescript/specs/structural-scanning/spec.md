本 delta 保持现有四语言 FunctionMetric 契约，只把 structural backend 从 Python/Lizard 进程改为仓库内 TypeScript 模块。

## MODIFIED Requirements

### Requirement: Function metrics backend boundary
Structural scanning SHALL 由当前 Vibe Check revision 中固定的 Lizard-compatible TypeScript function-metrics 模块提供。Adapter MUST 读取 normalized scan scope 中的 supported files，直接调用内部 typed API，并把结果归一化为 Vibe Check-owned metrics、provenance、diagnostics 或 failure。

Lizard-compatible model、tokenizer 和 state-machine types MUST 停留在 adapter boundary 内。正式扫描 MUST NOT 解析或执行 Python/Lizard component 或 CSV protocol。

#### Scenario: Product function metrics scan
- **WHEN** 固定 component 扫描 TypeScript、Go、Rust 或 Python supported input
- **THEN** product core 通过 adapter 调用当前 revision 的 TypeScript function-metrics module
- **AND** 只消费 normalized FunctionMetric 与 diagnostics

#### Scenario: Function metrics 记录组件 provenance
- **WHEN** TypeScript port 成功产生 normalized function metrics
- **THEN** result batch 记录 Lizard upstream revision、TypeScript port revision 和 normalization identity
- **AND** baseline、cache、warning、gate 与 report 使用该 normalized result

#### Scenario: 外部 Python/Lizard 不参与扫描
- **WHEN** 环境安装了不同版本的 Python/Lizard，或未安装 Python/Lizard
- **THEN** function-metrics result 仍由同一仓库内 TypeScript source 决定
- **AND** PATH 与 Python environment 不改变结果

### Requirement: Structural scanner diagnostics
Structural scanner problems SHALL 显式可见。单文件不存在、不是 regular file、不可读、不是 UTF-8，或 TypeScript port 返回能可靠归因到单文件的 parse/measurement failure 时，adapter MUST 跳过该文件的全部 function metrics，并产生 warning-severity STRUCTURAL_SCAN_PARTIAL diagnostic；scan report MUST 标记为 partial。

TypeScript module identity 或初始化失败、未声明 exception、supported language mapping 缺失、project root 外 path、无效 source range、state-machine 或 normalization invariant failure MUST 映射为 scanner fatal error，MUST NOT 转换成 empty structural result。

#### Scenario: 单文件 measurement error 产生 partial report
- **WHEN** TypeScript port 把 parse 或 measurement failure 可靠归因到一个 supported file
- **THEN** adapter 不返回该文件的 function metrics
- **AND** report 包含该文件的 STRUCTURAL_SCAN_PARTIAL diagnostic 并标记为 partial

#### Scenario: 所有 structural inputs 都发生文件级问题
- **WHEN** 每个 structural input 都因可归因的读取、UTF-8、parse 或 measurement 问题被跳过
- **THEN** scan 返回带 diagnostics 的 partial report
- **AND** structural failure 不表现为 clean completed report

#### Scenario: TypeScript module result 无法信任时 fatal
- **WHEN** module identity、初始化、language mapping、path、range、state-machine 或 normalization invariant 失效
- **THEN** CLI 以 scanner fatal exit code 3 退出
- **AND** stdout 不包含 human 或 JSON scan report
