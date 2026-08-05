> **核心句：**本spec定义内置quality capability如何逐条提交final records并报告internal execution summary；public `CapabilityRun`由Core独立finalize。

## Purpose

为数值、内容、安全和运行类质量能力提供同一套可验证的数据协议，使新增能力无需创建新的 Core result shape 或领域分支。

## ADDED Requirements

### Requirement: Product owns a compile-time capability registry

Product SHALL 使用 closed compile-time registry 声明本 revision 的全部 quality capabilities。每个 descriptor MUST 提供 stable `capabilityId`、request semantics、normalized-inventory selector、runner、execution-summary contract、record catalog、可选 named-reference contract 和显式 internal dependencies。Registry MUST NOT 加载第三方代码、project executable 或 runtime-discovered capability。

Registry dependencies MUST 构成可验证 DAG。需要共享 parser projection、候选数据或敏感材料的 capabilities SHALL 使用 descriptor 声明的 typed internal service；公开 record stream MUST NOT 成为隐式执行总线。

#### Scenario: New capability changes only declared extension points

- **WHEN** 后续 JSON capability 注册 descriptor、catalog、selector 和 runner
- **THEN** Product registry 包含该 capability 并按声明规划工作
- **AND** Core 不增加 JSON-specific result、warning 或 gate branch

#### Scenario: Runtime plugin input is rejected

- **WHEN** project config 或调用者尝试提供 executable、module path 或动态 capability
- **THEN** Product 不把它加入 registry 或 scan plan
- **AND** capability 集合仍只由 producing revision 的编译期代码决定

### Requirement: Capability emits one final semantic record shape

每个 capability SHALL 通过同一个 `QualityRecord` envelope 逐条输出已完成领域判断的数据。Record MUST 包含 producing `capabilityId`、stable `checkId`、location-independent `recordId`、final `level = info | warning | error`、closed subject、safe non-empty message、ordered typed fields、normalized causal paths 和 comparison relations array；没有 typed data、causal path 或 comparison 时 MUST 使用 empty array。

Subject MUST 包含 registered kind、stable identity、nullable normalized project-relative path 和 nullable current location。Typed field MUST 使用 registered key、kind 和 value；closed kinds 为 string、finite number、boolean 和 project location。Causal paths MUST是deduplicated、canonical ordered、normalized project-relative paths。Comparison relation MUST 绑定 explicit reference ID、registered relation ID、nullable reference record ID 和 catalog-declared typed data；relations MUST按reference ID、catalog relation order与reference record identity确定性排序。

Capability MUST 在 emit 前决定 level、message、typed data 和 comparison relation。Core MUST NOT 根据 numeric value、parser output、message、backend identity 或 capability ID 重新分类 record。

#### Scenario: Domain error is already final when emitted

- **WHEN** JSON capability 确认一个 syntax error
- **THEN** 它直接 emit final error-level record、stable identity、location 和 JSON-owned typed data
- **AND** Core 只验证通用 envelope/catalog，不解析 JSON 或生成第二条 warning

#### Scenario: Numeric fact uses the same record shape

- **WHEN** file-metrics capability 产生非阻断数值事实
- **THEN** 它使用同一 envelope emit info-level record 和 typed value/unit data
- **AND** Product 不建立独立 observation、metric-warning 或 security-finding result type

### Requirement: Record validity is independent from capability completion

每次 `emit` SHALL 是最小提交边界。Core MUST 在 emit 时验证该条record：valid record进入committed set，invalid record被拒绝。后续work unit、dependency或runner failure MUST NOT撤销此前committed records。Invalid、未完成或可能含敏感原始材料的单条record MUST NOT进入committed set，并 MUST使Core-finalized `CapabilityRun`成为`failed`且包含invalid-record diagnostic。

`recordId` MUST 使用 `sha256:<64 lowercase hex>`，由capability/check、subject semantic identity和catalog声明的identity fields经过catalog-owned canonical encoding构造；current location、level、message、timestamp、emit ordinal和backend wording MUST NOT参与。Final order MUST由registry/check catalog order、subject identity和record ID确定，不得依赖并发完成顺序。

#### Scenario: Later failure preserves earlier records

- **WHEN**capability已有若干records被committed，随后另一个work unit execution failed
- **THEN**此前committed records继续进入final record set
- **AND** final capability run 单独表达 failed status 和 remaining coverage

#### Scenario: Concurrent emission remains deterministic

- **WHEN** 相同 work units 以不同并发顺序完成
- **THEN** final record bytes、record IDs 和 policy operand set 保持一致
- **AND** Product 不把 emit arrival ordinal 当作语义身份或排序依据

### Requirement: Registry catalog makes records interpretable and safe

每个 check catalog MUST 声明 allowed levels、subject kinds、field keys/kinds/required/order/meaning/identity participation/policy-queryability/exposure、comparison relation IDs 和 relation fields。Semantic IDs MUST 使用 ASCII lower-kebab。Product SHALL 从 canonical public catalog 计算 registry fingerprint；semantic catalog 变化 MUST 改变 fingerprint，implementation-only refactor MUST NOT 改变它。

Capability MUST 在 emit 前将 backend-native output 转换为 safe Product semantics。Record、diagnostic、cache 和 output MUST NOT 包含 absolute host path、backend object/raw output、raw secret、URL credential/userinfo 或 sensitive query value。Catalog 的 exposure metadata 只声明 capability constructor/tests 的安全责任；Core MUST NOT 声称 generic string validation 能证明领域脱敏。

#### Scenario: Unknown catalog data is rejected locally

- **WHEN** capability emit unknown check/field/relation 或 wrong-kind value
- **THEN** record sink 拒绝该条 record 并记录 invalid-record diagnostic
- **AND**此前committed records保持不变

#### Scenario: Sensitive capability publishes only safe semantics

- **WHEN** secret capability 识别疑似 credential
- **THEN** record 只包含 registered safe identity、fingerprint、location 和脱敏 data
- **AND** raw secret 不进入 record sink、diagnostic、cache、report 或 machine artifact
