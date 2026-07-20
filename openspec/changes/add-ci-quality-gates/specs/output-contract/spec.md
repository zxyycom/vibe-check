## ADDED Requirements

### Requirement: Gate result projection

Output layer SHALL 从 product core 产出的同一 discriminated `GateResult` 投影 `metrics.json`、Markdown report 与 console completion，且 MUST NOT 重新选择 warning channel、重新应用 `acceptedReason`、重新排序 records 或重新计算 blocking warnings。`metrics.json` MUST 总是记录完整 result；省略 gate 时 report 与 console MUST 保持既有人读结构且不显示 gate section；请求 gate 时 report MUST 在 summary area、detailed findings 前提供 deterministic gate section，console MUST 显示同一 policy、status 与 state-specific fields。`all` gate human output MUST 将结论限定在 resolved profile，并保留 skipped-capability evidence。`not-evaluated` output MUST 显示 closed reason code，并从 capability diagnostics 或 `metrics.baseline.status` 提供行动信息。

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
- **AND** human output 使用 owning diagnostic 提供行动信息，不显示 gate passed 或 failed

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
