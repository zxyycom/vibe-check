## ADDED Requirements

### Requirement: Configuration workflow command

Product CLI SHALL 将 `scan [project-root]` 与 `init [project-root]` 路由为独立 operation。Root、scan
与 init help SHALL 共同呈现一条 workflow：ungated default observation、explicit/fixed config
selection、file-backed gate policy 与 safe initialization。Init execution SHALL 只执行 root
validation、config/schema generation、exclusive file creation 与 CLI result mapping。`init` SHALL
接受零或一个 project-root positional，以及 `--help`；省略 project root 时使用 startup cwd，显式
relative root 基于 startup cwd 解析。

#### Scenario: Root help exposes both operations

- **WHEN** 调用者运行 root `--help`
- **THEN** help 列出 `scan [project-root]` 与 `init [project-root]`
- **AND** 每个 operation 均说明自己的用途

#### Scenario: Scan help explains configuration selection

- **WHEN** 调用者运行 `scan --help`
- **THEN** help 说明 explicit `--config`、fixed `.vibe-check/config.json` discovery 和 neutral
  default observation
- **AND** help 说明任一 gate 使用 complete file-backed config

#### Scenario: Init help explains generated state

- **WHEN** 调用者运行 `init --help`
- **THEN** help 标明 generated config/schema paths 和 complete-default materialization
- **AND** help 说明 existing-directory reuse 和 target-file preservation

#### Scenario: Init remains a configuration operation

- **WHEN** init 成功或返回 handled failure
- **THEN** CLI 只执行 initialization responsibility，并返回对应 success/handled-failure result
- **AND** success 输出两个 created paths 与 discovery-ready state

#### Scenario: Configuration workflow failures use exit three

- **WHEN** gated scan 缺少 file-backed policy、selected config validation 失败，或 init 未形成
  complete file set
- **THEN** CLI 向 stderr 写入 operation/path/reason diagnostic 并退出 `3`
- **AND** diagnostic 提供可执行的 config recovery path
