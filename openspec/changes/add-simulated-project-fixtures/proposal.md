本 proposal 定义 `add-simulated-project-fixtures` 的目标：把 Vibe Check 首批产品支持范围收敛到 `.ts`、`.go`、`.rs` 和 `.py`，并建立对应的可复现模拟项目仓库验证 scan scope、LOC metrics、warning 和 gate 行为。

当前 change 只在 `openspec/changes/add-simulated-project-fixtures/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## Why

Vibe Check 已经具备真实 scan scope、LOC metrics、warning 和 gate 结果，但当前文档、schema、实现和测试仍把 `.tsx`、`.js`、`.jsx` / `javascript` 纳入 MVP supported baseline。下一步需要先把项目首批支持范围明确收敛为 `.ts`、`.go`、`.rs` 和 `.py`，再用稳定的模拟项目仓库证明 CLI 在这四类输入上保持 scan scope、metrics、warning、gate 和 JSON schema 契约。

## What Changes

- 将产品首批 supported source set 收敛为 TypeScript `.ts`、Go `.go`、Rust `.rs` 和 Python `.py`。
- 将 `.tsx`、`.js`、`.jsx`、`javascript` 以及其它语言视为后续支持范围；当前遇到这些文件时按 unsupported ordinary files 处理。
- 新增一组仓库内维护的模拟 fixture projects，覆盖首批 supported source set。
- 为每个模拟项目记录验证目标、关键文件布局、预期 scan invariants 和维护规则。
- 覆盖 `.gitignore`、默认排除目录、unsupported ordinary files、generated/vendor/cache 边界和 `file.too_many_lines` warning 阈值输入。
- 增加或调整测试 helper，让 CLI contract tests 可以从固定 fixture project 复制到临时目录后运行真实 `vibe-check` binary。
- 不引入外部真实开源仓库、不下载网络依赖、不要求 fixture project 自身可 build；本 change 只验证 Vibe Check scan 输入契约。
- 修正与首批支持范围不一致的 owner 文档、OpenSpec 主 spec、JSON schema/examples、Rust 实现和测试材料。

## Capabilities

### New Capabilities

- `test-fixtures`: 维护仓库内模拟项目 fixture 的范围、结构、验证边界和维护规则。

### Modified Capabilities

- `scan-scope`: 收窄 MVP supported file classification，只把 `.ts`、`.go`、`.rs` 和 `.py` 计入 supported files。
- `quality-metrics`: 收窄 LOC metrics adapter 的 supported language set 和 normalized language identifiers，移除首批 `javascript` 输出。
- `output-contract`: 同步 JSON schema 和 examples 的 language enum，使机器输出只声明首批 supported language identifiers。

## Impact

- 后续实现会影响 scan scope owner 文档、quality metrics owner 文档、output schema/examples、Rust scan scope 和 metrics 代码、CLI contract tests、测试 helper、测试 case 账本和必要的测试策略说明。
- 不改变 CLI 参数、report envelope 顶层 shape、scanner adapter 依赖或 release command surface。
- required profile 可以继续保持快速；如果 fixture 扩大导致测试成本上升，应先将较重验证放入 full profile 或单独 corpus profile。
