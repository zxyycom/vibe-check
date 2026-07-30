## ADDED Requirements

### Requirement: External project configuration workflow fixture

Repository SHALL 使用不含 Vibe Check repository structure 的 external project fixture
temporary copy 提供 deterministic formal-entry proofs。Proofs SHALL 覆盖 init、root
discovery、explicit priority、missing config、exclusive existing-file preservation、
launch-cwd independence、declared tool overrides 和 no-scanner-before-config。Controlled
scanner support MAY 保持结果 deterministic。

#### Scenario: Initialized project can be discovered and scanned

- **WHEN** acceptance 在 fixture copy 运行 `init`，再省略 `--config` 扫描
- **THEN** CLI 发现 generated root config 并按 neutral scope 生成 artifacts
- **AND** metrics 不含 Vibe Check repository-specific paths

#### Scenario: Explicit path overrides fixture discovery

- **WHEN** fixture 同时有 discovery config 和另一份 explicit config
- **THEN** acceptance 观察到 explicit version、scope 与 source
- **AND** 两个 files 的 persisted values 不 merge

#### Scenario: Missing config fails without scanner calls

- **WHEN** fixture 没有 config 且直接启动 scan
- **THEN** CLI 以 exit `3` 返回两条 recovery paths
- **AND** controlled scanner invocation count 为零

#### Scenario: Existing init target is byte-preserved

- **WHEN** `init` 面对 existing file 或失去 concurrent exclusive-create race
- **THEN** command 失败且不替换内容
- **AND** acceptance 观察到 bytes 完全相同

#### Scenario: Declared tool override is observable

- **WHEN** acceptance 提供受支持 `VIBE_CHECK_*` tool override
- **THEN** selected-config context 记录其 name，scanner 接收 resolved tool value
- **AND** unrelated environment values 不改变 config

### Requirement: Repository dogfood config is isolated

Repository SHALL 在 `<repo-root>/vibe-check.config.json` 保存 Vibe Check-specific
scope/report values 与最终 current tool shape。所有 `quality:*` wrappers SHALL 通过 formal
Product CLI 显式选择它。Wrapper MUST NOT 解析、merge、生成或重新解释 config。

#### Scenario: Dogfood wrapper selects repository config

- **WHEN** quick、full、default scan 或 gate dogfood entry 运行
- **THEN** Product CLI 报告 explicit repository config provenance
- **AND** existing profile/gate args 与 process outcomes 保持 pass-through

#### Scenario: External project never inherits dogfood config

- **WHEN** formal CLI 扫描另一 project root，且没有 explicit 或 discovered config
- **THEN** scanner work 前发生 missing-config failure
- **AND** repository dogfood values 不进入 external scope、report、cache 或 artifacts
