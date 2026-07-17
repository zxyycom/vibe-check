## MODIFIED Requirements

### Requirement: CLI owner documentation
CLI 契约 SHALL 拥有长期 owner 文档，该文档 MUST 记录正式入口 `bun run product:cli -- scan [project-root]`、project-root 归一化、pinned TypeScript scan flags、console/artifact 边界、进程状态映射和 dogfood wrapper 的单向调用关系，并被 `docs/navigation.md` 引用。首次产品化的 scan flags SHALL 保持 `--profile`、`--baseline`、`--with-baseline`、`--changed-files`、`--top-n`、`--artifact-dir`、`--skip-baseline`、`--verification-output` 和 `--help` 的现有语义，MUST NOT 增加 `--format`、`--config` 或 `--version`。

#### Scenario: Navigation points to TypeScript product CLI owner
- **WHEN** reviewer 从 `docs/navigation.md` 查找 CLI 行为规则
- **THEN** 导航文档指向记录正式 TypeScript 产品入口、现有 scan flags、console/artifact 边界、状态映射和 dogfood wrapper 方向的 owner 文档

#### Scenario: Existing flags retain pinned parser semantics
- **WHEN** 调用者通过正式入口传入现有 TypeScript scan flag
- **THEN** CLI 将该 flag 交给上移后的同一 parser
- **AND** 源码归位不增加 `--format`、`--config` 或 `--version`

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

## REMOVED Requirements

### Requirement: MVP scan command
**Reason**: 该 requirement 绑定即将删除的 Rust `vibe-check scan` command；正式 TypeScript 产品入口已由 `product-runtime` capability 定义。

**Migration**: 调用 `bun run product:cli -- scan [project-root]`；省略 project root 时继续使用启动 cwd。

### Requirement: MVP output mode option
**Reason**: `--format human|json` 属于 Rust stdout renderer，不是 pinned TypeScript consumer 的现有 flag 或 output boundary。

**Migration**: 继续消费 `metrics.json`、`report.md`、warnings NDJSON 和 raw artifacts；本 change 不增加 output mode flag。

### Requirement: Configuration entry option
**Reason**: `--config <path>` 属于 Rust CLI contract；pinned TypeScript consumer 绑定现有 product config，并没有该 CLI entry。

**Migration**: 保持上移后的默认 product config 和现有 scan flags；配置重做留给后续独立 change。
