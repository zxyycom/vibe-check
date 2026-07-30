## ADDED Requirements

### Requirement: Configuration workflow command

Product CLI SHALL 把 `init [project-root]` 与 `scan [project-root]` 路由到独立 owner。Root、
`scan` 和 `init` help SHALL 说明 fixed discovery file、显式 `--config` precedence、
missing-config failure 与 exclusive initialization。`init` MUST NOT 调用 scan core。

#### Scenario: Init help explains safe creation

- **WHEN** 调用者运行 `init --help`
- **THEN** help 标明 normalized project root 与
  `<project-root>/vibe-check.config.json`
- **AND** help 说明命令非交互且永不覆盖

#### Scenario: Scan help explains config selection

- **WHEN** 调用者运行 `scan --help`
- **THEN** help 说明 explicit path、root-only discovery、declared tool overrides 与
  missing-config recovery
- **AND** help 不声称存在 built-in fallback、parent discovery 或 implicit file merge

#### Scenario: Init stays outside the scan pipeline

- **WHEN** `init` 成功或失败
- **THEN** Product CLI 只执行 root validation 与 config file creation/error mapping
- **AND** banner、tool availability、collection、baseline、cache 与 artifacts 不启动
