本 delta 起草 external config discovery 与 initialization 的入口级 proof；当前 change 仅在 `openspec/changes/add-external-project-config-workflow/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## ADDED Requirements

### Requirement: External project configuration workflow fixture

Repository SHALL 提供不含 Vibe Check 仓库目录结构的 deterministic external project fixture，证明 init、root discovery、explicit precedence、missing-config failure、existing-file preservation 与 launch-cwd independence。Fixture acceptance MUST 通过正式 Product CLI，并 MAY 使用 controlled scanners 保持确定性。

#### Scenario: Initialized project can be discovered and scanned

- **WHEN** acceptance 在无 config 的 fixture copy 上运行 `init`，随后省略 `--config` 运行 scan
- **THEN** CLI 发现生成的 project-root config并产生符合其 scope 的 artifacts
- **AND** metrics 不包含 Vibe Check 仓库专用 paths

#### Scenario: Explicit path overrides fixture discovery

- **WHEN** fixture 同时有 discovery config和另一份显式 config
- **THEN** acceptance 观察到显式 config version、scope 与 provenance
- **AND** 两份 config 不合并

#### Scenario: Missing config fails without scanner calls

- **WHEN** fixture 没有 config且直接运行 scan
- **THEN** CLI 以 config error 退出
- **AND** controlled scanner invocation count 为零
