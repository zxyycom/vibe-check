> **核心句：**本 delta hard cut machine/human output 到同一个 Check/Record/Decision snapshot，并让完整 set validation 而非 arrival order 决定哪些 artifacts 可信。

## REMOVED Requirements

### Requirement: Shared report data projection

**Reason**: Existing projection 以 metrics、warnings 与 overall completeness 为 source，无法机械投影新的 Check/Record owners。

**Migration**: 使用新增的“Unified Check and Record report projection”。

### Requirement: Empty-state output

**Reason**: Existing empty semantics 依赖 capability/no-input 和 warning 模型。

**Migration**: 使用新增的“Check and Record empty and partial states”。

### Requirement: Output owner documentation

**Reason**: Existing owner 仍以 metrics.json 和 warning streams 为 current artifacts。

**Migration**: 使用新增的“Current Check and Record output owner documentation”。

### Requirement: Completeness is visible across output surfaces

**Reason**: Overall completeness 被 per-check terminal coverage 与 derived invocation summary 取代。

**Migration**: 使用新增的“Check coverage is visible across output surfaces”。

### Requirement: Gate result projection

**Reason**: Existing projection 绑定 legacy GateResult/channel shape。

**Migration**: 使用新增的“Decision evidence projects without reevaluation”。

### Requirement: Trustworthy gate publication

**Reason**: Trust boundary 现在还必须覆盖 record identity 与 ExecutionReport set integrity。

**Migration**: 使用新增的“Trusted decision requires a valid final snapshot”。

### Requirement: Single active output-owned machine contract

**Reason**: MachineMetricsV1 与 MachineWarningV1 被 Check/Record v2 整体替换。

**Migration**: 使用新增的“Single active Check and Record machine contract”。

### Requirement: Explicit DTO projection preserves owned public semantics

**Reason**: Metrics/warning DTO mapper 无法保持新的 definition/run/result/record owners。

**Migration**: 使用新增的“Generic Check and Record DTO projection”。

### Requirement: Positive byte grammar defines machine input

**Reason**: Canonical filenames 和 set shape 发生 breaking change，需要新的完整 byte grammar owner。

**Migration**: 使用新增的“Positive run and record byte grammar”。

### Requirement: Artifact-set invariants complete schema validation

**Reason**: Existing invariants 不验证 CheckDefinition、CheckRun/Result sum 及 record owning run references。

**Migration**: 使用新增的“Artifact set proves exact Check and Record relationships”。

### Requirement: Validated candidate precedes trusted publication

**Reason**: Publication candidate 已从 metrics/warnings set 变为 run/records set 并增加 identity-conflict failure。

**Migration**: 使用新增的“Validated Check and Record candidate precedes publication”。

### Requirement: Repository consumers validate their actual boundary

**Reason**: Annotation consumer 不再读取 warning stream。

**Migration**: 使用新增的“Repository consumers validate the record-stream boundary”。

## ADDED Requirements

### Requirement: Unified Check and Record report projection

Output SHALL 从同一 immutable final CheckDefinition catalog、CheckRun/CheckResult set、QualityRecord set、derived invocation coverage summary、policy annotations/views 和 GateResult 写出 `run.json`、`records.ndjson` 与 `report.md`。Output MUST NOT 序列化 private CheckExecutionBinding/contribution/report、重新运行 check、重新判断 record level、重新计算 comparison 或重新执行 DecisionPolicy。Backend/raw artifacts SHALL 保持 check-private。

#### Scenario: All outputs use one final model

- **WHEN**scan 成功完成 Core evaluation 并发布 artifacts
- **THEN**run summary、record stream、report 和 console 投影同一 final model
- **AND**Output 不增加 check-specific mapper 或 decision branch

### Requirement: Check and Record empty and partial states

Output SHALL 区分 zero resolved definitions、all skipped、completed/not-applicable、completed result with zero records、failed run with zero 或 partial records、disabled gate 与 Product/output failure。Contract-valid zero-record invocation MAY 发布 run summary 与 zero-byte record stream；它不得被描述为“全部检查通过”。Check execution failure MAY 作为 run evidence 发布；definition/report/record identity、Core/schema/serialization/publication failure MUST NOT 伪装为 valid empty result。

#### Scenario: Failed check publishes retained records

- **WHEN**check 在 committed records 之后 execution failed 且 final model/output 正常
- **THEN**artifacts 包含这些 records 及 failed run/coverage
- **AND**domain execution failure 不被 Output 改写为 publication failure 或 complete coverage

#### Scenario: Integrity conflict is not partial evidence

- **WHEN**RecordManager 检测同 ID 不同 body 或 ExecutionReport set 不完整
- **THEN**Output 不发布可信 run/record candidates
- **AND**该 Product failure 不被描述为 partial check result

### Requirement: Current Check and Record output owner documentation

Output owner SHALL 记录 console、`run.json`、`records.ndjson`、`report.md`、check-private artifacts、empty/partial/failure states、catalog/policy fingerprints、decision evidence、validated publication 和 consumer boundaries，并由 `docs/navigation.md` 引用。Owner MUST NOT 把 retired `metrics.json`、warning streams 或 MachineWarningV1 描述为 current contract。

#### Scenario: Reviewer locates current output contract

- **WHEN**reviewer 从 navigation 查找 machine output 规则
- **THEN**owner 说明 run v2、record v2、Check/Record provenance 与 policy-result boundary
- **AND**旧 warning artifacts 只作为 historical material 存在

### Requirement: Check coverage is visible across output surfaces

Output SHALL 从同一 final CheckRun set 投影 console、run summary 和 report。每项 resolved definition MUST 出现一次并显示 status、nullable result、domain-work coverage、committed record count 及 applicable failed diagnostic。任何呈现 partial-run records 的 surface MUST 同时显示或关联 producing run；Output MUST NOT 计算会覆盖独立 runs/results 的 overall quality verdict。

#### Scenario: Partial coverage is not hidden

- **WHEN**failed CheckRun 保留 records
- **THEN**machine 与 human output 同时呈现 records、failed status 和 unprocessed coverage
- **AND**summary 不把 record count 当作 complete 或 passed evidence

### Requirement: Decision evidence projects without reevaluation

Output SHALL 机械投影 Core 产生的 GateResult：disabled 使用 null policy identity 和 empty annotations/views/evidence；evaluated 使用 non-null policy ID/fingerprint、passed/failed status 和 canonical record/check evidence references。Output MUST NOT 嵌入完整 resolved policy、重新选择 view、应用 acceptance 或执行 policy。Human output MAY 解释 selected policy 与 evidence，但 message 不得成为 machine 语义来源。

#### Scenario: Consumer receives decision evidence

- **WHEN**selected policy 产生 failed gate
- **THEN**run、report 和 console 显示同一 policy identity、failed status 和 evidence references
- **AND**consumer 无需取得 policy AST 或实现 evaluator 即可消费结果

### Requirement: Trusted decision requires a valid final snapshot

Gate-failed process outcome 只有在 definition/binding resolution、complete ExecutionReport set、CheckManager/RecordManager final model 均 valid，且 run/record candidates 通过 schema/set validation 并成功发布后才可信。Check execution failure 可由 selected policy 允许或阻断；record identity conflict、Core evaluation、serialization、validation 或 publication failure MUST 优先映射为 Product/output failed。

#### Scenario: Publication failure overrides computed gate

- **WHEN**gate 已计算但 candidate validation 或 write 失败
- **THEN**CLI 返回 Product/output failure 而不是可信 gate outcome
- **AND**residual files 不构成 current-run evidence

### Requirement: Single active Check and Record machine contract

Output SHALL 定义唯一 current `MachineRunV2` 与 `MachineQualityRecordV2`。Canonical filenames MUST 为 `run.json` 和 `records.ndjson`；schema identities MUST 为 `vibe-check.run.v2` 和 `vibe-check.record.v2`。

`run.json` MUST 包含 invocation/named-reference metadata、仅含 serializable fields 的 public CheckDefinition catalog 与 fingerprint、完整 CheckRuns 及 nullable CheckResults、derived invocation coverage summary、record count、acceptance annotations、named view memberships 和一个 GateResult。GateResult MUST 是 selected policy ID/fingerprint 与 evidence 的唯一位置。`run.json` MUST NOT 复制 records、resolved policy 或 private execution bindings/contributions/reports。每条 record MUST 携带 schema/invocation/catalog provenance、canonical sequence、checkId、checkRunId 及 final QualityRecord fields。

Published schemas MUST 为 `docs/schemas/vibe-check-run.schema.json` 与 `docs/schemas/vibe-check-record.schema.json`。Repository MUST 删除 current `metrics.json`、`warnings.ndjson`、`warnings-all.ndjson`、MachineMetricsV1/MachineWarningV1 和 dual reader/writer。

#### Scenario: Product publishes only run and record v2

- **WHEN**invocation 发布 contract-valid machine artifacts
- **THEN**run 与 records 使用 current v2 identities 和 canonical schemas
- **AND**producer、examples、validators 及 direct consumers 不维持旧 warning format

### Requirement: Generic Check and Record DTO projection

Output SHALL 通过一个 run mapper 与一个 generic record mapper 显式投影 final model。Run mapper 只投影 public definitions、runs/results、derived summary 和 decision；record mapper 保留 producing check 提供的 domain fields 并添加 machine provenance/sequence，不得从 message、backend metadata 或相邻 feature 重建 data。

Run DTO SHALL 引用 record IDs 而不复制 records。Record order MUST 按 check ID、record catalog type order、subject semantic identity 和 recordId 确定；view、annotation 和 gate record references 必须保持该 order。

#### Scenario: One mapper handles all records

- **WHEN**final set 含不同 checks、levels 和 typed fields
- **THEN**全部 serialized records 经过同一 generic mapper
- **AND**不存在 metric/content/security 或 warning-stream 第二条 projection path

### Requirement: Positive run and record byte grammar

Machine validators SHALL 以 bytes 为输入并 fatal decode UTF-8，拒绝 BOM。`run.json` MUST 为恰好一个 schema-valid non-array object；producer 使用 deterministic two-space JSON 且无 trailing newline。`records.ndjson` MUST 为 zero bytes，或一个以上 LF-terminated、non-empty、single-object schema-valid records；producer 每条使用 compact one-line JSON 和 final LF。

任一 decode、framing、JSON 或 schema failure MUST 拒绝整个 input 且不得返回 typed prefix。该 consumer invariant 不撤销 Core ingestion 阶段的 valid commits；它只说明损坏 published bytes 不能形成可信 artifact。

#### Scenario: Invalid record stream returns no partial set

- **WHEN**任一 NDJSON segment 无效
- **THEN**validator 返回 record index/line 与 path-aware diagnostic
- **AND**已解析 prefix 不作为可信 typed result

### Requirement: Artifact set proves exact Check and Record relationships

Artifact-set validator SHALL 证明 run/records 的 schema identity、invocation ID 和 catalog fingerprint 一致；embedded public catalog fingerprint 正确且不含 private execution values；checkRunId 在 invocation 内唯一；每项 definition 恰有一个 terminal run；run status/result sum 与 coverage 合法；record IDs 唯一且 order/sequence canonical；每条 record 的 `(checkId, checkRunId)` 精确引用同一 owning run；每个 run 的 committedRecordCount 等于引用它的 unique records 数量；annotations、views 和 gate evidence 无 dangling/duplicate references 并保持 canonical order。

Validator MUST 使用 embedded catalog 校验 record membership 与 typed fields。它 MUST NOT 尝试从缺失的 resolved policy 重算 views、acceptance 或 gate business result；这些由 producer 在 projection 前验证。

#### Scenario: Mismatched record ownership fails the complete set

- **WHEN**record 的 checkId 与其 checkRunId 所引用 run 的 checkId 不同
- **THEN**artifact-set validator 拒绝整个 candidate set 并定位 record/run relationship
- **AND**两个 individual schema-valid files 不能形成可信 evidence

#### Scenario: Referentially complete partial run is valid

- **WHEN**failed run 保留 records 且所有 IDs、counts、coverage 和 references 一致
- **THEN**artifact-set validator 返回完整 typed set
- **AND**policy 可消费该 partial execution evidence

### Requirement: Validated Check and Record candidate precedes publication

Producer SHALL 按固定顺序：验证 final Core model 与 decision；投影 run DTO 与 record sequence；在内存序列化；验证完整 candidate set；清理 prior canonical files/owned temps；通过 same-directory temp rename 发布 `run.json` 与 `records.ndjson`。只有两项 canonical writes 成功后才能打印 trusted paths 并返回 success 或 gate-failed。

Identity conflict、handled validation 或 publication failure MUST best-effort 删除两项 canonical files 与 owned temps 并映射 output failed。Publication 不是 multi-file transaction；files 存在不能替代 producing invocation outcome。

#### Scenario: Valid candidates become current evidence

- **WHEN**Core validation、projection、serialization、set validation 和 publication 全部成功
- **THEN**producer 打印 paths 并返回对应 process outcome
- **AND**run outcome 与 files 共同构成 current-run evidence

### Requirement: Repository consumers validate the record-stream boundary

Annotation consumer SHALL 以 bytes 读取 `records.ndjson`，完整 validate 后机械选择具有 annotatable location 且 level 为 warning/error 的 records，再应用 limit 并输出 non-blocking GitHub annotations。它 MUST NOT 理解 check-specific fields、private bindings 或 policy 逻辑。

Zero-byte stream SHALL 产生 zero annotations 并 exit0；argument/read/decode/framing/schema failure SHALL 产生 zero annotation commands、actionable stderr 和 exit2。Workspace verifier 与 dogfood wrappers 只调度 Product producer/consumer，不维护第二份 parser、catalog 或 evaluator。

#### Scenario: Annotation consumes standard records

- **WHEN**consumer 读取 conforming record stream
- **THEN**它在完整 validation 后按 common level/location 渲染 annotations
- **AND**不需要 warning variant、backend mapper 或 resolved policy
