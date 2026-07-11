## MODIFIED Requirements

### Requirement: MVP output mode option
`vibe-check scan` 命令 SHALL 接受显式 `--format human` 和 `--format json`。显式 `--format` MUST 作为最高优先级 CLI configuration source；省略该 flag 时，CLI MUST 消费 Config owner 从 environment、显式 config 或 static default 解析出的 output format，且无其它来源时默认值 SHALL 为 `human`。CLI MUST 在不改变 scan、aggregate、warning 或 gate 语义的前提下把 resolved output mode 传递给 output layer。

#### Scenario: Human output is default
- **WHEN** 用户运行 `vibe-check scan` 且没有 environment 或显式 config output format
- **THEN** CLI 向 output layer 请求 human output

#### Scenario: JSON output is selected
- **WHEN** 用户运行 `vibe-check scan --format json`
- **THEN** CLI 向 output layer 请求 JSON output

#### Scenario: Explicit CLI output format overrides lower sources
- **WHEN** environment 或显式 config 提供 output format 且用户显式传入 `--format human`
- **THEN** CLI 向 output layer 请求 human output

#### Scenario: Unsupported output format
- **WHEN** 用户运行 `vibe-check scan --format xml`
- **THEN** CLI 报告 user input error，且不启动 scanner execution

### Requirement: Configuration entry option
`vibe-check scan` 命令 SHALL 定义 `--config <path>` 作为显式 JSON 配置入口。CLI MUST 基于启动 cwd 归一化该 file path，并在启动 scanner execution 前把它交给 Config owner 加载、严格校验和 resolution；`--config` 本身 MUST 保持 bootstrap option，不作为可由 config/env 覆盖的 field。未传 `--config` 时，CLI MUST 不设置显式 config path，且 Config owner 在本 capability 中 MUST 不执行隐式 config discovery。

#### Scenario: Explicit config path
- **WHEN** 用户运行 `vibe-check scan --config vibe-check.json`
- **THEN** CLI 归一化 config path，Config owner 在 scanner execution 前加载该文件，把 resolved config 保留在 scan pipeline context，并只把既有 config path 元数据放入 `ScanRequest`

#### Scenario: Invalid explicit config is rejected before scan
- **WHEN** 显式 config path 不可访问、不是文件或其内容无法通过 Config owner 校验
- **THEN** CLI 返回 user/config error，且不启动 scanner execution

#### Scenario: Default config handling is delegated
- **WHEN** 用户运行 `vibe-check scan` 且没有提供 `--config`
- **THEN** CLI 不设置显式 config path，并让 Config owner 在没有 file source 的情况下解析 environment、CLI 和 static default

### Requirement: Exit code mapping
CLI SHALL 将顶层 outcome 映射到稳定退出码：`0` 表示扫描完成且 gate 通过，`1` 表示扫描完成但 gate 失败，`2` 表示 CLI、路径、配置加载、配置 validation 或 configuration resolution 错误，`3` 表示 scanner fatal error，`4` 表示 output projection 或写入失败。

#### Scenario: Gate failure remains distinct
- **WHEN** scan 完成，但由于产生 blocking warnings 导致 gate 失败
- **THEN** CLI 以退出码 `1` 退出

#### Scenario: Invalid invocation remains distinct
- **WHEN** 用户提供无效 CLI arguments
- **THEN** CLI 以退出码 `2` 退出

#### Scenario: Invalid configuration remains distinct
- **WHEN** 显式 JSON、environment value 或 configuration resolution 无效
- **THEN** CLI 在 scanner execution 前以退出码 `2` 退出

#### Scenario: Scanner fatal remains distinct
- **WHEN** scanner execution 在 report 完成前发生 fatal failure
- **THEN** CLI 以退出码 `3` 退出

#### Scenario: Output failure remains distinct
- **WHEN** report data 已存在，但请求的输出无法投影或写入
- **THEN** CLI 以退出码 `4` 退出

### Requirement: Standard stream boundaries
CLI SHALL 将请求的人读或机器报告输出写入 stdout，并将顶层 diagnostics、usage errors、configuration errors、scanner fatal errors 和 output errors 写入 stderr。任何在 scanner execution 前发生的 CLI/configuration failure MUST 保持 stdout 为空。

#### Scenario: Machine output is clean
- **WHEN** resolved output format 为 `json` 且 scan 成功完成
- **THEN** stdout 只包含 JSON report，stderr 包含 report envelope 之外的 diagnostics

#### Scenario: Input error is diagnostic output
- **WHEN** 用户提供无效 CLI arguments
- **THEN** CLI 将 error diagnostic 写入 stderr，且不向 stdout 写入 scan report

#### Scenario: Configuration error is diagnostic output
- **WHEN** configuration loading、validation 或 resolution 失败
- **THEN** CLI 将 configuration diagnostic 写入 stderr，stdout 为空

## ADDED Requirements

### Requirement: Meta commands bypass configuration resolution
Root help、scan help 和 version SHALL 在不加载 config file、不读取 configuration environment source且不启动 scan pipeline 的情况下成功退出 `0`。它们的输出不承诺 scan report shape，但 MUST 保持 command/flag discoverability；Clap 生成的 wording、ordering、default annotation 和 possible-values annotation 不属于稳定 contract。

#### Scenario: Help succeeds despite invalid configuration environment
- **WHEN** `VIBE_CHECK_FORMAT` 无效且用户运行 `vibe-check --help` 或 `vibe-check scan --help`
- **THEN** CLI 输出相应 help、退出 `0`，且不加载或 resolve configuration；scan help 继续展示 `--format` 与 `--config`

#### Scenario: Version succeeds despite invalid configuration environment
- **WHEN** `VIBE_CHECK_FORMAT` 无效且用户运行 `vibe-check --version`
- **THEN** CLI 输出 version、退出 `0`，且不加载或 resolve configuration
