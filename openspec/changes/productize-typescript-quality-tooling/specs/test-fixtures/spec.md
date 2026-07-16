本 delta 将 duplicate 与 structural fixtures 的 owner 调整为现有 jscpd 与 Lizard/Python pipeline，使其承担产品化回归、组件协议与归一化证明和正式入口验收。

## MODIFIED Requirements

### Requirement: Fixture proof targets
Each checked-in project fixture environment SHALL have documented proof targets used by tests. Fixture environments MAY contain multiple file-level or function-level test cases. Proof targets MUST focus on owner-defined behavior such as 产品化回归、JSON schema validation、file collection/classification、measured language presence or absence、warning/gate status、diagnostics status、fixed scanner protocol 和 normalization conformance；fixtures MUST NOT be treated as a separate source of product semantics or human-readable rendering behavior.

Exact metric values MAY be asserted only when the owning product requirement or fixed scanner/config contract defines the corresponding calculation and expected value. Other fixture tests MUST NOT use checked-in metadata to invent exact LOC、function 或 aggregate metric contracts。

#### Scenario: Tests assert owner-defined behavior
- **WHEN** a CLI or scanner contract test scans a checked-in project fixture
- **THEN** the test asserts documented proof targets that trace back to 产品化前回归基线、CLI、scan scope、quality metrics、scanner contract 或 JSON schema/output-contract behavior

#### Scenario: Tests avoid unrelated full snapshots
- **WHEN** a fixture scan produces JSON output
- **THEN** tests validate the JSON schema and selected stable proof targets instead of comparing a full snapshot unrelated to the owner contract

#### Scenario: Exact metric expectation has an owner
- **WHEN** a conformance test asserts exact NLOC、cyclomatic complexity、parameter count 或 duplicate finding values
- **THEN** each exact expectation traces to an owning requirement or fixed scanner/config contract
- **AND** fixture metadata does not define a conflicting calculation rule

### Requirement: Duplicate code fixture coverage
Checked-in project fixture suite SHALL 为 jscpd product component 提供 deterministic regression、protocol、normalization、threshold 和 entry proof targets。Duplicate-code fixtures MUST 手写、提交到仓库、无需 language package installation 即可运行，并且默认只覆盖 product scan scope 的 supported inputs；只有测试明确证明 unsupported 或 excluded inputs 时才例外。

#### Scenario: Cross-file duplicate fixture 存在
- **WHEN** product contract test 需要验证跨文件 duplicate detection
- **THEN** fixture suite 包含至少两个 checked-in supported source files，并带有达到或超过内置默认 threshold 的 intentional duplicate fragment

#### Scenario: Same-file duplicate fixture 存在
- **WHEN** jscpd adapter test 需要验证 same-file duplicate normalization
- **THEN** fixture suite 包含一个 checked-in supported source file，并带有两个 intentional duplicate spans

#### Scenario: 默认 threshold 边界可验证
- **WHEN** adapter tests 验证内置 `50` token / `5` line-span profile
- **THEN** fixture suite 同时包含达到默认 threshold 和分别低于 token / line threshold 的 checked-in source fragments

#### Scenario: Excluded duplicate fixture 不产生 warning
- **WHEN** duplicate-looking code 只存在于 generated、vendor、cache、target 或 ignored fixture paths 下
- **THEN** fixture-backed tests 证明这些 paths 不进入 jscpd input，也不产生 duplicate-code warnings

#### Scenario: jscpd 产品化前后结果一致
- **WHEN** 固定 jscpd version、config、inputs 和 adapter protocol 在 source migration 前后执行
- **THEN** tests 使用同一 checked-in inputs 与 owner-defined expected findings
- **AND** normalized fragments、ordering、diagnostics 和 raw-artifact boundaries 满足同一产品化前回归基线

#### Scenario: Duplicate fixture proof targets 有文档记录
- **WHEN** duplicate-code fixture-backed tests 被新增或修改
- **THEN** 对应 test case entry 或 `@case` marker 标识 jscpd normalization、threshold 和 fixture responsibility

### Requirement: Structural scanner characterization fixtures
Checked-in fixture suite SHALL 为 Python/Lizard product component 提供 deterministic、hand-written regression、protocol、normalization 和 entry proof targets。Fixtures MUST 覆盖 TypeScript `.ts`、Go `.go`、Rust `.rs` 和 Python `.py`，并能证明 supported function forms、source ranges、stable names、kind、function NLOC、cyclomatic complexity、parameter slot semantics、receiver exclusion、diagnostics 和 deterministic ordering。

Exact normalized expectations MUST 追溯到 structural-scanning contract 与 fixed scanner/config contract；fixture metadata 只记录证明材料，不独立定义 metrics semantics。Lizard/Python version、protocol 或 normalization 变化必须重跑同一 suite。

#### Scenario: 四种语言具有 function-metrics proof targets
- **WHEN** component contract tests 读取 checked-in structural fixtures
- **THEN** fixtures 包含 TypeScript、Go、Rust 和 Python 的 supported named function / method forms
- **AND** tests 能证明每种语言的 name、kind、source range、NLOC、cyclomatic complexity 和 parameter count mapping

#### Scenario: Receiver 与复合参数具有明确 fixture
- **WHEN** Lizard adapter tests 验证跨语言 parameter count semantics
- **THEN** fixtures 包含 Go、Rust、TypeScript 和 Python receiver forms
- **AND** fixtures 包含 default、optional、destructured、rest 或 variadic parameter 的代表性输入

#### Scenario: Parameter-list comment 使用 checked-in input
- **WHEN** regression 与 adapter tests 验证 parameter-list extras
- **THEN** checked-in Go 和 TypeScript fixtures 在 parameter list 中包含 comment
- **AND** tests 证明 comment 不贡献 parameter slot，也不产生 diagnostic

#### Scenario: Parser measurement 与路径边界使用 checked-in input
- **WHEN** adapter tests 验证 syntax error、measurement failure、UTF-8 path 或 declaration-only source
- **THEN** 对应 source 与路径作为 checked-in fixture 存在
- **AND** 测试不在运行时生成、复制、追加或改写这些 scan inputs

#### Scenario: Path 与 process lexical 边界可验证
- **WHEN** product tests 验证 path normalization、cwd、structured arguments 或 executable naming
- **THEN** checked-in cases 覆盖 POSIX 与 Windows lexical paths、spaces、Unicode、quotes 和 separator forms
- **AND** assertions 验证 product-owned normalized inputs，不要求测试运行在指定操作系统

#### Scenario: Lizard/Python 产品化前后结果一致
- **WHEN** 固定 Python/Lizard version、config、inputs 和 adapter protocol 在 source migration 前后执行
- **THEN** tests 使用同一 checked-in inputs 与 normalized expectations
- **AND** metrics、ordering、diagnostics 和 raw-artifact boundaries 满足同一产品化前回归基线
