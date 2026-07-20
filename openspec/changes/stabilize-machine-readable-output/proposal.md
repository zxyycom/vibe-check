## Why

当前产品会写出 `metrics.json` 和 warning NDJSON，但这些 TypeScript artifacts 没有
current-product schema、稳定 identity 或统一接受条件。仓库中的 JSON schema/examples
属于已退役 Rust report；`quality:annotate` 只检查少量字段并跳过 malformed records。
调用者因此无法区分完整可信的 current output 与结构漂移或部分损坏的 output。

Scan completeness 与 quality gate 已稳定并归档。本 change 固定它们现有的 machine
projection，使产品 automation 可以依赖 artifacts，同时避免把 core implementation
细节直接变成 transport contract。

## What Changes

- Output 从 final `QualityMetrics` / `WarningRecord` 投影
  `MachineMetricsV1` / `MachineWarningV1`；core models 继续拥有业务语义，machine DTO
  只拥有公开 serialization。
- Canonical files 保持为 `metrics.json`、`warnings.ndjson` 与
  `warnings-all.ndjson`。Metrics identity 固定为 `vibe-check.metrics.v1`，每个 serialized
  warning identity 固定为 `vibe-check.warning.v1`。
- Product-owned runtime schemas 成为 machine field、requiredness、type、enum、
  nullability 与 numeric constraint 的 source of truth；checked-in JSON Schemas 与
  TypeScript DTO 必须与其一致。
- Producer 在写 canonical machine files 前验证 candidate bytes、schemas、warning
  framing、cross-artifact equality 与公开 semantic invariants。Validation 或 publication
  failure 保持 output failure / Product CLI exit `2`。
- Product 提供一个 artifact-set validator 和一个 warning-stream validator；两者复用同一
  current warning schema/framing definitions，分别服务 producer/set validation 与实际
  annotation input boundary。
- `quality:annotate` 对完整 byte input 做全量验证；valid non-empty/zero-byte input 退出
  `0`，参数、读取或 contract failure 作为 infrastructure failure 退出 `2`，并且不渲染
  部分 records。
- `docs/examples/artifacts/` 提供 deterministic complete、warning、empty、gate-failed 与
  scan-incomplete sets。Required validation 证明 schemas/examples 无 drift、关键
  invariants 有直接测试、正式 producer output 能被实际 annotation consumer 使用。
- Producer、canonical schemas/examples、validators、repository direct consumers、tests
  与 owner docs 在同一 change 显式硬切到唯一 current structure。

## Success Criteria

- 对同一次已完成 invocation，调用者可以用 canonical schemas 和公开 set rules 判断三个
  machine files 是否形成可信 current artifact set。
- Producer、published schemas、examples 与 `quality:annotate` 使用同一 warning
  structure；required validation 能发现 source、published schema 或 consumer drift。
- Contract/input failure 不产生成功或部分 annotation；Product CLI output failure 退出
  `2`，annotation infrastructure failure 也退出 `2`。
- Core 新增内部数据或重构时，只要 `MachineMetricsV1` / `MachineWarningV1` projection
  不变，就无需修改 machine schemas、examples 或 consumers。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `output-contract`：把现有 TypeScript machine artifacts 提升为 single-active、
  schema-validated、cross-artifact-consistent 的产品 contract。
- `test-fixtures`：增加 canonical examples、focused contract proofs 与
  producer-to-consumer acceptance。

## Impact

- 影响 Output DTO/serialization/validation、schema generation、docs validators、
  `quality:annotate`、required workspace checks 和对应 tests/docs。
- `src/product/**` 继续拥有 runtime contract source；product runtime 不读取 `docs/**` 或
  `scripts/**`。Published schemas 由 product definitions 生成并通过 drift check。
- Console、`report.md` 与 raw scanner artifacts 保持各自既有边界；machine identity 不改变
  human report contract。
- 不改变 scanner、threshold、warning generation、completeness、gate evaluation、config
  selection、canonical artifact filenames 或 Product CLI process-outcome mapping。
