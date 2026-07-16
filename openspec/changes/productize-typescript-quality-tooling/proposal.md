本 change 将现有 `scripts/quality/**` 与 `quality-core` 的完整 TypeScript 检测能力收归为 Vibe Check-owned 正式 TS/Bun 工具，保持 scc、Lizard/Python 与 jscpd 检测链，并补齐源码与依赖所有权、稳定入口、产品边界和验证。

## Why

现有 TypeScript tooling 已经完整执行 scan planning、code-area classification、baseline/cache、scc/Lizard/jscpd 扫描、metrics aggregation、warning、accepted-warning handling、gate 和 report/artifact 输出。本 change 的工作是把这套实现从开发脚本组织方式提升为正式产品工具：运行期源码仍来自 git submodule，入口、依赖、配置、错误和可写状态仍按脚本约定组织，长期 owner 也尚未切换。

完成后，Vibe Check 能从仓库正式入口独立拥有、执行、验证和维护同一套检测能力。

## What Changes

- 将 `quality-core` 及其运行期 helper closure 收归 Vibe Check-owned product modules，记录来源、许可证和 import boundary。
- 以现有实现的可重放回归结果保护 scan planning、code areas、baseline/cache、metrics、warning、accepted-warning、gate 和 report/artifact 行为。
- 将现有 scc、Lizard/Python 与 jscpd wrappers、typed tools config 和 availability checks 收归正式 scanner modules，明确依赖解析、归一化结果和错误边界。
- 建立正式 TS/Bun entry、typed product config、状态目录与诊断映射，并让 dogfooding 和仓库质量命令复用同一产品路径。
- 在当前开发环境完成真实 human/JSON scans、owner contract tests 和回归验证，再同步长期架构、scanner、contract、testing 与 script-tooling owners。

## Capabilities

### New Capabilities

- `product-runtime`: 现有 TS quality tooling 的产品所有权、正式入口、模块边界和单一执行路径。
- `scanner-backends`: 固定检测栈的 component mapping、adapter contract、依赖解析、进程和错误边界。

### Modified Capabilities

- `structural-scanning`: function metrics 由现有 Lizard/Python pipeline 提供，并保留 normalized metric 与 diagnostic contract。
- `duplicate-scanning`: duplicate scanning 由现有 jscpd pipeline 提供，并保留 planning、cache、normalization 与 failure contract。
- `quality-metrics`: 现有 TS engine 成为 metrics、baseline/cache、warning、accepted-warning、gate 和 report-data pipeline 的正式 owner。
- `test-fixtures`: fixtures 承担现有行为回归、固定组件 conformance 和正式入口验收。

## Impact

- 产品源码：完整 TS engine、必要 runtime helpers、scanner adapters 和正式 entry 进入 Vibe Check-owned modules。
- 产品契约：现有 engine 行为成为回归基线；CLI、output/schema、exit-code 和 scan-scope owners 继续定义外部验收边界。
- 依赖与配置：Bun、scc、Lizard/Python 和 jscpd 的来源、调用协议、解析方式与可用性检查进入产品 owner。
- 仓库与验证：默认质量入口改为消费正式产品路径，并增加源码 closure、固定组件、端到端与 owner contract 证据。
