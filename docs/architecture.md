# 架构

本文拥有 Vibe Check Product runtime 的组件职责与调用边界。支持的调用方向是：

```text
调用方 → 项目 Run → Product run
                    ├─ Definition validation 与 canonical Check catalog
                    ├─ invocation-wide flag control barrier
                    ├─ Scheduler admission + task-local Check preflight
                    ├─ Check direct execution / blocked-dependent settlement
                    └─ frozen Check facts → optional aggregation / publication / outputs / RunResult
```

当前实现是 <code>src/project-run/run.ts</code> 的 <code>run(ProjectDefinition, RunControls)</code>，并由 <code>src/index.ts</code> 作为唯一 public package entry 导出。项目拥有 TypeScript Definition 和绑定它的 Run wrapper；Product 不拥有项目模块路径、配置发现或重新加载。

## Source module boundaries

`src/` 的 Product module 按以下 owner 划分：

- `src/check/**` 拥有 ordinary Check contract、Definition/identity validation 与 options snapshot；
- `src/check/finding-presentation.ts` 提供由 Check owner 配置上限和格式化 hook 的通用 Finding message
  投影；它不拥有 Finding facts 或明细位置；
- `src/project-definition/**` 拥有 Project Definition tree、defaults、validation、normalization 与 fingerprint；
- `src/check-settlement/**` 拥有 terminal Check/Record facts、session、store 与 fact validation；
- `src/project-run/**` 拥有 Run entry、aggregation、project context 与 result；其下级 owner 见
  [Project Run child owners](#project-run-child-owners)；
- `src/machine-output/v4/**` 拥有从 Check facts 向 versioned machine artifacts 的 publication；
- `src/cache/**` 拥有 caller-keyed canonical JSON object 的 identity、untrusted disk envelope、read/compute/write observation 与 atomic local publication；它不拥有 caller key correctness、payload domain 或 Check adoption；
- `src/finding-waivers/**` 拥有按调用方语义 identity 对账 finding waiver 的公开纯函数；它不发布
  Record、不决定 Check outcome，也不依赖 Core 或 Gate；
- `src/package-checks/<check-owner>/**` 拥有 package-provided ordinary Checks 与 Check-owned scanners；其同级 `project-files/**`、`host-environment/**` 是该 delivery owner 的真实共同能力；
- `src/package-checks/function-metrics/analyzer/**` 是 function-metrics Check 私有的 source-aligned Lizard port；其
  文件职责见 [Function-metrics analyzer](#function-metrics-analyzer)；
- `src/data-boundary/**` 拥有 canonical JSON/data、closed-value snapshot 与跨 core owner 的 type guards；
- `scripts/docs/package-api/**` 拥有 package、文档与 candidate tooling 共用的 public-root inventory。

生产依赖方向由 `src/index.ts` 组合 public roots；Project Definition 与 Check facts 不相互依赖，二者都只依赖
ordinary Check contract。task scheduler 只是 Run 的 private child，不形成第二个顶层产品模块。源码不为这些模块额外建立
`index.ts` barrel 或 compatibility re-export。

### Project Run child owners

`src/project-run/**` 的目录层级表达下列父子关系；表中职责不改变 Product public entry 或 RunResult owner。

| 路径 | 下级 owner 的职责 |
| --- | --- |
| `invocation/**` | 一次 invocation 的创建、路径、Scheduler handoff、execution candidate 与 progress counter。 |
| `completion/**` | sealed Check facts 之后的 machine publication 与 terminal result。 |
| `outputs/**` | Run output 的选择与 status。 |
| `task-scheduler/admission-core/**` | immutable admission graph/state 的编译、查询、选择与 transition。 |
| `task-scheduler/measurement/**` | timing、summary 与 diagnostic measurement。 |
| `task-scheduler/**` 父层 | 实际 Scheduler lifecycle、graph validation 与两个子簇间的 integration。 |
| 其它直接子 owner | `check-execution/**`、`controls/**`、`diagnostic-logging/**`、`progress-rendering/**`、`scheduler-duration-model/**` 与 `admission-strategy-provider/**` 继续各自拥有其既有领域职责。 |

### Function-metrics analyzer

`src/package-checks/function-metrics/analyzer/**` 只处理 supplied source 的 Lizard-domain analysis；Product input
admission、I/O、cancellation 与 metric mapping 留在该目录外。

| 文件 | 职责 |
| --- | --- |
| `contracts.ts` | analyzer 内 reader、constructor、processor 等宿主组合的类型契约，不承载翻译算法。 |
| `analysis-model.ts` | 可变分析结果模型。 |
| `analysis-context.ts` | 每个文件的 reader context 与 extension nesting seam。 |
| `pipeline.ts` | token 与 extension lifecycle。 |
| `extension-output.ts` | analyzer-internal extension result/output lifecycle compatibility。 |
| `reader-registry.ts` | 有序 reader registry。 |
| `port-facade.ts` | 目录外生产调用的唯一 façade，以及 supplied-source/suffix capability 边界。 |

## Definition boundary

`defineConfig` 返回普通 Project Definition value。它的递归 `checks` tree 由普通 `Check` values 组成：
`execution`、`options` 和 child `checks` 是同一对象上的字段。容器只向 descendants 传递
`dependsOn`、`observes`、`mutex`、`maxParallel` 和 `admissionPriority`，不形成独立 Check-facts 或 output entity。

完整 authoring grammar、默认值和 invocation contract 由 [Configuration](configuration.md) 拥有。Definition validation 在任何 execution、scanner、cache、progress 或 output work 之前闭合 ordinary Check grammar：它拒绝 unknown Check field 和 malformed scheduling value，将每个 Check 的 `options` snapshot 为 canonical immutable JSON object，并 canonicalize scheduling collection。Definition 不识别 package-provided Check ID，也不解释其 option shape。

Definition grammar 只描述递归 Check、调度、executable-only `visibility` / `enabledByFlags`、Check-owned execution/options 及可选 `preflight`。Definition 将 `enabledByFlags` 规范化为 executable Check 的 declarative identity；完整字段 grammar 和 flag 条件由 [Configuration](configuration.md#flag-enabled-checks) 拥有。`preflight`、`execution` 与 typed provider 的 executable-only `parseData` 都是 trusted functions：Definition 保留函数 identity，但不调用函数，也不把它们写入 declarative snapshot、fingerprint、Check-facts snapshot 或 machine output。Typed provider 的 public type relation 由 [Configuration](configuration.md#typed-dependency-data) 拥有。`visibility` 是 normalized declarative fingerprint 的一部分，但不控制执行；producing Check 自己定义 final data 与可选 Record data 的 domain shape；跨 Check 的聚合只由 invocation controls 显式请求，不成为 Definition 的第二套 domain grammar。

## Execution boundary

Product 将 executable node 一次 flatten 为 canonical catalog。它只将 generic task engine 用于 graph validation、dependency/mutex admission、root budget、immutable Task graph metadata（含 `admissionPriority`）、cancellation 与 settlement。private static policy 是无状态纯决策；public custom policy 是 invocation-scoped `simple | prepared` strategy。simple 直接形成同步 select/wait closure；prepared 在 graph ready 后为每个 Run 一次 `prepare({ graph })`，只把该次返回的同步 `decide` 交给 Scheduler。priority 不另有 map/list 或旁路输入；public callbacks 收到 frozen context，并以 result-only proposal 回交 Scheduler，而不是取得 private engine alias，也不会因此被 sandbox 或限制自身 host-side effect。

standalone `createAdmissionGraph` 与 custom callback 的 `admissionState` 共享 Scheduler-private compiled graph、immutable
parent+delta dynamic node、pure reducer 和 canonical effects。前者从独立 static input 形成 initial state；后者只在实际 callback
boundary 提供同型 live seed。两者都只公开 frozen inspection/catalog/validation 与 hypothetical `select` / binary `settle`
successor。

real shell 仍独占 Task/Promise、signal、diagnostic、measurement、actual value/error 与 `RunResult`，并只应用 reducer effects
后执行既有 callback-return hard guards。public state 不是 cancellation、executor、effect stream、state storage 或 reservation
capability；static/custom/learned Run 未读取 `admissionState` 时不构造 public catalog/search projection。

`learned-critical-path` 只增加一条 invocation-owned 优化支路。完整静态 graph 就绪后，invocation 解析一个
Product-private effective strategy provider，并恰好一次 `prepare`：duration model 从 caller-managed local state 形成 immutable
prediction，Task Scheduler owner 从 immutable graph 与 prediction 形成 directed `dependsOn`/`observes` critical-path score
snapshot 和 frozen private selection policy。invocation 只把完整 prepared policy 交给 resolved Check execution；Scheduler 在每个
admission cycle 同步调用其 `decide`，但继续独占所有 legality hard guard。duration model 不拥有 graph ranking 或 candidate
selection，critical-path algorithm 不读取 history、filesystem 或跨 Run state，provider 是二者唯一的 private composition owner。

### Private admission-strategy lifecycle

下列生命周期适用于 graph 已验证且未在 pre-work / planning 阶段取消的 Run。public custom authoring 为
simple/prepared strategy；private learned provider lifecycle 仍封装在同一 Invocation owner 内，不能成为 public
state/model API。

```text
Invocation: graph ready → simple closure | await prepared prepare once | private learned prepare once
                                        │
                                        ▼
Scheduler: receives frozen synchronous policy → decide 0..N times → stops admission → drains
                                        │
                                        ▼
Scheduler: seals terminal measurement → internal summary → configured generic Hooks
                                        │
                         terminal context returned? ── no → no completion delivery
                                        │ yes
                                        ▼
Invocation: public prepared complete once → aggregate output; private learned complete stays contained
```

| Boundary | Sole owner | Handoff and authority |
| --- | --- | --- |
| Public/private strategy preparation and completion | Invocation | It resolves one Run-local strategy. Public prepare failure stops before Scheduler with `admission-strategy-preparation-failed`; a public complete runs at most once after Scheduler returns a sealed context. Private learned completion remains contained. |
| Admission decisions and hard legality | Scheduler | Receives only a frozen synchronous policy, invokes `decide` zero or more times, and alone validates relation, mutex, capacity, cancellation and drain guards. It never receives prepare or complete. |
| Terminal measurement and generic Hook delivery | Scheduler | Stops admission, drains started work, seals facts, then delivers its diagnostic-enabled internal summary and every configured generic Hook before returning context. |
| Public aggregate mapping | Invocation | After Scheduler returns, it runs public complete and maps actual generic Hook/complete settlement to existing `outputs.measurementHooks`, without changing sealed primary facts. |
| Cross-Run learning | Duration-model / provider | A learned internal complete may record sealed occupancy only for a later Run's private prepare. |

Invocation creates the measurement collector only when diagnostic logging, configured generic measurement Hooks, a policy's
per-decision `requiresMeasurement`, or a terminal-demanding prepared strategy requires it. Plain static has no extra collector/
clock read. simple custom retains per-decision measurement; prepared custom with complete and learned ready/fallback retain terminal
demand. No no-op completion is invented merely to satisfy a common shape. history/prediction/score do not enter `RunResult`,
Check/Record facts, machine publication, progress, callback context or public telemetry.

history 是 caller-owned、untrusted、cache-like local optimization state，而非 configuration、quality fact 或 durable public
artifact：它只保留 digest identity、admitted-to-settled duration、settlement kind 与 observation sequence；不保留 raw options
或 flags。当前实现的 32 samples/identity、4096 recent identities、mean → Run-median prior → cold `1` 和 envelope version
是实现细节而非 compatibility guarantee。missing、malformed、incompatible 或 read failure 形成 empty learned model；无法形成
canonical inputs，或 local setup、prediction 或 score-table construction 失败时才对该 invocation 使用 static selection；post-closure
record/write failure 与 concurrent last-writer 只影响未来样本。它们只写入有界 diagnostic observation，不得改变已形成的 Check
outcome、aggregation、machine bytes 或 `RunResult.kind`。

完整静态 graph validation 后、Task admission 前，Run 先处理 invocation cancellation precedence；尚未取消时，再按 Definition 顺序执行 invocation-wide flag control。条件不匹配的 Check 在任何 owning preflight/execution 前结算为 `not-applicable / flag-condition-not-matched`，没有 started fact且 duration 为 `null`。它作为同一张 Scheduler graph 的 pre-admission non-passed Task result，不再由 Scheduler admission；`dependsOn` dependent 因此被阻断，`observes` consumer 仍可等待和读取。Run 不建立第二套依赖传播。

Scheduler 仍拥有 readiness、mutex、capacity、cancellation、blocked settlement、状态转换、Task start、await 与 settlement。它只在 policy 后验证 selected Task 仍 pending、属于本轮 candidate、当前 capacity 可 admission 且未越过 lifecycle/cancellation cutoff；`wait` 只在 running work 能 drain 时有效。Scheduler 不解释 priority、公平、防饥饿或 wait 的理由，policy 也不启动、等待或结算 Task。static tightening/continuation 每轮重算，不保存 reservation、sticky target 或任何 Core-owned strategy state；engine 仍不解释 Record、scanner protocol、Check final data、Check terminal status 或 aggregation。

custom callback throw、thenable、malformed proposal、非法 select 或不可 drain `wait` 是 admission-policy fault：Scheduler 停止新 admission、按受控路径取消 pending Tasks 并 drain 已启动的 Task；Run 以 `admission-policy-failed` execution diagnostic 结束，绝不 fallback 到 static。diagnostic 只记录有界 fault category 和本轮 hard-guard facts，不保留 raw callback value、stack、caller data、policy wait reason、reservation、console/check-message attribution 或 policy timing/telemetry。

effective diagnostic logging enabled、Definition 配置至少一个 `scheduler.measurementHooks`、custom `decide` 的 per-decision measurement，或 prepared strategy 的 terminal demand 任一成立时，Scheduler shell 才创建 invocation-local 一阶 measurement collector；它通过 private handoff 接收 clock 与 invocation 已有的 `declarativeFingerprint`。plain static 的这些条件都不成立时不创建 collector、也不读取额外 clock；带 complete 的 prepared custom 与 learned ready/static fallback 通过 terminal demand 取得 sealed terminal facts。每次**实际** custom callback 前，collector 先 flush 当前 open interval，再 append 已完成的 action observation，并创建 captured-prefix reader；同一 Run 只冻结一次 graph DTO。`measurementCount` 是该 context 的 end-count，`measurementAt(index)` 是同步 prefix getter，不返回 live array 或 history slice，故旧 context 不能看见后续 append。每条 observation 从 accepted `select`/`wait` 的 post-state 开始，到下一实际 custom callback 前结束，交接 interval 的 state observation 与期间 admitted/settled effects，而不声明 action causality。每个 interval 是 closed timing union：available 才携带数值 contribution，unavailable 只携带 reason，合法 zero span 与 timing fault 明确不同。此紧凑表示避免按决策数复制完整 graph/per-Task table或 history；完整 per-Task table 只属于 terminal raw measurement。Scheduler 在既有 admission、pending/running settlement、accepted wait 与 terminal boundary 采样，唯一拥有区间归属、mutex/capacity/admissible 分类、slot/capacity integral、accepted-wait accumulator、per-Task admission table、峰值和 tail active sequence；它不建立第二套 state、streaming event bus 或完整 boundary ledger。clock throw、non-finite/backward sample、invalid interval/integral 只令本次 raw timing unavailable，不改变 admission、cancellation、policy-fault drain 或 settlement。

每个 raw terminal measurement 是 bounded immutable fact set：它保留 declarative fingerprint、离散 lifecycle facts、queue peaks，以及 timing 可用时的 shell/slot/capacity/accepted-wait accumulations、每个 admission-viable Task 的分类 delay table与 admission/settlement boundaries。它不包含 Task value、error、callback、clock、mutable collection、summary top-N、ratio、queue aggregate或 tail contributor projection。`scheduler.summary` 是加入统一 terminal delivery list 的内部默认 Hook 从该 raw fact set 计算的 human-only 二级 projection：它仍提供既有 top admission delay、queue total、utilization、tail contributor和 timing availability shape，且 writer failure保持 observational containment。

`SchedulerPolicy.measurementHooks` 是有序 runtime-only caller callback list。Scheduler 只在停止新 admission 且全部
started work 已 drain 后，创建一次递归冻结 context：它包含 canonical graph snapshot、admitted/settled
kind-only execution observation 和 raw measurement。随后 Invocation 才可将这份已封闭且完成既有 Hook delivery 的 context
交给 public prepared `complete`（或 contained private learned completion）；Scheduler 本身不接触 prepare
或 complete。启用 diagnostic 时，internal default `scheduler.summary` Hook 与 caller Hooks 组成同一个 ordered delivery list
并消费**同一 context object identity**；summary wrapper 自行包含 projection/writer failure，shared runner 只按各 delivery
wrapper 的 failure policy 工作，不识别 summary identity。sync/async Hook 均逐个 await，Hook elapsed 不计入 raw measurement；
任一 caller Hook throw/reject 都不阻止后续 caller Hook，也不改写已经形成的 Scheduler/Check facts。

nonempty caller Hook list 或 successful prepared result 实际含 public `complete` 时才有 `measurementHooks` output。terminal
sequence 中，generic Hooks 全部获得调用机会后 Invocation 才至多一次调用 complete；所有实际 participants 成功为
`succeeded`，任一 generic Hook 或 complete 失败为 `failed`，而成功 complete 不会覆盖已记录的 generic failure。没有 sealed
context 的 enabled Run 保持 `not-run`。在 sequence 全部交付后，Run 按下列优先级结算：

1. 若 Scheduler 正常完成（没有 cancellation 或 primary execution diagnostic）且 Hook output failed，返回保留完整
   settled facts 的 `kind: "output"` / `scheduler-measurement-hooks-failed`。
2. 若已经形成 cancellation、admission-policy fault 或其它 primary execution failure，保留既有 primary kind 与
   diagnostic；Hook failure 只在 `outputs.measurementHooks.status` 中可见。

pre-work/planning failure 没有 Scheduler context，因此不会调用 caller Hooks。summary writer failure 仍是受 containment 的
diagnostic writer failure，不是 measurement Hook failure。Hook identity/source/closure 不进入 declarative fingerprint，且本能力
不增加 hook ID/version/registry、machine/progress/Check facts、跨 invocation history、learned scheduling 或自动调参。

Run 在完整 static graph validation 后把 preflight 放入已 admitted Check 的 task-local lifecycle；未提供 `preflight` 的 Check 直接使用 authored options。每个 preflight 收到 Definition 已 snapshot 的 options 与本次 invocation 的 cancellation signal，并受该 Check 的 `dependsOn`、`observes`、mutex、capacity 与 priority 约束。`block`、throw、malformed result 或 noncanonical prepared/fallback value 只结算 owning Check 为 `unavailable`，不调用 author callback，也没有 author execution started lifecycle fact；它的 non-passed outcome 仍会阻止自己的 `dependsOn` dependents。每个独立 ready task 的 preflight 可以并行，不能形成全局 barrier。精确结果 grammar、messages 与 reason 映射见 [Configuration](configuration.md#check-options-preflight)。

Invocation creation 在任何 author work 前一次解析并冻结 effective absolute project root、enabled output target 和可选
Check artifact base；completion 与 callback assembly 只消费这份 private path representation，不再次解释 caller directory text。
它不吸收 scheduler history、Check cache、package candidate 或 external-tool workspace 等 cross-Run / owner-local state。

每个 executable Check 以 `{ artifactDirectory, dependencies, invocationId, options, project, records, signal }` 执行自己的
callback。`project` 只携带 normalized root 与由 invocation controls 形成的 canonical `flags`，`invocationId` 关联同次 callback；
`artifactDirectory` 仅在 caller 提供 invocation-only `checkArtifactBaseDirectory` 时，为当前 stable Check ID 给出确定性的
absolute directory，否则为 `null`。Check 不能据此读取 artifact base、拼接 sibling namespace 或取得 Product output target。
Check-owned file selection 与 cache configuration 继续保留在 owning Check options，共享领域事实通过声明的 direct dependencies
进入。Product 不替 package-provided Check 注入文件 scope 或领域 policy。callback 拥有 scanner invocation 或其它项目工作，并以
`passed(data)`、`failed(data)`、`not-applicable(reason?)` 或 `unavailable(reason)` 返回自己的 terminal result。`passed` /
`failed` 的 data 是该 Check 的唯一主结果；没有领域数据时 Check 返回 `{}`。`not-applicable` 和 `unavailable` 不伪造 final data。

Product 将 ordinary throw、malformed result、Record misuse 和 cancellation 映射为 owning unavailable outcome。静态 graph 通过后，Invocation 只建立一次 private effective flag selection：matching opt-in root 的 normalized `dependsOn` closure 与 direct selection 一起决定 flag-control settlement 和 `checks: "effective"` aggregation；它不建立第二张 graph、选择 DSL 或 callback resolver，也不传播 `observes`。被该 closure 加入的 dependency 继续遵守普通 Scheduler、preflight 与 prerequisite rules，不能以 selection 伪造 `passed` 或绕过 cancellation。这个 execution boundary 将 author terminal result 与其 messages attachment 一起验证，再只把 stripped four-state result 交给 Check facts；只有 Check facts 接受该 result 后，accepted Check-local Records 与 detached author messages 才一起进入 private lifecycle feedback，后者另进入 final-snapshot `RunResult.checkMessages`。invalid attachment 不接受部分 author messages；Product 在静态 graph 校验后、任何 author preflight 或 execution 前安装一次 console router，并在各自 awaited async context 中隔离捕获；已捕获的 `console.*` 文本是独立受管 feedback，即使 callback 随后 throw 或返回 malformed result 仍会保留。`dependsOn` 只在每个 direct upstream `passed` 后允许 dependent 的 preflight/execution；全部 direct prerequisite terminal 后若任一非 `passed`，Product 以 `unavailable / dependency-not-passed`、稳定 direct blocker `checkIds`、null duration 结算 dependent，且不调用其 author work。`observes` 等待每个 direct upstream 各自形成任意四态 terminal outcome。两类 relation 的 normalized union 授权 `dependencies.get` / `list`，但同一 direct ID 不得双重声明。Cancellation 停止新的 admission，并将同一 signal 传给已 admitted callback；它不能在 Bun runtime 中强制停止 non-cooperative code。已 admitted work drain 后，Product 保留已 settled Check 与 Record，安全关闭其余 executable Check，再返回 execution-phase cancellation facts。

Run 在 author callback 前开始 monotonic per-Check measurement，并在 callback result、Record validation 与 Check-facts settlement 后结束。这个 execution owner 将同一次 `{ checkId, durationMs | null }` 事实交给 private lifecycle feedback 和 final-snapshot `RunResult.checkDurations`，并将受管 messages 按 canonical Check order、再按 preflight console、preflight author messages、execution console、terminal author messages 的顺序投影为 `RunResult.checkMessages`。Core settlement 保持 accepted Record/message facts；execution lifecycle 只在 settlement 后私下交付完整事实给 progress。progress renderer 是唯一 terminal preview owner，不能回写 Record、message、snapshot、RunResult 或 machine publication；其 enabled/disabled 与有界展示契约由 [API mechanisms](api-mechanics.md#check-输出与受管-progress) 完整定义。duration 与 messages 都不进入 `CheckOutcome`、Record、Check facts 或 machine publication。flag-control、preflight-blocked 与 prerequisite-blocked Check 都保留 `null` duration。resolved-Check execution owner 在 invocation flag control 和 task-local preflight/admission 前安装一次 async-context-aware console router，并在全部 Check 闭合后恢复；每个 author function 只拥有自己的 invocation-local buffer，context 外仍调用 host console，并发 Check 不共享 buffer。settlement 后 renderer 才写自己的 target stream。直接 `process.stdout` / `process.stderr` 写入和高容量 process output 仍必须进入项目自己拥有的 transcript（例如 Project Gate 的 `.log/`），不能与 progress stream 穿插。这类 transcript 不是 Product output，也不属于 machine output。

## Check facts

Check-facts session 将每个 canonical executable Check 恰好 register 一次，且只冻结 `checks` 与 `records`。Check 的 terminal outcome grammar 由 [Quality Metrics](quality-metrics.md#check-and-record-facts) 定义：

- `passed`，带有 canonical final data；
- `failed`，带有 canonical final data；
- `not-applicable`，可选 reason code；
- `unavailable`，带有 Product or author-controlled reason code 和可选 prerequisite `checkIds`。

callback 只能通过自己的 reporter 提交 supplemental Record：`records.report({ id }, data)`。Product 提供 Check ownership 与 structural `{ checkId, id }` identity，验证 canonical safety、拒绝 duplicate/late/invalid mutation，并在后续 ordinary failure 时保留已经 accepted 的 Record。final data 与 Record data 都 materialize 为 detached、null-prototype、deep-frozen canonical JSON object；snapshot 不承诺 JavaScript own-key enumeration order。Check-local domain shape和canonical text/bytes ordering由 [Quality Metrics](quality-metrics.md#check-and-record-facts)分别界定。Task identity、callback closure、scheduler bookkeeping 和 scanner-private payload 都不是 Check facts。

Raw Check facts 始终可供 completed/output `RunResult` generic readback。只有 caller 显式提供 `RunControls.checkAggregation` 时，Run 才从选定 settled Check statuses 产生最小 `aggregate`；没有配置时该字段为 `null`。`checks: "effective"` 读取同一 invocation-private selection，但 facts、RunResult、machine publication 和 diagnostic output 都不发布该 selection、root 或 activation metadata。aggregation 不读取 Record data、definition warning、output status 或 presentation，也不替代项目的 raw facts。

Run callback-local dependency view 只授权当前 Check 的 normalized effective `dependsOn ∪ observes` direct ID。`dependencies.get(checkId)` 读取 Check-facts package-private settled Check seam：`passed` / `failed` 返回同一个 canonical final data 引用；`not-applicable` / `unavailable` 返回 closed read failure；未声明、transitive 或 malformed ID 不返回任何 upstream fact。Product 不调用 provider parser、不读取 supplemental Records，也不为 dependency reads 建立第二套 facts store。

## Caller-keyed cache boundary

`src/cache/**` 是独立 package-root helper：它只拥有 caller-keyed canonical JSON object 的本地存储 mechanics，不拥有 caller key correctness、payload meaning 或缓存 observation 如何影响 Check/项目行为的 policy。它既不发现项目输入，也不获得 project root、scanner、Check facts、diagnostic logger、output 或 Run lifecycle capability；cache hit 也不跳过 execution 或重放 Check settlement。完整 public contract 由 [API mechanics](api-mechanics.md#caller-keyed-json-cache) 拥有。

cache directory 是 caller-trusted disposable local state。atomic temporary publication 只保护完整 target，不引入 lock、single-flight、cleanup、remote sharing、tamper resistance 或 secret protection。duplicate detection 的 Check-local raw fragment cache 继续由该 Check 的 scanner/availability owner 解释，不因 standalone helper 而迁移或改变 unavailable mapping。

## Package-provided Checks and exact inputs

八个 package-provided exports 都从同一普通 Check 基础构造并返回 ordinary Check values；除
`maintenanceReminders(entries)` 与 `secretDetection({ files })` 外，其余六个 constructors 接收可省略 authoring policy、补齐完整 resolved options。它们
因为随 package 提供而方便使用，但不获得 Definition/Check facts 特权。每项 Check 完整拥有自己的
options type、runtime validation、execution、领域 measurement/finding model 与 documentation。三个基于 area 的代码质量
Check 只在 package-checks 内共享 `blocking | non-blocking` policy、重叠区域合并和 Finding 计数；各 Check 继续拥有阈值、
scanner protocol、candidate conversion、Record identity/data 与 unavailable vocabulary，Core 不解释这套 Finding policy。

需要项目文件的 Check 将完整 file selection 放在自己的 options 中，并独立调用 `src/package-checks/project-files/**` 的真实共同 collection/exact-membership mechanism；metric Check 也分别拥有自己的 code-area policy。jscpd 与 SCC adapter 分别位于唯一 producing Check 内；`functionMetrics` 的 TypeScript analyzer 同样只由该 Check 拥有，不存在集中 scanner owner 或 Definition registry。external adapter 只接收所属 Check 的 exact accepted files、command options 与必要 Check-owned cache options，在 conversion 前拒绝任何 out-of-set result batch，且不向 Check facts 或 publication 暴露 raw scanner data。SCC 的 CSV parsing 保持 adapter-local；function analyzer 的 reader/token state 也不成为公共或可替换 command protocol。每个 Check 通过自己的 final data 表达 conclusion；只有详细 finding 是补充事实时才报告 Record。具体初始 option 值见对应[随包 Check 指南](navigation.md#随包-check-指南)，file mechanism 见 [Project files and Check exact inputs](scan-scope.md)，private tool 边界见 [Check-owned scanner dependencies](scanner-dependencies.md)。

## Output and downstream boundary

Publication 创建一个 validated machine v4 model，再从它投影 `run.json` 和 `records.ndjson`。v4 Check row 投影 terminal status 及 passed/failed final data；Record row 投影 `{ checkId, id, data }`。aggregation、output status 与人读展示仍留在各自的 Run/consumer boundary。`diagnostic-logging/**` 只在 Product 已知事实形成处连续追加 invocation-local 人读材料；它显式拥有 `core`、`scheduler` 和只在 learned policy 生效时启用的 `learnedAdmission` 三个 channel。每个 channel 使用 owner-first filename 和同一 invocation suffix；router 在委托 channel 前赋予全局 sequence、monotonic elapsed 和 invocation ID，并分别收敛 setup/write/close failure。它不从 final snapshot 或 process transcript 重建过程，不进入 machine v4，也不向 Check callback 增加 logger。每个 package-provided Check 的 parser 只验证自己的 final-data object，不替代 machine complete-set validation。精确 field、complete-set fingerprint 与 atomicity boundary 见 [Output](output.md)。

Scheduler graph 只在 scheduler channel 记录一次完整 snapshot；随后的 decision 只携带同一 graph fingerprint 和动态 facts，不重复 graph。Scheduler terminal summary 也只是该 channel 的一次性 private observation；它不能成为 public result field、machine field、progress field、warning/autotune input 或可发现/可解析的 telemetry contract。

每个 structured `RunResult` 都包含 definition warning。configuration、planning、cancellation、execution、completion 与 output result 是不同 outcome；run-level diagnostic code 只能取 documented result vocabulary。带 final snapshot 的 result 还携带 canonical per-Check duration summary、accepted detached terminal-message readback 与 optional aggregate。public inventory 只暴露 authoring/run value 与 type，绝不暴露 Check-facts capability、scanner adapter、task-engine internal、callback slot 或 lifecycle renderer/stream/clock handoff。

## Runtime boundary

项目 callback 在调用方的 Bun runtime 中执行。Product 不序列化 callback、不重启 module、不创建 whole-invocation worker，也不保证隔离 `process.exit`、infinite synchronous loop、global mutation 或 non-cooperative work。Product source 不 import `scripts/**`、docs、fixture 或 toolkit code。

Repository Gate 单向地从 exact installed `@zxyycom/vibe-check` public entry 导入 `run`。candidate preparation 和 exact entry verification 完成后，Gate adapter 为本次 invocation 创建并拥有 evidence root；它只通过同一次 `RunControls` 把 Product diagnostic directory 定向到该 root、machine publisher 定向到 `machine/`、progress tee 定向到 `progress.log`，并把 `checks/` 作为 Check artifact base。Gate 自己只拥有 `gate.log`；Product channels、machine pair 与 Check-owned process artifacts 各自保持 owner namespace，Gate 不解析它们重建结果。测试只使用并清理自己的 fixture directory。Workspace tooling 可以使用它拥有的 generic infrastructure，但不能获得 Product Check-facts 或 Check settlement capability。
