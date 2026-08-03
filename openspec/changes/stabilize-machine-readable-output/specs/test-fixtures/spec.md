## ADDED Requirements

### Requirement: Canonical current-product artifact examples

Repository SHALL 在唯一 current root `docs/examples/artifacts/<outcome>/` 提供 deterministic、
完整的 current-v1 artifact sets。每个 outcome directory MUST 包含 `metrics.json`、
`warnings.ndjson`、`warnings-all.ndjson` 与 README；zero-warning streams MUST 是 zero-byte
files。README MUST 记录 fixed input、gate request、expected process outcome/exit，以及该 set
为何是 contract-valid。五个 outcome labels MUST 使用以下语义：

| Outcome | Completeness | Warning/Gate state | Producing outcome / exit |
| --- | --- | --- | --- |
| `complete-passed` | `complete` | all channels empty；gate `disabled` | `success` / `0` |
| `complete-warning` | `complete` | `all` non-empty；gate `disabled` | `success` / `0` |
| `legitimate-empty` | `empty` | all channels empty；gate `disabled` | `success` / `0` |
| `gate-failed` | `complete` | selected channel 含 unaccepted warning；gate evaluated `failed` | `gate-failed` / `1` |
| `scan-incomplete` | `failed` | fixed diagnostic；requested gate `not-evaluated: scan-incomplete` | `failed` / `2` |

Examples MUST 从 fixed core fixture values 经过 production mapper/serializer 生成；timestamp、
repository root、commit values、paths、config version 与 tool metadata MUST 在 serialization 前
注入固定值。Repeated generation MUST byte-stable。每组 files MUST 通过 canonical schemas、
byte grammar 与全部 public set invariants。Process exit 是 README scenario metadata，MUST NOT
从 files alone 推断。Retired Rust report examples MUST 保持不同 path 与 historical label，
不得注册为 current artifact examples。

#### Scenario: Representative current outcomes validate

- **WHEN** docs validation 遍历 canonical current artifact root
- **THEN** 五组 metrics/warning bytes 通过 schemas、framing、stream equality、channel、completeness 与 gate invariants
- **AND** scan-incomplete set 被识别为 contract-valid domain failure，而不是 output-contract failure

#### Scenario: Example generation is reproducible

- **WHEN** generator 对同一 fixed core fixture values 重复运行
- **THEN** JSON/NDJSON bytes 与 README scenario data 不变且 repository diff 为空
- **AND** artifacts 仍由 production mapper/serializer 产生

### Requirement: Focused contract and drift proof

Repository SHALL 通过 product-owned DTO/schema/mapper/serializer/validator tests、independent
docs validation 与 focused mutations 证明 current machine contract。Canonical valid sets MUST
在 runtime 与 docs boundaries 被接受。以下 predicates MUST 具有直接 failure proof：instance
identity；representative required/type/enum/nullability/closed-shape constraints；invalid UTF-8 与
BOM；metrics root object；warning missing/extra final LF、blank record、malformed/non-object
record；changed/all stream equality；warning channel subsequences；exact capability membership 与
completeness reduction；每个 evaluated-gate channel/count/blocking/order/status invariant，包括
empty `acceptedReason`。Key order、metrics JSON whitespace、record 内 non-LF whitespace 与
CRLF acceptance MUST 有直接 success proof。

Mutation cases MUST 调用 owning production 或 docs validator，并断言整体 verdict 与 logical
artifact plus applicable JSON Pointer/line/index/set relationship；不得按 mutation label 选择
test-only acceptance algorithm。Published schema generation drift 与 canonical example
generation drift MUST 使 required validation 失败。当前 semantic Cases MUST 通过 `Owner`、
`Entities` 与 `Proves` 关联实际 test entities 和适用 fixtures；不得为每个 schema field 或
keyword 复制模板 Case。通用 field constraints MAY 由 strict schema compile、derived DTO
types、representative mutations 与 canonical examples 共同证明。

#### Scenario: Runtime and docs boundaries accept canonical sets

- **WHEN** product validator 与 independent docs validator 检查 canonical current examples
- **THEN** 两者对 schemas、grammar 与 public set invariants 得出 accepted verdict
- **AND** docs validator 不 import product validator 来制造相同结果

#### Scenario: Focused mutation changes the owning verdict

- **WHEN** test 从 valid set 派生 representative identity、schema、grammar 或 set mutation
- **THEN** owning validator 返回 contract failure 与 actionable location
- **AND** valid prefix、schema-valid sibling file 或 mutation label 不会掩盖 failure

#### Scenario: Generated material drift fails required validation

- **WHEN** checked-in schema 或 canonical example bytes 与 product-owned generation result 不同
- **THEN** required validation 报告具体 path 并失败
- **AND** 其它 consumer/unit tests 的通过不能掩盖 drift

### Requirement: Required producer-to-consumer acceptance

Required workspace validation SHALL 调度一个 targeted acceptance child：正式 Product CLI 生成
current machine output，实际 `quality:annotate` 再读取 produced warning stream。Acceptance MUST
覆盖 conforming non-empty 与 zero-byte streams 并证明 annotation exit `0`；MUST 从 produced
valid stream 派生 representative decoding、framing 或 schema-invalid input，并证明同一个
warning-stream validator 产生 infrastructure failure、zero annotation commands 与 exit `2`。
Workspace verifier SHALL 只调度该 child、传播 exit/output 并按 child result 分类，不得直接
parse machine artifacts。Dogfood wrappers SHALL 保持 Product CLI pass-through。

#### Scenario: Formal producer output feeds the actual annotation CLI

- **WHEN** targeted acceptance 通过正式入口生成 non-empty 或 zero-byte current warning stream
- **THEN** producer artifact-set validation 与 consumer warning-stream validation 均成功
- **AND** actual annotation CLI 在完整 validation 后退出 `0`

#### Scenario: Invalid annotation input fails before rendering

- **WHEN** acceptance 使 produced warning input 的 decoding、framing 或 schema predicate 不成立
- **THEN** annotation stderr 使用 owning validator diagnostic，stdout 不含 annotation commands，process 退出 `2`
- **AND** quality warning non-blocking semantics 不把 infrastructure failure 改写为成功

#### Scenario: Required verifier remains an orchestrator

- **WHEN** required profile 执行 producer-to-consumer acceptance
- **THEN** verifier 根据 child result 报告 pass/fail 并保留 actionable output
- **AND** verifier 不维护 schema registry、artifact parser 或 warning mapper
