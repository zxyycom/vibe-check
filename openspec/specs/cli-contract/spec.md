# cli-contract Specification

## Purpose
定义正式 Product CLI 的 operation、project-root 与参数语义、scan planning、console /
artifact 通道、process outcome 到 exit code 的映射，以及 dogfood wrapper 的单向调用边界。
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

Product core SHALL 向 CLI 返回独立 process outcome：core outcome 为 `passed` / `warning` 且 gate 为 `disabled` 或 `passed` 时返回 `success`；core outcome 非 `failed`、gate 为 evaluated `failed` 且 artifacts 写出并通过 output validation 时返回 `gate-failed`；请求的 gate 为 `not-evaluated`，或发生 completeness、runtime、artifact write、output validation failure 时返回 `failed`。CLI MUST 将 `success`、`gate-failed`、`failed` 分别映射为 exit `0`、`1`、`2`；未返回 core outcome 的普通 top-level error MUST 退出 `2`，现有 `ENOENT`、config-related 与 CLI usage mappings MUST 退出 `3`。Output failure MUST 优先于已计算的 gate status，且 CLI MUST NOT 引入 exit `4`。

#### Scenario: Disabled or passed gate uses exit zero

- **WHEN** core/output 成功，且 gate result 为 `disabled` 或 `passed`
- **THEN** CLI 以退出码 `0` 退出

#### Scenario: Blocking warnings use exit one

- **WHEN** artifacts 已写出并验证，且 evaluated gate result 为 `failed`
- **THEN** CLI 以退出码 `1` 退出
- **AND** quality status 可以继续为 `warning`

#### Scenario: Requested gate without evidence uses exit two

- **WHEN** 请求的 gate 产生 `not-evaluated`
- **THEN** CLI 以退出码 `2` 退出

#### Scenario: Runtime or output failure uses exit two

- **WHEN** 发生 completeness、runtime、artifact write 或 output validation failure
- **THEN** CLI 以退出码 `2` 退出
- **AND** failure 不被分类为 evaluated gate failure

#### Scenario: Ordinary top-level error uses exit two

- **WHEN** 未处理顶层 error 不匹配现有特殊 mapping
- **THEN** CLI 以退出码 `2` 退出

#### Scenario: Input, config and CLI usage errors use exit three

- **WHEN** 未处理顶层 error 匹配 `ENOENT`、config-related 或 CLI usage mapping
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

### Requirement: Gate policy selection

Product CLI `scan` SHALL 接受至多一个 `--gate <all|changed|regressions>`；省略 option 时 MUST 传递 disabled gate request 并保持 warning 非阻断。`GatePolicy` type、合法 values 与 help text MUST 从 product-owned policy descriptor 派生；help MUST 记录每个 policy 的 warning scope、accepted warning 的非阻断行为以及 exit `1` / `2` 语义。缺失值、重复 option 或 unknown value MUST 在 scanner 和 artifacts 启动前作为 CLI usage error 退出 `3`。Normalized request MUST 传给 product core；launch cwd、config 与 `--verification-output` MUST NOT 选择或覆盖 policy。

#### Scenario: Omitted gate disables enforcement

- **WHEN** 调用者运行 `scan` 且未传入 `--gate`
- **THEN** CLI 传递 disabled gate request
- **AND** warning 或 empty quality result 不因 gate 产生非零 exit

#### Scenario: Invalid gate fails before scanner startup

- **WHEN** 调用者传入缺失值、重复 option 或 unknown `--gate` value
- **THEN** CLI 在 stderr 报告 option、合法值与修复方式，并退出 `3`
- **AND** 不启动 scanner 或创建 scan artifacts

#### Scenario: Verification output does not select policy

- **WHEN** 调用者组合 `--verification-output` 与任一 gate policy
- **THEN** CLI 保持 normalized policy 不变
- **AND** `--verification-output` 只改变人读 warning preview

### Requirement: Gate prerequisite planning

Product CLI SHALL 根据 policy descriptor 归一化 scan plan：`all` 只评价 resolved profile 的 `warnings.all`，MUST NOT 改变 profile capability selection 或 baseline selection；`changed` / `regressions` MUST 使用 full profile 并启用 baseline comparison，省略显式 baseline option 时 MUST 使用 auto-detection，显式 `--baseline <sha>` 时 MUST 使用指定 commit。Comparison policy 与 quick profile 或显式 `--skip-baseline` 的组合 MUST 在 scanner 和 artifacts 启动前作为 usage error 退出 `3`。

#### Scenario: All gate preserves the selected profile

- **WHEN** 调用者在 quick 或 full profile 传入 `--gate all`
- **THEN** CLI 保持已有 profile capabilities 与 baseline selection
- **AND** gate 只覆盖该 resolved profile 产出的 warnings

#### Scenario: Comparison gate enables baseline in full profile

- **WHEN** 调用者在 full profile 传入 `--gate changed` 或 `--gate regressions`，且没有显式 baseline option
- **THEN** CLI 启用 baseline auto-detection
- **AND** 调用者不需要同时传入 `--with-baseline`

#### Scenario: Impossible comparison plan fails before scanner startup

- **WHEN** 调用者把 comparison gate 与 quick profile 或显式 `--skip-baseline` 组合
- **THEN** CLI 在 stderr 报告 comparison prerequisite 与可用修复方式，并退出 `3`
- **AND** 不启动 scanner 或创建 scan artifacts

### Requirement: Configuration workflow command

Product CLI SHALL 将 `scan [project-root]` 与 `init [project-root]` 路由为独立 operation。Root、scan
与 init help SHALL 共同呈现一条 workflow：ungated default observation、explicit/fixed config
selection、file-backed gate policy 与 safe initialization。Init execution SHALL 只执行 root
validation、config/schema generation、target ensure 与 CLI result mapping。`init` SHALL
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

#### Scenario: Init help explains ensured state

- **WHEN** 调用者运行 `init --help`
- **THEN** help 标明 config/schema paths 和 missing-file complete-default materialization
- **AND** help 说明 existing-directory reuse、existing-file preservation 和 missing-file fill

#### Scenario: Init remains a configuration operation

- **WHEN** init 成功或返回 handled failure
- **THEN** CLI 只执行 initialization responsibility，并返回对应 success/handled-failure result
- **AND** 首次或重复 success 都输出两个 target paths 与 discovery-ready state

#### Scenario: Configuration workflow failures use exit three

- **WHEN** gated scan 缺少 file-backed policy、selected config validation 失败，或 init 未确保
  safe target set
- **THEN** CLI 向 stderr 写入 operation/path/reason diagnostic 并退出 `3`
- **AND** diagnostic 提供可执行的 config recovery path
