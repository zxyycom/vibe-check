## ADDED Requirements

### Requirement: Configuration workflow command

Product CLI SHALL 把 `init [project-root]` 与 `scan [project-root]` 路由到独立 owner。Root、
`scan` 和 `init` help SHALL 说明 fixed tool-directory config、显式 `--config` precedence、
missing-config failure 与 non-overwriting initialization。`init` MUST NOT 调用 scan core。

#### Scenario: Root help exposes both operations

- **WHEN** 调用者运行 root help
- **THEN** help 列出 `scan [project-root]` 与 `init [project-root]`
- **AND** 不把 `init` 描述为 scan mode、project inference 或 dependency setup

#### Scenario: Init help explains safe creation

- **WHEN** 调用者运行 `init --help`
- **THEN** help 标明 normalized project root 与
  `<project-root>/.vibe-check/config.json`、同目录 `config.schema.json`
- **AND** help 说明命令非交互、对 handled failures all-or-nothing，且永不覆盖已有
  `.vibe-check`

#### Scenario: Scan help explains config selection

- **WHEN** 调用者运行 `scan --help`
- **THEN** help 说明 explicit path、`.vibe-check/config.json` tool-directory discovery、
  complete semantic config、CLI field precedence 与 missing-config recovery
- **AND** help 不声称存在 built-in fallback、parent discovery 或 implicit file merge

#### Scenario: Init stays outside the scan pipeline

- **WHEN** `init` 成功或失败
- **THEN** Product CLI 只执行 root validation 与 config file creation/error mapping
- **AND** banner、tool availability、collection、baseline、cache 与 artifacts 不启动

#### Scenario: Config workflow failures use the usage/config exit

- **WHEN** `scan` 的 config selection/loading/validation 失败，或 `init` 的 root/creation 失败
- **THEN** Product CLI 把受控 failure 写入 stderr 并退出 `3`
- **AND** diagnostic 标明 operation、normalized path 与可行动原因，且不输出 config 或
  environment value 全文
