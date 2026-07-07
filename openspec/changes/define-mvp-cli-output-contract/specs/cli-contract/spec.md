本 delta spec 定义 MVP CLI 契约。

## ADDED Requirements

### Requirement: MVP scan command
`vibe-check` CLI SHALL 暴露 `vibe-check scan [project-root]` 作为 MVP scan 入口；当省略 `project-root` 时，CLI MUST 在传递给 core 前把当前工作目录归一化为 project root。

#### Scenario: Scan current working directory
- **WHEN** 用户在项目目录运行 `vibe-check scan`
- **THEN** CLI 将当前工作目录归一化为 project root，并用该 root 调用 scan pipeline

#### Scenario: Scan explicit project root
- **WHEN** 用户运行 `vibe-check scan path/to/project`
- **THEN** CLI 在调用 scan pipeline 前将 `path/to/project` 归一化为 project root

### Requirement: MVP output mode option
`vibe-check scan` 命令 SHALL 接受 `--format human` 和 `--format json`，默认值 SHALL 为 `human`，并且 MUST 在不改变 scan、aggregate、warning 或 gate 语义的前提下把输出模式传递给 output layer。

#### Scenario: Human output is default
- **WHEN** 用户运行 `vibe-check scan`
- **THEN** CLI 向 output layer 请求 human output

#### Scenario: JSON output is selected
- **WHEN** 用户运行 `vibe-check scan --format json`
- **THEN** CLI 向 output layer 请求 JSON output

#### Scenario: Unsupported output format
- **WHEN** 用户运行 `vibe-check scan --format xml`
- **THEN** CLI 报告 user input error，且不启动 scanner execution

### Requirement: Configuration entry option
`vibe-check scan` 命令 SHALL 定义 `--config <path>` 作为显式配置入口。`--config <path>` 表示本次 invocation 使用指定配置文件；未传 `--config` 时，配置发现和默认配置语义由 Config owner 定义。

#### Scenario: Explicit config path
- **WHEN** 用户运行 `vibe-check scan --config vibe-check.toml`
- **THEN** CLI 归一化 config path，并把它放入 core scan request

#### Scenario: Default config handling is delegated
- **WHEN** 用户运行 `vibe-check scan` 且没有提供 `--config`
- **THEN** CLI 不设置显式 config path，并把配置发现交给 Config owner 处理

### Requirement: CLI owner documentation
CLI 契约 SHALL 拥有长期 owner 文档，该文档 MUST 记录 MVP command surface、配置入口、路径归一化、输出模式、stdout/stderr 边界和退出码映射，并被 `docs/navigation.md` 引用。

#### Scenario: Navigation points to CLI owner
- **WHEN** reviewer 从 `docs/navigation.md` 查找 CLI 行为规则
- **THEN** 导航文档指向包含 MVP CLI 契约的 owner 文档

### Requirement: Exit code mapping
CLI SHALL 将顶层 outcome 映射到稳定退出码：`0` 表示扫描完成且 gate 通过，`1` 表示扫描完成但 gate 失败，`2` 表示用户输入或配置错误，`3` 表示 scanner fatal error，`4` 表示 output projection 或写入失败。

#### Scenario: Gate failure remains distinct
- **WHEN** scan 完成，但由于产生 blocking warnings 导致 gate 失败
- **THEN** CLI 以退出码 `1` 退出

#### Scenario: Invalid invocation remains distinct
- **WHEN** 用户提供无效 CLI arguments
- **THEN** CLI 以退出码 `2` 退出

#### Scenario: Scanner fatal remains distinct
- **WHEN** scanner execution 在 report 完成前发生 fatal failure
- **THEN** CLI 以退出码 `3` 退出

#### Scenario: Output failure remains distinct
- **WHEN** report data 已存在，但请求的输出无法投影或写入
- **THEN** CLI 以退出码 `4` 退出

### Requirement: Standard stream boundaries
CLI SHALL 将请求的人读或机器报告输出写入 stdout，并将顶层 diagnostics、usage errors、scanner fatal errors 和 output errors 写入 stderr。

#### Scenario: Machine output is clean
- **WHEN** 用户运行 `vibe-check scan --format json`
- **THEN** stdout 只包含 JSON report，stderr 包含 report envelope 之外的 diagnostics

#### Scenario: Input error is diagnostic output
- **WHEN** 用户提供无效 CLI arguments
- **THEN** CLI 将 error diagnostic 写入 stderr，且不向 stdout 写入 scan report
