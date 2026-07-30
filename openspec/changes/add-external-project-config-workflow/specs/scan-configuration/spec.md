## MODIFIED Requirements

### Requirement: Explicit scan configuration selection

Product CLI SHALL 接受一个 `--config <file>`。相对 config path MUST 基于 normalized
project root 按平台原生语义解析，绝对路径 MUST 保持绝对。省略 `--config` 时，scan SHALL
只检查 `<project-root>/vibe-check.config.json`，MUST NOT 搜索 parent、launch cwd、
worktree root 或 home。显式 config MUST 优先于 discovery。两种来源都不存在时，CLI MUST
在 scan work 前失败，且 MUST NOT 使用 Vibe Check repository fallback。

#### Scenario: Relative explicit configuration uses project root

- **WHEN** 调用者从 project root 外启动并传入
  `--config config/custom.json`
- **THEN** CLI 读取 `<project-root>/config/custom.json`
- **AND** 更换 launch cwd 不改变定位

#### Scenario: Absolute or parent-segment explicit path is preserved

- **WHEN** 调用者传入 absolute path 或包含 `..` 的 relative path
- **THEN** CLI 沿用 existing project-root path resolution，不替换为 discovery
- **AND** discovery file 不参与

#### Scenario: Omitted flag discovers one root file

- **WHEN** 省略 `--config` 且 project root 包含 `vibe-check.config.json`
- **THEN** CLI 只读取并验证该文件一次
- **AND** 不查询 parent、launch-cwd、worktree 或 home config

#### Scenario: Explicit config wins over discovered config

- **WHEN** discovery file 与显式 `--config` 同时存在
- **THEN** 只有显式 file 提供 persisted config values
- **AND** 两个 files 不 merge

#### Scenario: Missing project config fails before scan

- **WHEN** explicit 与 discovery config 都不存在
- **THEN** CLI 退出 `3` 并提示 `init [project-root]` 和 `--config <file>`
- **AND** banner、scanner、baseline、cache 与成功 artifacts 均不存在

### Requirement: Explicit configuration replaces defaults

Selected explicit 或 discovered file SHALL 提供一份完整 `QualityConfig` 并替换 built-in
config values。Product Config MAY 随后只应用仍存在于该 config revision 的受支持
`VIBE_CHECK_*` tool command/args overrides。既有显式 CLI precedence 保持：
`--top-n` 覆盖 `config.report.topN`，`--artifact-dir` 覆盖
`config.artifactDir`。其它 environment variable、built-in value 或 file MUST NOT merge
进 selected config。Current、baseline 与 fallback collection MUST 接收同一 resolved value。

#### Scenario: Selected file supplies the complete config

- **WHEN** 选择有效 explicit 或 discovered config
- **THEN** 除 `--top-n` / `--artifact-dir` 外，每个 non-tool field 都来自该 file
- **AND** missing fields 不从 built-in config 补齐

#### Scenario: Declared tool overrides have closed precedence

- **WHEN** 存在受支持的 `VIBE_CHECK_*` tool overrides
- **THEN** Product Config 在 file parsing 后应用它们并记录 applied names
- **AND** unrelated environment values 不能改变 config

#### Scenario: CLI report options remain highest priority

- **WHEN** selected config 与 CLI 同时提供 top-N 或 artifact directory
- **THEN** 显式 CLI values 胜出
- **AND** current、baseline 与 fallback 仍共享一份 resolved config

## ADDED Requirements

### Requirement: Project configuration initialization

Product CLI SHALL 提供非交互 `init [project-root]`。它 MUST 以 exclusive create 在
`<project-root>/vibe-check.config.json` 写出 deterministic UTF-8 完整
`QualityConfig`。Starter MUST repository-neutral 且能通过 current complete-config
parser。Initializer MUST NOT 扫描、检测项目语言、联网、修改 package scripts 或覆盖任何
已有 path。

#### Scenario: Initialize a new project config

- **WHEN** normalized project root 是 writable directory 且 discovery path 不存在
- **THEN** `init` exclusive create deterministic valid starter
- **AND** 打印 created path 与精确下一步 scan command 后 exit `0`

#### Scenario: Existing path is preserved

- **WHEN** discovery path 已存在或在并发中先被创建
- **THEN** exclusive creation 失败且不替换它
- **AND** existing bytes 保持不变

#### Scenario: Generated config is repository-neutral

- **WHEN** reviewer 或 acceptance 解析 generated config
- **THEN** 它包含 neutral 且内部一致的 scope/area/report/artifact/tool values
- **AND** 不含 Vibe Check-specific globs/text 或 source-checkout absolute paths

### Requirement: Selected configuration context

Product Config SHALL 创建一个 internal selection context，包含 resolved complete config、
source（`explicit` 或 `discovered`）、normalized absolute path、config version 与 applied
declared tool override names。Console SHALL 在 dependency preflight 前显示该 context。Scan
scope、current、baseline 与 fallback MUST 复用同一 resolved config，且 MUST NOT 按 source
分支。本 requirement SHALL NOT 给 stable machine DTO 增加 config source/path fields。

#### Scenario: Runtime reports discovered config

- **WHEN** scan 使用 root discovery file
- **THEN** preflight console 标明 `discovered`、normalized path、version 与 applied
  override names
- **AND** 后续阶段不再搜索或加载 config

#### Scenario: Runtime reports explicit config

- **WHEN** scan 使用 `--config`
- **THEN** preflight console 标明 `explicit` 与 selected normalized path
- **AND** discovery path 不进入 selection context

#### Scenario: Machine projection stays independent

- **WHEN** runtime context 已包含 selection source/path
- **THEN** scan 只把它用于 config diagnostics 与 console provenance
- **AND** 未经显式 output-contract change 不进入 machine v1
