## Why

当前 runtime 在构造 scan scope 前检查全部 scanner，并把 unavailable component 当作 skip；后续空数组仍可能聚合为 `passed`。调用者因此无法判断结果是完整、profile 有意跳过、没有可执行输入，还是缺失必要 measurement。

## What Changes

- 在 normalized scope 之后，为 `file-metrics`、`function-metrics` 与 `duplicate-detection` 产生最小 final result，状态为 `skipped`、`no-input`、`succeeded` 或 `failed`。
- 让 failed result 使用 normalized failure kind 区分 component unavailable、execution failure 与 invalid result，并提供可行动诊断。
- 从同一 capability results 计算 current overall completeness：任一 failure 为 `failed`；至少一项成功且没有 failure 为 `complete`；没有 failure 且没有成功 measurement 为 `empty`。
- `complete` 才计算可信质量结论；`empty` 固定返回 `warning`、CLI 退出 `0`，并明确质量未评价；`failed` 返回 `failed`、CLI 退出 `2`。
- 让 `metrics.json`、`report.md`、console conclusion、core outcome 与 CLI exit 投影同一 completeness。
- **BREAKING**：有 eligible input 的 required capability 未完成时，不再以 empty metrics 得到成功结果。

## Capabilities

### New Capabilities

- `scan-completeness`：定义 current capability results、overall completeness 与结果可信度。

### Modified Capabilities

- `quality-metrics`：聚合和最终状态消费 completeness，而不是把缺失 measurement 当作可信 zero。
- `output-contract`：在 console、report 与 machine artifacts 中一致呈现 completeness。
- `cli-contract`：将不完整扫描映射到明确、可自动化判断的进程状态。

## Impact

- 影响 `src/product/quality-core/**` 的 input sequencing、adapter result、metrics model、aggregation 和 output，以及 Product CLI status mapping。
- 本 change 必须先于 `add-ci-quality-gates` 与 `stabilize-machine-readable-output` 落地；后两者分别消费 completeness 和冻结最终 serialized shape。
- Baseline comparison 保持当前行为，不参与 current completeness；其 failure policy 由独立 change 决定。
- 不改变 scanner 算法、cache policy、threshold、warning rule、supported input、config discovery 或 public machine schema compatibility。
