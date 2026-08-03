## ADDED Requirements

### Requirement: Every project scan has one selected complete config

Scan scope SHALL 只消费 Product Config 已选择并解析的一份 complete config。Core MUST NOT
读取 built-in dogfood values、发现 config files、解析 scanner dependency，或按 selection
source 改变 include/exclude semantics。

#### Scenario: Explicit and tool-directory configs share scope behavior

- **WHEN** 相同 complete config 内容分别通过 explicit path 与 tool-directory discovery 选择
- **THEN** 两次 scan 产生相同 normalized scope、code areas 与 scanner exact inputs
- **AND** source 只影响 config diagnostics 与 console provenance

#### Scenario: Dogfood config is explicit

- **WHEN** repository `quality:*` wrapper 启动 Product CLI
- **THEN** 它传入 repository root 与 `--config .vibe-check/config.json`
- **AND** scan scope 通过同一 selected-config path 消费 parsed config
