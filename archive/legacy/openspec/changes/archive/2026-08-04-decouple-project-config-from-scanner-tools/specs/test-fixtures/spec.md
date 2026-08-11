## MODIFIED Requirements

### Requirement: Configured external project fixture

Repository SHALL 在 `fixtures/projects/configured-typescript/` 提供最小、deterministic、checked-in project，包含 current version `"1"` semantic config、eligible TypeScript source、excluded/generated controls、可产生现有 warning 的 source 与 fixture README。Fixture config 与其 schema/example material MUST 只包含 public semantic fields，并 MUST NOT 包含 scanner product name、command 或 args。

Fixture-backed acceptance MUST 通过正式 Product CLI 显式传入 project root 与 `--config`，并验证 config version、effective scope、code area、semantic check、warning 与 artifacts。Deterministic backend control MUST 通过 Product-owned dependency test seam 或 declared operational overrides 完成，且不得把 controlled executable 重新写入 project config。

#### Scenario: Formal entry scans according to fixture config

- **WHEN** acceptance 从 fixture root 外启动
  `bun run product:cli -- scan <fixture-root> --config .vibe-check/config.json`
- **THEN** metrics 只包含 config 批准的 files，并使用 config 声明的 code area、version 与 semantic checks
- **AND** warning 与 artifacts 对应 explicit config 而不是 built-in semantic values

#### Scenario: Fixture config does not expose scanner tools

- **WHEN** reviewer 检查 fixture config、corresponding schema 与 README config example
- **THEN** material 使用 `checks.files`、`checks.functions`、`checks.duplication` 与 semantic `checkId`
- **AND** material 不包含 `lizard`、`scc`、`jscpd`、`command` 或 `args`

#### Scenario: Excluded fixture inputs remain excluded

- **WHEN** fixture 同时包含 eligible source 与匹配 exclude/generated rules 的 controls
- **THEN** eligible source 进入 normalized scanner inputs
- **AND** excluded/generated files 不进入 metrics、warnings 或 scanner exact inputs

#### Scenario: Acceptance remains deterministic

- **WHEN** required product validation 重复运行 configured fixture acceptance
- **THEN** Product-owned dependency test control 产生稳定 Vibe Check-owned metrics、warning ordering 与 artifacts
- **AND** acceptance 不依赖网络、未固定第三方 output 或 project-level executable settings

## ADDED Requirements

### Requirement: External workflow fixtures consume the semantic config owner

`add-external-project-config-workflow` 的 init/discovery acceptance SHALL 使用 `.vibe-check/config.json` 与本 change 建立的 semantic runtime schema。Fixture 可以使用 comment-capable JSON content，但 filename、discovery、initializer safety 与 sibling schema lifecycle 仍由 external workflow owner；本 change MUST NOT 建立平行 file workflow。

#### Scenario: Initialized external config is semantic

- **WHEN** external workflow acceptance 初始化并扫描 fixture copy
- **THEN** `.vibe-check/config.json` 通过 semantic runtime schema，并产生与显式选择同义的 resolved config
- **AND** initializer 不生成 tool-named threshold tree、commands、args 或 applied dependency-override provenance

#### Scenario: Explicit and discovered selection share one semantic schema

- **WHEN** 同一 semantic document 分别经 explicit path 与 external-workflow discovery 选择
- **THEN** 两次选择产生相同 public scope、checks、report 与 artifact/cache semantics
- **AND** config selection source 不改变 internal dependency resolution
