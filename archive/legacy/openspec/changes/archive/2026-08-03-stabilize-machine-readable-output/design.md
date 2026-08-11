## Context

Product CLI 当前把 `QualityMetrics` 直接序列化为 `metrics.json`，并把
`warnings.changed` / `warnings.all` 分别写入 `warnings.ndjson` /
`warnings-all.ndjson`。Help text 把这些 files 称为 machine-readable artifacts，但当前
TypeScript 产品没有 published schemas、稳定 transport identity、byte-level acceptance
grammar 或 complete-set validator。

现有 output validation 在 machine files 写出后才检查 in-memory core model。
`quality:annotate` 是仓库中唯一读取 warning artifact 的 consumer；它宽松 decode text，只
检查 render fields，跳过 malformed records，并可能把 valid prefix 当作成功结果输出。

已归档的 `make-scan-completeness-observable` 与 `add-ci-quality-gates` changes 已经拥有
capability results、overall completeness、warning channels、`GateResult` 与 process
outcomes。本 change 只拥有这些数据的 public machine projection，以及验证和消费该
projection 的边界。

## 术语与证据模型

| 术语 | 在本 change 中的含义 |
| --- | --- |
| Core model | Product Core 拥有的 final `QualityMetrics` / `WarningRecord` business data。 |
| Machine DTO | Output 拥有的 `MachineMetricsV1` / `MachineWarningV1` public serialization value。 |
| Candidate bytes | Canonical write 前，从一个 machine DTO 产生的三组 in-memory bytes。 |
| Contract-valid set | Metrics 和两个 warning streams 同时满足 current schemas、byte grammar 与 set invariants。 |
| Published set | 三个 canonical writes 均已完成的 contract-valid candidate set。 |
| Current-run evidence | Published set 加 producing Product CLI outcome；files alone 不充分。 |
| Scan-incomplete set | 描述 measurement completeness failure 的 contract-valid set；不是 output-contract failure。 |
| Output-contract failure | Projection、validation、cleanup 或 write failure；映射为 process `failed` / exit `2`。 |

这些区分约束 implementation flow：valid artifact 可以描述 failed scan；invalid 或 partial
publication 不能描述可信 scan result。

## 依赖与 change 边界

| 关系 | 规则 |
| --- | --- |
| 已完成前置 | Completeness、warning-channel、`GateResult` 与 process-outcome semantics 来自主规范和既有 core owners。 |
| 兼容对象 | 当前没有 legacy machine consumer 或 historical artifact reader；早期开发优先当前功能与 correctness，不增加兼容路径。 |
| External config workflow | Config source/path 可以属于 CLI/config runtime context 与 console，但除非后续 output-contract change 显式加入，否则不进入 machine v1。 |
| Lizard TypeScript port | Scanner owner 内的 backend 与 tool metadata values 可以变化；DTO fields、warning projection 与 artifact predicates 保持不变。 |
| 未来 machine change | Public field、requiredness、type、enum、nullability、unit、semantic order 或 meaning 变化时，执行新的显式 version cut。 |

实现不得从另一个 change proposal 推断字段。Explicit DTO mapper 之后的 private core、CLI
或 scanner state 可以在各自 owner 内演进。

## Goals / Non-Goals

### Goals

- 建立 output-owned v1 DTOs、runtime schemas、serializers 与 validators。
- 把 machine identities、public field semantics、byte grammar、set invariants 与 failure
  mapping 定义到可以 independent validate 的精度。
- Canonical publication 前验证 candidates，防止 handled failure 留下可被误当作完整结果的
  partial set。
- Direct annotation consumer 采用 all-or-nothing input validation，同时保持 valid quality
  annotations non-blocking。
- Checked-in schemas/examples deterministic，并能检测与 product source 的 drift。

### Non-Goals

- Console、Markdown report 与 raw scanner artifacts 不成为 v1 machine transports。
- 不增加 result envelope、JSON stdout、manifest、SDK、plugin API 或 artifact discovery
  protocol。
- 不支持同一 artifact directory 的 concurrent writers，也不提供 multi-file transaction。
- Machine validator 不重算 scanner measurements、warnings、thresholds、comparison 或 gate
  business decisions。

## Contract surface 与 ownership

| Surface | Contract | Owner |
| --- | --- | --- |
| `metrics.json` | 一个 `MachineMetricsV1` artifact-set root。 | Product Output |
| `warnings.ndjson` | 与 `metrics.warnings.changed` 相等的 ordered stream。 | Product Output |
| `warnings-all.ndjson` | 与 `metrics.warnings.all` 相等的 ordered stream。 | Product Output |
| `quality:annotate` 的 warning input | 一个完整的 current warning stream。 | Product warning-stream validator |
| Runtime schemas 与 DTO projection | Public structure、constraints、descriptions 与 mapping。 | Product Output |
| Published schemas/examples | Generated 且 independently checked 的 consumer material。 | Product source + docs validation |
| Console / `report.md` / `raw/**` | 既有 human 或 scanner-private boundaries。 | 既有 Output/Scanner owners |

## Decisions

### Decision 1：Explicit machine DTO 隔离 transport、core 与 human output

Output 从 final `QualityMetrics` 构造一个 `MachineMetricsV1`，并通过一个
`MachineWarningV1` mapper 映射每个 embedded warning。V1 field set 以实现前 semantic
baseline 确认的 current serialized field set 为起点，本 change 只实施以下有意的 transport
identity 变化：

- `MachineMetricsV1.metadata.schemaVersion = "vibe-check.metrics.v1"`；
- 每个 embedded 或 streamed `MachineWarningV1.schemaVersion =
  "vibe-check.warning.v1"`。

`metrics.warnings.all`、`changed`、`regressions` 与 evaluated-gate
`blockingWarnings` 全部使用同一个 warning mapper。Stream candidates 从 machine DTO 的
`changed` / `all` arrays 序列化，不得独立再次映射 core warnings。Core
`WarningRecord` 不增加 transport identity；human reports 继续消费 core data，而不是
machine DTO。

该 baseline 是 semantic audit，不是 legacy compatibility evidence。Schema work 前
必须跨 complete、empty、gate-failed 与 scan-incomplete cases 记录 optional-field presence、
nested shapes、value domains、path meaning、units 与 producer ordering。V1 固定以下含义：

- `metadata.repository` 是该 invocation 使用的 normalized absolute project root；它是
  invocation context，不是 portable repository identifier。
- `metadata.timestamp` 是产品按既有 ISO-8601 millisecond form 产生的 UTC instant。
- file、function、duplicate-location 与 warning paths 保持 baseline 确认的
  product-normalized project-relative semantics。
- DTO mapper 保留每个 source array 的顺序；每个 public array 的 schema description 必须
  说明 order 是否具有 consumer semantic。Warning-channel 与 gate blocking order 是
  semantic；capability-array order 不是 semantic，consumer 通过 capability ID 识别成员。
- JSON object member order 与 serialization whitespace 不是 instance semantics。

Schema descriptions 与 owner docs 必须记录 public meaning、units、path context、optionality
和 non-semantic ordering。不得增加 config provenance、backend-only fields 或 speculative
metadata。任何没有现有 owner meaning 的 field 必须先更新 change，才能进入 v1。

### Decision 2：Runtime schema 是 field owner，Product 只暴露一个 shallow module boundary

`src/product/**` 内 JSON-serializable schema definitions 是 public field names、requiredness、
types、closed enums、nullability、numeric/string constraints、dynamic-map value shapes 与
field descriptions 的唯一 owner。Fixed objects 必须 closed；真正 dynamic maps 使用 typed
`additionalProperties` values，不接受 open unknown values。

`MachineMetricsV1` / `MachineWarningV1` types 从 schema-authoring source 派生；不维护第二份
手写 TypeScript field inventory。若现有 toolchain 无法派生 types，实现可以用 `pnpm` 增加
一个 focused schema-authoring/type-inference dependency，但不得建立 repository-specific
generic schema framework。

Product 通过 `src/product/**` 下一个 shallow product-owned boundary 暴露 DTO types、
serializers 与 validators。Product internals 和 `quality:annotate` 都消费该 boundary；script
不得 deep-import internal quality-core file，也不得保留 render-only parser。

Published JSON Schemas 使用 JSON Schema 2020-12，并显式声明
`$schema: "https://json-schema.org/draft/2020-12/schema"`：

| Artifact | Instance identity | Immutable schema `$id` | Canonical path |
| --- | --- | --- | --- |
| metrics | `vibe-check.metrics.v1` | `urn:vibe-check:schema:metrics:v1` | `docs/schemas/vibe-check-metrics.schema.json` |
| warning | `vibe-check.warning.v1` | `urn:vibe-check:schema:warning:v1` | `docs/schemas/vibe-check-warning.schema.json` |

Metrics schema 通过 immutable URN 引用 warning schema。Runtime 与 docs registries 都显式
注册两者。Published files 是 runtime source 的 deterministic projection；required validation
比较 generated bytes 与 checked-in files。Product runtime 不读取 `docs/**` 或 `scripts/**`。

### Decision 3：Positive byte grammar 定义 accepted JSON 与 warning streams

Validators 接收 bytes，而不是预先 decode 的 string，并使用 fatal UTF-8 decoding。Leading
UTF-8 BOM 一律拒绝。

`metrics.json` conformance：

1. bytes 以 UTF-8 decode，不能 replacement；
2. decoded content 恰好包含一个 JSON value，允许 ordinary leading/trailing JSON whitespace；
3. root value 是 non-null、non-array object；
4. object 通过 current metrics schema。

Producer 使用 deterministic two-space pretty JSON，且无 trailing newline。Checked-in
examples 使用该格式；validator acceptance 不依赖 key order 或 insignificant JSON
whitespace。

Warning-stream conformance：

1. zero records 编码为恰好 zero bytes；
2. non-empty stream 以 LF byte `0x0A` 结束；
3. 移除一个 required final LF 后，剩余一个或多个以 LF 分隔的 record segments；
4. 每个 segment 包含一个 JSON object，且不能 empty 或 whitespace-only；
5. LF 只作为 record delimiter；segment 内允许 `SP` (`0x20`)、`HTAB` (`0x09`) 与
   `CR` (`0x0D`) 这些 non-LF JSON whitespace，因此 CRLF 可以接受，其中 CR 属于
   delimiter 前的 trailing whitespace；
6. extra final LF、interior blank line、invalid UTF-8、BOM、malformed JSON、non-object value
   或 schema-invalid warning 都拒绝整个 stream；
7. Producer 对每个 record 输出 compact one-line JSON + LF。

Parsed equality 使用 recursive JSON-value equality：忽略 object member order，保留 array
order，member names 与 values 必须相同。任何 failed parse 都不返回 valid prefix。

### Decision 4：Public set invariants 补全 schema validation

Schema 与 byte validation 之后，artifact-set validator 证明：

1. parsed `warnings.ndjson` 在 length、order、multiplicity 与 values 上 deep-equal
   `metrics.warnings.changed`；
2. parsed `warnings-all.ndjson` deep-equal `metrics.warnings.all`；
3. `warnings.changed` 是 `warnings.all` 的 order-preserving subsequence，
   `warnings.regressions` 是 `warnings.changed` 的 order-preserving subsequence；
4. serialized capability results 包含每个 stable capability ID 恰好一次，不包含 unknown
   ID，并按 core rule reduce 到 `scanCompleteness.overall`：任一 `failed` 则 `failed`；否则
   任一 `succeeded` 则 `complete`；否则为 `empty`；
5. evaluated gate 使用 policy descriptor 指定的 channel，对该 channel 全部 records 计数，
   ordered blocking list 等于 `acceptedReason` absent 或 length 为 zero 的 records；
6. evaluated gate counts 等于对应 arrays 的长度；blocking list empty 时 status 恰好为
   `passed`，否则恰好为 `failed`。

依照现有 core rule，whitespace-only `acceptedReason` 仍为 non-empty，因此仍被接受；改变该
business semantic 属于 Quality Metrics，而不是本 output change。Closed disabled /
not-evaluated gate shapes、warning field constraints 与 status-specific diagnostics 继续由
schema 负责。

这些 checks 只验证 serialized relationships，不 regenerate warnings、不 recompute
thresholds、不 rescan files，也不复制 comparison/gate business logic。

### Decision 5：两个 validator entrypoints 共享同一 warning boundary 与 actionable diagnostics

Product 暴露两个 all-or-nothing entrypoints：

| Entrypoint | Byte input | Success value | Proof boundary |
| --- | --- | --- | --- |
| Artifact-set validator | metrics 加 changed/all warning bytes | typed machine metrics 与两个 parsed streams | schemas、grammar、channel/set invariants |
| Warning-stream validator | 一个 warning byte stream 加 logical artifact label | typed current warning array | warning decoding、grammar 与 schema |

两者复用同一 warning identity、schema registration、fatal decoder、record parser 与 diagnostic
mapping。Contract input failure 返回 discriminated failure，且没有 partial typed value。每个
diagnostic 标识：

- logical artifact；
- decoding、framing、syntax、schema 或 set invariant 等 stable failure category；
- applicable RFC 6901 JSON Pointer、1-based record line / 0-based record index，或 set
  relationship；
- readable message；底层 parser-library wording 不是 stable contract。

Docs validator 有意保持独立：它 compile checked-in schemas、decode example bytes 并重新
检查 public set invariants，不 import product validator。另一项 drift check 证明 checked-in
schemas 确实来自 product source。两侧都适用的 focused mutation 必须得到相同 accepted /
rejected verdict。

### Decision 6：Producer 验证 candidates，并清理 handled partial publication

Final output flow：

1. validate final core model；
2. project one machine DTO，并在 memory 中 serialize 三组 candidate bytes；
3. validate complete candidate set；
4. 清理该 invocation artifact directory 中 prior canonical machine files 与 product-owned
   temp files；
5. 每组 candidate 先写入 same-directory temp file，再 rename 到 canonical name；
6. 三个 canonical writes 全部成功后，才打印 trusted paths，并返回既有 `success` 或
   `gate-failed` outcome。

Validation 或 pre-publication cleanup failure 不执行 canonical machine write。Handled
temp/write/rename failure best-effort 删除三个 canonical machine files 与 owned temps，记录
output fatal issue，并返回 process `failed` / Product CLI exit `2`。Computed gate result 永远
不能覆盖 output failure。

这不是 multi-file transaction。Abrupt process termination 仍可能留下 residual files，因此
canonical file existence 不能代替 producing invocation outcome。下一次 invocation 拥有并
清理其 artifact directory；concurrent invocations 必须使用不同 artifact directories。

Markdown report 与 raw artifacts 保持既有 owners 和 generation conditions；其 write
failures 继续优先于 computed gate result。本 change 不把它们加入 machine artifact-set
predicate。

### Decision 7：Annotation 完整验证 input，并分离 annotations 与 diagnostics

Annotation CLI 保持：

```text
bun run quality:annotate -- [warnings-path] [limit]
```

- default path：`artifacts/vibe-check-quality/warnings-all.ndjson`；
- default limit：`5`；
- limit：匹配 `^[1-9][0-9]*$` 且不超过 `Number.MAX_SAFE_INTEGER` 的 canonical positive
  decimal integer；
- extra arguments 或 invalid limit：parameter failure。

`quality:annotate` 以 bytes 读取 selected file，并调用 product warning-stream validator。只有
完整 input 成功后才进入 rendering。Existing rendering semantics 保持不变：不 render
`info` records；validation 后再限制剩余 records；所有 GitHub annotations 都是 non-blocking
warnings。

Observable outcomes：

| Input/result | Annotation stdout | Diagnostic stderr | Exit |
| --- | --- | --- | --- |
| conforming non-empty stream | filtered/limited GitHub annotation commands 与既有 limit notice | empty | `0` |
| conforming zero-byte stream | zero annotation commands | empty | `0` |
| argument、read、decoding、framing、syntax 或 schema failure | zero annotation commands | actionable diagnostic | `2` |

Quality values 不会让 annotation exit non-zero。Exit `2` 表示 annotation infrastructure
不可用。需要 best-effort annotation 的 CI workflow 必须在 orchestration layer 使该 step
non-blocking，而不是让 parser 接受 malformed input。

### Decision 8：Canonical examples 与 focused proofs 使用显式 outcome matrix

Current examples 位于 `docs/examples/artifacts/<outcome>/`；每个目录包含三个 canonical files
和 README。五个 outcome labels 含义固定：

| Outcome directory | Completeness | Warning state | Gate | Producing outcome / exit |
| --- | --- | --- | --- | --- |
| `complete-passed` | `complete` | all channels empty | `disabled` | `success` / `0` |
| `complete-warning` | `complete` | `all` non-empty；`changed`/`regressions` 由 fixed comparison input 决定，可为空 | `disabled` | `success` / `0` |
| `legitimate-empty` | `empty` | all channels empty | `disabled` | `success` / `0` |
| `gate-failed` | `complete` | selected channel 至少包含一个 unaccepted warning | evaluated `failed` | `gate-failed` / `1` |
| `scan-incomplete` | `failed` | fixed diagnostic data；warnings 可为空 | requested gate 为 `not-evaluated: scan-incomplete` | `failed` / `2` |

每个 README 记录 fixed inputs、requested gate、expected process outcome/exit，以及该 set 为何
contract-valid。Exit 是 scenario metadata，不是从 files alone 推导的 field。

Examples 从 fixed core fixture values 经 production mapper/serializers 生成。Timestamp、
repository root、commit values、paths、config version 与 tool metadata 在 serialization 前
注入。Repeated generation byte-stable；zero-warning streams 是 zero-byte files。

Required proofs 包括：

- runtime 与 independent docs boundary 接受全部 canonical sets；
- identity，以及代表性 required/type/enum/nullability/closed-shape failures；
- invalid UTF-8、BOM、missing/extra final LF、blank record、malformed/non-object record，及
  key-order/non-LF whitespace/CRLF acceptance；
- warning-stream equality 与 channel-subsequence failures；
- exact capability membership 与 completeness reduction success/failure；
- 每个 evaluated-gate invariant，包括 empty `acceptedReason` 的直接 success/failure proof；
- deterministic schema/example regeneration drift failure；
- 正式 non-empty 与 zero-byte producer output 被 actual annotation CLI 消费；
- invalid annotation input 在任何 annotation command 前 exit `2`。

Tests 调用 owning validator，并断言 verdict 与 actionable location；不得让 mutation label
选择 test-only acceptance algorithm，也不复制 schema library 的全部 keyword matrix。
Semantic Cases 通过现有 many-to-many Case catalog 关联 current test entities 与 fixtures。

已退役 `vibe-check.report.v1` schemas/examples 保持 historical paths 与 label。它们仍可接受
generic JSON syntax/schema compile checks，但不注册为 current metrics/warning schemas 或
current artifact examples。

### Decision 9：Current structure hard-cut，不增加 compatibility layer

当前没有 compatibility object。本 change 在一个 repository revision 中替换 pre-v1 bytes 与
permissive annotation parser。仓库不保留另一个 accepted machine structure、legacy reader、
dual writer、deprecation period 或 migration path。

未来改变 public field set、requiredness、type、nullability、enum、unit、semantic order 或
meaning 时，用新的 output-contract change 同时替换 instance identities、schema `$id`、DTO
projection、canonical schemas/examples、validators、direct consumers、tests 与 owner docs。
Canonical filenames 可以保持不变。

若未来出现真实 compatibility object，新 decision 必须识别 consumers、artifact lifetime、
migration cost 与 accepted-version policy；本 change 不预建该机制。Rollback 是 producer、
schemas/examples、consumer、tests、docs 与 required checks 的 repository-revision rollback。

## 风险与取舍

- Runtime validation 增加 final-output work，但只处理三组已经产生的 candidates。
- Closed schemas 与 single current version 会让未来 public changes 显式且可能成本较高；DTO
  boundary 避免 ordinary core changes 支付该成本。
- Independent docs validation 有意在第二个 boundary 重写 public acceptance predicate；
  focused mutations 与 generated drift checks 用于检测 divergence。
- Same-directory temp writes 能处理已捕获的 torn writes，但没有 multi-file transaction；
  producing outcome 仍是必需证据。
- Strict annotation 把 malformed input 从 partial success 改为 infrastructure failure；
  best-effort behavior 属于 orchestration。
