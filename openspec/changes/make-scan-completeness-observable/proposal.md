本 proposal 只起草“扫描结果必须说明完成了哪些能力”的 contract change；当前 change 仅在 `openspec/changes/make-scan-completeness-observable/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## Why

当前 availability preflight 会把缺失 scanner 标记为 skipped，随后仍可能产生 `passed`；例如缺少 scc 时可以输出 `Files: 0`、保留 function metrics 并成功退出。调用者无法仅从最终状态判断结果是完整、按 profile 有意跳过、没有输入，还是因依赖缺失而残缺。

## What Changes

- 为每项 scanner capability 建立稳定 completeness record，至少区分 `not-planned`、`no-input`、`succeeded`、`unavailable` 与 `failed`。
- scan plan 在文件收集后决定本 profile 真正需要的 capability，避免为 no-input 或 profile-disabled capability 做无意义 preflight。
- 机器 artifact、human report 和 console summary 从同一 completeness data 投影。
- **BREAKING**：已计划且有输入的必要 capability 若 unavailable，不再产生可信的 `passed`；最终 outcome 和 CLI exit 按审计后确定的 failure policy 映射。
- 保持正常 no-input、quick profile 有意跳过 jscpd、正常 zero findings 与 component failure 可观察地区分。

## Capabilities

### New Capabilities

- `scan-completeness`：定义 capability planning、completion records、结果可信度与 outcome 映射。

### Modified Capabilities

- `quality-metrics`：聚合和最终状态消费 completeness，而不是把缺失 measurement 当作可信 zero。
- `output-contract`：在 console、report 与 machine artifacts 中一致呈现 completeness。
- `cli-contract`：将不完整扫描映射到明确、可自动化判断的进程状态。

## Impact

- 影响 scan planning、tool availability、metrics model、validation、console、report、artifact 和 CLI status mapping。
- 稳定 schema/example 由后续 `stabilize-machine-readable-output` change 负责；本 change 先稳定 completeness source data。
- 不改变 scanner 算法、threshold、warning rule 或 config discovery。
