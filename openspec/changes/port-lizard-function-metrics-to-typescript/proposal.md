## Change 状态

本 change 规划保留但当前明确延期。它是产品向能力和体验工作之后的最终运行时统一提升项，
不是默认近期任务，也不得阻塞产品向 change。只有用户显式重新排序，或出现直接阻塞产品
交付、目标平台可用性、可靠性、安全或许可证合规的证据时，才提前恢复实施。

前置 product-source promotion 与 `decouple-project-config-from-scanner-tools` runtime cut 已
完成。Current-contract audit 已把 port scope 修正为已实现的 TypeScript/Rust selector、当前
`FunctionMetric` model、`ResolvedQualityConfig` 与 `ScannerDependencySnapshot`；尚未实现
translated source 或 runtime switch。开始 implementation 前，本 change 的 task 0.3 仍须核对
最终交付证据。

Implementation 从 pinned upstream/license/source-closure evidence 开始。不得沿用历史四语言
计划，也不得把 provisional source map 当成已核实 closure。

## Why

TypeScript/Bun 产品当前仍执行 Python/Lizard 并解析 private CSV protocol。这给 formal scan
path 增加 Python/package installation、process startup、availability check、platform command
差异与 CSV validation。

产品需要在不依赖该 runtime 的前提下保持相同 current function metrics，而不需要重新设计
structural-analysis product contract。Project config 与 dependency execution 已由 semantic-config
change 隔离；本 port 不承担 public config migration。

## What Changes

- 固定 Lizard 1.23.0 exact upstream revision、适用 license、verified source closure 和当前
  TypeScript/Rust inputs 的 upstream-test mapping。
- 只翻译 `.ts`、`.d.ts`、`.rs` 实际可达的 core/readers。
- 用 differential fixtures 保持当前 normalized fields：function name、file、start/end
  line、lines、parameter count、cyclomatic-complexity value/source 与 deterministic order。
- 暴露一个 internal typed analyze API；file discovery、supported-input selection、
  normalization、warning、gate 与 output 留在既有 owner。
- Parity 与 failure behavior 通过后一次切换 adapter。
- 从 `ScannerDependencySnapshot` resolver 删除 Python/Lizard executable、args、availability、
  process wrapper 与 CSV parser；不修改 semantic project config/schema/starter。
- 保留 serialized `sourceTool: "lizard"` / metric source labels，作为当前兼容算法 identity；
  machine-output identity redesign 不属于本 change。

## Success Criteria

- Formal current/baseline scans 对 TypeScript/Rust fixtures 产生与 pinned pre-switch baseline
  相同的 normalized function inventory、fields、order、warnings、aggregates、gate 和
  machine DTO。
- Eligible function-metrics work 不再解析或启动 Python/Lizard，production import 不再到达
  retired process/CSV path。
- 既有 capability-level unavailable/execution/invalid-result semantics 保持可区分；port
  不引入 partial success。
- Semantic config version、`checks.functions` fields、accepted-warning `checkId`、generated
  starter/schema 与 `.vibe-check/config.json` authoring contract 在 backend replacement 前后
  保持不变。
- 每个 translated source 都有 pinned provenance、适用 license treatment 与直接 test 或
  differential evidence。

## Capabilities

### New Capabilities

无。Port 保持为 internal concrete dependency boundary，不建立 provider/plugin contract。

### Modified Capabilities

- `structural-scanning`：替换 Python/Lizard process backend，保持 current selector、product
  model、semantic function-check input 与 public output identity。
- `test-fixtures`：增加 TypeScript/Rust translation、differential、formal-entry 与
  config-stability proof。

## Dependencies and Impact

- 依赖已归档的 TypeScript/Bun product-source promotion。
- 依赖 `decouple-project-config-from-scanner-tools` 已实现 semantic document、
  `ResolvedQualityConfig` 与 `ScannerDependencySnapshot`；本 change 不重新定义或迁移 public
  config。
- 按当前产品优先级，`add-external-project-config-workflow` 先于本 change 交付；只有显式重新
  排序或直接阻塞证据才能改变这一排序。
- Machine-output stabilization 已完成；port 必须保持 published DTO shape 与 warning contract。
- 只影响 Product Scanner/dependency internals、pinned source/license material、focused tests、
  fixtures 和 owner docs。不增加语言、不改变 scanner exact inputs、不重设 completeness、
  不创建 public SDK。
