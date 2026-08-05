> **核心句：**本 delta hard cut acceptance、canonical examples、drift proof 和真实 consumer handoff 到 Check/Record/Decision v2，并直接证明 execution 与 identity integrity 边界。

## REMOVED Requirements

### Requirement: Configured external project fixture

**Reason**: Existing fixture asserts metrics/warnings/capability results rather than Check/Record owners。

**Migration**: 使用新增的“Configured Check and Record project fixture”。

### Requirement: CI quality gate acceptance matrix

**Reason**: Existing matrix hardcodes channels、overall completeness 与 not-evaluated gate semantics。

**Migration**: 使用新增的“Check and Record decision acceptance matrix”。

### Requirement: Canonical current-product artifact examples

**Reason**: Current-v1 metrics/warning examples 被 run/record v2 替换。

**Migration**: 使用新增的“Canonical Check and Record v2 examples”。

### Requirement: Focused contract and drift proof

**Reason**: Existing proof targets MachineMetricsV1/MachineWarningV1 and warning stream set relationships。

**Migration**: 使用新增的“Check and Record contract and drift proof”。

### Requirement: Required producer-to-consumer acceptance

**Reason**: Actual annotation consumer 改为读取 standard record stream。

**Migration**: 使用新增的“Record-stream producer-to-consumer acceptance”。

## ADDED Requirements

### Requirement: Configured Check and Record project fixture

Repository SHALL 在 `fixtures/projects/configured-typescript/` 提供 minimal deterministic project，包含 current semantic input、eligible sources、excluded/generated controls、可产生 file/function/duplicate records 的 source 与 README。Foundation 期间 current config MUST 通过 production adapter 投影为 built-in check settings 与 normalized policy；fixture 不得建立 test-only definition、binding、policy evaluator 或 warning mapper。

Fixture test MUST 通过正式 CLI 显式传入 project root/config，并验证 selected input、scope、applicability、domain work、standard records、CheckRuns/CheckResults 和 run/record/report artifacts。Backend control 只能使用 Product-owned test seam 或 supported operational override，不得进入 project semantic config。

#### Scenario: Formal entry follows fixture policy

- **WHEN**fixture test 从 fixture root 外运行正式 scan
- **THEN**built-in checks 只处理 config 批准的 exact work 并产生对应 runs/results/records
- **AND**excluded/generated inputs 不进入 record related paths 或 backend inputs

### Requirement: Check and Record decision acceptance matrix

Repository SHALL 用 deterministic Product-owned tests 证明：catalog/binding resolution 与 freeze；skipped、pre-execution not-applicable、applicable zero-work、completed passed/failed、execution failed；incremental acknowledgements；failed execution 保留 records；byte-equivalent duplicate 幂等与 conflicting duplicate 拒绝 publication；disabled 与 named policy pass/fail；explicit references；acceptance/views；允许和阻断 partial coverage；policy/config/reference request failure；evaluator/output integrity failure；cross-output consistency 及 exit0/1/2/3。

Matrix MUST 使用 normalized policy fixtures、controlled definitions/bindings/reports/records 或 checked-in project，不得按 policy 名称注入 Core shortcut，不得依赖 Task identity 或 scanner-private output。

#### Scenario: Policy determines partial-run outcome

- **WHEN**两个 policies 消费相同 failed run，其中一个允许 partial、另一个阻断 failed/unprocessed
- **THEN**前者可 pass 且后者 fail
- **AND**Core 与 fixture 不固定 partial evidence 为 not-evaluated

#### Scenario: Product integrity cannot be allowed by policy

- **WHEN**case 分别产生 record identity conflict、missing ExecutionReport 或 publication failure
- **THEN**三者 exit2 且不发布可信 GateResult evidence
- **AND**test 不把 Product failure 混同于 failed CheckRun 或 evaluated gate failure

### Requirement: Canonical Check and Record v2 examples

Repository SHALL 在 `docs/examples/artifacts/<outcome>/` 提供五组 deterministic current-v2 sets：`completed-empty`、`completed-records`、`gate-passed`、`gate-failed` 和 `partial-check`。每组 MUST 包含 `run.json`、`records.ndjson`、`report.md` 与 README；zero-record stream MUST 为 zero bytes。README MUST 记录 fixed input、policy/reference identity、expected process outcome/exit 和 validity 理由。

Examples MUST 从 fixed valid final model 经过 production mapper/serializer 生成，并通过 canonical schemas、byte grammar、public catalog、unique checkRunId、record ownership、run/result/coverage、reference 和 evidence invariants。Private bindings/contributions/reports 与 policy source 不得嵌入 run。Repeated generation MUST byte-stable；identity-conflict case 只能作为 negative mutation，不能成为 canonical valid set。

#### Scenario: Representative outcomes validate

- **WHEN**docs validation 遍历 current artifact root
- **THEN**五组 run/record sets 通过 independent validation
- **AND**partial-check 被识别为 contract-valid domain state 而非 Product failure

### Requirement: Check and Record contract and drift proof

Repository SHALL 通过 Product-owned model/schema/mapper/serializer/validator tests、independent docs validation 和 focused mutations 证明 run/record v2。Direct failure proof MUST 覆盖 public/private catalog separation、checkRunId uniqueness、run/result sum、domain coverage、record typed data/order、same-ID idempotency/conflict、exact record owning-run reference、annotations/views/evidence、UTF-8/BOM、JSON/NDJSON framing 与 complete-set relationships。

Published schema、catalog fixture 和 canonical example generation drift MUST 使 required validation 失败。Mutation tests MUST 调用 owning validator 并断言 actionable location，不得按 mutation label 实现 test-only acceptance algorithm。

#### Scenario: Runtime and docs validators agree

- **WHEN**Product validator 与 independent docs validator 检查 canonical examples 和 representative invalid mutations
- **THEN**两者接受相同 valid sets 并拒绝相同 relationship/integrity failures
- **AND**docs validator 不 import Product validator 制造相同结果

### Requirement: Record-stream producer-to-consumer acceptance

Required workspace validation SHALL 通过正式 CLI 生成 current machine output，再由 actual `quality:annotate` 读取 produced `records.ndjson`。Test MUST 覆盖 valid non-empty、zero-byte 与 derived invalid stream，分别证明 annotation exit0、zero annotations 和 invalid input exit2/zero annotation commands。

Workspace verifier SHALL 只调度 child 并传播结果，不得直接 parse artifacts。Annotation consumer MUST 完整 validate 后才按 common level/location 渲染，且不得理解 policy、private binding 或 check-specific fields。

#### Scenario: Formal producer feeds actual annotation consumer

- **WHEN**targeted test 生成 valid record stream 并交给 annotation CLI
- **THEN**producer set validation 与 consumer stream validation 均成功
- **AND**consumer 在完整 validation 后按 common fields 渲染或对 zero stream 无输出

#### Scenario: Invalid input fails before rendering

- **WHEN**produced stream 派生 decode、framing 或 schema-invalid input
- **THEN**consumer 输出 actionable stderr、zero annotation commands 并 exit2
- **AND**non-blocking quality semantics 不吞掉 infrastructure failure
