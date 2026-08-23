# Design

本设计用显式 registry/binding 和零网络 resolver 把 JSON Schema 2020-12 收口为一个 producing Check 拥有的完整领域管线。

## Context

当前仓库的 docs validators 和 Product tests 使用 pinned Ajv 8 `devDependency`，但 Product runtime 尚未 import Ajv；本仓库也只有服务 docs materials 的 registry，没有面向被扫描项目的 schema registry、instance binding或 reference security contract。活动决策已经确认 runtime-resolved Check/Record、TaskPlan、TypeScript Project Definition、Check-owned文件政策和 format-aware built-ins；这些基础方向目前仍未对齐当前实现。

本 Change 的实施顺序位于 `establish-check-record-core`、`establish-check-task-orchestration`、`adopt-typescript-project-definition`、`add-file-policy-overrides` 和 `add-json-validation` 之后。它复用 JSON Change 的 bytes→parsed value/pointer/location service。

## Goals / Non-Goals

目标：

- 由一个可在 work 前完整验证的 Project Definition plan 唯一决定 schema documents、bindings和 instances。
- 分阶段区分 JSON document defect、schema dialect/meta-schema defect、compile/reference defect、instance violation和 execution failure。
- 默认完全离线，把每次 secondary resource read限制为显式 registry中的一个 approved target。
- 同时保留 instance与schema的稳定 pointer和当前 location，并让 transitive dependency参与 comparison/cache。

非目标：

- 不支持 draft-04/06/07/2019-09、remote fetch、schema discovery、instance `$schema` 推断或 declaration-order precedence。
- 不公开 validator provider、compile flags、backend error objects或 `scripts/**` registry。
- 不重新实现 strict JSON parser，不让 ordinary JSON 与 schema Check 对同一 claimed path生成重复 records。
- 不把 dependent binding短路提升为新的 public CheckRun状态、record type或 machine field。

## Decisions

### Intended Change

#### 1. 固定 feature 顺序与公共 identities

本 feature固定 `checkId = json-schema-validation`，并注册：

- `json-schema-dialect`：缺失、冲突或不支持的 dialect声明。
- `json-schema-invalid`：schema document bytes存在 strict-JSON defect，或 schema未通过 2020-12 meta-schema / structural validation。
- `json-schema-compile`：schema在合法文档和引用已解析后仍不能编译的稳定 Product原因。
- `json-schema-reference`：unresolved、unregistered-local、outside-project、remote-disabled、invalid-fragment、invalid-base-uri、duplicate-registered-identity或bounded-cycle问题。
- `json-schema-instance`：bound instance document bytes存在 strict-JSON defect，或 parsed instance违反 compiled schema keyword。

这些是 `recordTypeId`，不与 `checkId`互作别名。CheckResult在所有 planned work正常收敛且没有以上 records时为 passed，存在任一 domain record时为 failed；validator/resolver/protocol异常让 CheckRun failed且 result 为 null。

#### 2. Project Definition 产生 closed registry/binding plan

JSON Schema built-in reference接受 owner-validated serializable policy：

- `schemas[]` entry精确表达unique `id`、一个normalized project-relative `path`和`dialect = "2020-12"`。`id`必须是1..64字符ASCII lower-kebab，并匹配`^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`。
- `bindings[]` entry使用同一1..64字符ASCII lower-kebab grammar表达unique `id`，其`schemaId`只能精确引用一个已声明的`schemas[].id`，另含non-empty `instances` project-relative selector array。
- `maximumBytes` 是 Schema owner自己的 document limit，default为 `5242880`，只接受 `1..67108864` 的 safe integer；它不读取或继承 ordinary `json-validation` policy。

Normalization在任何 Check work前完成：registry path必须命中 normalized inventory中的一个普通 JSON file；binding selector只在 inventory内求值；一个 instance最多匹配一个 binding；超长、非ASCII、不匹配lower-kebab grammar、duplicate schema/binding ID，duplicate schema path、空 selector、未知`schemaId`、unknown字段、非法`maximumBytes`、absolute/escape path与overlap全部是Project Definition input error。空 registry/bindings或没有approved bound instance使selected Check completed/not-applicable，不启动schema engine。

Project neutral definition不合成项目 registry，因此本 Check只有在 module-backed definition显式声明有效 binding work时运行。文件政策可以按各自 approved schema/instance path override `maximumBytes`，但 resolved value仍须位于 `1..67108864` 并通过 Schema semantic validation；它也可以关闭 path资格，但不能替换 registry、构造新 binding、扩大 global inventory/claimed paths或重新纳入 excluded resource。

#### 3. Schema Check接管其声明路径并复用 strict JSON service

Resolution形成唯一 claimed-path set：registry schemas与bound instances在本 invocation由 schema Check拥有；ordinary JSON Check不重复发布 syntax/duplicate records。Schema Check为每次 schema/instance read把该 path的 resolved `maximumBytes`传给共享 JSON document service，不读取 ordinary JSON Check policy。

Schema document bytes的 strict-JSON defect映射为 `json-schema-invalid`，使用 `kind = document`与 closed `reason = invalid-json | duplicate-key | unsupported-input`；通过 JSON document boundary后发生的 meta-schema或 structural defect使用 `kind = schema`。Bound instance bytes的 strict-JSON defect映射为 `json-schema-instance`，使用 `kind = document`和相同 document reasons；只有 parsed instance违反 compiled schema keyword时才使用 `kind = keyword-violation`。`unsupported-input`另带 closed `unsupportedReason = binary | maximum-bytes-exceeded`，size case带 `actualBytes` / `maximumBytes`。两类 document defect都是 producing Check拥有的领域records并完成对应domain-work acknowledgement；read/service throw、资源预算中断或非法 normalized result才是execution failure。这样既不伪造 `json-validation` provenance，也不把 instance bytes defect误称为 schema defect。

同一路径既为 schema又为 instance，或被多个逻辑角色声明时必须在 plan normalization阶段拒绝，避免同一 bytes在一个 run中拥有冲突 owner。

#### 4. Ajv 2020只存在于一个具体 private dependency boundary

首版以仓库当前 pinned Ajv 8的 `Ajv2020`能力作为候选，并在 `src/product/**` 建立单一 schema-engine boundary。Implementation必须审计 Bun/runtime、installed package、license、`$dynamicRef`、recursive semantics、offline registry和 deterministic error normalization，并把最终 engine放入正确的 Product runtime dependency分类和lockfile；不能依赖当前仅由 docs/tests tooling可达的 `devDependency` 状态。该 boundary负责 2020-12 meta-schema、all-errors normalization、compile、reference callback、work budget和 engine error→Vibe Check result映射；公共政策和 records不出现 Ajv名称、option或 error code。审计失败时在同一 boundary更换 dependency，不增加 public provider factory。

Conformance以 JSON Schema 2020-12 official suite的当前范围和项目 targeted fixtures证明；dependency存在不代表 declared support已经成立。

#### 5. Resolver按显式注册优先，未注册 remote identity才拒绝

Compile前从每个approved registry path读取schema document，并以Project Definition `schemas[].id`、approved path identity以及按JSON Schema 2020-12 base规则解析的root/embedded `$id`构造invocation-owned in-memory resource table。Validated `schemas[].id`只是bounded catalog-safe registry identity，不是网络地址、fetch指令或自动download许可；schema `$id`与canonical URI只作为invocation-private resolver aliases。即使schema `$id`是HTTP(S) URI，也只有显式注册到approved bytes后才成为可解析resource identity；它绝不替代或派生public `schemaId`。

每个 relative reference先按owning resource的resolved base URI canonicalize；absolute reference直接canonicalize。Resolver随后先对去除fragment的canonical resource identity做exact table lookup：命中时只返回该entry已经批准并读入内存的local bytes/resource，不论identity scheme为何，且永不执行DNS、socket、HTTP或package-registry I/O。未命中table的HTTP(S)或其它remote URI形成 `remote-disabled`；指向project内但未注册文件形成 `unregistered-local`，resolver不搜索目录、不自行向scope申请未知文件；lexical/realpath escape形成 `outside-project`。

同一canonical URI alias重复指向同一resource是幂等；指向不同root/embedded resource、不同approved path或不同bytes则形成 `json-schema-reference` 的 `duplicate-registered-identity`。非法或无法确定的base URI形成 `invalid-base-uri`；unresolved、invalid fragment与bounded cycle继续使用各自closed reason。Raw `$id`、`$ref` / `$dynamicRef`在 diagnostic boundary前解析并丢弃：公开数据只保留 source schema ID/path/pointer、keyword、stable reason和适用的 safe registered target schema ID/pointer。Userinfo、query、credential/token、其 digest、absolute path和 backend wording不得进入 records、message、suggestion、console、log、cache或 artifact。

Reference graph使用 node、depth和work budget。2020-12能够安全评价的 recursive/dynamic reference不因图有环自动失败；unsupported/non-terminating或超预算闭环归一化为 bounded-cycle/reference execution结果，不能 hang或 stack overflow。

#### 6. 一个预建静态 Task在内部收敛 schema graph和bindings

TaskPlan只包含一个在执行前从完整 Project Definition plan预建的 Check-owned task；它接收 frozen registry entries、bindings、approved schema/instance paths、每个path的resolved `maximumBytes`和全部 domain-work handles。Task内部先通过共享 JSON document service按path limit读取/解析显式 registry，建立 invocation in-memory resource table，再按registry-first resolver发现每个root实际使用的 transitive closure、执行dialect/meta-validation和compile；评价closure成功的bound instances前，同一task继续通过共享 JSON document service按各自limit解析其approved instance bytes。运行期才知道的reference edges只是task内部数据，不能注册新Task、改变TaskPlan或写成预先冻结的Task `needs`。

该task按稳定 registry/binding顺序处理并可复用task内部parse/compile结果；一个schema domain defect只短路依赖它的instance evaluation，相关domain work仍以已得到确定领域结果完成acknowledgement，不创建synthetic blocked record，独立 bindings继续。此最小拓扑牺牲首版binding级scheduler并行，换取完整静态计划和唯一closure owner；未来若有证据需要并行，只能按执行前已知bindings做静态批次，仍不得把transitive refs变成动态Task图。

Read/engine throw、budget infrastructure failure、invalid normalized result或 Task protocol failure使所属 CheckRun failed。已提交 domain records保留，但不能将 partial work伪装为 completed result。

#### 7. Record catalog同时标识 schema与instance侧

所有 records使用 common normalized primary path/location，并以 closed fields承载机器语义：

- dialect：`schemaId`、declared/expected dialect和schema pointer。
- invalid：`schemaId`、`kind = document | schema`、schema pointer和stable reason；document kind使用 `invalid-json | duplicate-key | unsupported-input`，duplicate-key带安全decoded-key occurrence，unsupported-input带closed unsupported reason及适用size fields，schema kind带meta/structural reason和适用keyword。
- compile：`schemaId`、optional schema pointer和 stable compile reason。
- reference：source public `schemaId`/pointer、`$ref | $dynamicRef | $id` keyword、stable reason和optional safe target public `schemaId`/pointer；stable reasons包括duplicate registered identity与invalid base，但不公开raw URI，也不把resolver alias投影成schema ID。
- instance：`bindingId`、`kind = document | keyword-violation`和instance pointer；document kind使用 `invalid-json | duplicate-key | unsupported-input`及与invalid record相同的条件字段，primary location只指向instance document；keyword-violation另带schema ID/path/pointer、schema secondary location和keyword，missing property定位 owning instance container，不伪造不存在的token位置。

Document `invalid-json` primary location指向可确定的syntax token；`duplicate-key` primary指向后一次定义并以secondary location指向第一次定义；`unsupported-input`只有可安全确定时才带token location，否则以normalized document path作为primary subject。Instance document defect的schema side fields必须absent，keyword violation才允许schema secondary location。

Identity使用`(checkId, recordTypeId)`、kind、已验证authoring `bindingId` / `schemaId`、normalized project-relative paths、pointers、keyword、stable reason和duplicate-key等必要semantic occurrence。Schema `$id`、canonical URI、resolver alias、`actualBytes`、`maximumBytes`、line/column/range、secondary location、message、backend traversal order和raw reference不参与public fields或identity。Records按type、kind、binding/schema、primary path/pointer、schema pointer和keyword稳定排序。任一上述domain record都会使正常收敛的CheckResult为`failed`；只有没有domain records且全部planned work正常完成才为`passed`。

#### 8. Causal closure同时驱动 named-reference comparison和cache

每个 record内部关联实际 causal resources：schema records包含 root及已解析 transitive schemas；instance records再包含 binding instance。调用者显式提供 named reference时，current/reference复用同一个冻结 registry/binding/policy但读取各 revision资源；producing Check以稳定 identity生成关系，没有 explicit reference时不从 repository/cache推断。

Cache分两层：content-addressed schema parse/compile closure，以及 binding+instance evaluation。Key包含 dialect/rules、normalized registry/binding、root/transitive schema content fingerprints、instance fingerprint、每个causal path的resolved `maximumBytes`及其它relevant file policy和 internal implementation identity；remote state、report/artifact、policy body的无关字段与 sibling Checks不参与。Execution failure不可缓存为成功结果。Transitive schema改变必须使受影响 instance重评，而不失效无关 closure。

### Resulting Impacts

- Project Definition 必须在 schema work 前形成唯一、冻结的 registry/binding plan，并把 ID、path、limit、binding 冲突和 claimed-path 边界作为配置错误处理。
- 离线 registry-only reference closure、Ajv private boundary、双侧安全 record/location、Task 收敛、comparison/cache 与 CheckRun failure 必须作为同一 Check 的交付边界；不得访问网络或泄漏 raw URI credential material。

## Risks / Trade-offs

- Ajv对动态/递归引用或 source mapping的行为可能与公共 contract不完全相同；用 adapter normalization和 targeted conformance锁定，不公开 engine errors。
- 显式 registry比自动 local discovery要求更多 authoring，但换来可审阅 resource boundary、确定 cache closure和零目录搜索；首版接受该取舍。
- All-errors可能放大 CPU/record数量；使用 per-schema/per-instance work上限和 deterministic truncation execution diagnostic，不能静默丢记录。
- Schema与instance位置并非每个 keyword都有 token；missing values定位 owning container并保留 pointer，不能制造虚假精度。
- Credential canary可能经异常路径泄漏；对 machine/human/stdout/stderr/log/cache/artifact执行 canary及digest搜索，并保证 raw reference在 normalization前后都受限。

## Open Questions

无。Draft 2020-12、bounded safe authoring IDs、role-specific document defects、Schema-owned byte limit、registered-URI-first offline resolver、engine runtime dependency boundary、record catalog和资源/证据边界均已固定。
