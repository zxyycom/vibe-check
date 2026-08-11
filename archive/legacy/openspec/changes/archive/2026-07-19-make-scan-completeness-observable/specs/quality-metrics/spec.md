## ADDED Requirements

### Requirement: Completeness controls scan outcome and quality evaluation

Aggregation SHALL 保留 capability results 与 missing measurement semantics，MUST NOT 用 zero、empty array 或 omitted field 把 failed capability 投影为成功 measurement。

Current overall completeness MUST 先于 quality evaluation 决定 core outcome：

1. `complete`：根据 normalized quality warnings 返回 `passed` 或 `warning`。
2. `empty`：不产生质量通过结论，core 固定返回 `warning`；该 warning MUST NOT 伪造成 normalized quality finding。
3. `failed`：core 返回 `failed`；warning 数量和其它 succeeded capability data MUST NOT 覆盖该结果。

#### Scenario: Missing file metrics does not become zero files passed

- **WHEN** file-metrics capability 有 eligible input，但 measurement failed
- **THEN** metrics 记录 capability 与 overall `failed`
- **AND** file count zero 不得导致 quality status `passed`

#### Scenario: Complete measurement determines quality outcome

- **WHEN** overall completeness 为 `complete`
- **THEN** normalized quality warnings 为空时 core 返回 `passed`
- **AND** normalized quality warnings 非空时 core 返回 `warning`

#### Scenario: Empty measurement is a non-fatal warning

- **WHEN** overall completeness 为 `empty`
- **THEN** core 返回 `warning`
- **AND** output 表达质量未评价，normalized quality warning channels 不增加虚构 finding

#### Scenario: Failed measurement cannot produce a quality verdict

- **WHEN** 任一 capability failed，即使其它 capability 已产生 metrics 或 warnings
- **THEN** overall 与 core outcome 都为 `failed`
- **AND** 这些数据只能作为诊断，不能形成可信 `passed` 或 `warning` 质量结论
