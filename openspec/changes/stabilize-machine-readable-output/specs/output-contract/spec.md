## ADDED Requirements

### Requirement: Single active output-owned machine contract

Output layer SHALL 从 final product core data 投影 output-owned `MachineMetricsV1` 与 `MachineWarningV1`，并使用 canonical filenames `metrics.json`、`warnings.ndjson` 与 `warnings-all.ndjson`。`MachineMetricsV1.metadata.schemaVersion` MUST 是 `vibe-check.metrics.v1`，每个 embedded 或 streamed `MachineWarningV1.schemaVersion` MUST 是 `vibe-check.warning.v1`。Product runtime schemas SHALL 是公开 field constraints 的唯一 owner，DTO types MUST 从该 source 派生或与其静态一致；published JSON Schema 2020-12 files MUST 位于 `docs/schemas/vibe-check-metrics.schema.json` / `docs/schemas/vibe-check-warning.schema.json`，使用 immutable `$id` `urn:vibe-check:schema:metrics:v1` / `urn:vibe-check:schema:warning:v1`，且 metrics schema MUST 引用同一 warning definition。任何 repository revision MUST 只定义一个 current machine structure；公开 projection 变化 MUST 在独立 change 中同时替换 identities、schemas/examples、validators、direct consumers、tests 与 docs，core-only 或 human-only change 不改变 machine contract。

#### Scenario: Product output uses the current v1 projection

- **WHEN** complete、legitimate empty、gate-failed 或 scan-incomplete run 成功发布 machine artifacts
- **THEN** metrics 与全部 embedded/stream warnings 使用 current v1 identities 并通过 canonical schemas
- **AND** Product CLI 保持该 run 原有 completeness、gate 与 process-outcome semantics

#### Scenario: Core change stays behind the DTO boundary

- **WHEN** core model 增加内部数据或重构，但 machine DTO projection 不变
- **THEN** serialized instances、schemas、examples 与 consumer behavior 保持不变
- **AND** transport identity 不因 private implementation 变化而改变

#### Scenario: Historical report material remains separate

- **WHEN** reviewer 或 consumer 查找 current-product schemas/examples
- **THEN** navigation 指向 canonical metrics/warning v1 materials
- **AND** retired Rust report materials 保持历史 ownership，不进入 current validation registry

### Requirement: Positive byte and artifact-set conformance

Machine artifact conformance SHALL 由 current schemas、byte grammar 与公开 set invariants 共同定义。`metrics.json` MUST 是 UTF-8 without BOM 编码的一个 JSON object。Warning stream MUST 是 zero-byte input，或一个以上由 LF 结束的 JSON object records；每个 non-empty record MUST 通过 canonical warning schema，JSON key order 与 insignificant whitespace MUST NOT 改变 parsed verdict。Parsed `warnings.ndjson` MUST 与 `metrics.warnings.changed` 在 length、order 与 values 上 deep-equal，parsed `warnings-all.ndjson` MUST 与 `metrics.warnings.all` deep-equal。Serialized completeness MUST 与 capability results 一致；evaluated gate 的 policy/channel、evaluated count、blocking list/count、list order 与 passed/failed status MUST 一致，且 `blockingWarnings` MUST 等于 selected channel 中没有 `acceptedReason` 的 records 并保持原顺序。Artifact-set validator 与 warning-stream validator MUST 复用同一 warning identity、schema、byte decoder 与 record parser，并分别证明完整 set boundary 与单 stream boundary。

#### Scenario: A complete artifact set satisfies one current predicate

- **WHEN** validator 接收 schema-valid metrics 和 conforming changed/all streams
- **THEN** 两个 streams 分别与 metrics channels deep-equal，serialized completeness 与 gate invariants 成立
- **AND** artifact-set validator 返回 accepted verdict

#### Scenario: Empty warning channel has explicit semantics

- **WHEN** warning channel 没有 records
- **THEN** 对应 stream 为 zero bytes 并与 metrics 中的 empty channel 一致
- **AND** warning-stream validator 返回 zero records，record-rendering consumer 可以产生 zero annotations

#### Scenario: Contract failure is actionable and all-or-nothing

- **WHEN** input 的 schema、byte grammar 或公开 set invariant 不成立
- **THEN** owning validator 返回包含 logical artifact 与适用 JSON Pointer 或 line/index 的 diagnostic
- **AND** producer 或 warning consumer 不发布或消费已解析的 subset

### Requirement: Validated candidate precedes trusted publication

Producer SHALL 先验证 final core model，再投影一个 `MachineMetricsV1`，从该 DTO 及其 `warnings.changed` / `warnings.all` channels 序列化三个 machine candidates，并在写 canonical machine files 前调用 artifact-set validator。只有 candidate 满足 current schemas、byte grammar 与 set invariants 且全部 canonical writes 成功后，artifact paths 与 `success` / `gate-failed` outcome 才构成 current-run evidence。Validation、prior-file cleanup 或 write failure MUST 映射为 runtime/output `failed` 与 Product CLI exit `2`，并且 MUST NOT 返回 success exit `0` 或 gate exit `1`。一个 invocation SHALL 在运行期间拥有其 artifact directory；需要并行 scan 的调用方 SHALL 使用不同 artifact directories。Files 的存在本身 MUST NOT 代替 producing invocation outcome。

#### Scenario: Conforming candidate is published

- **WHEN** core validation、DTO projection、candidate bytes、schemas、framing 与 set invariants 全部成功
- **THEN** producer 写入三个 canonical machine files 后返回对应 `success` 或可信 `gate-failed`
- **AND** artifact paths 只在 publication 完成后作为 current-run evidence

#### Scenario: Output failure outranks computed gate

- **WHEN** GateResult 已计算，但 candidate validation、cleanup 或任一 canonical write 失败
- **THEN** process outcome 为 `failed`，Product CLI 退出 `2`
- **AND** computed gate 与残留 files 不构成可信 success 或 gate-failed evidence

### Requirement: Repository consumers validate their actual boundary

Repository automation SHALL 对实际输入执行 current contract 的最窄充分 validator。`quality:annotate` MUST 以 bytes 读取一个 warning stream，在 render 前证明完整 input 满足 current warning byte/schema predicate；conforming non-empty 或 zero-byte input MUST 退出 `0`，参数、读取、decoding、framing 或 schema failure MUST 产生 zero annotations 并退出 `2`。Valid quality warnings SHALL 继续产生 non-blocking annotations，annotation infrastructure failure MUST 与 metric/gate failure 保持不同语义。Workspace verifier SHALL 只调度 targeted producer-to-annotation proof 并传播 child result；dogfood wrappers 与 package `quality:*` SHALL 保持 Product CLI pass-through。

#### Scenario: Annotation renders a valid current stream

- **WHEN** annotation consumer 读取完整 conforming warning v1 stream
- **THEN** 它在全量验证后只映射 schema 声明的 render fields 并退出 `0`
- **AND** rendered quality annotations 不改变 Product gate semantics

#### Scenario: Annotation contract failure is infrastructure failure

- **WHEN** annotation 参数/input 不可用，或完整 stream 未满足 current warning predicate
- **THEN** annotation 报告 actionable diagnostic、产生 zero annotations 并退出 `2`
- **AND** consumer 不把已解析 subset 当作成功 input

#### Scenario: Orchestrators remain pass-through

- **WHEN** required verifier 或 dogfood wrapper 执行 machine-output workflow
- **THEN** 它调度正式 producer/direct consumer 并传播 child outcome
- **AND** 不维护另一份 schema、warning mapping 或 machine parser
