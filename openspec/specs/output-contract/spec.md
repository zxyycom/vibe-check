# output-contract Specification

## Purpose
定义 TypeScript/Bun 产品如何从同一 core 结果投影 console、metrics、Markdown、warning
streams、completeness 与 GateResult，并固定 human/machine/raw 边界、可信发布条件和
output failure 优先级。
## Requirements
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

### Requirement: Current product ownership notices
Human-readable reports SHALL retain top and footer non-blocking development snapshot notices while naming the TypeScript/Bun product as the current release-contract owner. The top notice MUST identify the TypeScript/Bun product CLI, report contract, and product tests as the release contract. The footer notice MUST identify TypeScript/Bun product tests and contract validation as the release gates. Neither notice SHALL identify the retired Rust CLI, Rust schema, or Rust tests as the current owner. Updating these notices MUST preserve artifact shape, fields, status, section ordering, report structure, and machine-readable output.

#### Scenario: Top notice names the current release contract
- **WHEN** a human-readable quality report renders its top non-blocking notice
- **THEN** the notice names the TypeScript/Bun product CLI, report contract, and product tests as the release contract
- **AND** it does not name the retired Rust CLI, schema, or tests as the current release contract

#### Scenario: Footer notice names the current release gates
- **WHEN** a human-readable quality report renders its footer notice
- **THEN** the notice names TypeScript/Bun product tests and contract validation as the release gates
- **AND** it does not name Rust tests or Rust schema validation as the current release gates

#### Scenario: Notice replacement preserves report contracts
- **WHEN** both current-product notices replace the retired Rust notices
- **THEN** artifact shape, fields, status, section ordering, report structure, and machine-readable output remain unchanged

### Requirement: Completeness is visible across output surfaces

Output layer SHALL 从 product core 的同一 final capability results 与 overall completeness 投影 console summary/completion、`metrics.json` 和 `report.md`，MUST NOT 重新计算 capability status 或 overall。

Machine artifacts SHALL 提供 overall completeness、每项 capability 的 ID/status，以及 failed result 的 normalized diagnostic。Human output SHALL 区分 profile skip、no input、successful zero findings 与 failure。稳定 schema identity、最终 field naming/nesting、compatibility 和 examples 由后续 machine-output change 定义。

#### Scenario: Complete scan reports succeeded capabilities

- **WHEN** scan overall completeness 为 `complete`
- **THEN** machine artifact 和 human summary 表达相同的 complete state
- **AND** human completion 可以根据 normalized quality warnings 显示 passed 或 warning

#### Scenario: Empty scan is visible as warning

- **WHEN** scan overall completeness 为 `empty`
- **THEN** machine artifact 表达 `empty`，human completion 显示 warning
- **AND** human text 说明没有 eligible input、质量未评价，不显示绿色通过

#### Scenario: Capability states retain product meaning

- **WHEN** quick profile skip、no input 与 successful zero findings 出现在 capability results 中
- **THEN** output 分别表达 `skipped`、`no-input` 与 `succeeded`
- **AND** 不把任何一种状态显示为 component failure

#### Scenario: Failed measurement writes actionable evidence

- **WHEN** capability result 为 `failed`
- **THEN** 在 failure model 可验证且 artifacts 可写时，console、report 和 machine artifact 都显示 overall failed 与 normalized diagnostic
- **AND** human completion 显示 capability、原因与恢复动作，不包含可信 `passed` 结论

### Requirement: Gate result projection

Output layer SHALL 从 product core 产出的同一 discriminated `GateResult` 投影 `metrics.json`、Markdown report 与 console completion，且 MUST NOT 重新选择 warning channel、重新应用 `acceptedReason`、重新排序 records 或重新计算 blocking warnings。`metrics.json` MUST 总是记录完整 result；省略 gate 时 report 与 console MUST 保持既有人读结构且不显示 gate section；请求 gate 时 report MUST 在 summary area、detailed findings 前提供 deterministic gate section，console MUST 显示同一 policy、status 与 state-specific fields。`all` gate human output MUST 将结论限定在 resolved profile，并保留 skipped-capability evidence。`not-evaluated` output MUST 显示 closed reason code；行动信息来源 MUST 固定为：`scan-incomplete` → failed capability diagnostic，`no-eligible-input` → resolved profile/scan scope，`comparison-unavailable` → `metrics.baseline.status`。

#### Scenario: Disabled gate does not claim success

- **WHEN** metrics gate result 为 `disabled`
- **THEN** `metrics.json` 记录 disabled result
- **AND** report 与 console 不新增 gate section 或“gate passed”completion

#### Scenario: Passed gate is consistent across outputs

- **WHEN** requested gate 被评价且没有 blocking warnings
- **THEN** metrics、report 与 console 表达同一 policy、channel、counts 与 `passed`
- **AND** existing warning and capability output 保持可见

#### Scenario: Missing evidence is not reported as passed

- **WHEN** requested gate result 为 `not-evaluated`
- **THEN** metrics、report 与 console 显示同一 policy 与 reason code
- **AND** human output 的行动信息来源固定为：`scan-incomplete` → failed capability diagnostic，`no-eligible-input` → resolved profile/scan scope，`comparison-unavailable` → `metrics.baseline.status`
- **AND** human output 不显示 gate passed 或 failed

### Requirement: Trustworthy gate publication

Evaluated gate completion SHALL 写 stdout，且 evaluated gate failure 本身 MUST NOT 写 fatal stderr；`not-evaluated`、runtime、completeness 与 output failure MUST 使用 failure stderr boundary。`warnings.ndjson` 与 `warnings-all.ndjson` MUST 保持既有 channel records、ordering 与 `acceptedReason`，selected policy MUST NOT 删除 accepted、non-selected 或 non-blocking warnings。Gate failure 只有在 artifacts 写出并通过 output validation 后才能形成可信 `gate-failed` process outcome；artifact write 或 output validation failure MUST 保持 runtime/output failure，并 MUST NOT 被显示为可信 gate failure。

#### Scenario: Failed gate writes evidence before exit

- **WHEN** evaluated gate 存在 blocking warnings，且 artifacts 已写出并验证
- **THEN** metrics 与 report 记录同一 `failed` result 和 blocking warnings
- **AND** stdout 显示 gate-failed completion，stderr 不因 gate failure 本身显示 fatal error

#### Scenario: Output failure outranks a blocking result

- **WHEN** gate 已计算，但 artifact write 或 output validation 失败
- **THEN** console 使用 runtime/output failure conclusion
- **AND** 未完成验证的 artifacts 不作为 gate-failure evidence

#### Scenario: Gate selection does not mutate warning streams

- **WHEN** 同一 normalized warning data 使用 disabled request 或任一 gate policy
- **THEN** warning streams 保持原 records、ordering 与 `acceptedReason`
- **AND** blocking warnings 只由 `GateResult` 表达
