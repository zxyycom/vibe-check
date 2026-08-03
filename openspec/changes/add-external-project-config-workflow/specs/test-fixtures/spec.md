## ADDED Requirements

### Requirement: External project configuration workflow fixture

Repository SHALL 使用不含 Vibe Check repository structure 的 external project fixture
temporary copy 提供 deterministic formal-entry proofs。Proofs SHALL 覆盖 init、tool-directory
discovery、JSON comments/trailing commas、local schema generation、explicit priority、
missing config、exclusive existing-directory preservation、partial-set prevention、launch-cwd
independence、tool-neutral documents 和 no-scanner-before-config。Controlled scanner support
MAY 保持结果 deterministic。

#### Scenario: Initialized project can be discovered and scanned

- **WHEN** acceptance 在 fixture copy 运行 `init`，再省略 `--config` 扫描
- **THEN** CLI 生成 `.vibe-check/config.json` 与 `config.schema.json`，再发现 commented config
- **AND** schema link 有效、neutral scope 产生的 metrics 不含 Vibe Check-specific paths

#### Scenario: Explicit path overrides fixture discovery

- **WHEN** fixture 同时有 discovery config 和另一份 explicit config
- **THEN** acceptance 观察到 explicit version、scope 与 source
- **AND** 两个 files 的 persisted values 不 merge

#### Scenario: Missing config fails without scanner calls

- **WHEN** fixture 没有 config 且直接启动 scan
- **THEN** CLI 以 exit `3` 返回两条 recovery paths
- **AND** controlled scanner invocation count 为零

#### Scenario: Existing init directory is byte-preserved

- **WHEN** `init` 面对 existing `.vibe-check` 或失去 concurrent exclusive-create race
- **THEN** command 失败且不替换内容，也不留下 partial generated set
- **AND** acceptance 观察到原有 entries 与 bytes 完全相同

#### Scenario: Handled init write failure leaves no generated half-set

- **WHEN** acceptance 分别注入 first/second generated-file write failure
- **THEN** command 失败并只清理由该 invocation 创建的固定 entries
- **AND** project root 的其它 entries 与 bytes 保持不变，后续 clean init 可以成功

#### Scenario: Generated schema is assistance, not authority

- **WHEN** acceptance 删除或篡改 generated sibling schema 后扫描有效 `config.json`
- **THEN** runtime 仍按 Product-owned config contract 接受 config
- **AND** independent schema validation 另外证明原始 generated schema 与 runtime source 同步

#### Scenario: Generated project config is tool-neutral

- **WHEN** acceptance 检查 generated config、editor schema、help 与 selected-config provenance
- **THEN** 它们只包含 semantic project fields 与 source/path/version
- **AND** 不出现 scanner identity、command、args 或 applied tool override names

### Requirement: Repository dogfood config is isolated

Repository SHALL 在 `<repo-root>/.vibe-check/config.json` 保存 Vibe Check-specific
semantic scope/quality/report values，并保存对应 generated
`config.schema.json`。所有 `quality:*` wrappers SHALL 通过 formal Product CLI 显式选择该
JSON config。Checked-in config/schema MUST NOT 包含 scanner identity、command/args 或
checkout-specific dependency path。Wrapper MUST NOT 解析、merge、生成、按 platform 改写或
重新解释 config。

#### Scenario: Dogfood wrapper selects repository config

- **WHEN** quick、full、default scan 或 gate dogfood entry 运行
- **THEN** Product CLI 报告 explicit repository config provenance
- **AND** existing profile/gate args 与 process outcomes 保持 pass-through

#### Scenario: External project never inherits dogfood config

- **WHEN** formal CLI 扫描另一 project root，且没有 explicit 或 discovered config
- **THEN** scanner work 前发生 missing-config failure
- **AND** repository dogfood values 不进入 external scope、report、cache 或 artifacts
