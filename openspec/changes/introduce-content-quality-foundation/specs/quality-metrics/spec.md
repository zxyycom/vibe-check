本 delta spec 将 finding variants 接入既有 channel/gate，同时隔离 non-finding observations；它是临时 change artifact，尚未完成实现前审计。

## ADDED Requirements

### Requirement: Finding variants share channel and gate semantics

Quality core SHALL 将现有 metric warnings 投影为 `kind = metric` findings，并接受成功 content/security capabilities 产生的 closed non-metric variants。`all`、`changed`、`regressions` channels、acceptance 与 gate evaluation SHALL 只依赖 finding common fields 和 capability-owned comparison eligibility；它们 MUST NOT 要求每个 record 都具有 numeric value、backend source 或 baseline delta。

Channel builder SHALL 保持 `changed` 是 `all` 的 order-preserving subsequence、`regressions` 是 `changed` 的 order-preserving subsequence。`changed` membership MUST 消费 producing descriptor 按 `content-findings` 定义的 causal input path set，而不能一律只检查finding primary path；`regressions` MUST 只从这些 changed current candidates 中执行有效 explicit-baseline comparison。Causal path set是Core-only derivation，不增加machine field或改变finding stable identity。

Finding 的 `checkId` SHALL 是 public product semantic identity；backend/tool identity MAY 作为 variant 允许的 diagnostic metadata，但 MUST NOT 成为配置、acceptance 或 gate selection 的必要知识。

#### Scenario: Existing metric behavior survives the foundation migration

- **WHEN** scan 只运行现有 file/function/duplicate capabilities
- **THEN** thresholds、comparison、channel membership、acceptance 与 gate verdict 保持迁移前语义
- **AND** metric records 通过显式 metric variant 投影而不是宽松 optional-field object

#### Scenario: Non-metric finding uses the same blocking policy

- **WHEN** selected channel 同时包含 metric 与 content findings
- **THEN** gate 按 channel order 评价所有未接受 records
- **AND** 不因 content record 没有 numeric value 而删除、改写或重新排序它

#### Scenario: Dependency-aware change preserves channel subsequences

- **WHEN** multi-input capability 的 primary source 未变，但参与current finding结论的approved dependency path位于resolved changed scope
- **THEN** finding按`all`中的原顺序进入`changed`，有效explicit-baseline下的新identity才可继续进入`regressions`
- **AND** artifact-set仍证明`changed`是`all`子序列且`regressions`是`changed`子序列

### Requirement: Observations remain outside warning evaluation

Quality core SHALL 保留成功capability产生的current `ObservationRecord`，但 MUST NOT把它们加入`all`、`changed`、`regressions`、acceptance matching或gate blocking set。Finding引用同一semantic metric时 SHALL independently按finding contract进入channels；observation是否存在不得自动产生或接受finding。

#### Scenario: Observation does not block an all gate

- **WHEN**complete scan含Markdown length observations但没有任何finding
- **THEN**`all` gate evaluated finding count与blocking set均保持zero
- **AND**machine metrics仍保留observations作为非阻断事实
