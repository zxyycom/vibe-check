> **核心句：**本 delta 将machine/human output统一投影为一个run summary与一个standard record stream，并只发布decision结果和证据引用，不发布policy实现。

## MODIFIED Requirements

### Requirement: Shared report data projection

Output SHALL从同一final records、capability runs、registry catalog、policy-derived views/annotations和gate result写出`run.json`、`records.ndjson`与`report.md`。Gate result是policy identity与decision evidence的唯一output owner。Output MUST NOT重新运行capability、重新判断record level、重新计算comparison或重新执行decision policy。Backend/raw artifacts SHALL保持capability-private。

#### Scenario: All outputs use one final model

- **WHEN**scan成功完成Core evaluation并发布artifacts
- **THEN**run summary、record stream和report投影同一final model
- **AND**Output不增加capability-specific mapper或decision branch

### Requirement: Empty-state output

Output SHALL区分zero planned work、completed run with zero records、failed run with zero或partial records、disabled gate与Product/output failure。Contract-valid zero-record invocation MAY发布run summary与zero-byte record stream；它不得被描述为“全部质量检查通过”。Capability domain failure MAY作为run data发布；Core/schema/serialization/publication failure MUST NOT伪装为valid empty result。

#### Scenario: Failed capability publishes retained records

- **WHEN**capability在committed records之后failed且Core/output正常
- **THEN**artifacts包含这些records及failed run/coverage
- **AND**domain failure不被Output改写为publication failure或complete coverage

### Requirement: Output owner documentation

Output owner SHALL记录console、`run.json`、`records.ndjson`、`report.md`、capability-private artifacts、empty/partial/failure states、registry/policy fingerprints、decision evidence、validated publication和consumer boundaries，并由`docs/navigation.md`引用。Owner MUST NOT把retired`metrics.json`、warning streams或MachineWarningV1描述为current contract。

#### Scenario: Reviewer locates current output contract

- **WHEN**reviewer从navigation查找machine output规则
- **THEN**owner说明run v2、record v2与policy-result boundary
- **AND**旧warning artifacts只作为historical material存在

### Requirement: Completeness is visible across output surfaces

Output SHALL从同一`CapabilityRun[]`投影console、run summary和report。每项registered capability MUST出现一次并显示status、coverage、committed record count及failed diagnostic。任何呈现partial-run records的surface MUST同时显示或关联producing run；Output MUST NOT计算会覆盖独立runs的overall completeness。

#### Scenario: Partial coverage is not hidden

- **WHEN**failed capability保留records
- **THEN**machine与human output同时呈现records、failed status和unprocessed coverage
- **AND**summary不把record count当作complete evidence

### Requirement: Gate result projection

Output SHALL机械投影Core产生的gate result：disabled result使用null policy ID/fingerprint与empty evidence，同时run-level annotations/views为空；evaluated result使用non-null policy ID/fingerprint、passed/failed status和canonical record/capability evidence references。Output MUST NOT嵌入完整resolved policy、重新选择view、应用acceptance或执行policy。Human output SHOULD解释selected policy与evidence，但message不得成为machine语义来源。

#### Scenario: Consumer receives decision evidence

- **WHEN**selected policy产生failed gate
- **THEN**run、report和console显示同一policy identity、failed status和evidence references
- **AND**consumer无需取得policy AST或实现evaluator即可消费结果

### Requirement: Trustworthy gate publication

Gate-failed process outcome只有在final Core model已验证，且run/record candidates通过schema/set validation并成功发布后才可信。Capability domain failure可由selected policy允许或阻断；Core evaluation、serialization、validation或publication failure MUST优先映射为Product/output failed。

#### Scenario: Publication failure overrides computed gate

- **WHEN**gate已计算但candidate validation或write失败
- **THEN**CLI返回Product/output failure而不是可信gate outcome
- **AND**residual files不构成current-run evidence

### Requirement: Single active output-owned machine contract

Output SHALL定义唯一current `MachineRunV2`与`MachineQualityRecordV2`。Canonical filenames MUST为`run.json`和`records.ndjson`；schema identities MUST为`vibe-check.run.v2`和`vibe-check.record.v2`。

`run.json` MUST包含invocation/named-reference metadata、public registry catalog与fingerprint、完整capability runs、record count、acceptance annotations、named view memberships和一个gate result。Gate result MUST是selected policy ID/fingerprint与evidence的唯一位置：disabled时identity为null且policy-derived arrays为空，evaluated时identity为non-null。`run.json` MUST NOT复制records或resolved policy。每条record MUST携带invocation ID、registry fingerprint和canonical sequence，以及capability提供的standard record fields。

Runtime schemas SHALL是public field约束唯一owner，DTOs从schema source派生；published schemas MUST为`docs/schemas/vibe-check-run.schema.json`与`docs/schemas/vibe-check-record.schema.json`。Repository MUST删除current`metrics.json`、`warnings.ndjson`、`warnings-all.ndjson`、MachineMetricsV1/MachineWarningV1和dual reader/writer。

#### Scenario: Product publishes only run/record v2

- **WHEN**invocation发布contract-valid machine artifacts
- **THEN**run与records使用current v2 identities和canonical schemas
- **AND**producer、examples、validators及direct consumers不维持旧warning format

### Requirement: Explicit DTO projection preserves owned public semantics

Output SHALL通过一个run mapper与一个generic record mapper显式投影final model。Record mapper MUST保留capability提供的domain fields，只添加schema identity、invocation/registry provenance和final sequence；不得从message、backend metadata或相邻feature重建data。

Run DTO SHALL引用record IDs而不复制records。Record order MUST按registry/check catalog order与stable subject/record identity确定；view、annotation和gate record references必须保持该order。

#### Scenario: One mapper handles all records

- **WHEN**final set含不同capabilities、levels和typed fields
- **THEN**全部serialized records经过同一generic mapper
- **AND**不存在metric/content/security或warning-stream第二条projection path

### Requirement: Positive byte grammar defines machine input

Machine validators SHALL以bytes为输入并fatal decode UTF-8，拒绝BOM。`run.json` MUST为恰好一个schema-valid non-array object；producer使用deterministic two-space JSON且无trailing newline。`records.ndjson` MUST为zero bytes，或一个以上LF-terminated、non-empty、single-object schema-valid records；producer每条使用compact one-line JSON和final LF。

任一decode、framing、JSON或schema failure MUST拒绝整个input且不得返回typed prefix。该consumer invariant不撤销Core ingestion阶段的records；它只说明损坏的published bytes不能形成可信artifact。

#### Scenario: Invalid record stream returns no partial set

- **WHEN**任一NDJSON segment无效
- **THEN**validator返回record index/line与path-aware diagnostic
- **AND**已解析prefix不作为可信typed result

### Requirement: Artifact-set invariants complete schema validation

Artifact-set validator SHALL证明run/records的schema identity、invocation ID和registry fingerprint一致；embedded catalog fingerprint正确；record IDs唯一且order/sequence canonical；每项registered capability run恰好一次；全部run的`committedRecordCount`之和等于顶层record count；annotations、views和gate evidence无dangling/duplicate references并保持canonical order；gate result的policy ID/fingerprint满足status-specific shape。

Validator MUST使用embedded catalog校验record membership与typed fields，并验证run coverage。它 MUST NOT尝试从缺失的resolved policy重算views、acceptance或gate business result；这些由producer在projection前验证。

#### Scenario: Referentially complete set validates successfully

- **WHEN**run/records满足schemas、catalog、counts、order和all references
- **THEN**artifact-set validator返回完整typed set
- **AND**failed capability with retained records仍是contract-valid domain state

### Requirement: Validated candidate precedes trusted publication

Producer SHALL按固定顺序：验证final Core model与decision result；投影run DTO与record sequence；在内存序列化；验证完整candidate set；清理prior canonical files/owned temps；通过same-directory temp rename发布`run.json`与`records.ndjson`。只有两项canonical writes成功后才能打印trusted paths并返回success或gate-failed。

Handled failure MUST best-effort删除两项canonical files与owned temps并映射output failed。Publication不是multi-file transaction；files存在不能替代producing invocation outcome。

#### Scenario: Valid candidates become current evidence

- **WHEN**Core validation、projection、serialization、set validation和publication全部成功
- **THEN**producer打印paths并返回对应process outcome
- **AND**run outcome与files共同构成current-run evidence

### Requirement: Repository consumers validate their actual boundary

Annotation consumer SHALL以bytes读取`records.ndjson`，完整validate后机械选择具有annotatable location且level为warning/error的records，再应用limit并输出non-blocking GitHub annotations。它 MUST NOT理解check-specific fields、policy逻辑或改变gate。

Zero-byte stream SHALL产生zero annotations并exit0；argument/read/decode/framing/schema failure SHALL产生zero annotation commands、actionable stderr和exit2。Workspace verifier与dogfood wrappers只调度Product producer/consumer，不维护第二份parser、registry或evaluator。

#### Scenario: Annotation consumes standard records

- **WHEN**consumer读取conforming record stream
- **THEN**它在完整validation后按common level/location渲染annotations
- **AND**不需要warning variant、backend mapper或resolved policy
