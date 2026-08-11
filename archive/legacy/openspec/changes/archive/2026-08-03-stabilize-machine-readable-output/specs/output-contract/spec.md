## ADDED Requirements

### Requirement: Single active output-owned machine contract

Output layer SHALL 定义唯一 current `MachineMetricsV1` / `MachineWarningV1` machine
contract，并使用 canonical filenames `metrics.json`、`warnings.ndjson` 与
`warnings-all.ndjson`。`MachineMetricsV1.metadata.schemaVersion` MUST 是
`vibe-check.metrics.v1`；每个 embedded 或 streamed `MachineWarningV1.schemaVersion`
MUST 是 `vibe-check.warning.v1`。Product runtime schemas SHALL 是 public field constraints
与 field descriptions 的唯一 owner，DTO types MUST 从 schema-authoring source 派生。
Published JSON Schema 2020-12 files MUST 位于
`docs/schemas/vibe-check-metrics.schema.json` 与
`docs/schemas/vibe-check-warning.schema.json`，分别使用 immutable `$id`
`urn:vibe-check:schema:metrics:v1` 与 `urn:vibe-check:schema:warning:v1`；metrics schema
MUST 通过该 warning URN 引用同一 warning definition。Current repository MUST NOT 保留
legacy reader、dual writer、migration window 或另一个 accepted machine structure。
两个 schemas MUST 显式声明 dialect URI
`https://json-schema.org/draft/2020-12/schema`。Product SHALL 通过 `src/product/**` 下 shallow
boundary 暴露 DTO types、serializers、artifact-set validator 与 warning-stream validator；
product runtime MUST NOT 读取 `docs/**` / `scripts/**`，repository scripts MUST NOT deep-import
internal quality-core modules 来建立第二个 contract boundary。

#### Scenario: Product output uses the only current v1 contract

- **WHEN** invocation 发布 contract-valid machine artifacts
- **THEN** metrics 与全部 embedded/streamed warnings 使用 current v1 identities 并通过 canonical schemas
- **AND** repository producer、validators、direct consumer、schemas/examples、tests 与 owner docs 只使用该 current structure

#### Scenario: Historical report material remains separate

- **WHEN** reviewer 或 consumer 查找 current-product schemas/examples
- **THEN** navigation 指向 metrics/warning v1 materials
- **AND** retired Rust report schema/examples 保持 historical ownership，不进入 current machine registry

### Requirement: Explicit DTO projection preserves owned public semantics

Output layer SHALL 从 final core `QualityMetrics` / `WarningRecord` 显式投影一个
`MachineMetricsV1`，并通过同一个 mapper 产生 metrics 内全部 warnings 和 streamed warnings。
`warnings.ndjson` 与 `warnings-all.ndjson` candidates MUST 分别从该 DTO 的
`warnings.changed` 与 `warnings.all` 序列化，不得从 core warnings 建立第二条 projection
path。V1 field set SHALL 只包含 current runtime schemas 与 explicit mapper 声明的 fields；
不得从相邻 change 预取 config provenance、scanner backend field 或 speculative metadata。
Schema descriptions 与 owner docs MUST 明确
公开 field 的 meaning、unit、path context、optional/null semantics 和 semantic ordering。
`metadata.repository` SHALL 表示 invocation 使用的 normalized absolute project root，而不是
portable repository identity；capability arrays SHALL 按 capability ID 消费而不承诺 semantic
order。DTO mapper SHALL 保留 source array order；每个 public array 的 schema description MUST
声明 order 是否有 consumer semantic，warning channels 与 gate blocking order MUST 是
semantic。Core-only、human-only 或 private scanner change 在 DTO projection 不变时 MUST NOT
改变 machine instances、schemas、examples 或 consumer behavior。

#### Scenario: All warning projections use one mapper

- **WHEN** final core data 包含 all/changed/regressions warnings 或 evaluated-gate blocking warnings
- **THEN** 每个 serialized value 经过同一个 `MachineWarningV1` mapper
- **AND** metrics channels 与 stream candidates 不会因独立 projection path 产生漂移

#### Scenario: Private core change stays behind the DTO boundary

- **WHEN** core 增加 private field、重构内部 model 或改变 human-only output
- **THEN** explicit machine mapper 忽略未声明数据，current machine contract 保持不变
- **AND** transport identity 不因 private implementation change 改变

### Requirement: Positive byte grammar defines machine input

Machine validators SHALL 以 bytes 为输入，使用 fatal UTF-8 decoding，并拒绝 leading UTF-8
BOM。`metrics.json` MUST decode 为恰好一个 JSON value，MAY 包含普通 leading/trailing JSON
whitespace，root MUST 是 non-null、non-array object，且 MUST 通过 current metrics schema。
Producer metrics serialization MUST 使用 deterministic two-space JSON 且没有 trailing newline；
key order 与 insignificant JSON whitespace MUST NOT 改变 validator verdict。

Warning stream MUST 是 zero-byte input，或一个以上由 LF byte `0x0A` 结束的 records。对
non-empty stream 移除一个 required final LF 后，每个 LF-separated segment MUST 非空、不能
只包含 whitespace、MUST parse 为 JSON object，并 MUST 通过 current warning schema。
LF MUST 只作为 record delimiter；segment 内的 `SP` (`0x20`)、`HTAB` (`0x09`) 与 `CR`
(`0x0D`) 这些 non-LF JSON whitespace，以及 CRLF MUST 被接受。Extra final LF、interior
blank record、invalid UTF-8、BOM、malformed JSON、non-object record、missing final LF 或
schema-invalid record MUST 拒绝整个 stream。Producer MUST 使用 compact one-line JSON 并为
每个 warning 追加 LF。任一 record failure MUST NOT 返回 partial typed records。

#### Scenario: Conforming metrics and warning bytes are accepted

- **WHEN** metrics bytes 含一个 schema-valid object，warning bytes 为 zero bytes 或完整 LF-terminated schema-valid records
- **THEN** validators 返回完整 typed values
- **AND** key order、metrics JSON whitespace、record 内 non-LF whitespace 或 CRLF 不改变 parsed verdict

#### Scenario: Non-conforming bytes fail all-or-nothing

- **WHEN** input 违反 decoding、BOM、root-object、record、blank-line、final-LF 或 schema predicate
- **THEN** validator 返回对应 logical artifact 与 RFC 6901 JSON Pointer，或 1-based record line / 0-based record index diagnostic
- **AND** 不返回已解析 subset

### Requirement: Artifact-set invariants complete schema validation

Artifact-set validator SHALL 在 schema 与 byte validation 后证明完整 public set predicate：
parsed `warnings.ndjson` MUST 与 `metrics.warnings.changed` 在 length、order、multiplicity 与
values 上 deep-equal；parsed `warnings-all.ndjson` MUST 与 `metrics.warnings.all` deep-equal；
`warnings.changed` MUST 是 `warnings.all` 的 order-preserving subsequence，且
`warnings.regressions` MUST 是 `warnings.changed` 的 order-preserving subsequence。

Serialized capability results MUST 包含每个 stable capability ID 恰好一次，不得包含 unknown
或 duplicate ID，并 MUST 按 shared reducer 与 `scanCompleteness.overall` 一致：任一
`failed` → `failed`；否则任一 `succeeded` → `complete`；否则 → `empty`。Evaluated gate
MUST 使用 policy descriptor 选择的 channel，`evaluatedWarningCount` MUST 等于该 channel
length；`blockingWarnings` MUST 等于其中 `acceptedReason` absent 或 length zero 的 records
并保持原顺序，counts MUST 与 arrays 一致，blocking list 为空时 status MUST 为 `passed`，
否则 MUST 为 `failed`。Validator MUST NOT 重新计算 scanner metrics、warning generation、
threshold、comparison 或 gate business decision。

#### Scenario: Complete set satisfies one public predicate

- **WHEN** three schema-valid artifacts 满足 stream equality、channel membership、completeness 与 gate invariants
- **THEN** artifact-set validator 返回 accepted verdict 与完整 typed set
- **AND** capability array order 不影响以 ID 检查的 completeness verdict

#### Scenario: Any public set relationship fails closed

- **WHEN** stream/channel value、channel subsequence、capability membership/reduction 或 evaluated-gate relationship 不成立
- **THEN** validator 返回 logical artifact 与 applicable pointer/index/set-relationship diagnostic
- **AND** schema-valid individual files 不会掩盖 complete-set failure

### Requirement: Validated candidate precedes trusted publication

Producer SHALL 按固定顺序执行：validate final core model；project one machine DTO；serialize
three in-memory candidates；调用 artifact-set validator；清理 prior canonical machine files 与
product-owned temp files；把每个 candidate 写入同目录 temp file 并 rename 到 canonical name。
只有三次 canonical writes 全部成功后，producer 才能打印 trusted machine paths 并返回既有
`success` / `gate-failed` outcome。Validation 或 pre-publication cleanup failure MUST NOT 写
canonical machine file。Handled temp/write/rename failure MUST best-effort 删除三个 canonical
machine files 与 owned temp files，映射为 output `failed` / Product CLI exit `2`，且 MUST NOT
被 computed gate 改写。

Machine publication 不构成 multi-file transaction；abrupt termination MAY 留下 residual
files。因此 canonical files 的存在 MUST NOT 代替 producing invocation outcome。一个
invocation SHALL 在运行期间拥有其 artifact directory；concurrent callers MUST 使用不同
artifact directories。Contract-valid `scan-incomplete` artifacts 表达 domain failure，MUST
与 schema/framing/publication failure 区分。

#### Scenario: Conforming candidate becomes current-run evidence

- **WHEN** core validation、projection、serialization、artifact-set validation、cleanup 与全部 canonical writes 成功
- **THEN** producer 在完成 publication 后打印 paths，并返回对应 `success` 或可信 `gate-failed`
- **AND** files 与该 outcome 共同构成 current-run evidence

#### Scenario: Output failure outranks computed gate

- **WHEN** GateResult 已计算，但 validation、cleanup、temp write 或 rename 失败
- **THEN** producer best-effort 清理 current machine set，并返回 `failed` / exit `2`
- **AND** computed gate 与任何 residual file 不构成可信 success 或 gate-failed evidence

### Requirement: Repository consumers validate their actual boundary

Repository automation SHALL 对实际输入调用 current contract 的最窄充分 validator。
`quality:annotate` MUST 以 bytes 读取一个 warning stream，并在 render 前验证完整 input。
其 CLI SHALL 保持 `[warnings-path] [limit]` 形状，默认 path 为
`artifacts/vibe-check-quality/warnings-all.ndjson`、默认 limit 为 `5`；limit MUST 匹配
`^[1-9][0-9]*$` 且不超过 `Number.MAX_SAFE_INTEGER`，extra arguments MUST 作为 parameter
failure。Valid input MUST 先完成全量 validation，再按既有规则过滤 `info` 并应用 limit。

Conforming non-empty input MUST 向 stdout 写 filtered/limited non-blocking GitHub annotations
并退出 `0`；conforming zero-byte input MUST 产生 zero annotations 并退出 `0`。Argument、
read、decoding、framing、syntax 或 schema failure MUST 向 stderr 写 actionable diagnostic、
产生 zero annotation commands 并退出 `2`。Workspace verifier SHALL 只调度 targeted
producer-to-annotation acceptance 并传播 child result；dogfood wrappers 与 package
`quality:*` SHALL 保持 Product CLI pass-through，不得实现另一个 schema registry、parser 或
warning mapper。

#### Scenario: Annotation renders only after complete validation

- **WHEN** annotation consumer 读取 conforming non-empty current warning stream
- **THEN** 它在完整 validation 后按 existing info filter/limit 渲染 annotations，并退出 `0`
- **AND** rendered annotations 不改变 Product gate semantics

#### Scenario: Annotation infrastructure failure emits no partial result

- **WHEN** arguments/input 不可用，或完整 stream 未满足 current predicate
- **THEN** stdout 不包含 annotation commands，stderr 包含 actionable diagnostic，process 退出 `2`
- **AND** consumer 不把已解析 prefix 当作成功 input

#### Scenario: Orchestrators remain pass-through

- **WHEN** required verifier 或 dogfood wrapper 执行 machine-output workflow
- **THEN** 它调度正式 producer/direct consumer 并传播 child outcome
- **AND** 不维护另一份 machine acceptance logic
