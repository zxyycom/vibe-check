## MODIFIED Requirements

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
