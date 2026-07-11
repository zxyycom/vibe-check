## ADDED Requirements

### Requirement: Canonical output format declaration
Config owner SHALL 使用一个 canonical field declaration 拥有 output format 的 identity、`--format` CLI locator、`VIBE_CHECK_FORMAT` environment locator、`output.format` config locator、`human|json` enum validation、`Replace` merge strategy 和 static default `human`。CLI parser、config loader、environment extractor 和 typed materialization MUST 消费同一 declaration，不得维护并行的 accepted-value 或 default schema。

#### Scenario: Canonical metadata exposes every supported source
- **WHEN** Config owner 构造 output format field definitions
- **THEN** 同一 field metadata 声明 `--format`、`VIBE_CHECK_FORMAT`、`output.format`、`human|json` 和 static default `human`

#### Scenario: Unsupported enum value is rejected by canonical validation
- **WHEN** selected source 提供 `xml` 作为 output format，且没有更高优先级合法 candidate 覆盖它
- **THEN** resolution 产生归属于 output format 与该 source locator 的 validation diagnostic，且不 materialize partial config

### Requirement: Deterministic source precedence
Config owner SHALL 按 explicit CLI > environment > explicit config file > static default 的稳定顺序解析 output format。省略的来源 MUST NOT 创建 candidate；Clap 的非 command-line default MUST NOT 被建模为 explicit CLI candidate。

#### Scenario: Static default is used without explicit sources
- **WHEN** invocation 没有 `--format`、没有 `VIBE_CHECK_FORMAT` 且没有显式 config file value
- **THEN** resolved output format 为 `human`，其 provenance 为 static default

#### Scenario: Explicit config overrides the static default
- **WHEN** 显式 JSON 配置的 `output.format` 为 `"json"` 且没有更高优先级来源
- **THEN** resolved output format 为 `json`，其 provenance 为 explicit config

#### Scenario: Environment overrides explicit config
- **WHEN** 显式 JSON 配置提供 `json` 且 `VIBE_CHECK_FORMAT` 提供 `human`
- **THEN** resolved output format 为 `human`，其 provenance 为 environment

#### Scenario: CLI overrides environment and config
- **WHEN** config 与 environment 提供任意合法值且用户显式传入 `--format json`
- **THEN** resolved output format 为 `json`，其 provenance 为 explicit CLI

### Requirement: Strict explicit JSON loading
Config owner SHALL 只加载 CLI 通过 `--config <path>` 提供的归一化文件，并 MUST 将完整内容解析为 UTF-8 JSON object。Extraction 前，metadata-derived key registry MUST 拒绝首个 unknown field 或 non-object intermediate；declared leaf 的 value kind 与 enum validation MUST 由 canonical resolver 处理。文件内容始终按 JSON 解析，不根据扩展名选择 parser。省略 `--config` 时，本 capability MUST NOT 隐式发现 cwd、project、user 或 system config file。

#### Scenario: No implicit config discovery
- **WHEN** invocation 省略 `--config`，即使 cwd 或 project root 存在 `vibe-check.json`
- **THEN** Config owner 不读取该文件，并从 environment、CLI 或 static default 解析配置

#### Scenario: Empty JSON object supplies no config candidate
- **WHEN** 显式 config file 的完整内容为 `{}`
- **THEN** Config owner 不创建 file candidate，并从 environment、CLI 或 static default 解析配置

#### Scenario: Valid declared JSON field is extracted
- **WHEN** 显式 UTF-8 JSON object 的 `output` object 包含 `"format": "json"`
- **THEN** Config owner 创建 `output.format` config candidate 并允许 resolution 继续

#### Scenario: Unknown field is a configuration error
- **WHEN** 显式 JSON object 包含未由 canonical config metadata 声明的 root 或 nested key
- **THEN** Config owner 返回包含显式文件 path、未知 field path 和 reason 的 configuration error，不静默忽略该 key

#### Scenario: Non-object intermediate is a configuration error
- **WHEN** 显式 JSON 的 `output` 不是 object
- **THEN** Config owner 返回归属于 `output` path 的 configuration error，不把 `output.format` 当作缺失值

#### Scenario: Structural error remains blocking
- **WHEN** 显式 JSON 包含 unknown key 或 non-object intermediate，且用户同时提供合法 `--format`
- **THEN** Config owner 仍返回 structural configuration error，不把 file structure 当作可覆盖 candidate

#### Scenario: Invalid file content is a configuration error
- **WHEN** 显式 config file 不可读取、不是有效 UTF-8、不是有效 JSON、为空文件或其顶层 value 不是 object
- **THEN** Config owner 返回包含显式文件 path 和失败原因的 configuration error

### Requirement: Vibe Check-owned resolved config boundary
Config owner SHALL 在 resolution 与 final validation 成功后一次性 materialize Vibe Check-owned resolved config。该 config SHALL 保留在 scan pipeline context：output format 直接交给 output dispatch，`ScanRequest` 继续只携带 project root 与 config path 元数据。Core、Scanner、Output、report data 和 machine schema MUST 只消费已验证领域值或既有 path 元数据，不得依赖 `cli-config-resolution` 类型。

#### Scenario: Successful resolution yields a typed domain value
- **WHEN** selected / contributing candidates 合法且 resolution 没有 blocking diagnostic
- **THEN** Config owner 返回包含 Vibe Check `OutputFormat` 的 resolved config，pipeline 不需要重新解析 raw string 或 dependency value

#### Scenario: Failed resolution is all-or-nothing
- **WHEN** selected candidate、final validation 或 typed materialization 失败
- **THEN** Config owner 不返回 partial resolved config，Core、Scanner 和 Output 均不接收 dependency-owned partial state

### Requirement: Configuration failures block scanner execution
JSON load/structure、selected candidate validation、resolution 或 materialization failure SHALL 在 scanner execution 前映射为 Vibe Check user/config error。CLI MUST 输出至少一条包含 source/path、field/locator 和 reason 的 diagnostic；Config owner MAY 返回首个失败，且不承诺多错误聚合、排序或精确文案。被更高优先级合法 `Replace` candidate 覆盖的 lower invalid value candidate MUST 只保留在 trace 中，不得阻塞 scanner execution。

#### Scenario: Invalid environment value blocks the scan
- **WHEN** `VIBE_CHECK_FORMAT` 包含不支持的值且没有显式 CLI override
- **THEN** invocation 返回 environment-owned configuration diagnostic，scanner execution 不启动

#### Scenario: Higher-priority valid CLI candidate overrides invalid lower candidate
- **WHEN** lower-priority config 的 declared `output.format` leaf 具有错误 value kind 或 enum value，但用户显式提供合法 `--format`
- **THEN** `Replace` resolution 选择 explicit CLI candidate，lower-priority invalid candidate 只保留在 trace 中且不阻止 materialization
