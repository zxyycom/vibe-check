This delta spec adds a read-only per-file configuration explanation operation; it is a temporary change artifact and has not passed its implementation audit.

## MODIFIED Requirements

### Requirement: Configuration workflow command

Product CLI SHALL 将 `scan [project-root]`、`init [project-root]` 与 `explain-config [project-root] <file>` 路由为独立operation。Root、scan、init与explain-config help SHALL共同呈现一条workflow：ungated default observation、explicit/fixed config selection、file-backed gate policy、safe initialization与read-onlyper-filepolicy explanation。

Init execution SHALL只执行root validation、config/schema generation、target ensure与CLI result mapping。`init` SHALL接受零或一个project-root positional以及`--help`；省略project root时使用startup cwd，显式relative root基于startup cwd解析。

`explain-config` SHALL接受一个或两个positionals以及optional `--config <file>` / `--help`：一个positional表示以startup cwd为project root的candidate file；两个positionals依次表示project root与candidate file。Candidate file MUST按normalized project root解释为project-relative path。该operation SHALL复用正式config selection、validation与file-policy resolver，但 MUST NOT启动scanner、baseline、cache或artifact work。

#### Scenario: Root help exposes all operations

- **WHEN**调用者运行root `--help`
- **THEN**help列出`scan [project-root]`、`init [project-root]`与`explain-config [project-root] <file>`
- **AND**每个operation均说明自己的用途与关键参数

#### Scenario: Scan help explains configuration selection

- **WHEN**调用者运行`scan --help`
- **THEN**help说明explicit `--config`、fixed `.vibe-check/config.json` discovery和neutral default observation
- **AND**help说明任一gate使用complete file-backed config

#### Scenario: Init help explains ensured state

- **WHEN**调用者运行`init --help`
- **THEN**help标明config/schema paths和missing-filecomplete-default materialization
- **AND**help说明existing-directory reuse、existing-file preservation和missing-file fill

#### Scenario: Explain help defines positional disambiguation

- **WHEN**调用者运行`explain-config --help`
- **THEN**help说明一个positional是startup-cwd project中的file，两个positionals是project root与file
- **AND**help说明`--config` selection、project-relativepath boundary与read-only behavior

#### Scenario: Explain command returns deterministic policy

- **WHEN**调用者为root内candidate path运行`explain-config`且selected config有效
- **THEN**stdout报告selected source、normalized path、ordered matched overrides、winning leaves与complete resolved checks，并退出`0`
- **AND**命令不启动scanner、baseline、cache或artifact work

#### Scenario: Init remains a configuration operation

- **WHEN**init成功或返回handled failure
- **THEN**CLI只执行initialization responsibility，并返回对应success/handled-failure result
- **AND**首次或重复success都输出两个target paths与discovery-ready state

#### Scenario: Configuration workflow failures use exit three

- **WHEN**gated scan缺少file-backed policy、selected config validation失败、init未确保safe target set，或explain path/arity无效
- **THEN**CLI向stderr写入operation/path/reason diagnostic并退出`3`
- **AND**diagnostic提供适用于该operation的config或argument recovery path
