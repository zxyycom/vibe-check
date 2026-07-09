# Proposal: add-simulated-project-fixtures

## Summary

将 Vibe Check 首批产品支持范围固定为 TypeScript `.ts`、Go `.go`、Rust `.rs` 和 Python `.py`，并新增仓库内手写维护的 fixture projects。Fixture project 作为测试环境被真实 CLI scan 直接读取，文件或函数级输入作为测试用例承接 scan scope、LOC metrics、warning、gate 和 JSON schema 契约证明。

本 change 的实施必须同步修正文档、schema、示例、Rust 实现和测试中的首批语言范围漂移。`vibe-check.report.v1` 尚未发布，因此可以直接收窄 language enum，无需 schema version bump 或兼容迁移。

## Why

当前长期文档、OpenSpec 主 spec、scanner dependency 文档、JSON schema、examples、Rust 实现和 CLI contract tests 仍把 `.tsx`、`.js`、`.jsx` / `javascript` 纳入 MVP supported baseline。用户已确认首批支持应只包含 `.ts`、`.go`、`.rs` 和 `.py`，因此需要先收敛产品契约，再建立稳定 fixture 环境证明这些契约。

手写 fixture project 能在不引入真实开源仓库、不下载依赖的前提下，把项目形态、ignore/default-exclude 边界、unsupported 文件和 threshold 输入沉淀为可审计、可复现、可追溯的测试环境。具体测试用例落在 fixture 内的文件、函数或测试断言上，而不是把整个 fixture project 当作单个测试用例。

## What Changes

- 收敛首批 supported source set：只支持 `.ts`、`.go`、`.rs` 和 `.py`。
- 将 `.tsx`、`.js`、`.jsx`、`javascript` 和其它非首批语言保留为后续支持范围；当前遇到这些文件时按 unsupported ordinary files 处理。
- 新增 `test-fixtures` capability，定义 checked-in fixture environment 的目录、范围、边界和维护规则。
- 同步修改 `scan-scope`、`quality-metrics` 和 `output-contract` delta specs，使产品契约、metrics language identifiers 和 JSON schema/examples 与首批支持范围一致。
- 在实现阶段修正 owner docs、scanner dependency 文档、JSON schema/examples、Rust scan scope、Rust metrics normalization、unit tests、CLI contract tests 和测试资料中的不一致声明。
- 新增测试资料记录，让 CLI contract tests 直接以 checked-in fixture project path 作为 project root 运行真实 `vibe-check` binary；fixture-backed tests 不复制、不生成、不修改 fixture 输入。
- 覆盖 `.gitignore`、默认排除目录、unsupported ordinary files、generated/vendor/cache 边界、专门的混合语言 fixture 和 `file.too_many_lines` gate 行为。
- 首批 fixture 测试只固定 JSON schema validity、文件收集/分类和 language identifier presence；不把 LOC totals、scope counts、人读渲染文案或第三方统计结果作为 fixture 契约。
- Fixture project 中的源码、配置和 ignore 文件都作为测试环境输入维护，必须手写并提交到仓库；文件或函数可以作为测试用例承载细分场景，不得用测试代码、build script 或运行时生成逻辑创建测试源码。

## Out of Scope

- 不支持 JavaScript、JSX、TSX 或其它非首批语言。
- 不引入真实开源仓库、submodule、网络下载或语言包安装。
- 不要求 fixture project 自身可通过 npm、go、cargo 或 pip build。
- 不改变 CLI 参数、report envelope 顶层 shape、scanner adapter 依赖或 release command surface。
- 不调整 human/readable rendering contract；可读输出应由后续专门 output change 处理。本 change 只在必要范围内同步 JSON schema/examples 的 language identifier。
- 不把 fixture 作为产品语义 owner；fixture 只验证 scan-scope、quality-metrics、JSON schema/output-contract 或 CLI owner 已声明的行为。
- 不在正常单语言 fixture 中混入其它语言；混合代码和 unsupported extension 边界只放入专门 mixed fixture。
- Fixture-backed tests 直接读取 checked-in fixture；scan 本身必须保持只读，并行测试也读取同一套 checked-in fixture。

## Capabilities

### New

- `test-fixtures`: 维护仓库内 checked-in fixture project 的范围、结构、验证边界、proof targets、文件分类集合和测试资料同步规则。

### Modified

- `scan-scope`: 将 MVP supported file classification 收窄为 `.ts`、`.go`、`.rs` 和 `.py`。
- `quality-metrics`: 将 LOC metrics adapter input 和 normalized language identifiers 收窄为 `go`、`python`、`rust` 和 `typescript`。
- `output-contract`: 同步 JSON schema 和 examples 的 language enum，首批只声明 `go`、`python`、`rust` 和 `typescript`。

## Acceptance

- OpenSpec strict validation 通过，且 delta spec 的 owner 分工清晰。
- 主文档、schema、examples、实现和测试不再声明 `.tsx`、`.js`、`.jsx` / `javascript` 是首批 supported input。
- Fixture-backed CLI contract tests 能通过只读扫描 checked-in fixture 证明四种首批语言、unsupported ordinary files、默认排除、ignore 规则、schema validation 和 blocking warning gate，且不依赖固定 LOC/count snapshot。
- `bun run validate` 和 `bun run verify:vibe-check-workspace:required` 通过，Rust 行为改动至少通过 `cargo fmt --all --check` 与 `cargo test --all`。
