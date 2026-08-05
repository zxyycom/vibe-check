## MODIFIED Requirements

### Requirement: CLI owner documentation

CLI 契约 SHALL 拥有长期 owner 文档，该文档 MUST 记录正式入口 `bun run product:cli -- scan [project-root]`、project-root 归一化、TypeScript scan flags、console / artifact 边界、进程状态映射和 dogfood wrapper 的单向调用关系，并被 `docs/navigation.md` 引用。Product CLI SHALL 提供 `--profile`、`--baseline`、`--changed-files`、`--config`、`--top-n`、`--artifact-dir`、`--skip-baseline`、`--verification-output` 与 `--help`。相对 `--changed-files` list path 与相对 `--config` path MUST 使用 normalized project root 基准；其余既有 parser 语义保持不变。CLI MUST NOT 提供 `--with-baseline`，也 MUST NOT 增加 `--format` 或 `--version`。

#### Scenario: Navigation exposes the current CLI surface

- **WHEN** reviewer 从 `docs/navigation.md` 查找 CLI behavior
- **THEN** navigation 指向记录正式入口、scan flags、config selection、console /
  artifact boundary、status mapping 与 dogfood wrapper direction 的 owner 文档

#### Scenario: Existing flags retain parser semantics

- **WHEN** 调用者通过正式入口传入既有 TypeScript scan flag
- **THEN** CLI 将该 flag 交给同一 product parser
- **AND** 相对 `--changed-files` list path 继续使用 normalized project root
- **AND** CLI 不提供 `--with-baseline`、`--format` 或 `--version`

#### Scenario: Help documents complete configuration input

- **WHEN** 调用者运行 `scan --help`
- **THEN** help 列出 `--config <file>`、相对路径的 project-root 基准和 omitted behavior
- **AND** help 说明 explicit config 优先，否则只从 fixed path discovery 选择完整 JSON config
- **AND** help 不声称会 merge explicit、discovered 或 default config

#### Scenario: Help documents explicit baseline selection

- **WHEN** 调用者运行 `scan --help`
- **THEN** help 说明只有 `--baseline <revision>` 启用 comparison
- **AND** help 不声称能够自动发现或推断 baseline

### Requirement: Gate prerequisite planning

Product CLI SHALL 根据 policy descriptor 归一化 scan plan：`all` 只评价 resolved profile 的 `warnings.all`，MUST NOT 改变 profile capability selection 或 baseline selection；`changed` / `regressions` MUST 使用 full profile，并且 MUST 要求调用者提供显式 `--baseline <revision>`。省略 baseline 的 quick/full scan MUST 只生成当前快照，且 MUST NOT 从 previous commit、nearest code commit、merge base、upstream 或远端 ref 推断 comparison target。显式 revision MUST 在 scanner、cache 和 artifact work 前解析一次为不可变完整 commit SHA；本次 invocation 的 materialization、comparison、metadata 与 diagnostics MUST 使用该 SHA。缺少、无效或无法解析的显式 baseline，以及 comparison policy 与 quick profile 或显式 `--skip-baseline` 的组合，MUST 在 scanner 和 artifacts 启动前作为 usage error 退出 `3`。

#### Scenario: All gate preserves the selected profile

- **WHEN** 调用者在 quick 或 full profile 传入 `--gate all`
- **THEN** CLI 保持已有 profile capabilities 与显式 baseline selection
- **AND** gate 只覆盖该 resolved profile 产出的 warnings

#### Scenario: Omitted baseline produces only a current snapshot

- **WHEN** 调用者运行 quick 或 full scan 且没有传入 `--baseline`
- **THEN** scan 不产生 baseline comparison
- **AND** repository history、当前 branch、upstream 与 remote state 不改变该选择

#### Scenario: Comparison gate requires an explicit baseline

- **WHEN** 调用者传入 `--gate changed` 或 `--gate regressions` 但没有传入 `--baseline`
- **THEN** CLI 在 stderr 报告需要 `--baseline <revision>` 的修复方式并退出 `3`
- **AND** 不启动 scanner、cache 或创建 scan artifacts

#### Scenario: Comparison gate enables baseline in full profile

- **WHEN** 调用者在 full profile 传入 `--gate changed` 或 `--gate regressions`，并提供可解析的显式 `--baseline <revision>`
- **THEN** CLI 启用 baseline comparison，并使用该 revision 的 canonical full commit SHA
- **AND** gate planning 不从 repository history、branch、upstream 或 remote state 推断其他 baseline

#### Scenario: Explicit baseline is canonicalized once

- **WHEN** full scan 收到可解析为 commit 的 `--baseline <revision>`
- **THEN** CLI 在任何 scan work 前把它解析为不可变完整 commit SHA
- **AND** baseline materialization、comparison、metadata 与 diagnostics 使用同一个 SHA

#### Scenario: Invalid explicit baseline fails before scan work

- **WHEN** `--baseline` 的值不能解析为 commit
- **THEN** CLI 报告该显式输入无效并退出 `3`
- **AND** 不启动 scanner、cache 或创建 scan artifacts

#### Scenario: Impossible comparison plan fails before scanner startup

- **WHEN** 调用者把 comparison gate 与 quick profile 或显式 `--skip-baseline` 组合
- **THEN** CLI 在 stderr 报告 comparison prerequisite 与可用修复方式，并退出 `3`
- **AND** 不启动 scanner 或创建 scan artifacts
