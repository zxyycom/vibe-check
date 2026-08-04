本 delta spec 定义显式 JSON Schema 2020-12 validation capability；它是临时 change artifact，须通过实现前审计后才可执行。

## Purpose

让 Vibe Check 在项目声明的 schema registry 与 instance bindings 内可靠验证 JSON Schema 2020-12 文档和实例，同时限制引用解析与网络访问。

## ADDED Requirements

### Requirement: Schema registry and instance bindings are explicit

Product SHALL 只从 semantic config v2 `checks.jsonSchema` 中显式声明的 schema selectors、registry entries 与 schema-to-instance bindings 构造 `json-schema-validation` plan。每个 registry entry MUST 具有 stable binding-visible name、project-root-relative `files` selector 与 explicit dialect `2020-12`，且 selector MUST 在 normalized inventory 中解析为恰好一个 schema document；每个 binding MUST 通过 stable name 引用恰好一个 registry entry，并包含 explicit instance `files` selector。Product MUST NOT 按 `.schema.json` filename、directory adjacency、discovery order、前一个 schema、instance `$schema` 值或未声明 convention 猜测 binding。

Quick profile MUST 不请求 `json-schema-validation` 并返回 `skipped`。Full profile 在 base section 缺失时 MUST 返回 `skipped`；section 存在时，只有 base `enabled = true` 或至少一个 in-scope schema/instance path 经 matching overrides 得到 resolved `enabled = true` 才请求 capability，否则 MUST 为 `skipped`。只有 full profile 已请求但没有 approved registry/binding work时，final result才 MUST为`no-input`。

#### Scenario: Profile and configuration determine schema request

- **WHEN** invocation 分别使用 quick profile、缺失 `checks.jsonSchema` 的 full profile、effective enabled 全为 false 的 full profile 与存在 effective enabled schema work 的 full profile
- **THEN** 前三者的 schema capability 均为 `skipped`，最后一项才进入 registry/binding planning
- **AND** `skipped` 不被改写为 `no-input`，也不启动 schema engine

Config normalization MUST 展开 selectors 并在任何 schema compile/evaluation 前证明每个 selected instance 恰好匹配零或一个 binding。一个 instance 匹配多个 bindings——即使它们引用同一 schema——MUST 是 path-aware config error，列出 normalized instance path 与 conflicting binding IDs，并在 scan work 前退出 `3`；不得任选 first/last match。Adapter 只接收 Product-approved schema/instance exact inputs、normalized registry 与 conflict-free bindings，MUST NOT 重新遍历 root。

Schema/instance paths MUST 先通过 global scope 与 per-file `checks.jsonSchema.enabled`，override 不得重新加入 generated/excluded path。Explicit schema/instance inputs SHALL 由 schema capability plan 拥有并复用 `add-json-validation` 的 strict parser/location boundary；ordinary JSON selector MUST 排除这些已归属 paths，使同一 JSON byte defect 在一个 invocation 只产生一份 finding。Schema JSON stage SHALL 使用该 path 的 `ResolvedFilePolicy.checks.json.maximumBytes`，但不受 ordinary `checks.json.enabled` 开关抑制，因为 schema binding 本身已经显式请求 strict JSON prerequisite。

#### Scenario: Explicit binding selects one schema

- **WHEN** config v2 的一个 binding selector 匹配 approved instance 且引用一个 registered 2020-12 schema
- **THEN** Product 将该 instance 与 schema 的 normalized exact inputs 交给 capability
- **AND** filename、directory layout 与 registry declaration order 不改变 mapping

#### Scenario: Unbound JSON is not inferred

- **WHEN** approved ordinary JSON path 没有匹配任何 explicit schema binding
- **THEN** JSON Schema capability 不验证该 instance
- **AND** 相邻 `.schema.json`、instance 内 `$schema` 或前一个 registry entry 不会成为 inferred binding

#### Scenario: Binding conflict fails before execution

- **WHEN** 一个 instance selector 同时匹配两个 binding IDs
- **THEN** Product Config 在 schema compile/evaluation 前以 exit `3` 报告 instance path 与全部 conflicting IDs
- **AND** capability 不按 declaration order 选择 binding

#### Scenario: Schema-owned JSON input is checked once

- **WHEN** 一个 ordinary `.json` path 同时被 JSON check 启用且作为 schema 或 bound instance 显式选中
- **THEN** exact-input planner 将该 path 归给 schema capability 并复用 strict JSON parser/location contract
- **AND** ordinary JSON capability 不对同一 bytes 产生重复 syntax 或 duplicate-key finding

### Requirement: Schema processing stages remain distinct

对每个 registered schema，Product SHALL 依序区分：schema document strict JSON validation、declared dialect consistency、JSON Schema 2020-12 meta-validation、compile、reference resolution；只有这些 stages 对某 binding 成功后才能评价对应 instances。Schema document 与 instance 自身 strict JSON defect MUST 复用 `json-validation` 的 UTF-8/BOM/size/grammar/duplicate-key/location 语义，并以同一 semantic JSON check ID 形成 schema-capability-owned finding。Entry 声明 dialect MUST 为首版唯一支持的 `2020-12`；schema 的 `$schema` 若存在 MUST 是 `https://json-schema.org/draft/2020-12/schema`，不存在时由 registry entry 的 explicit dialect 决定，MUST NOT 从 keywords 猜测 dialect。

Dialect mismatch、schema-invalid、compile-invalid、reference-invalid与instance-invalid SHALL分别使用exact check IDs `json-schema-dialect`、`json-schema-invalid`、`json-schema-compile`、`json-schema-reference`与`json-schema-instance`，并属于可重复的content findings，而非dependency unavailable/execution failure；schema/instance strict JSON defects复用JSON capability的三个exact check IDs与catalog。上游schema content defect SHALL只产生对应root finding，并在internal binding plan中确定性短路依赖该schema closure的instance evaluation；Product MUST NOT为短路另造instance/blocking finding、public binding-scoped diagnostic、portable not-evaluated record或machine field。内部exception、资源耗尽或normalized result contract violation MUST形成capability `failed`，不能伪装成schema/instance finding。一个schema/binding failure MUST NOT阻止不依赖它的registry entries与bindings被评价。

#### Scenario: Invalid schema JSON stops later stages

- **WHEN** registered schema document 含 strict JSON syntax 或 duplicate-key defect
- **THEN** capability 报告 schema document finding 并不执行其 meta-validation、compile、refs 或 bound instances
- **AND** dependent bindings只在internal plan短路，machine仅发布root finding；其它independent valid bindings仍被评价

#### Scenario: Binding short circuit creates no portable record

- **WHEN** 一个published schema-invalid或reference finding使两个dependent bindings无法评价
- **THEN** internal plan确定性标记并短路两项work，且不产生synthetic instance finding或binding diagnostic
- **AND** human summary若提及短路，只能从同一internal plan与published root finding派生，不是portable machine contract

#### Scenario: Dialect is explicit

- **WHEN** registry entry 声明 `2020-12` 且 schema 省略 `$schema`
- **THEN** Product 按 explicit registry dialect 执行 2020-12 meta-validation
- **AND** Product 不从 filename 或 keyword set 推断其它 dialect

#### Scenario: Content invalidity differs from execution failure

- **WHEN** 一个 schema 未通过 2020-12 meta-schema，另一次 invocation 的 schema engine 内部中断
- **THEN** 前者产生 `schema-invalid` finding，后者产生 capability `failed` / execution diagnostic
- **AND** 两者在 completeness、gate 与 recovery guidance 中保持可区分

### Requirement: JSON Schema findings register exact typed evidence catalogs

`json-schema-validation` descriptor SHALL注册下列check-specific catalogs；每项使用foundation generic`{key, kind, value}`entry并按所列order投影。除特别说明外entries均required；unknown、missing required、wrong-kind、duplicate或out-of-order evidence MUST使normalized capability result为`invalid-result`：

1. `json-schema-dialect`：`schemaId:string`、`schemaPointer:string`。Order固定同列；common primary location指向schema `$schema` token。
2. `json-schema-invalid`：`schemaId:string`、`schemaPointer:string`、`keyword:string`。Order固定同列；primary location在invalid schema document。
3. `json-schema-compile`：`schemaId:string`、optional `schemaPointer:string`、`compileReason:string`。Order固定同列并跳过absent optional entry；`compileReason` MUST是Product-owned stable reason而非backend code/message。
4. `json-schema-reference`：required `schemaId:string`、`schemaPointer:string`、`keyword:string`、`referenceReason:string`，以及optional `targetSchemaId:string`、`targetPath:string`、`targetPointer:string`。Order固定同列并跳过absent optional entries；`keyword`仅为`$ref`或`$dynamicRef`，reason使用stable values `unresolved`、`outside-project`、`remote-disabled`、`reference-cycle`或`invalid-fragment`。Registry target只投影normalized `targetSchemaId`；local target只投影project-relative `targetPath`与normalized JSON Pointer；remote target只投影`remote-disabled` reason，不得投影raw URI。
5. `json-schema-instance`：`bindingId:string`、`instancePointer:string`、`schemaId:string`、`schemaPath:string`、`schemaPointer:string`、`schemaLocation:location`、`keyword:string`。Order固定同列；common path/primary location属于instance，`schemaLocation`是project-relative schema secondary location。

Identity participation MUST为：每个catalog的string evidence均参与stable identity，包括compile/reference reasons与present safe target projection；`schemaLocation` secondary location不参与identity。所有catalog的redaction requirement MUST是“normalized identifiers, pointers and locations only”：paths必须project-relative，pointer/keyword/reason不得包含raw schema/instance value、URI credential/query、backend wording或absolute host path。Raw `$ref` text MUST在diagnostic boundary前丢弃；message、suggestion、console/log、evidence与machine artifacts MUST NOT包含URI userinfo、query、credential/token或其digest。任何必要URI display MUST仅显示normalized registry/schema identity、safe project-relative path/pointer，或不含target的remote-scheme-disabled reason。Producing-revision registry/artifact-set validator SHALL验证exact check membership、key/kind/required/order/identity/redaction。注册这些check/catalog MUST进入sorted public catalog canonical SHA-256并改变expected `semanticRegistryFingerprint`，canonical examples与validator fixtures MUST同步新fingerprint；immutable machine v2 schema只验证generic evidence union，其metrics/warning schema bytes与URI MUST保持不变。

#### Scenario: Instance evidence identifies both documents

- **WHEN** bound instance违反compiled schema keyword
- **THEN** common location指向instance，evidence按catalog顺序提供binding、instance pointer、schema identity/path/pointer、schema secondary location与keyword
- **AND** consumer无需解析message即可定位两侧contract

#### Scenario: Reference evidence is stable and redacted

- **WHEN** `$ref`或`$dynamicRef`产生unresolved、outside-project、remote-disabled、cycle或invalid-fragment finding
- **THEN** reference catalog提供schema identity/pointer、keyword、stable `referenceReason`与适用的safe registry ID或project-relative target/pointer
- **AND** evidence、message、suggestion与logs不包含raw `$ref`、userinfo、query、credential token、其digest、backend code/message或absolute path

#### Scenario: Credential canary never reaches diagnostics

- **WHEN** disabled remote `$ref`在userinfo与query内包含unique credential canary
- **THEN** finding只含`remote-disabled`reason与source schema safe identity/pointer
- **AND** machine/human message、suggestion、stdout/stderr、logs与evidence均不含canary或其digest

#### Scenario: Schema catalogs do not mutate portable schema

- **WHEN** Product registry新增五个schema check IDs与evidence catalogs
- **THEN** artifact-set validator按producing-revision catalog验证records/order/redaction，expected `semanticRegistryFingerprint`及examples/fixtures随sorted catalog更新
- **AND** canonical immutable machine v2 schema bytes、identity与generic evidence shape保持不变

### Requirement: Reference resolution is local, bounded and explicit

Reference resolver SHALL从root schema base URI、explicit registry IDs与Product-approved local schema documents解析`$ref`/`$dynamicRef`。File/path target MUST相对source/base归一化、保持在normalized project root内并命中Core提供的normalized inventory index；resolver只可把该明确target请求为新增staged exact input，Core批准后才可读取，MUST NOT接收root用于搜索或遍历。Registry URI MUST解析到本invocation的explicit registry。HTTP、HTTPS与其它remote references MUST默认禁用，且resolver MUST NOT发起DNS、socket、fetch或package-registry access。

Unresolved、outside-root、remote-disabled与reference-cycle findings MUST使用不同stable `referenceReason`并只保留safe projection：source schema project-relative path/pointer，加normalized target registry/schema identity或project-relative target path/JSON Pointer；remote只保留disabled reason。Resolver MUST在构造message/log/evidence前移除并丢弃URI userinfo与query，且不得输出raw `$ref` text、credential/token或其digest。Human recovery suggestion只能基于stable reason与safe projection生成。

Resolver MUST 检测 reference graph cycle 并施加有界 traversal。JSON Schema 2020-12 语义允许且 engine 能安全评价的 recursive reference MUST 保持有效，不得仅因 graph 有环报告错误；不能按支持语义终止或超出明确资源 budget 的 cycle MUST 产生 `reference-cycle` finding，而不是 hang、stack overflow、unresolved 或 generic execution failure。

#### Scenario: Local registered reference resolves

- **WHEN** schema `$ref` 指向 explicit registry ID 或 project-root 内 approved schema document 的有效 fragment
- **THEN** resolver 使用本 invocation registry 解析并继续 compile/evaluation
- **AND** 不搜索 project root 或读取未批准文件

#### Scenario: Local path reference requires staged approval

- **WHEN** schema引用project-root内但尚未进入schema closure的relative local path
- **THEN** resolver只按normalized inventory index请求该单一target，Core批准后将其加入staged exact inputs
- **AND** target不在inventory、越界或未获批准时不读取，也不通过directory traversal寻找替代文件

#### Scenario: Remote reference is disabled

- **WHEN** schema 引用 HTTP/HTTPS URI 且首版 config 没有 remote opt-in surface
- **THEN** capability 产生 `json-schema-reference` finding与`referenceReason = remote-disabled`
- **AND** runtime不发起网络访问、不输出remote target text，也不把failure映射为dependency unavailable

#### Scenario: Recursive schema is bounded

- **WHEN** reference graph 含可由 2020-12 semantics 安全评价的 recursive reference
- **THEN** capability 在显式资源 budget 内评价 matching instances
- **AND** 只有 unsupported/non-terminating cycle 才产生 `reference-cycle` finding

### Requirement: Instance findings identify both sides of the contract

对每个 successfully compiled binding，Product SHALL 评价全部 approved matching instances。Conforming instance MUST 产生 zero instance-invalid findings；non-conforming instance SHALL 为每个 normalized validation error 产生 `json-schema-instance` finding。Common path/primary location MUST指向instance project-relative path与最窄source token；binding ID、instance pointer、schema ID/path/pointer、schema secondary location与keyword MUST进入上述typed evidence。无法唯一映射instance token（例如missing required property）时common primary location MUST指向最窄owning instance container并保留`instancePointer` evidence，不得伪造不存在token的位置。Human message/suggestion可解释action但不是structured contract。

Findings MUST 按 catalog evidence中的binding ID、common instance path、instance pointer、schema pointer与stable keyword order deterministically排序。Absolute host paths、schema engine error codes/wording与traversal order MUST NOT成为public finding identity或evidence。

#### Scenario: Conforming instance has zero findings

- **WHEN** bound instance 满足 compiled 2020-12 schema
- **THEN** binding evaluation 成功且不产生 instance-invalid finding
- **AND** zero findings 不被改判为 no-input

#### Scenario: Invalid instance points to schema and instance

- **WHEN** bound instance 在 `/items/0/name` 违反 registered schema 的 `/properties/items/items/required`
- **THEN** finding 同时标识 binding、instance pointer/location 与 schema registry/path/pointer
- **AND** consumer 不需要解析 backend-private message 才能定位两侧

#### Scenario: Missing property uses owning container

- **WHEN** required property 不存在因而没有 source token
- **THEN** diagnostic 指向最窄 owning object 的 pointer/location并命名 missing property
- **AND** 不虚构 missing property 的 byte offset

### Requirement: Schema capability preserves result, comparison and cache semantics

Full profile 通过 present/effectively-enabled section 请求 capability 但没有 approved registry/bound instance work时 final result MUST 为 `no-input`，且不得启动 schema engine。Quick、section absent 或 effective disabled MUST 为 `skipped`。全部 planned bindings 完成时，无论 zero findings 或存在 deterministic schema/reference/instance findings，capability SHALL 返回 `succeeded` 与完整 findings；任一 execution/invalid normalized result failure MUST 返回 `failed`，partial findings 不得提升 completeness。

Current 与显式 baseline MUST 复用一个 config/registry/rules snapshot并对各 revision 的 exact schema/instance inputs独立求值；省略 baseline MUST 保持 current-only并绝不推断comparison target。Stable finding fingerprint MUST 基于 semantic check、binding ID、normalized instance/schema paths 与 pointers/keyword identity，不得依赖 line/column 或 backend wording。

Descriptor SHALL 为每个current finding构造internal causal input closure。Closure MUST包含finding common primary path；schema/dialect/compile/reference finding还 MUST包含产生该finding的root schema与实际解析到的transitive local schema/reference paths；instance finding还 MUST包含binding使用的instance path、root schema及全部实际使用的transitive local schema/reference paths。Finding的changed membership在且仅在closure任一路径命中invocation resolved changed scope时为true。`regressions` MUST只从`changed` current findings中，在存在explicit baseline时按stable identity comparison选择，并保持`regressions ⊆ changed`与current order；省略baseline时不得从cache、Git history或location推断regression。

Cache identity MUST 包含 dialect/rules version、normalized registry/bindings、transitive referenced-schema content fingerprints、instance content fingerprint、measurement-relevant file policy 与 capability implementation identity；remote state、report/artifact fields、config version label和 sibling capability settings MUST NOT 参与。Schema/reference/instance deterministic findings MAY cache；execution failure MUST NOT 缓存为成功结果。Causal closure只拥有channel membership，不新增machine evidence/shape。

#### Scenario: Requested capability has no binding work

- **WHEN** full profile 的完整 schema section effectively enabled，但 `schemas`/`bindings` 为空或 normalized scope 中没有 approved bound instance
- **THEN** final result 为 `no-input`
- **AND** Product 不 compile schema 或启动 engine

#### Scenario: Referenced schema change invalidates instances

- **WHEN** root schema 未变但其 transitive local referenced schema bytes 改变
- **THEN** 受影响 binding/instance cache identity 改变并重新评价
- **AND** 未依赖该 schema 的其它 binding cache 保持可复用

#### Scenario: Referenced schema change makes unchanged instance finding changed

- **WHEN** instance bytes与primary path未变，但resolved changed scope命中其binding实际使用的transitive schema path，且该变化产生新的current instance finding
- **THEN** causal input closure使该finding进入`changed`
- **AND** 只有explicit baseline identity comparison判定为new regression时才进入`regressions`，从而保持`regressions ⊆ changed`

#### Scenario: Omitted baseline never infers schema regression

- **WHEN** current causal closure命中changed scope但invocation省略explicit baseline
- **THEN** finding可进入`changed`，comparison保持current-only且不进入`regressions`
- **AND** cache、repository history与reference graph都不能成为inferred baseline

#### Scenario: Location movement does not invent regression

- **WHEN**同一 binding、instance pointer 与 schema keyword violation 仅因 whitespace 使 line/column 改变
- **THEN** baseline comparison 保持同一 finding identity并报告 current location
- **AND** backend message wording或 traversal order 不改变 changed/regression membership
