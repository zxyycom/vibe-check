本 delta 让 structural fixtures 同时证明逐文件 TypeScript 翻译与 Python-free 产品运行。

## ADDED Requirements

### Requirement: Structural scanner characterization fixtures
Checked-in fixture suite SHALL 为 Lizard-compatible TypeScript function-metrics module 提供 deterministic regression、normalization 和正式入口 proof targets。Fixtures MUST 覆盖 TypeScript、Go、Rust 和 Python，并证明 supported function forms、source ranges、stable names、kind、NLOC、cyclomatic complexity、token count、parameter semantics、diagnostics 和 deterministic ordering。

每个 translated upstream test MUST 能追溯到 Lizard 1.23.0 的 source/test 文件。迁移期 differential tests MUST 对相同 checked-in source 比较 Python/Lizard 与 TypeScript port；required validation MUST 只运行 TypeScript port 和 checked-in expectations。

#### Scenario: 每个翻译文件有对应测试
- **WHEN** reviewer 检查 source map 中的一个 TypeScript port 文件
- **THEN** test mapping 指向对应 upstream tests 或明确的 product fixture
- **AND** 测试覆盖该文件承担的核心行为

#### Scenario: 四种语言具有 function-metrics proof targets
- **WHEN** component contract tests 读取 structural fixtures
- **THEN** fixtures 包含 TypeScript、Go、Rust 和 Python 的 supported functions 或 methods
- **AND** tests 验证 name、range、NLOC、CCN、token 和 parameter results

#### Scenario: Python/Lizard 与 TypeScript port 结果一致
- **WHEN** 固定 Python/Lizard 1.23.0 和 TypeScript port 分析同一 corpus
- **THEN** function inventory、raw fields 和 ordering 没有未解释差异
- **AND** normalized FunctionMetric 满足同一 structural-scanning contract

#### Scenario: 正式 entry 不启动 Python
- **WHEN** fixture-backed acceptance 通过默认 entry 扫描四语言项目
- **THEN** scan 直接使用仓库内 TypeScript function-metrics module
- **AND** dependency 与 process evidence 表明没有解析或启动 Python/Lizard
