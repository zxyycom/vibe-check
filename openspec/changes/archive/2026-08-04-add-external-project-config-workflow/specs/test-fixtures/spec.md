## ADDED Requirements

### Requirement: External project configuration workflow fixture

Repository SHALL 使用 existing external project fixture 的独立 temporary copies，通过正式 Product
CLI 证明 zero-config observation、gate policy prerequisite、init/discovery、repeat ensure、explicit
precedence、document grammar、safe initialization 与 schema authority。Test-owned scanner support
MAY 用于保持结果确定。

#### Scenario: Clean project proves default and gate boundary

- **WHEN** clean fixture copy 先执行 ungated scan，再在同一未配置状态执行 gated scan
- **THEN** ungated scan 使用 neutral default；gated scan 在 dependency/scanner work 前退出 `3`
- **AND** evidence 同时标识 neutral scope 与 file-policy recovery path

#### Scenario: Initialized project proves source equivalence

- **WHEN** clean fixture copy 执行 init，再通过 fixed discovery 执行 scan
- **THEN** production loader 发现并解析 generated config；sibling schema 独立证明 editor projection
- **AND** semantic value、scope、exact inputs 与 report settings 等同于 in-memory neutral default

#### Scenario: Explicit and invalid files prove selection finality

- **WHEN** fixture 已有 discovered config，调用者另行选择 explicit file
- **THEN** valid explicit file 控制 scan；invalid explicit file 返回该文件自身的 config error
- **AND** 两条路径均保持 persisted inputs 原有内容

#### Scenario: Repeated initialization preserves and completes project state

- **WHEN** acceptance 覆盖 two-target no-op、one-target fill、existing tool-directory entries、target
  races、handled writes 与 changed sibling schema
- **THEN** initializer 保留 existing file bytes，只补齐 missing file，并清理 invocation-owned
  partial entries
- **AND** existing normal targets 按 presence contract 保留；后续 runtime validation 始终由
  embedded Product schema 承担

### Requirement: Repository dogfood config is isolated

Repository SHALL 将完整政策保存于 `<repo-root>/.vibe-check/config.json`，并保存对应 generated
schema。`quality:*` SHALL 通过正式 discovery 获得该政策；root-only wrapper SHALL 原样传递 caller
arguments、streams 与 process outcome。

#### Scenario: Dogfood exercises discovery

- **WHEN** quick、full、default 或 gate dogfood entry 运行
- **THEN** Product CLI 报告 discovered repository config
- **AND** entry-specific profile/gate settings 与 product outcome 保持既有行为

#### Scenario: Explicit wrapper input retains public precedence

- **WHEN** 调用者通过 `quality:scan` 传入 `--config`
- **THEN** Product CLI 选择 explicit file
- **AND** wrapper 继续作为 transparent root adapter
