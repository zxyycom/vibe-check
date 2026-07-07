本 delta spec 定义 MVP 输出契约。

## ADDED Requirements

### Requirement: Shared report data projection
Output layer SHALL 从 core 产出的同一份 report data 投影 human output 和 JSON output，并且 MUST NOT 独立重新计算 scanner metrics、warnings 或 gate result。CI 集成默认消费 JSON output；未来存在 CI summary 或 annotation 时，它们 SHALL 只是同一 report data 的展示投影。

#### Scenario: Output modes preserve semantics
- **WHEN** 同一次已完成 scan 被渲染为 human output 和 JSON output
- **THEN** 两种输出表达同一份 scope、warnings、diagnostics 和 gate result

### Requirement: JSON envelope
JSON output SHALL 是单一 JSON object，并包含稳定顶层字段 `schema_version`、`tool`、`run`、`scope`、`summary`、`metrics`、`warnings`、`gate` 和 `diagnostics`。Owner schema MUST 定义这些字段的类型、必填性和合法枚举值。

#### Scenario: JSON envelope is complete
- **WHEN** 已完成 scan 使用 `--format json` 渲染
- **THEN** stdout 包含具有所有必需顶层 envelope 字段的 JSON object

#### Scenario: Scanner-private output is excluded
- **WHEN** scanner adapters 提供 raw output 或 private diagnostics
- **THEN** JSON output 只包含归一化 `diagnostics`，而不是第三方原生 report structures 或未进入 schema 的 adapter 私有引用

#### Scenario: Schema defines field contracts
- **WHEN** reviewer 检查 JSON output schema
- **THEN** schema 定义每个 MVP envelope 字段的类型、必填性和合法枚举值

### Requirement: Human output sections
Human output SHALL 包含 summary、gate result、warning findings、report data 中存在时的 accepted 或 suppressed warnings，以及 report data 中存在时的 scanner diagnostics。

#### Scenario: Passing scan is readable
- **WHEN** 已完成 scan 没有 blocking warnings
- **THEN** human output 包含 summary 和 passing gate result

#### Scenario: Warning findings are visible
- **WHEN** 已完成 scan 产生 warnings
- **THEN** human output 按 file、location、severity 和 rule 等信息组织 warning findings，足以支持本地 review

### Requirement: Empty-state output
Output layer SHALL 对扫描文件数为零、warnings 为零或 supported scanner findings 为零的已完成 scan 渲染明确 empty state，而不是静默省略相关 section。

#### Scenario: No files in scope
- **WHEN** scan 以空 scan scope 完成
- **THEN** human output 和 JSON output 都表明扫描文件数为零

#### Scenario: No warnings
- **WHEN** scan 完成且没有 warnings
- **THEN** human output 和 JSON output 都表明没有产生 warnings

### Requirement: Schema and examples
JSON output SHALL 拥有 owner schema 和代表性 examples，用于验证 MVP envelope、passing report、gate-failing report、empty-scope report 和 diagnostic report。

#### Scenario: Schema validates examples
- **WHEN** 验证流程检查 JSON output examples
- **THEN** 每个 JSON output example 都能通过 owner schema 校验

#### Scenario: Example coverage includes failure categories
- **WHEN** 实现添加 output contract examples
- **THEN** examples 至少包含一个 gate-failing report 和一个 diagnostic report

### Requirement: Output owner documentation
Output 契约 SHALL 拥有长期 owner 文档，该文档 MUST 记录 human output section、JSON envelope、CI 消费边界、schema/example owner、empty-state 行为和格式校验边界，并被 `docs/navigation.md` 引用。

#### Scenario: Navigation points to output owner
- **WHEN** reviewer 从 `docs/navigation.md` 查找输出规则
- **THEN** 导航文档指向包含 MVP 输出契约的 owner 文档

### Requirement: Schema identity and validation boundary
JSON output validation SHALL 由 `schema_version`、owner schema 和 examples 共同证明。MVP JSON output MUST 使用 `vibe-check.report.v1`，且 MUST NOT 输出未在 owner schema 中声明的字段。`schema_version` 只标识当前 JSON 格式和校验材料。

#### Scenario: Current schema version validates against owner schema
- **WHEN** reviewer 检查 `vibe-check.report.v1` JSON output
- **THEN** output 只包含 owner schema 声明的字段，并能通过 owner schema 校验

#### Scenario: Contract shape change updates validation materials
- **WHEN** 需要改变 envelope 字段集合、必填性、字段含义、合法枚举，或暴露新的 scanner/adapter 私有引用
- **THEN** 该变更必须作为后续 change 同步更新 `schema_version`、owner schema、examples、Output owner 文档和测试
