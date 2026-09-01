# Proposal

本 Change 在已受约束的内部 admission-selection policy 边界上开放一个同步 custom selector，让项目以 trusted TypeScript function 从 Scheduler 提供的合法候选中选择下一项 Task，而不获得启动、等待、结算或修改图的控制权。

## Why

内置 static priority 与 learned critical-path 可以覆盖常见顺序，但项目仍可能拥有 Product 无法统一解释的调度依据，例如外部成本、项目阶段、已准备的性能模型或特定资源偏好。强迫这些项目修改 Definition 顺序、伪造 dependency 或等待 Product 增加另一项内置字段，会把项目政策放错 owner。

Project Definition 已经承载在 caller Bun runtime 执行的 trusted `preflight`、`execution` 与 `parseData` functions，因此 selector function 并非新的代码信任等级。但 Scheduler 的不变量比普通 callback 更集中：custom code 不能绕过 dependency、observation、mutex、capacity、reservation、cancellation或静态图。公共能力应开放“在本轮候选里选谁”，而不是开放整个 Scheduler 状态机。

## Outcome

项目可以通过 package-root `defineAdmissionPolicy(...)` 构造带稳定 `policyId`、`policyVersion` 和同步 `selectNext(context)` 的 custom admission policy，并在 Definition 的 `scheduler.admissionPolicy` 中使用。每次需要在同一既有准入层级选择 Task 时，Product 传入冻结的 graph/candidate/runtime view；hook 返回其中一个 Task ID，或返回 `undefined` 委托当前 static-priority fallback。

Product 在调用前后维持 guard。hook throw、返回 thenable、malformed value或非候选ID时，本次invocation禁用该custom hook并稳定回退到static policy；错误只进入有界diagnostic，不改变Check settlement或Run result kind。hook不能返回wait、注册Task、抢占running work或直接调用executor。

## Scope

### Intended Change

- 从package root导出`defineAdmissionPolicy`及支持inline authoring所需的公共类型。helper只保留literal inference并返回普通value，不注册global plugin或发现配置文件。
- 将`ProjectDefinition.scheduler.admissionPolicy`扩展为closed `static-priority | custom` union。custom variant包含non-empty string `policyId`、non-empty string `policyVersion`与同步trusted `selectNext`；两个identity字段沿用Check ID的精确author-text语义，不trim或normalize。declarative snapshot/fingerprint只包含kind/id/version，不包含function identity。
- 在preflight barrier完成、静态graph与prepared Check集合闭合后构造deep-frozen public view。view包含selection layer、按既有层级tie-break顺序排列的合法candidates、按canonical graph order排列的normalized directed graph及running/settled Task IDs，以及root/effective capacity；不暴露Check options/functions、final data、Records、messages、logger、clock、signal或mutable collections。
- custom hook只在没有sticky reservation且当前层级存在非空候选集合时被调用。它返回一个candidate ID或`undefined`；undefined使用该层级的static comparator。hook没有deliberate wait、reservation update、scope activation或settlement output。
- hook异常、thenable、非字符串、空字符串或非candidate ID视为一次policy fault。Product本轮不启动该值，记录一个有界fault，随后整次invocation只使用static fallback，避免重复副作用和diagnostic flood。
- hook在caller runtime同步执行，不能被Product隔离、抢占或timeout；同一Definition重复或重叠Run会复用同一function/closure identity，author必须保持selector纯且可重入，或自行同步closure state。文档明确说明infinite loop、`process.exit`、global mutation与slow I/O会影响host。输入deep-freeze和result guard只保护Product state，不把trusted code变成sandbox。
- 在resolved Check console router生命周期内为custom policy建立独立capture context。`console.*`不进入Check messages或progress stream；diagnostic启用时以有界policy event记录，禁用时丢弃。直接process streams、pre-bound console与global replacement仍不受保证。
- diagnostic记录policyId/version、selection layer、candidate count、selected/fallback/fault结果与同步hook duration；不把hook input、closure state或完整graph复制为稳定telemetry。

### Resulting Impacts

- `extract-scheduler-admission-selection-policy`必须先归档，提供private candidate/result guard；本Change不能直接从public callback形成imperativeadmission。
- `require-passed-dependencies-and-observe-outcomes`必须先闭合最终directed readiness vocabulary，避免发布随后立即变化的graph view。
- Project Definition validation、normalization、fingerprint、public declarations、API examples与installed consumer需要覆盖trusted function和declarativeidentity的分离。
- Check console router需要增加非Check的policy-local capture owner，但不能改变现有preflight/execution message顺序或把policy console归属给任一Check。
- scheduler performance diagnostics需要把custom hook同步duration与pure Product scheduler own time分列，避免项目函数成本被误称为Product算法成本。
- learned-duration Change随后扩展同一closed union为`learned-critical-path`；custom与learned是互斥policy variants，不在首版建立arbitrary composition chain。
- 现有trusted caller-runtime、priority、console router、fingerprint与public inventory Decisions需要在实施前建立successor或补充Decision，明确custom selector的信任、fallback和身份责任。

## Success Criteria

- 省略或显式选择static policy时不调用author code，并保持现有admission trace、fingerprint canonicalization、terminal facts与outputs兼容；schema造成的digest演进被显式记录和重建baseline。
- valid custom hook只能从当前非空candidate集合选择Task；blocked、not-ready、mutex/capacity-ineligible、reserved或unknown Task永远不能到达executor。
- `undefined`在当前层级稳定委托static fallback；throw、thenable、malformed或非candidateresult只产生一次fault，随后整轮使用static fallback且不会死循环。
- sticky reservation与hardselection layer优先于custom hook；custom code不能返回wait、修改reservation、启动/取消/settle Task、注册动态图或抢占running work。
- hook input及其nestedarrays/objects全部冻结，字段只包含documented scheduler view；不包含options、trusted Check functions、data、Records、messages、diagnostic logger、clock、AbortSignal或内部mutableidentity。
- `policyId`与`policyVersion`进入declarativefingerprint，selectorfunction不进入；行为变化而不更新version由author负责，文档、tests和example明确该责任。
- selector同步执行且同一function可被重叠Run并发调用；runtime拒绝thenable，每个invocation独立维护fault-disable状态。hookfault、console capture或slow execution不改变Check outcome、Record、aggregation、machine bytes、progressordering或Run result kind。
- `console.*`不会写入managed progress stream或任一`RunResult.checkMessages`；diagnostic enabled时可定位policyconsole/fault/duration，disabled时不建立第二输出。
- package candidate declaration和真实installed consumer可以inline或经`defineAdmissionPolicy`声明custom selector；publicinventory没有暴露privateSchedulerDecision、executionstate或callback slot。
- 实现不增加prepare/finalize/settlement hooks、policy registry、dynamic Task API、async selector、composition DSL或custom lifecycle state owner。

## Affected Owners

- [`docs/configuration.md`](../../docs/configuration.md)：custom admission policy authoring、identity、hook input/output与默认值。
- [`docs/architecture.md`](../../docs/architecture.md)：caller-runtime trusted policy、private Scheduler guard和console capture依赖方向。
- [`docs/api-mechanics.md`](../../docs/api-mechanics.md)：hook调用时机、fallback、fault、diagnostic与host风险。
- [`docs/testing.md`](../../docs/testing.md)、`docs/testing/cases/**`：Definition、Scheduler、console、diagnostic与installed consumer语义证据。
- `src/project-definition/**`、`src/index.ts`：closed policy grammar、normalization、fingerprint与public export。
- `src/project-run/check-execution/**`：prepared graph之后的public view adapter与policy console context。
- `src/project-run/task-scheduler/**`：private policy adapter、candidate guard、static fallback与hook timing。
- `src/project-run/diagnostic-logging/**`：有界custom policy observation。
- `scripts/docs/package-api/**`、package examples：public inventory、declaration和consumer材料。
- `docs/decisions/**`：trusted function、priority、fingerprint、console与public policy长期边界。
