> **核心句：**本 delta 将现有 file、function 与 duplicate 逻辑迁移为 built-in CheckRunner 和 final QualityRecord producers，并删除 metrics-owned warning、completeness 与 gate 模型。

## MODIFIED Requirements

### Requirement: Quality metrics owner documentation

Quality metrics SHALL 有 long-term owner document，说明 `file-metrics`、`function-metrics` 与 `duplicate-detection` built-in checks 如何消费 resolved semantic settings、生成领域 measurements、返回 `CheckResult` 并提交 catalog-valid `QualityRecord`。Owner MUST 明确 threshold、allowance、measurement interpretation、final record level 及 comparison relation 属于 producing check；generic acceptance/view/gate 属于 `quality-decision-policy`，machine projection 属于 `output-contract`。`docs/navigation.md` MUST 引用该 owner。

#### Scenario: Navigation points to pinned TypeScript quality owner

- **WHEN**reviewer 从 navigation 查找 file/function/duplicate threshold、record 或 comparison 规则
- **THEN**navigation 指向记录 built-in CheckRunner、CheckResult 与 record semantics 的 owner
- **AND**owner 不把 fixed warning channels 或 overall completeness 描述为 metrics 责任

#### Scenario: Source lift preserves existing quality behavior

- **WHEN**reviewer 验证迁移后的 threshold、allowance、measurement 或 comparison 语义
- **THEN**owner 把当前 source、semantic config、tests 及迁移 parity 作为领域行为依据
- **AND**Check/Record hard cut 不顺带重设既有 metric 算法

### Requirement: Function comparison uses line-independent unambiguous identity

Function-metrics check SHALL 使用 normalized project-relative file path 与 exact stable function name 匹配 current 和 explicit named reference data，MUST NOT 将 start/end line 或其它当前位置加入 comparison identity。`(anonymous)`、`unknown`、empty 与 all-whitespace name MUST NOT 形成可比较 identity；任一侧同文件同名候选不唯一时，runner MUST 保持 unmatched，不得按 line、candidate order 或 cross-file search 猜测。

Current location MAY 进入 record subject 但 MUST NOT 参与 `recordId`。Matched/new/unmatched 与 baseline/delta data SHALL 由 runner 作为 catalog-valid relations/fields 提交；Core 不得计算 function-specific comparison 或固定 regression membership。

#### Scenario: Preceding line edits preserve function comparison

- **WHEN**同文件同名 function 只因前置源码变化而移动位置
- **THEN**stable record identity 和合法 comparison match 保持不变
- **AND**current location 仍可用于 annotation

#### Scenario: Same-file duplicate names remain unmatched

- **WHEN**current 或 reference 存在多个同文件同名 candidates
- **THEN**runner 不提交 guessed matched relation
- **AND**Core 不补做 line/order/cross-file matching

#### Scenario: Anonymous and unknown names are not identities

- **WHEN**function name 为 `(anonymous)`、`unknown`、empty 或 all-whitespace
- **THEN**runner 不形成 comparison identity 或 matched relation
- **AND**即使两侧各只有一个候选也不按 location 匹配

#### Scenario: New named function preserves new-function semantics

- **WHEN**current 存在同文件唯一具名 function 而 reference 没有同 identity 候选
- **THEN**runner 保留既有 new-function comparison semantics 并提交 catalog-valid relation/data
- **AND**Core 不重建 baseline-zero 或 regression 逻辑

#### Scenario: Cross-file move is not guessed

- **WHEN**同名 function 只在另一文件存在 reference candidate
- **THEN**runner 不执行 cross-file match
- **AND**record identity 与 relation 保持 file-scoped semantics

#### Scenario: Warning location remains current

- **WHEN**matched function 产生 current record
- **THEN**subject location 使用 current function 位置
- **AND**location 不参与 recordId 或 comparison identity

## REMOVED Requirements

### Requirement: Completeness controls scan outcome and quality evaluation

**Reason**: Check coverage、record validity 与质量 verdict 已是独立事实，不再由 metrics overall reducer 决定全局结果。

**Migration**: 使用 `CheckRun`、`CheckResult` 和 selected `DecisionPolicy`。

### Requirement: Gate evidence evaluation

**Reason**: Gate evaluation 是所有 checks 共享的 decision 责任，不属于 metrics owner。

**Migration**: 使用 `quality-decision-policy` 的 closed policy 与 GateResult contract。

### Requirement: Gate warning selection

**Reason**: 固定 `all`、`changed`、`regressions` warning channels 被普通 record views 与 declarative reducers 取代。

**Migration**: `regressions` 保留为一个 built-in policy ID，Core 不赋予其名字特殊逻辑。

### Requirement: Gate result invariants

**Reason**: GateResult、policy identity 和 evidence 由 `quality-decision-policy` 统一拥有。

**Migration**: Output 机械投影新的 generic GateResult。

### Requirement: Semantic check configuration drives quality warnings

**Reason**: Built-in runner 直接提交 final records，不再由 Quality Core 生成专用 warning objects。

**Migration**: 使用新增的“Semantic settings drive built-in metric checks”。

### Requirement: Accepted warnings use stable semantic check identity

**Reason**: Acceptance 成为 immutable record annotation，不再修改 warning 或映射 legacy machine identity。

**Migration**: Current config adapter 把 accepted-warning entry 的 semantic identity 投影到对应 built-in check/record type selector 和 normalized acceptance rule。

### Requirement: Explicit baseline provenance is immutable

**Reason**: `baseline` 成为一个 explicit named reference，不再拥有 metrics-wide 特殊 pipeline。

**Migration**: Current `--baseline` 继续提供名为 `baseline` 的 immutable reference；其解析与使用服从 CLI 和 DecisionPolicy reference contract。

## ADDED Requirements

### Requirement: Semantic settings drive built-in metric checks

Resolved file/function/duplication settings SHALL 分别投影给 `file-metrics`、`function-metrics` 与 `duplicate-detection` CheckRunner。Producing runner MUST 使用其既有 threshold、allowance、classification 和 comparison 语义决定 CheckResult，以及每条 record 的 final level、message、typed fields 与 relations。Dependency name、command、args、availability 和 backend format MUST NOT 参与 public semantic selection。

五个 existing semantic IDs `file-code-lines`、`function-cyclomatic-complexity`、`function-code-lines`、`function-parameter-count` 与 `duplicate-code` SHALL 成为所属 built-in check catalog 中的 stable `recordTypeId`，不再映射到 legacy machine `ruleId`、`sourceTool` 或 fixed channel。Core MUST NOT 重新比较 numeric values、生成 warning、解析 backend output 或更改 level。

#### Scenario: File threshold is runner-owned

- **WHEN**resolved file settings 提供 code-line threshold 且 measurement 超限
- **THEN**file-metrics runner 直接提交 final record 及 typed value/threshold data
- **AND**Core 不生成第二条 numeric warning

#### Scenario: Backend replacement preserves semantic records

- **WHEN**internal metric backend 变化但 built-in check contract 不变
- **THEN**check ID、record type IDs、result 与 record semantics 保持不变
- **AND**backend identity 不进入 policy selector 或 record identity
