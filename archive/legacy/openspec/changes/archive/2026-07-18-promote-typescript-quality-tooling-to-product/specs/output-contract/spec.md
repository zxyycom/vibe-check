## MODIFIED Requirements

### Requirement: Shared report data projection
Output layer SHALL 按 pinned generation conditions 从 product core 产出的同一份 TypeScript metrics/report data 写出 `metrics.json`、`report.md`、`warnings.ndjson` 和 `warnings-all.ndjson`，并且 MUST NOT 独立重新计算 scanner metrics、warning channels、baseline/comparison 或 `passed` / `warning` / `failed` status。为复现 scanner behavior 保存的 raw artifacts SHALL 保持 adapter-private boundary，不得直接成为 stable product output field。

#### Scenario: Stable artifacts project the same product data
- **WHEN** 同一次已完成 scan 按既有生成条件写出 metrics、Markdown report 和 warning-channel artifacts
- **THEN** `metrics.json`、`report.md`、`warnings.ndjson` 和 `warnings-all.ndjson` 投影同一份 product metrics/report data
- **AND** Output 不重新运行 scanner 或重新计算 warning、baseline/comparison 与 status

#### Scenario: Raw scanner material remains private
- **WHEN** adapter 保存 normalized scanner reproduction material 或 raw artifact
- **THEN** 该 material 留在 scanner artifact boundary
- **AND** 第三方原生 output structure 不直接提升为 stable product output field

### Requirement: Empty-state output
Output layer SHALL 保持 pinned TypeScript consumer 对 zero scan inputs、zero metrics/findings、zero warnings、profile skip、baseline unavailable 与 fatal failure 的既有可观察区分。正常 empty result SHALL 按既有生成条件写出 metrics/report artifacts 和一致 console summary；fatal failure MUST NOT 被投影为 empty success。

#### Scenario: Completed empty result remains distinct
- **WHEN** scan 正常完成但没有 scan inputs、scanner findings 或 warnings
- **THEN** 既有 artifacts 和 console summary 表达相应 empty state
- **AND** 该结果不被标记为 fatal failure

#### Scenario: Profile skip and unavailable baseline remain observable
- **WHEN** quick profile 跳过既有 component，或 baseline comparison 不可用
- **THEN** artifacts 与 console 保持 pinned consumer 对 skip 或 unavailable state 的表达
- **AND** Output 不把这些状态重新分类为 successful finding 或 fatal failure

#### Scenario: Fatal failure is not empty success
- **WHEN** scanner/runtime fatal issue 阻止 scan 正常完成
- **THEN** Output 保持既有 fatal console、artifact 和 status behavior
- **AND** 不生成伪装为 zero-result success 的报告

### Requirement: Output owner documentation
Output 契约 SHALL 拥有长期 owner 文档，该文档 MUST 记录 operational console channels、`metrics.json`、`report.md`、`warnings.ndjson`、`warnings-all.ndjson`、raw scanner artifacts、adapter-private output boundary、empty/failure state 和 status consistency，并被 `docs/navigation.md` 引用。Owner 文档 MUST NOT 把 Rust human/JSON stdout mode、`vibe-check.report.v1` schema 或 examples 作为 TypeScript 产品 contract。

#### Scenario: Navigation points to TypeScript output owner
- **WHEN** reviewer 从 `docs/navigation.md` 查找输出规则
- **THEN** 导航文档指向记录现有 TypeScript console 与 artifact boundary 的 owner 文档
- **AND** owner 文档不要求 TypeScript 产品实现 Rust stdout report 或 schema/example contract

## REMOVED Requirements

### Requirement: JSON envelope
**Reason**: 该 requirement 定义 Rust `--format json` stdout envelope；pinned TypeScript product 通过 artifacts 交付机器结果。

**Migration**: 使用现有 `metrics.json` 与 warning NDJSON artifacts；本 change 不设计 replacement envelope。

### Requirement: Human output sections
**Reason**: 该 requirement 定义 Rust human stdout renderer 与 blocking gate sections，不属于 pinned TypeScript console/report behavior。

**Migration**: 使用既有 operational console text 与 `report.md`；不移植 Rust renderer。

### Requirement: Schema and examples
**Reason**: Rust JSON stdout schema 与 examples 不验证 pinned TypeScript artifact contract，也不是源码上移输入。

**Migration**: 无。现有 TypeScript tests、fixtures 和迁移前后 parity 证明 pinned artifact behavior；本 change 不新建 schema/examples。

### Requirement: Schema identity and validation boundary
**Reason**: `vibe-check.report.v1` 只标识即将删除的 Rust JSON stdout format。

**Migration**: 无。TypeScript product 保持既有 artifact serialization，不沿用或替换该 schema identity。

### Requirement: Basic metrics JSON projection
**Reason**: 该 requirement 固定 Rust envelope 中的 metrics fields 和 language ordering，不是 pinned TypeScript `metrics.json` contract。

**Migration**: 保持 pinned TypeScript metrics artifact behavior，不把 Rust field set 复制进新产品。

### Requirement: Basic metrics human projection
**Reason**: 该 requirement 固定 Rust human metrics sections 与 Rust empty state，不是现有 TypeScript `report.md` 或 console contract。

**Migration**: 保持 pinned Markdown report 与 console projection。

### Requirement: Warning and gate projection
**Reason**: 该 requirement 固定 Rust warning `blocking` field 和 blocking gate projection；pinned TypeScript consumer 使用 warning channels 与 `passed` / `warning` / `failed` status。

**Migration**: 保持现有 warning artifacts、accepted-warning behavior 与 status mapping；不引入 blocking gate。

### Requirement: Basic quality schema and examples
**Reason**: 该 requirement 只验证 Rust metrics、warning 与 gate JSON shape，TypeScript 源码上移不采用该 shape。

**Migration**: 无。迁移继续使用 pinned TypeScript tests、fixtures 和 artifact parity，不补 replacement schema/examples。

### Requirement: Language metric schema follows supported source set
**Reason**: 该 requirement 将 Rust 四语言 supported set 固化到 Rust JSON schema，与 pinned TypeScript scanner-specific selectors 和 artifacts 不一致。

**Migration**: 无。Scanner input selectors 由对应 scanner capability 维护；本 change 不创建全局 language enum。
