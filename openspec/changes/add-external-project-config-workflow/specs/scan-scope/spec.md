本 delta 起草 discovered/generated config 与现有 scan-scope pipeline 的统一边界；当前 change 仅在 `openspec/changes/add-external-project-config-workflow/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## ADDED Requirements

### Requirement: Every project scan has one explicit selected config

Scan scope SHALL 只消费 config owner 已选择并解析的一份 complete `QualityConfig`，不区分其来自显式 path 或 project-root discovery。Core MUST NOT 读取 built-in dogfood config、再次发现文件或按 config source 改变 include/exclude semantics。

#### Scenario: Explicit and discovered configs share scope behavior

- **WHEN** 同一 config 内容分别通过 `--config` 与 root discovery 选择
- **THEN** 两次 scan 产生相同 normalized scope、code areas 与 scanner exact inputs
- **AND** config source 只改变 provenance

#### Scenario: Dogfood config is explicit

- **WHEN** repository `quality:*` wrapper 启动 scan
- **THEN** wrapper 显式传入 checked-in Vibe Check config
- **AND** formal CLI 不把该 config 当作其它 project root 的 fallback
