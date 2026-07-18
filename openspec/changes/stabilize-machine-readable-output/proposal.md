本 proposal 只起草当前 TypeScript 产品既有机器可读 artifacts 的稳定 contract；当前 change 仅在 `openspec/changes/stabilize-machine-readable-output/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## Why

当前产品会写出 `metrics.json` 和 warnings NDJSON，但仓库没有声明这些 TypeScript artifacts 遵循哪个 schema；现存 JSON schema/examples 又明确属于已退役 Rust contract。自动化 consumer 因而只能依赖未承诺的内部 shape，字段演进和错误状态都缺少兼容性依据。

## What Changes

- 为现有 `metrics.json` 定义 current-product JSON schema、schema version 与兼容性规则，不新增平行 result artifact。
- 为 `warnings.ndjson` / `warnings-all.ndjson` 定义共享 warning-record schema 与逐行验证。
- **BREAKING（机器 artifact contract）**：以 `vibe-check.metrics.v1` 和 `vibe-check.warning.v1` 取代未承诺的 pre-contract version 标记；artifact 名称保持不变。
- 提供 complete、empty、warning、gate-failed 和 runtime-failed 等代表性 examples；具体集合以先行 completeness/gate contracts 为准。
- 让 repository automation 只消费已声明的 stable fields，不解析任意 console text 或 scanner-private output。
- 保持 console 为人读 operational output；本 change 不增加 JSON stdout mode、gate policy 或新 scanner behavior。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `output-contract`：把现有 TypeScript machine artifacts 提升为 versioned、schema-validated 的正式 contract。
- `test-fixtures`：增加 current-product schema/examples、cross-artifact consistency 与 consumer compatibility proof。

## Impact

- 影响 metrics/warning serialization、schema/examples、output validation、CI annotation、workspace verifier 和对应 tests/docs。
- 实现应在 scan completeness 与 quality gate contracts 收敛后进行，避免刚稳定 schema 又立即改动核心状态字段。
- 不改变 CLI exit、threshold、warning generation、scanner inputs、config selection 或 artifact names。
