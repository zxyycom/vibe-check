> **核心句：**本 spec 定义一个 closed named `DecisionPolicy` evaluator，机械组合 immutable Check 与 Record snapshots，而不重新执行检查或解释领域数据。

## Purpose

让项目能够用可验证、可审阅的声明式逻辑组合检查结论、执行覆盖、记录与显式比较证据，并由一个统一 evaluator 产生可追踪 gate decision。

## ADDED Requirements

### Requirement: DecisionPolicy is closed declarative data

Product SHALL 在 check work 前解析并验证一个 detached normalized `DecisionPolicy` catalog。每个 ASCII lower-kebab `policyId` MUST 映射到独立 policy，并声明 exactly one `blockWhen`；policy MAY 声明 required check IDs、named references、acceptance rules 和 named record views。Policy 内部不得引用另一个 policy 或声明第二个 gate。

Record predicate 只能读取 `checkId`、`recordTypeId`、`recordId`、level、subject semantic fields、catalog 标记为 policy-queryable 的 typed fields、related paths 及 comparison relation/reference fields；message、current location、sequence 和 private values 不可查询。Check predicate 只能读取 `checkId`、CheckRun status/coverage/diagnostic kind 和 nullable CheckResult verdict。Scalar operations 只支持 presence、typed equality/inequality 及 finite-number ordering；boolean expression 只支持 non-empty `and`/`or` 和 single-child `not`；collection reducer 只支持 `any`、`all`、`none` 和 count 与 non-negative integer 的 typed comparison。

Empty collection semantics MUST 为 `any = false`、`all = true`、`none = true`、`count = 0`。Unknown check/type/field/relation/reference/view/policy、wrong operand type、invalid reducer、cycle、script、function 或 unrestricted property access MUST 在 check/cache/artifact work 前失败。Public JSON 或 TypeScript authoring MAY 演进，但 SHALL 单向投影到这一个 normalized boundary；Core 不得同时执行 authoring-shaped 或 feature-specific evaluator。

#### Scenario: Different checks use one evaluator

- **WHEN**一个 policy 阻断任意 error record，另一个 policy 只阻断 failed CheckRun
- **THEN**Core 用同一 closed evaluator 计算两者
- **AND**不增加 error、security 或 check-specific branch

#### Scenario: Executable policy is rejected

- **WHEN**authoring 尝试把 function、script 或动态 property 作为 policy operand
- **THEN**normalization 在 check work 前失败并提供恢复动作
- **AND**Product 不执行或静默降级该输入

### Requirement: Acceptance and named views annotate immutable records

Evaluation order MUST 为 acceptance annotations、named views、selected policy `blockWhen`。Acceptance rule SHALL 用 stable semantic predicate 匹配 records，并产生独立 `(recordId, ruleId, reason)` annotation；它不得改变 record identity、level、message、fields、relations 或 ordering。每个 policy MUST 固定 unmatched acceptance mode 为 `ignore | diagnostic | error` 之一。

Named view SHALL 从同一 immutable final record set 投影 canonical ordered record IDs；view 可引用已解析 acceptance annotation 和 acyclic earlier views，同一 record 可属于 zero 或多个 views。名称如 `all`、`changed`、`regression` 不获得 Core 内置 subset、reference 或优先级语义。

#### Scenario: Accepted record remains visible

- **WHEN**acceptance rule 匹配一个 error record 且 policy view 排除该 annotation
- **THEN**record 本体保持 error 并继续出现在 base stream
- **AND**只有 view membership 与后续 decision operand 反映 acceptance

### Requirement: Explicit references produce ordinary record relations

每个 comparison policy SHALL 声明所需 named references；caller MUST 在 check work 前提供并解析每个 reference 为本次 invocation 不可变 identity。Product 不得从 Git history、branch、remote 或 policy 名称推断缺失 reference。Producing check owns semantic matching 和 relation meaning，并提交 final comparison relations；Core 只验证 catalog 并供 policy 查询。

Reference 缺失或无法解析 MUST 作为 request/config failure 在 work 前结束。Reference 已解析但某项 comparison 只有 partial evidence 时，已有 records、CheckRuns 与 CheckResults 仍进入 selected policy；Core 不得固定产生 not-evaluated 或自动通过/阻断。

#### Scenario: Two references remain independent

- **WHEN**一个 policy 声明 `release` 与 `branch` 两个 references
- **THEN**两者在 execution 前分别解析为 immutable identities 并由 relations 显式区分
- **AND**Core 不把任一 reference 提升为全局 baseline

### Requirement: One GateResult owns decision identity and evidence

省略 gate MUST 产生 `status = disabled`、null policy identity 和 empty policy-derived annotations/views/evidence。选择合法 policy 时，Core SHALL 按固定阶段评价并产生 `status = passed | failed`、selected policy ID/fingerprint 和 canonical record/check evidence references；`blockWhen = true` 对应 failed，false 对应 passed。

Policy fingerprint MUST 覆盖 fully resolved selected policy 及其 referenced declarations。GateResult MUST 是 output 中 policy identity、decision 和 evidence 的唯一 owner，不包含完整 policy body。CheckRun failed、CheckResult failed、partial coverage、record level 或 zero records 本身没有隐式 gate 含义；只有 selected policy 能使用它们。Evaluator 或 final-model invariant failure 是 Product failure，不得伪装为 disabled、passed 或 failed gate。

#### Scenario: Same snapshot supports different decisions

- **WHEN**两个 policies 分别允许和阻断同一 failed CheckRun
- **THEN**同一 check/record snapshot 可分别得到 passed 与 failed GateResult
- **AND**Core 不预设 partial evidence 结果

### Requirement: Foundation provides one regressions policy adapter

在后续 public policy authoring 生效前，Product SHALL 从 current semantic config 单向解析一个 stable `regressions` policy entry，供仓库 `quality:gate` 使用。该 entry MUST 要求现有三个 built-in checks 与 caller 提供的 `baseline` reference，应用 current semantic acceptance，并阻断 unaccepted regression warning/error records 或 required check 的 failed/unprocessed execution evidence；它不得恢复 fixed Core channel 或第二个 evaluator。

Catalog 不得额外暴露 legacy `all` 或 `changed` gate aliases。省略 `--gate` 继续使用 disabled observation；后续 project-definition/config change MAY 替换 public catalog authoring，但必须投影同一 normalized evaluator contract。

#### Scenario: Repository gate keeps one explicit entry

- **WHEN**caller 选择 `--gate regressions` 并提供 valid baseline
- **THEN**Product 解析 required checks/reference 并用 normalized evaluator 计算 decision
- **AND**`regressions` 只是 catalog entry 而不是 Core hardcoded branch
