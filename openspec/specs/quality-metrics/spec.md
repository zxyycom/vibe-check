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

### Requirement: Semantic check configuration drives quality warnings

Quality core SHALL 从 resolved semantic config 的 `checks.files`、`checks.functions` 与 `checks.duplication` 读取 product-owned threshold behavior。File code-line、function cyclomatic-complexity、function code-line、function parameter-count 与 duplicate-code warnings MUST 保持 current absolute-floor、changed-delta 和 allowance semantics；current、baseline 与 comparison MUST 使用同一 resolved values。

Dependency name、command、args、availability 或 backend format MUST NOT 参与 warning policy selection。Internal metric source identity MAY 继续服务 machine/report diagnostics，但不得成为设置 threshold 所需的 public config knowledge。

#### Scenario: File checks use semantic thresholds

- **WHEN** resolved config 提供 `checks.files.codeLines` threshold 与 low-decision-token allowance
- **THEN** file code-line warnings 按这些 semantic values 选择 floor 与 changed delta
- **AND** config 不需要声明 file-metrics backend name

#### Scenario: Function checks use semantic thresholds

- **WHEN** resolved config 提供 `checks.functions` complexity、code-line 与 parameter thresholds
- **THEN** function warnings 按这些 values 和既有 low-complexity allowance behavior 生成
- **AND** config 不需要声明 structural backend name

#### Scenario: Duplication checks use semantic sensitivity

- **WHEN** resolved config 提供 default/per-code-area minimum token values 与 fragment changed delta
- **THEN** duplicate detection 和 warning generation 使用这些 product-semantic settings
- **AND** dependency concurrency 与 backend syntax hint 不来自 project config

### Requirement: Accepted warnings use stable semantic check identity

Accepted-warning matching SHALL 以 public semantic `checkId` 作为 required check identity，并保留 optional `codeArea`、`messageIncludes`、`metric`、`path`、`suggestionIncludes` 与 `value` filtering。Config owner MUST 将 check identity 映射到当前 internal warning rule；matcher MUST NOT 要求或接受 scanner source identity。

本 change MUST NOT 改写 machine warning `ruleId`、`sourceTool`、metric、ordering、channel membership 或 `acceptedReason` behavior。后续 machine identity redesign 必须作为独立 output-contract change。

#### Scenario: Semantic acceptance marks the corresponding warning

- **WHEN** accepted-warning entry 的 `checkId` 与 generated semantic check 匹配，且所有 supplied optional filters 也匹配
- **THEN** warning 保留 identity/order/channel membership 并获得 configured `acceptedReason`
- **AND** matching 不读取 dependency source matcher

#### Scenario: Semantic acceptance still detects stale entries

- **WHEN** accepted-warning entry 没有匹配任何 generated semantic check result
- **THEN** current unmatched-acceptance warning behavior 保持
- **AND** diagnostic 使用 semantic check identity 描述 stale entry，而不是要求 scanner name

#### Scenario: Machine warning identity remains compatible

- **WHEN** semantic config 生成 file、function 或 duplicate warning
- **THEN** current machine/report projection 保持本 change 前的 rule/source fields 与 ordering
- **AND** public config 的 `checkId` 只作为 config boundary identity，不建立第二个 machine format

### Requirement: Explicit baseline provenance is immutable

当显式 baseline comparison 被启用时，Quality metrics SHALL 将已解析的不可变完整 commit SHA 作为唯一 baseline commit identity，并在 baseline metadata、materialization、cache identity、changed-input detection 与 comparison 中保持一致。调用者提供的 branch、tag、abbreviated SHA 或其它 revision spelling MUST NOT 在解析后被重复求值。

#### Scenario: Mutable revision is pinned for one invocation

- **WHEN** 调用者提供的显式 revision 在 invocation 开始时解析到一个 commit
- **THEN** metrics 记录该 commit 的不可变完整 SHA
- **AND** 后续 baseline 工作不因同名 branch 或 tag 移动而改变 target

#### Scenario: Comparison artifacts share one baseline identity

- **WHEN** baseline scan、cache 与 warning comparison 成功完成
- **THEN** 它们使用 metrics 中同一个完整 baseline commit SHA
- **AND** artifact 不混合原始 revision spelling 与重新解析后的不同 commit

### Requirement: Function comparison uses line-independent unambiguous identity

Function baseline comparison SHALL 使用 normalized file path 与 exact stable function name 匹配 current 与 baseline metric，MUST NOT 将 start line、end line 或其它源码位置加入 comparison identity。`(anonymous)`、`unknown`、空名称与全空白名称 MUST NOT 形成 comparison identity。对可识别名称，只有 current 与 baseline 两侧都恰好存在一个候选时才计算 matched baseline value 与 delta；任一侧存在重名歧义时 MUST 保持不可比较，并且 MUST NOT 通过行号、候选顺序或跨文件搜索猜测对应关系。源码位置 SHALL 继续作为 current warning location 输出，而不是 identity。

#### Scenario: Preceding line edits preserve function comparison

- **WHEN** 同文件同名函数的实现 metric 可比较，但前置源码增删只改变了函数行号
- **THEN** function warning 使用对应 baseline metric 计算 baseline value 与 delta
- **AND** 行号移动本身不把该函数分类为新 regression

#### Scenario: Same-file duplicate names remain unmatched

- **WHEN** current 或 baseline 在同一文件内对一个函数名称存在多个候选
- **THEN** comparison 不为这些候选选择 baseline function，且 warning 的 baseline value 与 delta 为 null
- **AND** comparison 不使用行号或扫描顺序消除歧义

#### Scenario: Anonymous and unknown names are not identities

- **WHEN** function metric 的 name 是 `(anonymous)`、`unknown`、空值或全空白值
- **THEN** comparison 不为该 function 选择 baseline function，且 warning 的 baseline value 与 delta 为 null
- **AND** 即使同文件两侧各只有一个这样的名称也不使用行号或位置匹配

#### Scenario: New named function preserves new-function semantics

- **WHEN** current 中存在一个同文件唯一的可识别具名函数，而 baseline 中没有同 identity candidate
- **THEN** comparison 保持既有 new-function baseline-zero semantics
- **AND** 该函数仍可按 threshold 与 delta policy 进入 regressions

#### Scenario: Cross-file move is not guessed

- **WHEN** 同名函数只在另一文件中存在 baseline candidate
- **THEN** current function 按同文件无 baseline candidate 的既有 new-function semantics 处理
- **AND** comparison 不执行跨文件匹配

#### Scenario: Warning location remains current

- **WHEN** matched function 产生 current warning
- **THEN** warning location 使用 current function 的文件与行号
- **AND** location 不参与 baseline identity
