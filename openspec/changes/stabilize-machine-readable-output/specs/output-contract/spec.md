本 delta 起草当前 TypeScript machine artifacts 的 versioned contract；当前 change 仅在 `openspec/changes/stabilize-machine-readable-output/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## ADDED Requirements

### Requirement: Versioned current-product machine artifacts

Output layer SHALL 继续写出 `metrics.json`、`warnings.ndjson` 与 `warnings-all.ndjson`，并 MUST 使用 current-product schemas `docs/schemas/vibe-check-metrics.schema.json` 与 `docs/schemas/vibe-check-warning.schema.json` 验证。`metrics.metadata.schemaVersion` MUST 为 `vibe-check.metrics.v1`；每个 warning record MUST 包含 `schemaVersion: "vibe-check.warning.v1"`。Schemas MUST 固定 product-owned fields、requiredness、types、nullability、closed enums 与语义，且 MUST NOT 复用 retired Rust `vibe-check.report.v1` envelope。Console、Markdown report 与 raw scanner artifacts MUST NOT 成为该 machine schema 的替代 transport。

#### Scenario: Complete metrics artifact validates as v1

- **WHEN** complete 或 legitimate empty scan 写出 `metrics.json`
- **THEN** artifact 具有 `vibe-check.metrics.v1` identity 并通过 current metrics schema
- **AND** completeness、quality、gate、metrics 与 warning channels 保持 product model semantics

#### Scenario: Warning streams contain self-identifying records

- **WHEN** output 写出 changed 或 all warning stream
- **THEN** 每个非空行都是通过 warning schema 的 `vibe-check.warning.v1` record
- **AND** zero-warning stream 是空文件而不是 header、sentinel 或 JSON array

#### Scenario: Retired report contract is not reused

- **WHEN** reviewer或 consumer 查找 current-product machine schema
- **THEN** navigation 指向 metrics 与 warning schemas
- **AND** 不把 `vibe-check.report.v1` schema/examples 当作当前 artifacts

### Requirement: Cross-artifact consistency and version evolution

Output validation SHALL 证明 `warnings.ndjson` 的 ordered records 与 `metrics.warnings.changed` deep-equal，且 `warnings-all.ndjson` 与 `metrics.warnings.all` deep-equal。Unknown version、schema-invalid instance、channel length/order/content mismatch MUST 使 output 失败并使用 runtime/output failure semantics。`vibe-check.metrics.v1` 与 `vibe-check.warning.v1` 下的 fields、requiredness、types、closed enums、nullability、单位、排序含义和语义 MUST 保持冻结；任何改变有效 instance 集合或 consumer interpretation 的演进 MUST 使用新 version、schema、examples 与 migration说明。

#### Scenario: Adjacent artifacts agree exactly

- **WHEN** producer 完成 metrics 与 warning artifacts
- **THEN** changed/all NDJSON records 分别与 metrics 中对应 channel 数量、顺序和内容完全一致
- **AND** gate policy 不删除 accepted 或 non-selected warning records

#### Scenario: Invalid machine output fails closed

- **WHEN** artifact 含 unknown schema token、缺失 required field、invalid record 或 cross-artifact mismatch
- **THEN** validation 将运行分类为 runtime/output failure
- **AND** CLI 不返回 gate exit `1` 或 success exit `0`

#### Scenario: Contract evolution requires a new identity

- **WHEN** producer 需要新增/删除字段、改变 requiredness/type/nullability/closed enum 或改变既有字段语义
- **THEN** change 发布新的 namespaced version、schemas、examples 与 consumer migration
- **AND** 不在 v1 token 下静默改变 contract

### Requirement: Stable fields are the automation boundary

Repository automation SHALL 只消费 current schemas 声明的 stable fields，并 MUST 在 unknown version 或 schema-invalid input 上 fail closed。CI annotation、workspace verifier 与 dogfood consumer MUST NOT 从 operational console、Markdown formatting 或 scanner-private raw output 推导 machine decision。

#### Scenario: Automation consumes declared fields

- **WHEN** CI annotation、workspace verifier 或 dogfood summary 读取 scan result
- **THEN** consumer 验证 schema identity并只访问 current schema 声明的 fields
- **AND** console wording或 report table formatting 变化不影响 consumer

#### Scenario: Unsupported version is explicit

- **WHEN** automation 遇到不支持的 metrics 或 warning schema token
- **THEN** consumer 报告 actionable incompatibility并 fail closed
- **AND** 不按 v1 shape 猜测解析
