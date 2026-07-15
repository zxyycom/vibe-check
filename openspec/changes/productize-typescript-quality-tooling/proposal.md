本 change 的核心目标是把现有 TypeScript quality tooling 提升为 Vibe Check 的自包含产品核心，并以 Bun 控制面、内建混合 scanner 和便携目录形成正式产品架构；本文只在本 change 下形成待审计临时计划，不影响现有其它文档或主规范。

## Why

现有 `scripts/quality/**` 与 `quality-core` 已经拥有扫描编排、code area、baseline、cache、warning、gate 和报告等主要产品能力，继续围绕 Rust CLI 或跨仓共享基础设施演进会重复实现并增加维护边界。现在需要先确立 TS/Bun 产品架构，再通过最小便携分发和函数指标 backend spike 验证这条路线。

## What Changes

- **BREAKING**：Vibe Check 从 Rust-first CLI 转为以现有 TypeScript quality tooling 为产品核心的 TS/Bun 模块化单体；Rust 不再承担主控制面、兼容基准或迁移门禁。
- 将现有 `quality-core` 及运行期实际使用的基础 helper 一次性迁入 Vibe Check 仓库，移除产品运行路径上的 git submodule / 跨仓源码 import，后续独立开发。
- 建立 product-owned scanner backend 边界：TS/Bun 拥有扫描范围、编排、baseline、cache、warning、gate 和报告；JS、原生进程、Python 或 WASM 只作为受管理 backend。
- 第一版函数指标 backend 固定为随包携带的 Lizard 与 Python runtime；并行制作 Rust `function-metrics` sidecar spike，只作为可替换 backend 实验。
- 形成自包含、离线可运行的平台便携目录，携带产品控制面、固定 backend、schema、manifest 和许可证材料；第一条验证路径为 Windows x64。
- 不建立 Docnav / Vibe Check 共享基础设施仓库，不建立公开 scanner plugin API，也不要求所有 scanner 使用同一种实现语言。
- 配置字段、CLI 细节和最终报告 shape 由后续切片在本架构内确定。

## Capabilities

### New Capabilities

- `product-runtime`: Vibe Check 的 TS/Bun 产品控制面、模块化单体边界、自包含源码所有权以及开发脚本向产品核心的提升方式。
- `scanner-backends`: product-owned scanner adapter、内建 backend 生命周期、semantic profile 以及 JS / native / Python / WASM 实现隔离。
- `portable-distribution`: 平台便携目录、运行时与 backend 闭合、manifest、离线执行和 clean-machine 验收边界。

### Modified Capabilities

- `structural-scanning`: 函数指标不再绑定 Rust ast-grep 正式实现，改由版本化 function-metrics backend 提供；第一版使用 Lizard + bundled Python，Rust sidecar 仅作替代实验。
- `quality-metrics`: 现有 TS quality engine 成为函数 NLOC、圈复杂度、参数数量、baseline/cache、warning 和报告数据的产品 owner，并消费 backend-neutral normalized metrics。

## Impact

- 产品代码：`scripts/quality/**`、`scripts/tools/quality-core/**` 及其运行期 foundation / task-runner 依赖将重新归属到 Vibe Check 产品源码；开发脚本改为消费产品入口。
- 仓库：移除产品源码 submodule 依赖与跨仓同步，保留来源 revision 和许可证记录；Docnav 与 Vibe Check 独立演进。
- Runtime：Bun 成为产品控制面 runtime / build target；Lizard + Python、scc、jscpd 等 scanner 作为受管理 backend 随平台包交付。
- Rust：现有 Rust CLI 与 structural adapter 不进入新产品主调用链；仅允许在独立 spike 中作为候选 function-metrics sidecar 复用。
- 规范：架构、脚本工具、scanner 依赖、函数指标、测试和 release owner 需要按新产品边界重写；具体 CLI/config/output contract 不在本 change 中提前定稿。
- 验证：新增 TS 产品核心 characterization、backend semantic fixtures、Windows x64 portable spike、clean-machine/offline 验收和分发预算证据。
