> **核心句：**本spec定义named `DecisionPolicy` catalog及其single evaluator：Core只组合standard records、comparison relations与capability runs，不加入capability-specific判断。

## Purpose

让调用者可以选择一个named `DecisionPolicy`，以acceptance annotations、views和`blockWhen`组合多个质量能力的结果，同时保持确定性、可审计性与capability/Core责任分离。

## ADDED Requirements

### Requirement: Decision policy is closed declarative data

Product SHALL 在capability work前解析并验证一个detached normalized `DecisionPolicy` catalog。Catalog MUST把stable `policyId`映射到独立policy；`--gate <policy-id>`至多选择其中一项。每个可选择policy MUST声明exactly one `blockWhen`，并 MAY声明required capabilities、profile constraints、named references、acceptance rules和named record views。Policy内部不得再声明named gate或引用另一个policy。

Normalized policy SHALL固定以下语义边界，而不要求public config复用其内部表示：

- Base record predicate只可读取`capabilityId`、`checkId`、`recordId`、`level`、subject kind/identity/path、catalog声明为policy-queryable的typed fields、causal paths和comparison relation/reference fields；message、current location、sequence及backend/private values不可查询。View与`blockWhen`可额外读取前一阶段产生的acceptance rule IDs，acceptance selector本身不可读取acceptance annotations。
- Run predicate只可读取`capabilityId`、status、`planned`、`finished`、`unprocessed`、`committedRecordCount`和closed diagnostic kind。
- Scalar predicate只支持presence、typed equality/inequality与finite-number ordering；wrong-kind comparison必须在work前失败，不能做string coercion或message parsing。
- Boolean expression只支持non-empty `and`、non-empty `or`与single-child `not`。
- Collection reducer只支持对record view或capability run集合执行`any`、`all`、`none`和count；count只可与non-negative integer使用typed equality或ordering比较。

Evaluation order MUST为acceptance annotations、named views、selected policy `blockWhen`。Acceptance不得依赖view；view之间的引用 MUST形成acyclic dependency graph；`blockWhen`可引用views与capability runs，但不得引用另一个policy。每个阶段只读取前一阶段的immutable结果。最终`blockWhen = true`产生failed，false产生passed。

`policyId`、acceptance rule ID、view ID与reference ID MUST使用ASCII lower-kebab。Policy fingerprint MUST覆盖fully resolved selected policy及其referenced declarations。Policy MUST NOT包含script、project executable、dynamic module、backend object、message parsing或unrestricted property access。Unknown capability/check/field/relation/reference/view/policy、wrong operand type、invalid reducer或dependency cycle MUST在capability/cache/artifact work前作为config/policy error失败。Public config的JSON authoring shape MAY演进，但 SHALL单向投影到这一normalized boundary；Core MUST NOT同时执行public-config-shaped或feature-specific evaluator。

Empty collection semantics MUST 固定为 `any = false`、`all = true`、`none = true`、`count = 0`。

#### Scenario: Different policies use the same evaluator

- **WHEN** 一个 policy 阻断任意 error record，另一个 policy 只阻断 failed security run
- **THEN** Core 用同一 closed evaluator 计算两者
- **AND** 不需要 error/security-specific Core branch

#### Scenario: Executable policy is rejected

- **WHEN** config 尝试通过 script、module 或动态 property 表达 gate
- **THEN** policy validation 在 scan work 前失败并给出恢复动作
- **AND** Product 不执行或静默降级该输入

### Requirement: Named views and acceptance do not mutate records

Named view SHALL 从同一 immutable final record set 投影 canonical ordered record IDs。View name（包括 `all`、`warning`、`changed`、`regression`）MUST NOT 获得 Core 内置优先级、reference 或 subset 语义；同一 record MAY 属于 zero 或多个 views。

Acceptance rule SHALL 使用stable semantic selector匹配records，并产生独立`(recordId, ruleId, reason)`annotation。这里的`ruleId` MUST是resolved policy拥有的stable acceptance-rule ID，不是record `checkId`或legacy warning `ruleId`；`reason` MUST为non-empty user-facing text。Annotation MUST NOT改变record identity、level、message、fields、relations或source order。每个resolved policy MUST把unmatched acceptance mode固定为`ignore | diagnostic | error`之一；unmatched rule MUST NOT使Core合成`QualityRecord`。

#### Scenario: Policy-accepted record stays visible

- **WHEN** acceptance rule 匹配一个 warning-level record
- **THEN** record 保持原值并获得独立 annotation
- **AND** gate 只有在其 policy 明确排除该 annotation 时才不阻断

#### Scenario: View names carry no hidden logic

- **WHEN** policy 定义名为 `changed` 和 `regression` 的两个 views
- **THEN** Core 只按各自 selectors 投影 record IDs
- **AND** 不强制两者共享 reference 或满足 subset 关系

### Requirement: Comparison references are explicit and capability-owned

任一capability或selected `DecisionPolicy`需要comparison时，MUST声明stable named reference并要求调用者提供对应input。Product MUST在capability、cache和artifact work前将输入解析一次为invocation内immutable identity；不得从commit history、branch、merge base、remote、cache或dependency state推断缺失reference。

Capability SHALL 使用自己的 semantic identity 和 comparator emit catalog-valid comparison relations。Core 只验证 relation/reference membership并提供给views/policy；它 MUST NOT 猜测匹配对象、计算领域 delta 或把某个 relation 自动命名为 change/regression。Reference materialization或某项comparison只能获得partial evidence时，records与capability run如实保留，最终影响由selected policy决定。

#### Scenario: Two comparisons use different references

- **WHEN** policy 为同一 capability 提供 release 与 branch references
- **THEN** capability 可以 emit 分别绑定两个 reference IDs 的 relations
- **AND** Core 不选择唯一 global baseline

#### Scenario: Missing reference fails before work

- **WHEN** selected policy 需要 named reference但调用者没有提供
- **THEN** Product 在 capability/cache/artifact work 前返回 actionable request error
- **AND** 不自动选择 repository history 中的替代 reference

### Requirement: Gate result reports decision and evidence, not policy source

省略gate request SHALL不选择或执行`DecisionPolicy`，并产生`disabled` result；selected policy ID与fingerprint MUST为null，policy-derived acceptance annotations、view memberships与evidence MUST为空。Evaluated result MUST包含non-null selected policy ID、resolved policy fingerprint、`passed | failed` status和canonical evidence references；`failed`与`passed`分别对应producing evaluator的`blockWhen`为true与false。Evidence MAY引用published record IDs和capability IDs，MUST NOT复制或修改records/runs；当结果由empty collection semantics成立时，evidence MAY为空。

`run.json` MUST NOT 嵌入完整 resolved policy 或要求 machine consumer重放gate。Core SHALL 在 output projection前验证policy evaluation与final model；artifact-set validator只验证policy identity/fingerprint shape、evidence引用完整性、canonical order和status-specific fields。需要复现policy的调用者 SHALL 使用产生该fingerprint的config/resolution材料或独立explain-config输出。

Capability failed、partial coverage、record level或record count本身 MUST NOT 自动决定 gate。Policy evaluation failure是Product failure，不得伪装成 evaluated gate result。

#### Scenario: Capability failure follows selected policy

- **WHEN** capability run failed但selected policy不阻断该状态
- **THEN** evaluator仍可基于其余 records/runs产生passed result
- **AND** failed run保持可见，不被Core固定为not-evaluated或process failure

#### Scenario: Omitted gate has no implicit policy

- **WHEN**调用者省略gate request
- **THEN**result为`disabled`且policy identity为null
- **AND**acceptance annotations、view memberships与evidence均为空

#### Scenario: Consumer does not need a second evaluator

- **WHEN** machine consumer读取run summary与record stream
- **THEN**它可以取得policy identity、decision和referenced evidence
- **AND**它不需要解析project config或执行normalized policy才能消费结果
