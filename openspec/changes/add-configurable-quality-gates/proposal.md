本 proposal 只起草 opt-in quality gate 与稳定退出语义；当前 change 仅在 `openspec/changes/add-configurable-quality-gates/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## Why

当前 `passed` 与 `warning` 固定退出 `0`，`--verification-output` 只改变文本，调用者无法由 Product CLI 明确选择“仅观察”还是“阻断全部、changed 或 regression warnings”。这不是实现 bug，而是缺失的公开质量策略。

## What Changes

- 增加显式 gate policy：`never`、`all`、`changed`、`regressions`，默认 `never` 以保持现有 non-blocking behavior。
- Gate 只消费 successful completeness 后的 normalized warning channels，并按 `acceptedReason` 排除已接受 warning 的 blocking 影响。
- **BREAKING（仅显式 gate 调用）**：gate 未通过时使用专用非零 exit `1`；runtime/completeness failure 继续使用 `2`，input/config error 继续使用 `3`。
- Human report、console 与现有 metrics data 记录 policy、evaluated channel、blocking warnings 和 result。
- `--verification-output` 保留为显示选择，不再承担隐式 gate 语义。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `quality-metrics`：增加从 normalized warning channels 计算 gate result 的 product-owned policy。
- `cli-contract`：增加 `--gate` surface 与可区分 gate/runtime/config 的 exit mapping。
- `output-contract`：从同一 gate data 投影 console、report 与 machine artifacts。
- `test-fixtures`：增加各 policy、accepted warning、incomplete scan 与 exit code 的入口级证明。

## Impact

- 影响 argument parsing、quality result model、output、CLI status、dogfood/CI consumers 和 tests/docs。
- 依赖 `make-scan-completeness-observable` 先区分可信 completed scan 与 incomplete measurement。
- 不定义 stable machine schema；schema stabilization 在本 change 之后独立进行。
