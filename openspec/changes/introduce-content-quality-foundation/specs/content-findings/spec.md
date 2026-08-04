本 delta spec 定义共享 capability、exact-input 与 finding 语义；它是临时 change artifact，尚未完成实现前审计。

## Purpose

为代码指标、内容正确性和安全检查提供共同但不丢失变体语义的 finding、capability 与 exact-input 契约，使后续检查无需伪造数值指标或重新遍历项目。

## ADDED Requirements

### Requirement: Product registry owns capability identity and eligibility

Product core SHALL 以一个 Product-owned descriptor registry 声明每个稳定 capability ID、profile request 条件、exact-input selector 和 result owner。Selector MUST 只消费 normalized scan inventory 与 resolved product policy，并 MUST 在 adapter 启动前产生 project-relative exact paths；adapter MUST NOT 接收 project root 来重新发现文件、重新解释 include/exclude 或扩大输入。

现有 `file-metrics`、`function-metrics` 与 `duplicate-detection` MUST 作为 registry members 保持原测量语义。后续 content/security capability MUST 注册独立 identity，不得借用 `file-metrics` 来承载语法、链接或秘密检查。

Registry owner SHALL 从public capability/check/observation/evidence catalog的closed canonical JSON projection计算deterministic `semanticRegistryFingerprint`，格式为`sha256:`加64个lowercase hexadecimal字符。Capability、check与metric集合 MUST按semantic ID Unicode code-point order排序；具有contractual order的evidence catalog MUST保留declared order；object keys MUST按Unicode code-point order排序；serialization MUST是UTF-8 compact JSON且无BOM/trailing newline。Capability projection MUST包含profile/request semantics与result owner；check/observation/evidence projection MUST包含closed IDs、kinds、required/order/redaction/identity语义。Fingerprint不包含implementation、dependency version、config value或project data。任一catalog semantic变化 MUST改变fingerprint；仅实现重构或非semantic presentation/declaration order变化 MUST保持fingerprint。

#### Scenario: Non-code input reaches only an eligible capability

- **WHEN** normalized inventory 同时包含 source、Markdown 与 JSON 文件
- **THEN** 每个 descriptor selector 只批准其声明支持的 exact paths
- **AND** JSON 或 Markdown 不会仅因属于 inventory 就进入 code-metric adapter

#### Scenario: Adapter cannot enlarge its input

- **WHEN** capability selector 返回一组 exact project-relative paths
- **THEN** adapter 只处理该集合并返回 normalized result
- **AND** adapter 不扫描 project root、邻接目录或 selector 未批准的文件

#### Scenario: Registry fingerprint tracks public catalog only

- **WHEN**feature注册新的check/evidence catalog，或只重构既有runner实现
- **THEN**前者改变semantic registry fingerprint，后者保持相同fingerprint
- **AND**canonical projection不受descriptor declaration/presentation order影响

### Requirement: Findings use an explicit semantic variant

Product core SHALL 使用 status-independent `FindingRecord` union 表达成功 capability 产生的可行动结果。每个 finding MUST 包含稳定 semantic `checkId`、`kind`、severity、project-relative path、可选精确 location、message、可选 suggestion、changed-scope state，以及 acceptance 后可选的非空 reason；`checkId` MUST 与 backend identity 分离。

Shared source location MUST 使用 one-based start line/column，以及 optional one-based end line/column与optional zero-based UTF-8 byte offset；end存在时不得早于start。Location只定位current source，不得包含absolute host path，也不得单独成为stable finding identity。

Content/security variant MAY包含ordered `evidence` array。每个closed evidence entry MUST精确包含non-empty semantic `key`、`kind`与对应`value`；`kind` MUST是`string`、`number`、`boolean`或`location`。Number value MUST finite；location value MUST包含normalized project-relative path与optional shared source location。每个finding内evidence key MUST唯一并按check catalog order排列。Producing descriptor registry SHALL为每个check声明allowed evidence keys、kind、required/optional status、meaning、identity participation与redaction requirement；machine schema只验证generic closed entry，Product validator MUST拒绝unknown、missing、wrong-kind或out-of-order evidence。

Evidence MUST只承载consumer无需解析message即可使用的稳定Product语义，例如JSON pointer、threshold、binding ID或secondary location；不得包含backend error object、raw scanner output或未脱敏security material。Generic accepted-warning matching MUST NOT隐式匹配evidence values；需要evidence-based acceptance的security/feature capability必须拥有独立、已审计policy。

`kind = metric` MUST 承载 numeric metric/value 以及 applicable comparison basis、baseline 和 delta；`kind = content` MUST 承载稳定 finding code、可选不含原始内容的 fingerprint与catalog-valid evidence，且 MUST NOT 伪造 numeric value；`kind = security` MUST只承载稳定rule/fingerprint、location、脱敏message与catalog-valid redacted evidence，不得包含、缓存或序列化被检测秘密的原始值。Union 的每个 variant MUST 是 closed shape，unknown、缺失或属于其它 variant 的字段 MUST 被拒绝。

#### Scenario: Content error does not fabricate a metric

- **WHEN** 成功的内容 capability 发现 broken local link 或 invalid JSON
- **THEN** core 产生 `kind = content` finding 与稳定 finding code
- **AND** record 不包含虚构的 `value = 1`、baseline 或 delta

#### Scenario: Security evidence is redacted at the model boundary

- **WHEN** 成功的 security capability 检测到疑似秘密
- **THEN** normalized record 只保留 rule、fingerprint、location 与脱敏说明
- **AND** core、cache、report 和 machine candidate 均无法取得原始秘密值

#### Scenario: Typed evidence preserves structured content semantics

- **WHEN**JSON Schema finding需要公开instance pointer、schema pointer与secondary schema location
- **THEN**content check catalog声明对应string/location evidence，record按catalog order投影typed entries
- **AND**consumer无需解析human message，portable schema与Product validator分别证明generic shape和check-specific catalog

### Requirement: Findings and capability failures remain distinct

Capability `succeeded` MAY 产生 zero 或多个 findings及zero或多个non-finding observations；`failed` MUST 只通过 capability diagnostic 表达未完成工作，且 partial findings/observations MUST NOT 进入可信输出。Core SHALL 维护 `all`、`changed` 与 `regressions` semantic channels。`all` SHALL 包含全部 current findings。每个 descriptor MUST 为其 current finding 计算 closed normalized project-relative causal input path set：single-input finding至少包含自身primary path；链接、schema等multi-input finding还可包含实际参与该结论的target、binding、root schema与transitive approved dependency paths，包括changed scope中已删除而current inventory不再存在的确定性target path。该set只用于channel membership，不进入stable identity、public finding、message或machine evidence。

`changed` MUST是`all`的order-preserving subsequence，并且只包含causal input path set与invocation resolved changed scope相交的current findings。`regressions` MUST是`changed`的order-preserving subsequence；它只包含对应capability明确定义、调用者提供有效explicit baseline、且current identity不存在于comparable baseline result的changed findings。省略、无效或不可用baseline时 MUST保持current-only；Core与feature capability均不得从Git history、cache、上一提交、location或dependency state推断comparison target。没有baseline-comparison contract的content/security finding MUST NOT伪装成regression；observations MUST NOT进入任一finding channel。

Acceptance MUST 保留 finding identity、variant、channel membership 与 ordering，只增加非空 acceptance reason 并从 blocking set 排除该 record。Gate evaluator MUST 按现有 policy 选择一个 final channel，不重新生成、转换或排序 finding。

#### Scenario: Successful finding can block an all gate

- **WHEN** complete scan 的 `all` channel 包含一个未接受的 content finding
- **THEN** `all` gate 保留并评价该 finding
- **AND** finding 的非数值 variant 不改变 gate blocking 语义

#### Scenario: Capability failure is not a finding

- **WHEN** requested content capability 未完整执行并返回 failed diagnostic
- **THEN** overall completeness 按 capability result 变为 failed
- **AND** partial observations、partial/synthetic“scanner failed”finding均不进入可信输出或finding channel

#### Scenario: Dependency change makes an unchanged source finding changed

- **WHEN** unchanged Markdown source 的 local-link finding 只因其确定性 target path 被删除或其 target heading 改变而新产生
- **THEN** descriptor causal input set 同时包含 source 与 target，current finding 进入 `all` 和 `changed`
- **AND** 只有调用者提供有效 explicit baseline 且该 identity 在 baseline 不存在时，它才进入作为 `changed` 子序列的 `regressions`
