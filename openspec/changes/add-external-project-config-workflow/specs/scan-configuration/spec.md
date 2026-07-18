本 delta 起草 external project 的 root discovery、fail-closed selection 与 initialization；当前 change 仅在 `openspec/changes/add-external-project-config-workflow/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## MODIFIED Requirements

### Requirement: Explicit scan configuration selection

Product CLI SHALL 接受单值 `--config <file>`。相对 config path MUST 基于 normalized project root 按平台原生规则解析，绝对路径 MUST 保持绝对。未指定 `--config` 时，scan SHALL 只发现 normalized project root 下的 `vibe-check.config.json`，MUST NOT 搜索父目录、启动 cwd 或用户 home。显式 config 优先于 discovered config；两者都不存在时，CLI MUST 在 scanner 启动前报告 actionable config error，MUST NOT 静默使用 Vibe Check 仓库 dogfood defaults。

#### Scenario: Relative explicit configuration uses project root

- **WHEN** 调用者从 project root 外启动正式入口，并传入显式 project root 与
  `--config config/custom.json`
- **THEN** Product CLI 读取 normalized project root 下的 `config/custom.json`
- **AND** 更换 process launch cwd 不改变配置定位

#### Scenario: Explicit external configuration path is preserved

- **WHEN** 调用者传入绝对 config path 或包含 `..` 的相对 config path
- **THEN** CLI 按 normalized project root 与平台原生 path resolution 读取指定文件
- **AND** CLI 不搜索或替换该配置

#### Scenario: Omitted flag discovers the project-root config

- **WHEN** 调用者未传入 `--config`，且 normalized project root 包含
  `vibe-check.config.json`
- **THEN** CLI 读取并校验该文件
- **AND** 不搜索 parent worktree、launch cwd 或 home 中的其它配置

#### Scenario: Explicit config wins over discovered config

- **WHEN** project root 同时存在 discovery file且调用者传入 `--config`
- **THEN** CLI 只采用显式路径指向的 config
- **AND** discovered file 不参与 merge

#### Scenario: Missing project config fails before scan

- **WHEN** 调用者未传 `--config`且 project root 没有 discovery file
- **THEN** CLI 报告 config-required error并提示 `init` 或 `--config`
- **AND** 不检查 scanner、不创建成功 artifacts、不使用 Vibe Check dogfood defaults

## ADDED Requirements

### Requirement: Project configuration initialization

Product CLI SHALL 提供非交互 `init [project-root]` operation，在 `<project-root>/vibe-check.config.json` 不存在时写出 deterministic、UTF-8、满足当前 complete `QualityConfig` schema 的 starter config。Initializer MUST NOT 扫描项目、访问网络、修改 package scripts 或覆盖已有文件。

#### Scenario: Initialize a new project config

- **WHEN** normalized project root 可写且 discovery path 不存在
- **THEN** `init` 写出可被正式 config parser 接受的 starter config
- **AND** 命令打印创建路径和下一步 scan 命令后退出 `0`

#### Scenario: Existing config is preserved

- **WHEN** discovery path 已存在
- **THEN** `init` 拒绝覆盖并报告 existing path
- **AND** 原文件内容保持不变

#### Scenario: Generated config is repository-neutral

- **WHEN** reviewer 检查 initializer output
- **THEN** config 不包含 Vibe Check 仓库专用 `src/product/**`、`scripts/**` 或 OpenSpec code areas
- **AND** tool settings 与 paths 不依赖 source checkout 的绝对位置

### Requirement: Selected configuration provenance

Selected config SHALL 记录 `explicit` 或 `discovered` source、resolved path 与 config version，并在 scanner preflight 前向 console 和 runtime metadata 暴露。Current、baseline 与 fallback collection MUST 复用 invocation 开始时加载的同一 parsed config。

#### Scenario: Runtime reports discovered config source

- **WHEN** scan 使用 project-root discovery file
- **THEN** console 和 metadata 记录 `discovered`、resolved path 与 version
- **AND** 后续阶段不重新搜索或加载 config

#### Scenario: Runtime reports explicit config source

- **WHEN** scan 使用 `--config`
- **THEN** console 和 metadata 记录 `explicit` 与 resolved path
- **AND** discovered file 不出现在 selected provenance
