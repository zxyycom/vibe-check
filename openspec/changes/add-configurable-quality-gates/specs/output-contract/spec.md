本 delta 起草 gate result 在既有 output surfaces 上的一致投影；当前 change 仅在 `openspec/changes/add-configurable-quality-gates/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## ADDED Requirements

### Requirement: Gate result projection

Output layer SHALL 从 product core 产出的同一 `GateResult` 投影 `metrics.json`、Markdown report 与 console completion，且 MUST NOT 重新选择 warning channel、重新应用 `acceptedReason` 或重新计算 blocking warnings。Machine artifact MUST 记录 policy、evaluated channel、status、evaluated count、blocking count、blocking warnings 与 optional not-evaluated reason；human output MUST 清楚区分 quality warning、gate failure 与 runtime/completeness failure。`warnings.ndjson` 和 `warnings-all.ndjson` MUST 继续表达各自 warning channels，不得因 gate policy 删除 accepted 或 non-selected warnings。

#### Scenario: Passed gate is consistent across outputs

- **WHEN** complete scan 的 selected gate 没有 blocking warnings
- **THEN** metrics、report 与 console 都表达同一 policy、channel、counts 与 `passed`
- **AND** warning artifacts 保持原 channel 内容

#### Scenario: Failed gate writes evidence before exit

- **WHEN** complete scan 的 selected gate 存在 blocking warnings
- **THEN** metrics 与 report 在 CLI exit `1` 前记录同一 `failed` result 和 blocking warnings
- **AND** console 不把结果显示为 runtime failure或 unqualified success

#### Scenario: Incomplete scan does not fabricate a gate outcome

- **WHEN** overall completeness 为 `failed`
- **THEN** output 将 gate 显示为 `not-evaluated` 并记录 reason
- **AND** output 不显示 gate passed或 gate failed
