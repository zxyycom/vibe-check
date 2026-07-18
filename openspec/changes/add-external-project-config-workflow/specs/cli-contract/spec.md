本 delta 起草 config initialization operation 与 help surface；当前 change 仅在 `openspec/changes/add-external-project-config-workflow/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## ADDED Requirements

### Requirement: Configuration workflow command

Product CLI SHALL 路由 `init [project-root]` 与 `scan [project-root]` 到独立 owner，并 SHALL 在 root/operation help 中说明 discovered config path、显式 `--config` precedence、missing-config failure 与 initialization command。`init` MUST NOT 启动 scan core。

#### Scenario: Init help explains safe creation

- **WHEN** 调用者运行 `init --help`
- **THEN** help 说明 project-root 基准、固定输出文件与不覆盖行为
- **AND** help 不声称存在 parent-directory discovery 或 implicit merge

#### Scenario: Scan help explains config selection

- **WHEN** 调用者运行 `scan --help`
- **THEN** help 说明 explicit、project-root discovery 与 missing config behavior
- **AND** 不再声称 omitted config 使用 Vibe Check dogfood defaults

#### Scenario: Init does not enter the scanner pipeline

- **WHEN** 调用者成功运行 `init`
- **THEN** CLI 只生成配置并输出下一步
- **AND** tool availability、file collection、baseline 与 artifacts 都不启动
