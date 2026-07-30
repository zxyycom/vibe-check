## Change 状态

前置 product-source promotion 已完成。Current-contract audit 已把 port scope 修正为已实现的
TypeScript/Rust selector 和当前 `FunctionMetric` model。尚未实现 translated source 或
runtime switch。

Implementation 从 pinned upstream/license/source-closure evidence 开始。不得沿用历史四语言
计划，也不得把 provisional source map 当成已核实 closure。

## Why

TypeScript/Bun 产品当前仍解析 configured Python command，执行
`python -m lizard --csv`，并为 function metrics 解析 private CSV protocol。这给 formal scan
path 增加 Python/package installation、process startup、availability check、platform command
差异、CSV validation 和 config surface。

产品需要在不依赖该 runtime 的前提下保持相同 current function metrics，而不需要重新设计
structural-analysis product contract。

## What Changes

- 固定 Lizard 1.23.0 exact upstream revision、适用 license、verified source closure 和当前
  TypeScript/Rust inputs 的 upstream-test mapping。
- 只翻译 `.ts`、`.d.ts`、`.rs` 实际可达的 core/readers。
- 用 differential fixtures 保持当前 normalized fields：function name、file、start/end
  line、lines、parameter count、cyclomatic-complexity value/source 与 deterministic order。
- 暴露一个 internal typed analyze API；file discovery、supported-input selection、
  normalization、warning、gate 与 output 留在既有 owner。
- Parity 与 failure behavior 通过后一次切换 adapter。
- 删除 Python/Lizard availability、command/args、process wrapper、CSV parser，以及完整
  config 中的 `tools.lizard`。
- 保留 top-level `config.lizard` threshold group，以及 serialized
  `sourceTool: "lizard"` / metric source labels，作为 Lizard-compatible algorithm identity。

## Success Criteria

- Formal current/baseline scans 对 TypeScript/Rust fixtures 产生与 pinned pre-switch baseline
  相同的 normalized function inventory、fields、order、warnings、aggregates、gate 和
  machine DTO。
- Eligible function-metrics work 不再解析或启动 Python/Lizard，production import 不再到达
  retired process/CSV path。
- 既有 capability-level unavailable/execution/invalid-result semantics 保持可区分；port
  不引入 partial success。
- Complete config 不再接受或要求 `tools.lizard`；docs、fixtures、parsers、help、tests、
  cache/scanner identity 与 semantic Cases 一致。
- 每个 translated source 都有 pinned provenance、适用 license treatment 与直接 test 或
  differential evidence。

## Capabilities

### New Capabilities

无。Port 保持为 internal concrete dependency boundary，不建立 provider/plugin contract。

### Modified Capabilities

- `structural-scanning`：替换 Python/Lizard process backend，保持 current selector 与 product
  model。
- `scan-configuration`：从 complete config 移除 retired runtime `tools.lizard` command，
  保留 `lizard` threshold group。
- `test-fixtures`：增加 TypeScript/Rust translation、differential 与 formal-entry proof。

## Dependencies and Impact

- 依赖已归档的 TypeScript/Bun product-source promotion。
- 应在 machine-output stabilization 后实施；必须保持 published DTO shape 与 warning
  contract。
- 两者都 active 时，应先于 external config initialization，确保 starter 与 dogfood
  configs 使用最终 current tool shape。
- 只影响 Product Scanner/Config internals、pinned source/license material、focused tests、
  fixtures 和 owner docs。不增加语言、不改变 scanner exact inputs、不重设 completeness、
  不创建 public SDK。
