> **核心句：**本delta把产品acceptance tests、canonical examples、drift proof和真实consumer handoff迁移到standard record/run/policy contract。

## MODIFIED Requirements

### Requirement: Configured external project fixture

Repository SHALL在`fixtures/projects/configured-typescript/`提供minimal deterministic project，包含current semantic config、eligible sources、excluded/generated controls、可产生file/function/duplicate records的source与README。Foundation期间current config MUST通过production adapter投影为capability settings与normalized policy；fixture不得建立test-only config或warning mapper。

Fixture test MUST通过正式CLI显式传入project root/config，并验证selected config、scope、exact work、standard records、capability runs和run/record/report artifacts。Backend control只能使用Product-owned test seam或supported operational override，不得进入project config。

#### Scenario: Formal entry follows fixture policy

- **WHEN**fixture test从fixture root外运行正式scan
- **THEN**capabilities只处理config批准的exact work并产生对应records/runs
- **AND**excluded/generated inputs不进入record causal paths或backend inputs

### Requirement: CI quality gate acceptance matrix

Repository SHALL用deterministic Product-owned tests证明：disabled gate及其empty policy-derived arrays；named policy pass/fail；explicit references与independent comparison views；matched/unmatched acceptance annotations；skipped/no-input/completed/failed runs；failed run保留records；允许和阻断partial coverage的policy；zero records；policy/config/reference request failure；evaluator/output failure；cross-output consistency；exit0/1/2/3。

Test matrix MUST使用normalized policy fixtures、controlled records/runs或checked-in project，不得按`all`/`changed`/`regressions`名字注入Core shortcut，不得依赖scanner-private output。

#### Scenario: Config determines partial-run outcome

- **WHEN**两个policies消费相同failed run，其中一个允许partial、另一个阻断failed/unprocessed
- **THEN**前者可pass且后者fail
- **AND**Core与fixture不固定partial evidence为not-evaluated

#### Scenario: Policy result and output failure remain distinct

- **WHEN**一个case满足blocking policy，另一个case在decision后发生publication failure
- **THEN**前者exit1且artifacts可信，后者exit2且不发布可信gate evidence
- **AND**test不混淆domain decision与infrastructure failure

### Requirement: Canonical current-product artifact examples

Repository SHALL在`docs/examples/artifacts/<outcome>/`提供五组deterministic current-v2 sets：`completed-empty`、`completed-records`、`gate-passed`、`gate-failed`和`partial-capability`。每组 MUST包含`run.json`、`records.ndjson`、`report.md`与README；zero-record stream MUST为zero bytes。README MUST记录fixed input、policy/reference identity、expected process outcome/exit和validity理由。

Examples MUST从fixed final model经过production mapper/serializer生成，并通过canonical schemas、byte grammar、catalog、run coverage、reference和evidence invariants。Policy source不嵌入run；fixtures只固定status-specific policy ID/fingerprint与result/evidence。Repeated generation MUST byte-stable。

#### Scenario: Representative outcomes validate

- **WHEN**docs validation遍历current artifact root
- **THEN**五组run/record sets通过independent validation
- **AND**partial-capability被识别为contract-valid domain state而非output failure

### Requirement: Focused contract and drift proof

Repository SHALL通过Product-owned model/schema/mapper/serializer/validator tests、independent docs validation和focused mutations证明run/record v2。Direct failure proof MUST覆盖schema/identity、record typed data/order、registry fingerprint、run coverage、annotations/views/evidence references、UTF-8/BOM、JSON/NDJSON framing与complete-set relationships。

Published schema、catalog fixture和canonical example generation drift MUST使required validation失败。Mutation tests MUST调用owning validator并断言actionable location，不得按mutation label实现test-only acceptance algorithm。

#### Scenario: Runtime and docs validators agree

- **WHEN**Product validator与independent docs validator检查canonical examples
- **THEN**两者接受相同valid sets并拒绝representative mutations
- **AND**docs validator不import Product validator制造相同结果

### Requirement: Required producer-to-consumer acceptance

Required workspace validation SHALL通过正式CLI生成current machine output，再由actual `quality:annotate`读取produced `records.ndjson`。Test MUST覆盖valid non-empty、zero-byte与derived invalid stream，分别证明annotation exit0、zero annotations和invalid input exit2/zero annotation commands。

Workspace verifier SHALL只调度child并传播结果，不得直接parse artifacts。Annotation consumer MUST完整validate后才按common level/location渲染，且不得理解policy或check-specific fields。

#### Scenario: Formal producer feeds actual annotation consumer

- **WHEN**targeted test生成valid record stream并交给annotation CLI
- **THEN**producer set validation与consumer stream validation均成功
- **AND**consumer在完整validation后按common fields渲染或对zero stream无输出

#### Scenario: Invalid input fails before rendering

- **WHEN**produced stream派生decode、framing或schema-invalid input
- **THEN**consumer输出actionable stderr、zero annotation commands并exit2
- **AND**non-blocking quality semantics不吞掉infrastructure failure
