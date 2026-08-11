# output-contract Specification

## Purpose
定义 TypeScript/Bun 产品如何从同一 core 结果投影 console、metrics、Markdown、warning
streams、completeness 与 GateResult，并固定 human/machine/raw 边界、可信发布条件和
output failure 优先级。
## Requirements
### Requirement: Shared report data projection
Output layer SHALL 按 pinned generation conditions 从 product core 产出的同一份 TypeScript metrics/report data 写出 `metrics.json`、`report.md`、`warnings.ndjson` 和 `warnings-all.ndjson`，并且 MUST NOT 独立重新计算 scanner metrics、warning channels、baseline/comparison 或 `passed` / `warning` / `failed` status。为复现 scanner behavior 保存的 raw artifacts SHALL 保持 adapter-private boundary，不得直接成为 stable product output field。

#### Scenario: Stable artifacts project the same product data
- **WHEN** 同一次已完成 scan 按既有生成条件写出 metrics、Markdown report 和 warning-channel artifacts
- **THEN** `metrics.json`、`report.md`、`warnings.ndjson` 和 `warnings-all.ndjson` 投影同一份 product metrics/report data
- **AND** Output 不重新运行 scanner 或重新计算 warning、baseline/comparison 与 status

#### Scenario: Raw scanner material remains private
- **WHEN** adapter 保存 normalized scanner reproduction material 或 raw artifact
- **THEN** 该 material 留在 scanner artifact boundary
- **AND** 第三方原生 output structure 不直接提升为 stable product output field

### Requirement: Empty-state output
Output layer SHALL 保持 pinned TypeScript consumer 对 zero scan inputs、zero metrics/findings、zero warnings、profile skip、baseline unavailable 与 fatal failure 的既有可观察区分。正常 empty result SHALL 按既有生成条件写出 metrics/report artifacts 和一致 console summary；fatal failure MUST NOT 被投影为 empty success。

#### Scenario: Completed empty result remains distinct
- **WHEN** scan 正常完成但没有 scan inputs、scanner findings 或 warnings
- **THEN** 既有 artifacts 和 console summary 表达相应 empty state
- **AND** 该结果不被标记为 fatal failure

#### Scenario: Profile skip and unavailable baseline remain observable
- **WHEN** quick profile 跳过既有 component，或 baseline comparison 不可用
- **THEN** artifacts 与 console 保持 pinned consumer 对 skip 或 unavailable state 的表达
- **AND** Output 不把这些状态重新分类为 successful finding 或 fatal failure

#### Scenario: Fatal failure is not empty success
- **WHEN** scanner/runtime fatal issue 阻止 scan 正常完成
- **THEN** Output 保持既有 fatal console、artifact 和 status behavior
- **AND** 不生成伪装为 zero-result success 的报告

### Requirement: Output owner documentation
Output 契约 SHALL 拥有长期 owner 文档，该文档 MUST 记录 operational console channels、`metrics.json`、`report.md`、`warnings.ndjson`、`warnings-all.ndjson`、raw scanner artifacts、adapter-private output boundary、empty/failure state 和 status consistency，并被 `docs/navigation.md` 引用。Owner 文档 MUST NOT 把 Rust human/JSON stdout mode、`vibe-check.report.v1` schema 或 examples 作为 TypeScript 产品 contract。

#### Scenario: Navigation points to TypeScript output owner
- **WHEN** reviewer 从 `docs/navigation.md` 查找输出规则
- **THEN** 导航文档指向记录现有 TypeScript console 与 artifact boundary 的 owner 文档
- **AND** owner 文档不要求 TypeScript 产品实现 Rust stdout report 或 schema/example contract

### Requirement: Current product ownership notices
Human-readable reports SHALL retain top and footer non-blocking development snapshot notices while naming the TypeScript/Bun product as the current release-contract owner. The top notice MUST identify the TypeScript/Bun product CLI, report contract, and product tests as the release contract. The footer notice MUST identify TypeScript/Bun product tests and contract validation as the release gates. Neither notice SHALL identify the retired Rust CLI, Rust schema, or Rust tests as the current owner. Updating these notices MUST preserve artifact shape, fields, status, section ordering, report structure, and machine-readable output.

#### Scenario: Top notice names the current release contract
- **WHEN** a human-readable quality report renders its top non-blocking notice
- **THEN** the notice names the TypeScript/Bun product CLI, report contract, and product tests as the release contract
- **AND** it does not name the retired Rust CLI, schema, or tests as the current release contract

#### Scenario: Footer notice names the current release gates
- **WHEN** a human-readable quality report renders its footer notice
- **THEN** the notice names TypeScript/Bun product tests and contract validation as the release gates
- **AND** it does not name Rust tests or Rust schema validation as the current release gates

#### Scenario: Notice replacement preserves report contracts
- **WHEN** both current-product notices replace the retired Rust notices
- **THEN** artifact shape, fields, status, section ordering, report structure, and machine-readable output remain unchanged

### Requirement: Completeness is visible across output surfaces

Output layer SHALL 从 product core 的同一 final capability results 与 overall completeness 投影 console summary/completion、`metrics.json` 和 `report.md`，MUST NOT 重新计算 capability status 或 overall。

Machine artifacts SHALL 提供 overall completeness、每项 capability 的 ID/status，以及 failed result 的 normalized diagnostic。Human output SHALL 区分 profile skip、no input、successful zero findings 与 failure。稳定 schema identity、最终 field naming/nesting、single-active version boundary 和 examples SHALL 遵循本规范的 current machine contract requirements。

#### Scenario: Complete scan reports succeeded capabilities

- **WHEN** scan overall completeness 为 `complete`
- **THEN** machine artifact 和 human summary 表达相同的 complete state
- **AND** human completion 可以根据 normalized quality warnings 显示 passed 或 warning

#### Scenario: Empty scan is visible as warning

- **WHEN** scan overall completeness 为 `empty`
- **THEN** machine artifact 表达 `empty`，human completion 显示 warning
- **AND** human text 说明没有 eligible input、质量未评价，不显示绿色通过

#### Scenario: Capability states retain product meaning

- **WHEN** quick profile skip、no input 与 successful zero findings 出现在 capability results 中
- **THEN** output 分别表达 `skipped`、`no-input` 与 `succeeded`
- **AND** 不把任何一种状态显示为 component failure

#### Scenario: Failed measurement writes actionable evidence

- **WHEN** capability result 为 `failed`
- **THEN** 在 failure model 可验证且 artifacts 可写时，console、report 和 machine artifact 都显示 overall failed 与 normalized diagnostic
- **AND** human completion 显示 capability、原因与恢复动作，不包含可信 `passed` 结论

### Requirement: Gate result projection

Output layer SHALL 从 product core 产出的同一 discriminated `GateResult` 投影 `metrics.json`、Markdown report 与 console completion，且 MUST NOT 重新选择 warning channel、重新应用 `acceptedReason`、重新排序 records 或重新计算 blocking warnings。`metrics.json` MUST 总是记录完整 result；省略 gate 时 report 与 console MUST 保持既有人读结构且不显示 gate section；请求 gate 时 report MUST 在 summary area、detailed findings 前提供 deterministic gate section，console MUST 显示同一 policy、status 与 state-specific fields。`all` gate human output MUST 将结论限定在 resolved profile，并保留 skipped-capability evidence。`not-evaluated` output MUST 显示 closed reason code；行动信息来源 MUST 固定为：`scan-incomplete` → failed capability diagnostic，`no-eligible-input` → resolved profile/scan scope，`comparison-unavailable` → `metrics.baseline.status`。

#### Scenario: Disabled gate does not claim success

- **WHEN** metrics gate result 为 `disabled`
- **THEN** `metrics.json` 记录 disabled result
- **AND** report 与 console 不新增 gate section 或“gate passed”completion

#### Scenario: Passed gate is consistent across outputs

- **WHEN** requested gate 被评价且没有 blocking warnings
- **THEN** metrics、report 与 console 表达同一 policy、channel、counts 与 `passed`
- **AND** existing warning and capability output 保持可见

#### Scenario: Missing evidence is not reported as passed

- **WHEN** requested gate result 为 `not-evaluated`
- **THEN** metrics、report 与 console 显示同一 policy 与 reason code
- **AND** human output 的行动信息来源固定为：`scan-incomplete` → failed capability diagnostic，`no-eligible-input` → resolved profile/scan scope，`comparison-unavailable` → `metrics.baseline.status`
- **AND** human output 不显示 gate passed 或 failed

### Requirement: Trustworthy gate publication

Evaluated gate completion SHALL 写 stdout，且 evaluated gate failure 本身 MUST NOT 写 fatal stderr；`not-evaluated`、runtime、completeness 与 output failure MUST 使用 failure stderr boundary。`warnings.ndjson` 与 `warnings-all.ndjson` MUST 保持既有 channel records、ordering 与 `acceptedReason`，selected policy MUST NOT 删除 accepted、non-selected 或 non-blocking warnings。Gate failure 只有在 artifacts 写出并通过 output validation 后才能形成可信 `gate-failed` process outcome；artifact write 或 output validation failure MUST 保持 runtime/output failure，并 MUST NOT 被显示为可信 gate failure。

#### Scenario: Failed gate writes evidence before exit

- **WHEN** evaluated gate 存在 blocking warnings，且 artifacts 已写出并验证
- **THEN** metrics 与 report 记录同一 `failed` result 和 blocking warnings
- **AND** stdout 显示 gate-failed completion，stderr 不因 gate failure 本身显示 fatal error

#### Scenario: Output failure outranks a blocking result

- **WHEN** gate 已计算，但 artifact write 或 output validation 失败
- **THEN** console 使用 runtime/output failure conclusion
- **AND** 未完成验证的 artifacts 不作为 gate-failure evidence

#### Scenario: Gate selection does not mutate warning streams

- **WHEN** 同一 normalized warning data 使用 disabled request 或任一 gate policy
- **THEN** warning streams 保持原 records、ordering 与 `acceptedReason`
- **AND** blocking warnings 只由 `GateResult` 表达

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
