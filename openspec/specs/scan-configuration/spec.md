# scan-configuration Specification

## Purpose
TBD - created by archiving change add-explicit-scan-config. Update Purpose after archive.
## Requirements
### Requirement: Explicit scan configuration selection

Product CLI SHALL 接受单值 `--config <file>`。相对 config path MUST 基于 normalized project root 按平台原生规则解析，绝对路径 MUST 保持绝对。未指定 `--config` 时，scan MUST 使用当前 `DEFAULT_CONFIG`，并且 MUST NOT 自动发现或搜索配置文件。

#### Scenario: Relative configuration uses project root

- **WHEN** 调用者从 project root 外启动正式入口，并传入显式 project root 与
  `--config vibe-check.config.json`
- **THEN** Product CLI 读取 normalized project root 下的 `vibe-check.config.json`
- **AND** 更换 process launch cwd 不改变配置定位

#### Scenario: Explicit external configuration path is preserved

- **WHEN** 调用者传入绝对 config path 或包含 `..` 的相对 config path
- **THEN** CLI 按 normalized project root 与平台原生 path resolution 读取指定文件
- **AND** CLI 不搜索或替换该配置

#### Scenario: Omitted configuration preserves current behavior

- **WHEN** 调用者未传入 `--config`
- **THEN** scan 使用当前 `DEFAULT_CONFIG`
- **AND** CLI 不搜索 project root、父目录或启动 cwd 中的配置文件

### Requirement: Configuration JSON matches complete QualityConfig

显式配置 MUST 是 UTF-8 JSON object，并完整提供当前 `QualityConfig` 的 `version`、`include`、`excludeDirs`、`generatedFiles`、`codeAreas`、`lizard`、`scc`、`jscpd`、`acceptedWarnings`、`report`、`artifactDir`、`cacheDir` 与 `tools` fields。Parser MUST 拒绝 missing、unknown 或 invalid fields，并 MUST 直接返回对应这些输入值的新 typed config；parser MUST NOT 增加 envelope、重命名字段、补默认值或执行 partial merge。

#### Scenario: Complete configuration is accepted unchanged

- **WHEN** JSON object 完整满足当前 `QualityConfig` structure
- **THEN** parser 返回字段值与输入一致的新 `QualityConfig`
- **AND** scan core 只接收该 typed config

#### Scenario: Incomplete or invalid configuration is rejected

- **WHEN** JSON 缺少 required field、包含 unknown field 或任一 nested value 类型 /
  取值无效
- **THEN** parser 立即失败
- **AND** parser 不从 `DEFAULT_CONFIG` 补齐或修正该对象

#### Scenario: Tool settings remain part of the complete config

- **WHEN** valid explicit config 声明 `tools` command 与 args
- **THEN** 本次 scan 使用该 config 中的 tool settings
- **AND** loader 不用 `VIBE_CHECK_*` environment values 重写它们

### Requirement: Explicit configuration replaces defaults

指定 `--config` 时，该完整 config SHALL 整体替换 `DEFAULT_CONFIG`，且 MUST NOT 与 built-in values、environment values 或其它文件合并。Current、baseline 与 fallback collection MUST 使用同一个 parsed config。现有显式 CLI options 保持最高优先级：`--top-n` MUST 覆盖 `config.report.topN`，`--artifact-dir` MUST 覆盖 `config.artifactDir`；未显式提供时 MUST 使用 selected config 中的值。

#### Scenario: Explicit config is authoritative

- **WHEN** valid explicit config 的任意 fields 与 `DEFAULT_CONFIG` 不同
- **THEN** 本次 scan 使用 explicit config fields
- **AND** built-in config 不参与该 scan

#### Scenario: Explicit CLI option overrides its config field

- **WHEN** 调用者同时传入 valid config 与显式 `--top-n` 或 `--artifact-dir`
- **THEN** 本次运行使用显式 CLI value
- **AND** 其它 fields 保持来自 selected config

#### Scenario: Current and baseline share one config

- **WHEN** explicit-config scan 执行 current 与 baseline measurement
- **THEN** 两个 revision 使用 invocation 开始时读取的同一个 parsed config
- **AND** baseline revision 不重新加载另一份配置

### Requirement: Configuration parse failure stops the scan

Config owner SHALL 在调用 `runQualityScan` 前完成 file read、UTF-8、JSON-object 与完整 `QualityConfig` parsing。文件不存在、不可读或任一 parse failure MUST 立即抛出包含 resolved config path 的 config error；Product CLI MUST 将错误写入 stderr、退出 `3`，且 MUST NOT 回退到 `DEFAULT_CONFIG`、启动 scanner / baseline 或创建成功 scan artifacts。

#### Scenario: Configuration file cannot be read

- **WHEN** 指定配置不存在、不是 regular file 或不可读
- **THEN** CLI 直接报告 config path 与 read error
- **AND** scan 不启动并退出 `3`

#### Scenario: Configuration content cannot be parsed

- **WHEN** 配置不是 valid UTF-8 JSON object 或不满足完整 `QualityConfig`
- **THEN** CLI 直接报告 config parse error
- **AND** scan 不创建 artifacts、不回退默认配置并退出 `3`
