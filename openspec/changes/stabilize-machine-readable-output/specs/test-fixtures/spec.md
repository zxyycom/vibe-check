## ADDED Requirements

### Requirement: Canonical current-product artifact examples

Repository SHALL 在唯一 canonical root `docs/examples/artifacts/<outcome>/` 提供 deterministic、完整的 current v1 artifact sets。Outcomes MUST 包括 `complete-passed`、`complete-warning`、`legitimate-empty`、`gate-failed` 与 `scan-incomplete`；每个目录 MUST 包含 `metrics.json`、`warnings.ndjson` 与 `warnings-all.ndjson`，zero-warning streams MUST 是 zero-byte files。Examples MUST 从 fixed core fixture values 经过 production DTO/serializer 生成，dynamic values MUST 在 serialization 前注入固定值，重复 generation MUST byte-stable。每组 files MUST 通过 canonical schemas、byte framing 与公开 set-invariant validation。Current validation registry SHALL 只包含该 canonical root；retired Rust report examples SHALL 保持不同 path 与 historical ownership label。

#### Scenario: Representative current outcomes validate

- **WHEN** docs validation 遍历 canonical artifact examples
- **THEN** 五个 outcomes 的 metrics 与 warning records 通过 current schemas/framing
- **AND** changed/all streams、completeness 与 gate data 满足公开 set invariants

#### Scenario: Example generation is reproducible

- **WHEN** generator 使用同一 fixed core fixture values 重复生成 examples
- **THEN** JSON/NDJSON bytes 不变且 repository diff 为空
- **AND** generated files 仍由 production DTO/serializer 产生

#### Scenario: Valid scan failure differs from output-contract failure

- **WHEN** reviewer 检查 `scan-incomplete` example
- **THEN** example 表达 failed completeness 与对应 GateResult，但 machine contract 本身有效
- **AND** schema/framing/publication failure 由 tests 表达，不进入 canonical valid examples

### Requirement: Focused contract and drift proof

Repository SHALL 通过 product-owned DTO/schema/serializer/validator tests、independent docs validation 与 focused mutations 证明 current machine contract。Canonical valid sets MUST 被接受；identity、representative required/type/enum/closed-shape constraint、UTF-8/record/final-LF framing、changed/all equality，以及每个手写 completeness/gate set invariant MUST 具有直接 failure proof。Mutation cases MUST 调用 owning production 或 docs validator 并断言整体 verdict 与 actionable location，不得使用按 mutation 类型选择 acceptance algorithm 的 test-only parser。Published schema generation drift MUST 使 required validation 失败。Recorded product proof targets MUST 由唯一 test-evidence case 映射到实际 test path、稳定原生测试名称与适用 fixture；通用 schema field constraints MAY 由 schema compile、DTO/schema structural check、representative mutations 与 canonical examples 共同证明，而不为每个 field/keyword 复制同类 case。

#### Scenario: Canonical sets satisfy runtime and published contracts

- **WHEN** product 与 independent docs validators 检查 canonical current examples
- **THEN** schemas、framing 与公开 set invariants 全部成功
- **AND** 两个 validators 得出 accepted verdict

#### Scenario: Focused mutation changes the owning verdict

- **WHEN** test 从 valid set 派生 representative schema、framing 或 set-invariant mutation
- **THEN** owning validator 返回 contract failure 并定位 artifact 与 JSON Pointer 或 line/index
- **AND** validator algorithm 不依赖 mutation label

#### Scenario: Every handwritten set invariant has direct evidence

- **WHEN** reviewer 检查 changed/all equality、completeness reduction 与 evaluated gate invariants
- **THEN** 每项分别具有 success 和 failure test
- **AND** tests 不重新证明 schema library 已统一处理的每个同类 field constraint

#### Scenario: Published schema drift fails required validation

- **WHEN** checked-in schema 与 product-owned generated projection 不同
- **THEN** required validation 报告具体 schema path 并失败
- **AND** example 或 consumer tests 的通过不能掩盖 drift

### Requirement: Required producer-to-consumer acceptance

Required workspace validation SHALL 调度 targeted acceptance：正式 Product CLI 生成 current machine output，实际 `quality:annotate` 再读取 produced warning stream。Acceptance MUST 证明 conforming non-empty 与 zero-byte streams 退出 `0`；representative decoding、framing 或 schema failure MUST 通过同一 warning-stream validator 得出 infrastructure failure、退出 `2`，并在 verdict 前产生 zero annotations。Workspace verifier SHALL 只调度该 acceptance 并按 child exit 分类，不直接解析 machine artifacts；dogfood wrappers SHALL 保持 Product CLI pass-through。

#### Scenario: Formal producer output feeds annotation

- **WHEN** targeted acceptance 通过正式入口生成 non-empty 或 zero-byte warning v1 stream
- **THEN** producer artifact-set validation 与 consumer warning-stream validation 均成功
- **AND** annotation 在完整 validation 后退出 `0`

#### Scenario: Invalid annotation input fails as infrastructure

- **WHEN** acceptance 使 produced warning input 的 decoding、framing 或 schema predicate 不成立
- **THEN** annotation 使用 owning validator diagnostic、产生 zero annotations 并退出 `2`
- **AND** quality warning non-blocking semantics 不把 infrastructure failure 改写为成功

#### Scenario: Required verifier remains an orchestrator

- **WHEN** required profile 执行 producer-to-consumer acceptance
- **THEN** verifier 根据 child result 报告 pass/fail 并保留 actionable output
- **AND** verifier 与 dogfood wrapper 不维护 schema registry 或 artifact parser
