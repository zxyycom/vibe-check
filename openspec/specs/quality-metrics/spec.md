# quality-metrics Specification

## Purpose
Define how Vibe Check turns collected supported files into basic quality metrics, warning findings, diagnostics, and gate results before output projection.
## Requirements
### Requirement: Quality metrics owner documentation
Quality metrics behavior SHALL have a long-term owner document under `docs/` that records pinned TypeScript product models, scc file metrics、Python/Lizard function metrics 与 jscpd duplicate boundaries、aggregation、`all` / `changed` / `regressions` warning channels、baseline comparison、quick/full profiles、`acceptedReason` behavior 和 `passed` / `warning` / `failed` status。该 owner MUST 明确不存在 Rust blocking-gate contract，并由 `docs/navigation.md` 引用；详细 TypeScript shape、threshold 和 algorithm SHALL 继续由 pinned source 与 product config 证明，而不是在本 migration delta 中重新设计。

#### Scenario: Navigation points to pinned TypeScript quality owner
- **WHEN** reviewer 使用 `docs/navigation.md` 查找 metrics、warning、baseline 或 status rules
- **THEN** 导航文档指向记录 pinned TypeScript models、scanner boundaries、warning channels、profiles、accepted reason 和三态 status 的 owner 文档
- **AND** owner 文档不要求 Rust blocking gate

#### Scenario: Source lift preserves existing quality behavior
- **WHEN** reviewer 验证迁移后的 metrics、warnings、baseline、profiles 或 status
- **THEN** owner 文档将 pinned TypeScript source、product config、tests 和迁移前后 parity 作为详细行为依据
- **AND** 不把本 delta 当作新的 field、threshold 或 algorithm 定义

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

### Requirement: Gate evidence evaluation

Quality core SHALL 从 normalized gate request、final overall completeness 与 final comparison status 产生一次 gate state，并使用固定优先级：omitted request 产生 `disabled`；`failed` completeness 产生 `not-evaluated: scan-incomplete`；`empty` completeness 产生 `not-evaluated: no-eligible-input`；`changed` / `regressions` 且 comparison 为 `baseline-unavailable` 时产生 `not-evaluated: comparison-unavailable`；其余 request 进入 warning evaluation。`input-unchanged` MUST 视为有效 comparison evidence。

#### Scenario: Omitted request is disabled

- **WHEN** scan 没有 gate request
- **THEN** gate status 为 `disabled`
- **AND** completeness 或 warnings 不改变 disabled state

#### Scenario: Empty measurement cannot certify a requested gate

- **WHEN** overall completeness 为 `empty` 且请求任一 policy
- **THEN** gate result 为 `not-evaluated: no-eligible-input`
- **AND** empty warning channel 不被描述成 passed gate

#### Scenario: Failed measurement cannot run a requested gate

- **WHEN** overall completeness 为 `failed`
- **THEN** gate result 为 `not-evaluated: scan-incomplete`
- **AND** completeness failure 不被分类为 evaluated gate failure

#### Scenario: Comparison policy requires comparison evidence

- **WHEN** complete scan 请求 `changed` 或 `regressions`
- **THEN** `compared` 或 `input-unchanged` 进入 warning evaluation
- **AND** `baseline-unavailable` 产生 `not-evaluated: comparison-unavailable`

### Requirement: Gate warning selection

For an evaluable gate, quality core SHALL 使用 policy descriptor 选择且只选择一个 final warning channel：`all` 选择 resolved profile 的 `warnings.all`，`changed` 选择 `warnings.changed`，`regressions` 选择 `warnings.regressions`。Evaluation MUST 在 accepted-warning reasons 应用后执行；具有非空 `acceptedReason` 的 warning MUST 保留在 channel 与 evaluated count 中，但 MUST NOT 进入 blocking set。Evaluator MUST 保留 selected-channel identity 与 ordering，不得修改 warning records、channel membership、profile capability results 或 quality status。Blocking set 为空时 gate MUST 为 `passed`，否则 MUST 为 `failed`。

#### Scenario: All gate evaluates the resolved profile

- **WHEN** complete scan 使用 `all` policy
- **THEN** gate 只评价 resolved profile 的 `warnings.all`
- **AND** profile-skipped capabilities 保持可见

#### Scenario: Comparison gate evaluates its selected channel

- **WHEN** complete scan 具有有效 comparison evidence，并使用 `changed` 或 `regressions`
- **THEN** gate 只评价 descriptor 指定的 channel
- **AND** empty blocking set 通过，non-empty blocking set 失败

#### Scenario: Accepted warnings remain visible but non-blocking

- **WHEN** selected channel 同时包含 accepted 与 unaccepted warnings
- **THEN** 所有 warnings 保持原 identity、ordering 与 evaluated membership
- **AND** 只有 unaccepted warnings 进入 blocking set

### Requirement: Gate result invariants

`QualityMetrics` SHALL 包含一个 normalized、status-discriminated `GateResult`：`disabled` result 只记录 `policy = null` 与 status；`passed` / `failed` result 记录 closed policy、descriptor-selected `evaluatedChannel`、`evaluatedWarningCount`、`blockingWarningCount` 与 `blockingWarnings`，且不记录 reason；`not-evaluated` result 只记录 closed policy、status 与 `scan-incomplete` / `no-eligible-input` / `comparison-unavailable` 之一的 `reasonCode`。Evaluated count MUST 等于 selected channel 长度，blocking count MUST 等于 blocking list 长度，zero/non-zero blocking count MUST 分别对应 `passed` / `failed`。Validation MUST reject unknown enum、状态不拥有的 extra/missing field、negative or non-integer count、count/list mismatch、policy/channel mismatch 与 status/count mismatch。

#### Scenario: Disabled result has no evaluated placeholders

- **WHEN** gate request 被省略
- **THEN** result 不包含 evaluated channel、counts、blocking list 或 reason
- **AND** consumer 只需按 `status = disabled` 判断未启用 gate

#### Scenario: Evaluated result preserves warning identity and order

- **WHEN** selected channel 包含 accepted 与 unaccepted warnings
- **THEN** evaluated count 等于 channel 长度，blocking list 按 channel 原顺序包含 unaccepted warnings
- **AND** blocking count 等于 blocking list 长度

#### Scenario: Invalid result combination fails validation

- **WHEN** GateResult 不满足 status-specific fields、enum、count/list 或 policy/channel invariants
- **THEN** metrics validation 返回 path-aware error
- **AND** invalid result 不得形成可信 gate 或 process outcome
