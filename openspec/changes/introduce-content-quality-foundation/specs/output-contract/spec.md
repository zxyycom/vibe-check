本 delta spec 发布 single-active machine v2 的 observations、finding variants 与 registry validation；它是临时 change artifact，尚未完成实现前审计。

## MODIFIED Requirements

### Requirement: Single active output-owned machine contract

Output layer SHALL 定义唯一 current `MachineMetricsV2` / `MachineWarningV2` machine contract，并使用 canonical filenames `metrics.json`、`warnings.ndjson` 与 `warnings-all.ndjson`。`MachineMetricsV2.metadata.schemaVersion` MUST 是 `vibe-check.metrics.v2`，且metadata MUST包含producing Product registry的required `semanticRegistryFingerprint`；每个embedded或streamed `MachineWarningV2` MUST包含`schemaVersion = "vibe-check.warning.v2"`与相同registry fingerprint。Fingerprint MUST符合`sha256:<64 lowercase hex>`。Metrics v2 MUST包含required current `observations` array；Warning v2 SHALL是与core finding variants对应的closed discriminated union，不得要求content/security records伪造numeric metric fields，也不得把non-finding observation写入warning stream。

Product runtime schemas SHALL 是 public field constraints 与 field descriptions 的唯一 owner，DTO types MUST 从 schema-authoring source 派生。Published JSON Schema 2020-12 files MUST 位于 `docs/schemas/vibe-check-metrics.schema.json` 与 `docs/schemas/vibe-check-warning.schema.json`，分别使用 immutable `$id` `urn:vibe-check:schema:metrics:v2` 与 `urn:vibe-check:schema:warning:v2`；metrics schema MUST 通过该 warning URN 引用同一 warning definition。为了让immutable v2 schema在Product新增registered capability/check/metric/evidence IDs时保持同一bytes与语义，schema SHALL将这些semantic identifiers验证为non-empty strings而不得枚举producing-revision registry，并 SHALL包含stable generic evidence entry union；Product core/artifact-set validator SHALL负责closed registry membership与check/metric/evidence catalog组合。Current repository MUST NOT 保留 v1 reader、dual writer、migration window 或另一个 accepted machine structure。两个 schemas MUST 显式声明 dialect URI `https://json-schema.org/draft/2020-12/schema`。

Product SHALL 通过 `src/product/**` 下 shallow boundary 暴露 DTO types、serializers、artifact-set validator 与 warning-stream validator；product runtime MUST NOT 读取 `docs/**` / `scripts/**`，repository scripts MUST NOT deep-import internal quality-core modules 来建立第二个 contract boundary。

#### Scenario: Product output uses the only current v2 contract

- **WHEN** invocation 发布 contract-valid machine artifacts
- **THEN** metrics observations 与全部 embedded/streamed findings 使用 current v2 identities 并通过 canonical schemas
- **AND** repository producer、validators、direct consumer、schemas/examples、tests 与 owner docs 只使用该 current structure

#### Scenario: Registry growth does not mutate immutable schema IDs

- **WHEN**后续feature change注册新的capability、check、observation metric或evidence semantic IDs，但不增加machine fields或改变existing field meaning
- **THEN**canonical v2 schema bytes与immutable URNs保持不变，structural schema接受non-empty identifiers，新artifact使用新的semantic registry fingerprint
- **AND**producing Product registry validator要求fingerprint与新catalog相等、新ID出现于正确catalog，并继续拒绝unknown/missing/duplicate membership

#### Scenario: Historical report material remains separate

- **WHEN** reviewer 或 consumer 查找 current-product schemas/examples
- **THEN** navigation 指向 metrics/warning v2 materials
- **AND** retired Rust report 与 superseded machine v1 material 不进入 current machine registry

### Requirement: Explicit DTO projection preserves owned public semantics

Output layer SHALL 从 final core `QualityMetrics` / `ObservationRecord` / `FindingRecord` 显式投影一个 `MachineMetricsV2`，通过一个observation mapper产生required current observations，并通过同一个variant-aware finding mapper产生metrics内全部findings和streamed warning records。`warnings.ndjson` 与 `warnings-all.ndjson` candidates MUST 分别从该 DTO 的 `warnings.changed` 与 `warnings.all` 序列化，不得从 core findings 建立第二条 projection path；warning streams MUST NOT复制observations。V2 field set SHALL 只包含 current runtime schemas 与 explicit mappers 声明的 observation/common/variant fields；不得从相邻 feature change 预取未确认的 check-specific evidence、config provenance 或 scanner backend fields。

Schema descriptions 与 owner docs MUST 明确每个 observation/common/variant field 的 meaning、unit、path context、redaction、optional/null semantics 和 semantic ordering。`metadata.repository` SHALL 表示 invocation 使用的 normalized absolute project root，而不是 portable repository identity；capability arrays SHALL 按 descriptor registry ID 消费而不承诺 semantic order。DTO mapper SHALL 保留 source array order；每个public array的schema description MUST声明order是否具有consumer semantic，observations、warning channels与gate blocking order MUST按各自owner声明的semantic order。Core-only、human-only 或 private scanner change 在 DTO projection 不变时 MUST NOT 改变 machine instances、schemas、examples 或 consumer behavior。

#### Scenario: All finding projections use one mapper

- **WHEN** final core data 包含 all/changed/regressions findings 或 evaluated-gate blocking findings
- **THEN** 每个 serialized value 经过同一个 variant-aware `MachineWarningV2` mapper
- **AND** metrics channels 与 stream candidates 不会因独立 projection path 产生漂移

#### Scenario: Observation projection is single-source

- **WHEN**final core data包含current observations
- **THEN**MachineMetricsV2通过explicit observation mapper按registry-declared order投影它们
- **AND**report若呈现相同事实只消费core records，不重新测量或创建second machine shape

#### Scenario: Private core change stays behind the DTO boundary

- **WHEN** core 增加 private field、重构内部 model 或改变 human-only output
- **THEN** explicit machine mapper 忽略未声明数据，current machine contract 保持不变
- **AND** transport identity 不因 private implementation change 改变

## ADDED Requirements

### Requirement: Machine v2 validates producing registry and record variants

Artifact-set validator SHALL 在 schema 与 byte validation 后，先验证metrics metadata及每个embedded/streamed warning的`semanticRegistryFingerprint`全部等于producing Product registry的canonical fingerprint，再按该registry验证capability results恰好包含每个registered capability ID一次且没有unknown/duplicate ID，并使用shared reducer核对overall completeness。Validator SHALL按同一registry验证每个observation的capability/metric/unit/subject-kind组合，对每个embedded/streamed warning record验证capability/check membership、discriminant、variant-owned fields与evidence key/kind/order/redaction catalog，且 SHALL 保持 stream/channel deep equality、subsequence、acceptance 与 evaluated-gate invariants。Portable JSON Schema只负责稳定v2结构与fingerprint grammar，不得声称单独证明revision-specificregistry completeness。

#### Scenario: Variant or registry drift fails the complete set

- **WHEN**registry fingerprint不一致、observation/finding semantic catalog或record discriminant与fields不一致，或capability membership与descriptor registry不一致
- **THEN** artifact-set validator 返回 applicable pointer/index/set-relationship diagnostic
- **AND** individually parseable JSON 不会掩盖 complete-set failure
