本 proposal 只起草外部项目可实际采用的配置工作流；当前 change 仅在 `openspec/changes/add-external-project-config-workflow/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## Why

当前未传 `--config` 时使用的 `DEFAULT_CONFIG` 固定包含 Vibe Check 自身目录和 code areas，而外部项目必须手写完整 `QualityConfig`，canonical fixture 已超过一百行。正式 CLI 虽接受任意 project root，但还没有低摩擦、可解释且不会误用 dogfood defaults 的项目配置路径。

## What Changes

- 将仓库 dogfood 配置与面向外部项目的 product configuration 分离，dogfood wrapper 继续显式选择仓库自有配置。
- 为 project root 定义单一、可预测的 config discovery 规则，并保留显式 `--config` 的最高优先级。
- 增加生成初始配置的非交互 workflow，使用户无需复制内部 fixture 或理解完整 runtime model 即可开始。
- 区分用户可维护的 project config 与 scanner 执行所需的 resolved config；默认值、preset 或 merge 只在一个 owner 内完成。
- 配置选择、来源、版本和关键 scope 在 scan 开始前可见，失败信息给出可行动的下一步。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `scan-configuration`：从“仅显式完整 JSON”扩展为 external-project discovery、initialization 与 resolved config contract。
- `cli-contract`：增加 config initialization/discovery surface，并固定显式 flag precedence。
- `scan-scope`：确保 discovered/generated config 与显式 config 进入同一 normalized scope pipeline。
- `test-fixtures`：增加无 Vibe Check 仓库结构的 external project onboarding 和 discovery proof。

## Impact

- 影响 product CLI operation/flags、config model/parser/resolution、dogfood wrapper、fixtures、文档和错误映射。
- 可能需要新的 project config schema 或 preset，但不得把 trusted tool command 作为不透明远程输入。
- 不在本 change 中增加新 scanner、修改指标算法或建立发布包。
