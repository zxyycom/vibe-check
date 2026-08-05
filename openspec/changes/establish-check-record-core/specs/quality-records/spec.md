> **核心句：**本 spec 定义 runner 如何逐条提交归属于一个 CheckRun 的 final `QualityRecord`，以及 Record Core 如何验证、持久保留并确定性排序这些领域数据。

## Purpose

让数值、内容、安全和项目自定义检查使用同一个可验证的数据条协议，使消费者不需要按检查类型重建领域含义，也不会因后续执行失败丢失已经可信的记录。

## ADDED Requirements

### Requirement: QualityRecord carries final domain semantics

每个 runner SHALL 通过同一 bound sink 逐条提交已经完成领域判断的 record candidate。Candidate MUST 包含 stable `recordTypeId`、final `level = info | warning | error`、closed subject、safe non-empty message、ordered typed fields、normalized related paths 和 comparison relations；没有 fields、paths 或 relations 时 MUST 使用 empty array。

Subject MUST 包含 registered kind、stable semantic identity、nullable normalized project-relative path 和 nullable current location。Typed field closed kinds MUST 为 string、finite number、boolean 或 project location。Comparison relation MUST 绑定 explicit named `referenceId`、catalog-declared `relationId`、nullable reference record identity 和 catalog-declared typed fields。Runner MUST 在提交前决定 level、message、typed values 和 relation；Core MUST NOT 按 metric value、parser output、message、backend identity 或 check ID 重新分类。

Sink SHALL 为 valid candidate 添加 immutable `recordId`、owning `checkId` 与 `checkRunId`，形成 final `QualityRecord`。`checkRunId` MUST 由 CheckManager 创建、在同一 invocation 内唯一，并与 exactly one owning CheckRun 及其 checkId 绑定；runner 不得提交或覆盖这些 provenance fields。

#### Scenario: Domain error is final at submission

- **WHEN**一个 format-aware runner 确认领域错误
- **THEN**它提交 error-level candidate、stable subject、safe message 与 catalog-owned fields
- **AND**Core 只验证公共 envelope/catalog 并绑定 owning check/run，不再解析领域格式或生成第二条 warning

#### Scenario: Numeric fact uses the same envelope

- **WHEN**file-metrics runner 产生非阻断数值事实
- **THEN**它使用同一 envelope 提交 info-level candidate 与 typed numeric fields
- **AND**Product 不建立平行 observation、metric-warning 或 security-finding result type

### Requirement: Resolved record catalog defines valid records

每个 CheckDefinition 的 record catalog SHALL 把 ASCII lower-kebab `recordTypeId` 映射到 closed semantic definition，并声明 allowed levels、subject kinds、field keys/kinds/required/order/identity participation/policy-queryability、relation IDs 及 relation fields。`(checkId, recordTypeId)` MUST 在 resolved catalog 中唯一；unknown type/field/relation、wrong-kind value、missing required field 或 forbidden level MUST 被当前 sink 拒绝。

Public Check catalog fingerprint MUST 覆盖 canonical record definitions。Runner implementation、backend wording 和 execution order 变化不得改变 fingerprint；任何会改变消费者解释或 policy 合法查询的 catalog 变化 MUST 改变 fingerprint。

#### Scenario: Dynamic check records remain self-describing

- **WHEN**后续 project definition 贡献 custom check 及其 record catalog
- **THEN**resolved public catalog 足以验证和解释该 check 提交的 records
- **AND**Core 不需要 custom-check-specific union 或 mapper

### Requirement: Valid submissions commit independently until identity conflict

每次 sink submission SHALL 是最小 commit boundary。首次出现的 valid candidate 立即进入 invocation-owned committed set；普通 invalid candidate 只拒绝该条并记录 `invalid-record` execution failure。后续 work、runner、dependency 或其它非 identity record failure MUST NOT 撤销、修改或隐藏此前 committed records。

RecordManager MUST 为每个 recordId 计算不含 final sequence 的 canonical public body bytes。再次提交同一 recordId 且 body byte-equivalent 时 SHALL 作为幂等重放接受，返回 existing commit 且不增加 record count。若同一 recordId 对应不同 public body，RecordManager MUST 记录 arrival-neutral identity-integrity conflict：两份 body 按 canonical digest 保留为 diagnostic evidence，该 recordId 不得进入可信 final set，整个 final Core model MUST validation failed 并阻止 machine/human artifact 可信发布。First-arrival body 不得获胜，交换 arrival order 不得改变 conflict verdict 或 diagnostic identity。

CheckRun completed、failed 或其 CheckResult verdict 都不得合成、删除或重写 records。Record 存在只证明该条通过公共验证，不证明所属 check 完整或 passed；identity-integrity conflict 是无法形成可信 record set 的 Product failure，不是 policy 可允许的 partial check evidence。

#### Scenario: Later failure preserves earlier records

- **WHEN**runner 已经提交若干 valid records，随后另一个 work unit execution failed
- **THEN**此前 records 继续进入 final snapshot
- **AND**所属 CheckRun 独立表达 failed status 和 remaining coverage

#### Scenario: Invalid record does not poison valid siblings

- **WHEN**同一 run 依次提交 valid、invalid 和 valid candidates
- **THEN**两个 valid records 都保留，invalid candidate 不进入 committed set
- **AND**final CheckRun 因 protocol violation 为 failed

#### Scenario: Equivalent duplicate is idempotent

- **WHEN**并发 work 重复提交同一 recordId 且 canonical public body byte-equivalent
- **THEN**RecordManager 只保留一个 committed record 并让两次 submission 观察同一 commit
- **AND**committedRecordCount 与 final bytes 不依赖 arrival order

#### Scenario: Conflicting duplicate prevents trusted publication

- **WHEN**两个 valid candidates 计算出同一 recordId 但 level、location、message 或其它 public body 字段不同
- **THEN**RecordManager 产生相同的 identity-integrity conflict 并使 final-model validation 失败
- **AND**无论哪个 candidate 先到达都不发布 first-arrival record 或可信 artifacts

### Requirement: Record identity and ordering are deterministic

`recordId` MUST 使用 `sha256:<64 lowercase hex>`，由 `checkId`、`recordTypeId`、subject semantic kind/identity 和 catalog 标记为 identity-participating 的 typed fields 经过 Product-owned canonical encoding 计算。Current location、level、message、timestamp、arrival ordinal 和 backend wording MUST NOT 参与 identity。

Final record order MUST 按 `checkId`、record catalog type order、subject semantic identity 和 `recordId` 的 canonical order 确定，不得依赖 runner、task 或 backend 完成顺序。Related paths 与 relations 也 MUST 去重并按 catalog/reference semantic order canonicalize。

#### Scenario: Source movement preserves record identity

- **WHEN**同一领域问题只因前置行变化而改变 current location
- **THEN**recordId 保持不变而 location 更新
- **AND**comparison 与 consumer 不把位置移动视为新问题

#### Scenario: Concurrent arrival produces stable bytes

- **WHEN**相同 record candidates 以不同 completion order 提交
- **THEN**final identities、sequence 和 serialized record bytes 保持一致
- **AND**arrival ordinal 不进入 public semantics

### Requirement: Record ownership is referentially exact

每条 committed QualityRecord MUST 同时携带 owning `checkId` 与 `checkRunId`，且二者必须精确引用本 invocation final CheckRun set 中的同一 run。RecordManager SHALL 从 bound sink 取得这两个值，不能从 candidate 或 record body 反向推断。Unknown run、check/run mismatch、跨 invocation run ID 或一个 run ID 对应多个 check IDs MUST 使 final-model validation 失败并阻止可信 publication。

每个 CheckRun 的 `committedRecordCount` MUST 等于 final unique record set 中精确引用该 `(checkId, checkRunId)` 的 records 数量；幂等 duplicate 不重复计数。

#### Scenario: Record cannot claim a sibling run

- **WHEN**candidate 来自 check A 的 bound sink 但尝试携带 check B 或其它 run provenance
- **THEN**sink 忽略或拒绝 candidate-owned provenance 并只使用 manager binding
- **AND**final record 只能引用 check A 的 exact CheckRun

#### Scenario: Artifact relation rejects mismatched provenance

- **WHEN**machine candidate 中的 record checkId 存在但 checkRunId 引用另一个 check 的 run
- **THEN**complete-set validation 拒绝整个 candidate set
- **AND**schema-valid individual files 不能形成可信 artifact

### Requirement: Public records exclude private and sensitive material

Runner SHALL 在 submission 前把 backend-native data 转换为 Product 语义。Record candidate、failure diagnostic、cache、report 与 machine artifact MUST NOT 包含 absolute host path、backend object/raw output、raw secret、URL credential/userinfo 或 sensitive query value。Catalog exposure metadata 只声明 producing check 的安全责任；generic Record Core MUST NOT 声称仅凭 string shape 即可证明领域脱敏。

#### Scenario: Sensitive check emits only safe evidence

- **WHEN**一个 secret check 识别疑似 credential
- **THEN**record 只包含 registered safe identity、location、fingerprint 或脱敏 fields
- **AND**raw secret 不进入 record sink、diagnostic、cache 或 output
