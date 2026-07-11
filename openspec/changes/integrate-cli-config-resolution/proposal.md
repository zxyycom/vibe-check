## Why

Vibe Check 已暴露 `--config`，但当前实现只校验并记录路径，没有加载或应用配置；`--format` 的声明、默认值与来源合并也尚未归属于 Config owner。`cli-config-resolution` 已提供 canonical field、来源解析、验证与 typed materialization，可用于补齐这条边界并避免重复维护配置规则。

## What Changes

- 以固定 submodule commit 和 workspace path dependency 接入 core、Clap、serde 与 typed-fields packages。
- 新增 Config owner 和 Vibe Check-owned resolved config；首个 canonical field 用同一声明覆盖 `--format`、`VIBE_CHECK_FORMAT`、JSON `output.format` 与静态默认值 `human`。
- 按显式 CLI > environment > 显式 JSON > 静态默认值解析 output format；`--config <path>` 是唯一文件入口，不做隐式发现。
- 在 scanner execution 前完成 JSON 结构校验、canonical value validation 和 typed materialization；阻塞失败保持退出码 `2`、stderr diagnostic 与空 stdout。
- 保持 command、路径、help/version 快路径、flag discoverability、输出、退出码和 report 契约；Clap 生成的展示细节不作为兼容目标。
- 同步 Config/CLI owner 文档、单元与真实 binary 测试、checked-in JSON fixtures 和 case 账本。本 change 不开放 scan scope、threshold、scanner profile 或 warning policy 配置。

## Capabilities

### New Capabilities

- `configuration-resolution`: 拥有 canonical field declaration、显式 JSON 加载、CLI/env/config/default 来源合并、typed materialization、配置诊断与严格字段校验。

### Modified Capabilities

- `cli-contract`: 明确 `--format` 和 `--config` 与 Config owner 的交接、显式 CLI 覆盖规则，以及配置失败保持退出码、通道和 scan 启动边界。

## Impact

- 代码：`crates/vibe-check` 的 CLI parser、scan pipeline context、error mapping 和新增 config 实现归属；既有 core `ScanRequest` 只保留原有 project/config path 语义。
- 契约：`docs/cli.md`、`docs/architecture.md`、新增 Config owner 文档、`docs/navigation.md`、测试策略资料与 `cli-contract` 主 spec。
- 依赖：`.gitmodules`、workspace `Cargo.toml` / `Cargo.lock`、固定 commit 的 nested Cargo workspace；JSON 解析复用现有 `serde_json`。
- 验证：Config 单元测试、`crates/vibe-check/tests/cli_contract.rs`、checked-in JSON fixtures、case 账本、OpenSpec 严格校验和 workspace required/full profile。
