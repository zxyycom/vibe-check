本 proposal 定义 `add-basic-quality-metrics` 的目标：在真实 scan scope 基础上产出第一批基础质量指标、warning 和 gate 结果，并保持 CLI surface 不变。

当前 change 只在 `openspec/changes/add-basic-quality-metrics/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## Why

Vibe Check 现在已经能基于真实项目文件集合生成 scan scope report，但 `metrics.supported_scanner_findings` 仍固定为 `0`，warnings 为空，gate 固定通过。下一步需要让扫描结果开始表达真实质量判断，作为后续 LOC adapter、结构扫描、重复检测和配置阈值的稳定基座。

## What Changes

- 定义基础质量指标的长期能力边界，包括指标输入、聚合模型、warning rule、warning blocking 字段和 gate 结果。
- 用 `tokei` 作为 LOC metrics adapter，在已收集的 supported files 上生成文件级行数、语言汇总和可用于 warning 的基础体量信号。
- 生成第一批稳定 warning findings，并让 `summary.warning_count`、`summary.blocking_warning_count`、`gate.status` 和 `gate.blocking_warnings` 从 warning findings 的 `blocking` 值派生。
- 同步 JSON schema、examples 和 human output，使新增指标、warning 和 gate 结果可被机器校验并可被人读报告定位。
- 保持 `vibe-check scan [project-root]`、`--format`、`--config`、stdout/stderr 边界和退出码分类不变。
- 暂不实现完整配置发现、accepted/suppressed warning 配置、AST 复杂度、重复代码检测、CI annotation 或新的 CLI 参数。

## Capabilities

### New Capabilities

- `quality-metrics`: 覆盖 Core/Scanner 的基础指标模型、指标聚合、warning 生成、blocking policy 和 gate result 的长期契约。

### Modified Capabilities

- `output-contract`: 扩展 metrics、warnings 和 gate 在 human/json 输出、schema 和 examples 中的稳定投影要求。

## Impact

- 后续实现会影响 `crates/vibe-check/src/core.rs`、scan pipeline/runtime、新增或调整的 metrics/warning/gate 模块、output rendering、schema examples 和 CLI/output tests。
- 后续实现会添加 `tokei` 作为 LOC metrics adapter；如果实现前审计证明 `tokei` 不可用，必须先更新 design 和 tasks，再选择替代方案。
- JSON schema 会在现有 `vibe-check.report.v1` envelope 内扩展 `metrics` object，并给 warning item 增加 `blocking` 字段；如果实现发现需要改变顶层 envelope 或字段含义，必须先重新审计 schema version 策略。
- Gate failure 会使完成扫描的 CLI 退出码返回 `1`；输入/config、scanner fatal 和 output failure 退出码不改变。
- 本 change apply 后应新增或更新长期 owner 文档，让 `docs/navigation.md` 能定位质量指标、warning 和 gate 规则 owner。
