# cli-contract Specification

## Purpose
TBD - created by archiving change define-mvp-cli-output-contract. Update Purpose after archive.
## Requirements
### Requirement: CLI owner documentation

CLI 契约 SHALL 拥有长期 owner 文档，该文档 MUST 记录正式入口 `bun run product:cli -- scan [project-root]`、project-root 归一化、TypeScript scan flags、console / artifact 边界、进程状态映射和 dogfood wrapper 的单向调用关系，并被 `docs/navigation.md` 引用。Product CLI SHALL 提供 `--profile`、`--baseline`、`--with-baseline`、`--changed-files`、`--config`、`--top-n`、`--artifact-dir`、`--skip-baseline`、`--verification-output` 与 `--help`。相对 `--changed-files` list path 与相对 `--config` path MUST 使用 normalized project root 基准；其余既有 parser 语义保持不变。CLI MUST NOT 增加 `--format` 或 `--version`。

#### Scenario: Navigation exposes the current CLI surface

- **WHEN** reviewer 从 `docs/navigation.md` 查找 CLI behavior
- **THEN** navigation 指向记录正式入口、scan flags、config selection、console /
  artifact boundary、status mapping 与 dogfood wrapper direction 的 owner 文档

#### Scenario: Existing flags retain parser semantics

- **WHEN** 调用者通过正式入口传入既有 TypeScript scan flag
- **THEN** CLI 将该 flag 交给同一 product parser
- **AND** 相对 `--changed-files` list path 继续使用 normalized project root
- **AND** CLI 不增加 `--format` 或 `--version`

#### Scenario: Help documents complete configuration input

- **WHEN** 调用者运行 `scan --help`
- **THEN** help 列出 `--config <file>`、相对路径的 project-root 基准和 omitted behavior
- **AND** help 说明配置必须是完整 JSON config，不声称存在自动发现或 merge

### Requirement: Exit code mapping
CLI SHALL 保持 pinned TypeScript consumer 的进程状态映射：core 返回 `passed` 或 `warning` 时退出 `0`；core 返回 `failed` 或发生普通未处理顶层 error 时退出 `2`；现有顶层 mapping 识别 `ENOENT` 或 config-related error 时退出 `3`。CLI MUST NOT 引入 Rust blocking-gate exit `1` 或 output-failure exit `4`。

#### Scenario: Passed and warning outcomes remain successful
- **WHEN** scan core 返回 `passed` 或 `warning`
- **THEN** CLI 以退出码 `0` 退出

#### Scenario: Failed outcome and ordinary top-level error use exit two
- **WHEN** scan core 返回 `failed`，或发生不匹配现有特殊 mapping 的未处理顶层 error
- **THEN** CLI 以退出码 `2` 退出

#### Scenario: Existing missing-file or config error mapping uses exit three
- **WHEN** 未处理顶层 error 匹配 pinned consumer 的 `ENOENT` 或 config-related error mapping
- **THEN** CLI 以退出码 `3` 退出

### Requirement: Standard stream boundaries
CLI SHALL 将 banner、profile、scan progress、artifact paths、summary、warning preview 和 completion status 等既有 operational console text 写入 stdout，并将 normalized fatal details 与未处理顶层 errors 写入 stderr。机器和人读报告 SHALL 继续由既有 artifacts 交付，而不是成为 stdout mode；scanner process 的原生 stdout/stderr MUST NOT 直接成为产品 console contract。

#### Scenario: Successful scan keeps operational console on stdout
- **WHEN** scan 正常完成并写出 report artifacts
- **THEN** stdout 包含 pinned consumer 的进度、artifact、summary、warning preview 和 completion text
- **AND** stdout 不被转换成 Rust human 或 JSON report mode

#### Scenario: Fatal details and top-level errors use stderr
- **WHEN** core 报告 normalized fatal issue 或 CLI 捕获未处理顶层 error
- **THEN** fatal detail 或 top-level error 写入 stderr
- **AND** scanner process 的原生 stream 不被直接转发为 stable product output

### Requirement: Changed-files 列表路径基于 project root
CLI SHALL 基于 normalized project root 和平台原生 path resolution 解析相对 `--changed-files` 列表文件路径，包括 `.` / `..` segments，且 MUST NOT 限制解析结果位于 project root 内。绝对列表文件路径 MUST 保持绝对；Product parser、正式入口和 dogfood wrapper MUST 透传同一个选项值，不得增加其它 rebasing 基准。列表中的 entries MUST 继续作为 normalized project root 下的 project paths 解释，而不是相对于列表文件解释。读取失败 MUST 保持 `failed to read --changed-files` error boundary；missing list 的 `ENOENT` MUST 使用既有 exit `3` mapping，其它普通 read error MUST 使用既有 exit `2` mapping。

#### Scenario: 相对列表路径不依赖启动目录
- **WHEN** 调用者从 project root 外启动正式入口，传入显式 project root 和相对
  `--changed-files inputs/changed.txt`
- **THEN** CLI 读取 normalized project root 下的 `inputs/changed.txt`
- **AND** 更换 process launch cwd 不改变该列表文件的定位基准

#### Scenario: 绝对列表路径与 project-path entries 保持边界
- **WHEN** 调用者传入位于 project root 外的绝对或 `..` relative
  `--changed-files` 列表文件路径，且文件包含 project-relative entries
- **THEN** CLI 基于上述 path contract 读取列表文件，不施加 project-root containment
- **AND** entries 继续作为 normalized project root 下的 project paths 交给 scan scope

#### Scenario: Dogfood wrapper 不引入第二套路径基准
- **WHEN** 调用者通过 dogfood wrapper 传入相对 `--changed-files` 列表文件路径
- **THEN** wrapper 将原始选项值与显式 Vibe Check project root 交给 Product CLI
- **AND** 列表路径仍只基于 normalized project root 解析

#### Scenario: 相对列表文件缺失
- **WHEN** normalized project root 下的相对 `--changed-files` 列表文件不存在
- **THEN** CLI 在 stderr 报告包含 `failed to read --changed-files` 的 fatal error
- **AND** top-level error 保留 `ENOENT` 分类并退出 `3`

#### Scenario: 普通列表读取失败
- **WHEN** `--changed-files` 列表读取发生不匹配 `ENOENT` 或 config mapping 的普通 error
- **THEN** CLI 在 stderr 报告包含 `failed to read --changed-files` 的 fatal error
- **AND** CLI 使用既有 ordinary top-level error mapping 退出 `2`

