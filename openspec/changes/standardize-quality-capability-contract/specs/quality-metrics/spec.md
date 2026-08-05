> **核心句：**本 delta 将现有file/function/duplicate质量逻辑收敛为capability-owned record production，并把通用decision责任移交给`quality-decision-policy`。

## MODIFIED Requirements

### Requirement: Quality metrics owner documentation

Quality metrics SHALL有long-term owner document，说明现有file/function/duplicate capabilities如何消费resolved semantic settings、产生standard `QualityRecord`、声明stable check/catalog语义和执行comparison。Owner MUST明确threshold、allowance、measurement interpretation与final record level属于producing capability；generic views、acceptance和gate属于`quality-decision-policy`，machine projection属于`output-contract`。`docs/navigation.md` MUST引用该owner。

#### Scenario: Reviewer finds the metric capability boundary

- **WHEN**reviewer查找file/function/duplicate threshold或comparison规则
- **THEN**navigation指向记录capability-owned semantics的owner
- **AND**owner不把fixed warning channels或generic gate evaluator描述为metrics责任

### Requirement: Function comparison uses line-independent unambiguous identity

Function capability SHALL使用normalized project-relative file path与exact stable function name匹配current和explicit named reference data，MUST NOT将start/end line或其它当前位置加入comparison identity。`(anonymous)`、`unknown`、empty与all-whitespace name MUST NOT形成可比较identity；任一侧同文件同名候选不唯一时，capability MUST保持unmatched，不得按line、candidate order或cross-file search猜测。

Current location MAY进入record subject但 MUST NOT参与`recordId`。Matched/new/unmatched与baseline/delta data SHALL由function capability作为catalog-valid relation/fields输出；Core不得计算function-specific comparison或固定regression membership。

#### Scenario: Preceding line edits preserve identity

- **WHEN**同文件同名function只因前置源码变化而移动位置
- **THEN**stable record identity和合法comparison match保持不变
- **AND**current location仍可用于annotation

#### Scenario: Duplicate names remain unmatched

- **WHEN**current或reference存在多个同文件同名candidates
- **THEN**capability不emit guessed matched relation
- **AND**Core不补做line/order/cross-file matching

## REMOVED Requirements

### Requirement: Completeness controls scan outcome and quality evaluation

**Reason**: Capability coverage与record validity改为独立事实，不再由metrics overall reducer决定全局结果。

**Migration**: 使用`CapabilityRun`和`quality-decision-policy`。

### Requirement: Gate evidence evaluation

**Reason**: Gate evaluation是所有capabilities共享的decision责任，不属于metrics owner。

**Migration**: 使用`quality-decision-policy`的closed policy与gate result contract。

### Requirement: Gate warning selection

**Reason**: 固定`all`、`changed`、`regressions` warning channels被named views与configurable reducers取代。

**Migration**: Built-in或project policy可以复用这些名字，但Core不赋予特殊语义。

### Requirement: Gate result invariants

**Reason**: Gate result、policy identity和evidence由`quality-decision-policy`统一拥有。

**Migration**: Machine projection引用新的generic gate result。

### Requirement: Semantic check configuration drives quality warnings

**Reason**: Capability直接emit final records，不再由Quality Core生成专用warning objects。

**Migration**: 使用新增的“Semantic settings drive metric capability records”。

### Requirement: Accepted warnings use stable semantic check identity

**Reason**: Acceptance成为immutable record annotation，不再修改warning或映射legacy machine identity。

**Migration**: Current config adapter把semantic accepted-warning entries投影为normalized acceptance rules；public v2 shape由`add-file-policy-overrides`拥有。

### Requirement: Explicit baseline provenance is immutable

**Reason**: `baseline`只是一个explicit named reference，不再拥有metrics-wide特殊pipeline。

**Migration**: 使用`quality-decision-policy`的explicit comparison reference contract；current `--baseline`继续提供名为`baseline`的reference input。

## ADDED Requirements

### Requirement: Semantic settings drive metric capability records

Resolved file/function/duplication settings SHALL按registry descriptor投影给对应capability。Producing capability MUST使用其threshold、allowance、classification和comparison语义决定是否emit、final level、message、typed fields与relations。Dependency name、command、args、availability和backend format MUST NOT参与public policy selection。

Core MUST NOT重新比较numeric values、生成warning、解析backend output或更改level。现有五个stable check IDs SHALL直接成为record catalog check IDs，不再映射到`ruleId`、`sourceTool`或fixed channel identity。

#### Scenario: File threshold is capability-owned

- **WHEN**resolved file settings提供code-line threshold且measurement超限
- **THEN**file capability直接emit final record及typed value/threshold data
- **AND**Core不生成第二条numeric warning

#### Scenario: Backend replacement preserves semantic records

- **WHEN**internal metric backend变化但capability contract不变
- **THEN**check IDs、record semantics和public settings保持不变
- **AND**backend identity不进入policy selector或machine record identity
