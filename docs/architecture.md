# 架构

本文拥有 Vibe Check Product runtime 的组件职责与调用边界。支持的调用方向是：

```text
调用方 → 项目 Run → Product run
                    ├─ Definition validation 与 canonical Check catalog
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
- `src/project-run/**` 拥有 Run entry、invocation、aggregation、project context、completion/result，以及独立的
  `check-execution/**`、`controls/**`、`diagnostic-logging/**`、`progress-rendering/**` 与 `task-scheduler/**` 子 owner；
- `src/machine-output/v4/**` 拥有从 Check facts 向 versioned machine artifacts 的 publication；
- `src/cache/**` 拥有 caller-keyed canonical JSON object 的 identity、untrusted disk envelope、read/compute/write observation 与 atomic local publication；它不拥有 caller key correctness、payload domain 或 Check adoption；
- `src/finding-waivers/**` 拥有按调用方语义 identity 对账 finding waiver 的公开纯函数；它不发布
  Record、不决定 Check outcome，也不依赖 Core 或 Gate；
- `src/package-checks/<check-owner>/**` 拥有 package-provided ordinary Checks 与 Check-owned scanners；其同级 `project-files/**`、`host-environment/**` 是该 delivery owner 的真实共同能力；
- `src/data-boundary/**` 拥有 canonical JSON/data、closed-value snapshot 与跨 core owner 的 type guards；
- `scripts/docs/package-api/**` 拥有 package、文档与 candidate tooling 共用的 public-root inventory。

生产依赖方向由 `src/index.ts` 组合 public roots；Project Definition 与 Check facts 不相互依赖，二者都只依赖
ordinary Check contract。task scheduler 只是 Run 的 private child，不形成第二个顶层产品模块。源码不为这些模块额外建立
`index.ts` barrel 或 compatibility re-export。

## Definition boundary

`defineConfig` 返回普通 Project Definition value。它的递归 `checks` tree 由普通 `Check` values 组成：
`execution`、`options` 和 child `checks` 是同一对象上的字段。容器只向 descendants 传递
`dependsOn`、`observes`、`mutex`、`maxParallel` 和 `admissionPriority`，不形成独立 Check-facts 或 output entity。

完整 authoring grammar、默认值和 invocation contract 由 [Configuration](configuration.md) 拥有。Definition validation 在任何 execution、scanner、cache、progress 或 output work 之前闭合 ordinary Check grammar：它拒绝 unknown Check field 和 malformed scheduling value，将每个 Check 的 `options` snapshot 为 canonical immutable JSON object，并 canonicalize scheduling collection。Definition 不识别 package-provided Check ID，也不解释其 option shape。

Definition grammar 只描述递归 Check、调度、executable-only `visibility`、Check-owned execution/options 及可选 `preflight`。`preflight`、`execution` 与 typed provider 的 executable-only `parseData` 都是 trusted functions：Definition 保留函数 identity，但不调用函数，也不把它们写入 declarative snapshot、fingerprint、Check-facts snapshot 或 machine output。Typed provider 的 public type relation 由 [Configuration](configuration.md#typed-dependency-data) 拥有。`visibility` 是 normalized declarative fingerprint 的一部分，但不控制执行；producing Check 自己定义 final data 与可选 Record data 的 domain shape；跨 Check 的聚合只由 invocation controls 显式请求，不成为 Definition 的第二套 domain grammar。

## Execution boundary

Product 将 executable node 一次 flatten 为 canonical catalog。它只将 generic task engine 用于 graph validation、dependency/mutex admission、root budget、immutable Task graph metadata（含 `admissionPriority`）、cancellation 与 settlement。private static policy 是无状态纯决策；public custom policy 是同一无状态 select/wait boundary 上的 trusted synchronous callback。每个 admission cycle 都从 immutable 完整 graph、dynamic inspection、Scheduler 形成的 relation/mutex eligible candidates 及其 current capacity facts 重新计算，精确返回 `select(taskId)` 或 `wait`。priority 不另有 map/list 或旁路输入；public custom callback 收到的是该事实的 detached、deep-frozen ordinary projection，而不是 private engine alias，也不会因此被 sandbox 或限制自身 host-side effect。

Scheduler 仍拥有 readiness、mutex、capacity、cancellation、blocked settlement、状态转换、Task start、await 与 settlement。它只在 policy 后验证 selected Task 仍 pending、属于本轮 candidate、当前 capacity 可 admission 且未越过 lifecycle/cancellation cutoff；`wait` 只在 running work 能 drain 时有效。Scheduler 不解释 priority、公平、防饥饿或 wait 的理由，policy 也不启动、等待或结算 Task。static tightening/continuation 每轮重算，不保存 reservation、sticky target 或任何 Core-owned strategy state；engine 仍不解释 Record、scanner protocol、Check final data、Check terminal status 或 aggregation。

custom callback throw、thenable、malformed proposal、非法 select 或不可 drain `wait` 是 admission-policy fault：Scheduler 停止新 admission、按受控路径取消 pending Tasks 并 drain 已启动的 Task；Run 以 `admission-policy-failed` execution diagnostic 结束，绝不 fallback 到 static。diagnostic 只记录有界 fault category 和本轮 hard-guard facts，不保留 raw callback value、stack、caller data、policy wait reason、reservation、console/check-message attribution 或 policy timing/telemetry。

effective diagnostic logging enabled 时，Scheduler shell 才创建 invocation-local accumulator，并通过 private handoff 接收 clock、logger 与 invocation 已有的 `declarativeFingerprint`；只有 clock 用于采样。disabled 时不创建 accumulator，也不为此新增 clock read 或 pressure projection。pure `decideScheduler`、custom admission callback 与 hard guard 仍不接收或读取这些 diagnostic input，custom callback 也没有 per-policy timing。constructor 从初始 execution state 安装 projection 并采样 span 起点；此后 shell 在 admission、pending/running settlement、accepted explicit policy `wait` 与 terminal 等既有 boundary 先安全 sample 并 flush 旧 interval，再变更真实 Scheduler state，最后以不采样的 `captureState` 安装唯一 execution state 的 post-state projection。accumulator 不建立第二套 pending/running/settlement truth，也没有独立的 graph-ready sample。clock throw、non-finite/backward sample、negative/invalid interval 或 integral 只使本次 timing projection 以稳定 reason `unavailable`，不改变 admission、cancellation、policy-fault drain 或 settlement；合法 zero span 与该状态不同。timing unavailable 时 summary 仍保留 declarative fingerprint、admitted count、accepted-wait count、max-running、last-settled Task ID、queue peaks 与 tail active count，但不以 `0`、空 timing list 或部分区间伪造无法证明的时间投影。

可用 timing 使用 Scheduler slots，而非 CPU、thread 或 OS resource：`taskSlotMs += elapsedMs * running`、`rootCapacitySlotMs += elapsedMs * rootMaxParallel`、`effectiveCapacitySlotMs += elapsedMs * effectiveMaxParallel`；`rootSlotUtilization` 与 `effectiveSlotUtilization` 分别以对应 capacity integral 为分母，零分母为 `null` 而不伪造 0%。`schedulerControlPathMs` 只累计 shell 的 snapshot、同步 decision（包括 custom callback）、hard-guard/state-transition 与 result construction，不含 Promise await、Task callback、diagnostic observation，也不声称 pure Scheduler CPU。每次 `scheduler.decision` synchronous observation 单列为 `schedulerDecisionObservationMs`；`scheduler.summary` 本身不递归计入任一值。

broader graph-ready 只要求全部 directed relations 已 settled；Queue pressure 使用更窄的 admission-viable pending 集合：Task 仍为 pending、每个 `dependsOn` 已以 `completed` 结算，且每个 `observes` 已形成任意 terminal settlement。具有 non-completed prerequisite、即将走 `settle-blocked` 的 graph-ready Task 不进入这个集合。每个 sampled interval 按当前 canonical Scheduler facts 将集合内 Task 互斥分类：先把与 running mutex 冲突者计为 mutex-blocked；其余以同一个 canonical `canAdmit` 判定，false 为 capacity-blocked，true 为 admissible-pending。`admissionViablePendingTaskMs` 是三类 task·ms 之和；`mutexBlockedTaskMs`、`capacityBlockedTaskMs`、`admissiblePendingTaskMs` 分别累积三类。`peakAdmissionViablePendingTaskCount` 记录完整集合峰值，`peakMutexBlockedTaskCount`、`peakCapacityBlockedTaskCount` 与 `peakAdmissiblePendingTaskCount` 分别记录分类峰值；这些峰值可以来自不同 boundary，不能相加还原某一时刻的总量。分类不推断 policy 动机，也不把 decision 次数当作 queue pressure。

Task 在无 directed relation 时从 Scheduler span start 即为 graph-ready，否则在全部 directed relations settled 后成为 graph-ready。对最终实际 admitted 的 Task，首次 admission-viable post-state projection 是其 delay 的逻辑起点；该 projection 由 constructor 或前一次真实 mutation 后的 capture 安装，下一既有 boundary 才累计时间。summary 至多列出三项 admission delay（delay 降序、Task ID 升序）；每项的 `mutexBlockedMs`、`capacityBlockedMs` 与 `admissiblePendingMs` 使用同一互斥分类，三项之和精确构成该 Task 的 `admissionDelayMs`。admissible-pending 只表示当前硬条件允许 admission 而 Task 仍 pending，不声称 policy 为什么选择、等待或延后它。

`completionTailMs` 是从最后一次 admission boundary 到 terminal 的 span。该 boundary 的逻辑 post-state active snapshot 由此前仍 running 的 Tasks 与新 admitted Task 组成；`discrete.completionTailActiveTaskCount` 记录完整大小，`topCompletionTailContributors` 只从其中随后 settled 的 Tasks 选出至多三个 `{ taskId, settledAfterLastAdmissionMs }`，按 settlement delta 降序、Task ID 升序排列。terminal control/observation 可能使 `completionTailMs` 大于最大的 contributor delta。该集合解释谁参与 tail，不等于 dependency critical path，也不证明某项 Task 单独造成整个 tail。仅 accepted proposal `kind: "wait"` 形成 accepted wait interval，`proposal: null` 的被动 running drain 不计 wait。control path、slot/capacity integral、queue task·ms、wait、active duration、delay 和 tail 可以重叠，绝不可相加重建 wall time。

Summary 原样携带 invocation 已拥有的 `declarativeFingerprint`，只用作 declarative-configuration matching signal；Scheduler 不计算第二种 graph 或 policy fingerprint。该值覆盖 normalized declarative Definition，包括声明的 Check membership/options/relations、outputs 与 Scheduler declarative fields；trusted function bodies 不进入该 snapshot。它不覆盖 `RunControls`、code/candidate/tool/runtime/host identity、terminal outcome 或 custom callback 的 identity/source/closure；尤其两个 custom policy 的 fingerprint 相同不能证明算法相同。跨 invocation 比较仍须由实验或 adapter owner 同时匹配这些外部条件。

只要已经进入 Scheduler，normal completion、caller cancellation 与 admission-policy fault 的 drain 都在 terminal path 尝试一次有界 `[SCHEDULER] [SUMMARY] scheduler.summary` human observation；writer failure 保持 observational containment。pre-work 或 planning failure 没有 Scheduler execution，因而不伪造 summary。summary 是 private human diagnostic：不进入 public `RunResult`、Core/Check/Record facts、machine publication、progress、warning、autotune、parser/schema/version 或跨 invocation telemetry，也不采集 CPU、memory、thread、process 或其它 OS telemetry。future fail-fast 或 named-resource capacity 若改变 hard guard/capacity model，必须重新审阅这些 boundary、denominator、queue classification、wait facts 和 summary。

Run 在完整 static graph validation 后把 preflight 放入已 admitted Check 的 task-local lifecycle；未提供 `preflight` 的 Check 直接使用 authored options。每个 preflight 收到 Definition 已 snapshot 的 options 与本次 invocation 的 cancellation signal，并受该 Check 的 `dependsOn`、`observes`、mutex、capacity 与 priority 约束。`block`、throw、malformed result 或 noncanonical prepared/fallback value 只结算 owning Check 为 `unavailable`，不调用 author callback，也没有 author execution started lifecycle fact；它的 non-passed outcome 仍会阻止自己的 `dependsOn` dependents。每个独立 ready task 的 preflight 可以并行，不能形成全局 barrier。精确结果 grammar、messages 与 reason 映射见 [Configuration](configuration.md#check-options-preflight)。

每个 executable Check 以 `{ dependencies, options, project, records, signal }` 执行自己的 callback。`project` 只携带 normalized root 与由 invocation controls 形成的 canonical `flags`；Check-owned file selection 与 cache configuration 保留在 owning Check options，共享领域事实通过声明的 direct dependencies 进入。Product 不替 package-provided Check 注入文件 scope 或领域 policy。callback 拥有 scanner invocation 或其它项目工作，并以 `passed(data)`、`failed(data)`、`not-applicable(reason?)` 或 `unavailable(reason)` 返回自己的 terminal result。`passed` / `failed` 的 data 是该 Check 的唯一主结果；没有领域数据时 Check 返回 `{}`。`not-applicable` 和 `unavailable` 不伪造 final data。

Product 将 ordinary throw、malformed result、Record misuse 和 cancellation 映射为 owning unavailable outcome。这个 execution boundary 将 author terminal result 与其 messages attachment 一起验证，再只把 stripped four-state result 交给 Check facts；只有 Check facts 接受该 result 后，detached author messages 才进入 private lifecycle feedback 和 final-snapshot `RunResult.checkMessages`。invalid attachment 不接受部分 author messages；Product 在静态 graph 校验后、任何 author preflight 或 execution 前安装一次 console router，并在各自 awaited async context 中隔离捕获；已捕获的 `console.*` 文本是独立受管 feedback，即使 callback 随后 throw 或返回 malformed result 仍会保留。`dependsOn` 只在每个 direct upstream `passed` 后允许 dependent 的 preflight/execution；全部 direct prerequisite terminal 后若任一非 `passed`，Product 以 `unavailable / dependency-not-passed`、稳定 direct blocker `checkIds`、null duration 结算 dependent，且不调用其 author work。`observes` 等待每个 direct upstream 各自形成任意四态 terminal outcome。两类 relation 的 normalized union 授权 `dependencies.get` / `list`，但同一 direct ID 不得双重声明。Cancellation 停止新的 admission，并将同一 signal 传给已 admitted callback；它不能在 Bun runtime 中强制停止 non-cooperative code。已 admitted work drain 后，Product 保留已 settled Check 与 Record，安全关闭其余 executable Check，再返回 execution-phase cancellation facts。

Run 在 author callback 前开始 monotonic per-Check measurement，并在 callback result、Record validation 与 Check-facts settlement 后结束。这个 execution owner 将同一次 `{ checkId, durationMs | null }` 事实交给 private lifecycle feedback 和 final-snapshot `RunResult.checkDurations`，并将受管 messages 按 canonical Check order、再按 preflight console、preflight author messages、execution console、terminal author messages 的顺序投影为 `RunResult.checkMessages`；duration 与 messages 都不进入 `CheckOutcome`、Record、Check facts 或 machine publication。preflight-blocked 与 prerequisite-blocked Check 都保留 `null` duration。resolved-Check execution owner 在 task-local preflight/admission 前安装一次 async-context-aware console router，并在全部 Check 闭合后恢复；每个 author function 只拥有自己的 invocation-local buffer，context 外仍调用 host console，并发 Check 不共享 buffer。settlement 后 renderer 才写自己的 target stream。直接 `process.stdout` / `process.stderr` 写入和高容量 process output 仍必须进入项目自己拥有的 transcript（例如 Project Gate 的 `.log/`），不能与 progress stream 穿插。这类 transcript 不是 Product output，也不属于 machine output。

## Check facts

Check-facts session 将每个 canonical executable Check 恰好 register 一次，且只冻结 `checks` 与 `records`。Check 的 terminal outcome grammar 由 [Quality Metrics](quality-metrics.md#check-and-record-facts) 定义：

- `passed`，带有 canonical final data；
- `failed`，带有 canonical final data；
- `not-applicable`，可选 reason code；
- `unavailable`，带有 Product or author-controlled reason code 和可选 prerequisite `checkIds`。

callback 只能通过自己的 reporter 提交 supplemental Record：`records.report({ id }, data)`。Product 提供 Check ownership 与 structural `{ checkId, id }` identity，验证 canonical safety、拒绝 duplicate/late/invalid mutation，并在后续 ordinary failure 时保留已经 accepted 的 Record。final data 与 Record data 都 materialize 为 detached、null-prototype、deep-frozen canonical JSON object；snapshot 不承诺 JavaScript own-key enumeration order。Check-local domain shape和canonical text/bytes ordering由 [Quality Metrics](quality-metrics.md#check-and-record-facts)分别界定。Task identity、callback closure、scheduler bookkeeping 和 scanner-private payload 都不是 Check facts。

Raw Check facts 始终可供 completed/output `RunResult` generic readback。只有 caller 显式提供 `RunControls.checkAggregation` 时，Run 才从选定 settled Check statuses 产生最小 `aggregate`；没有配置时该字段为 `null`。aggregation 不读取 Record data、definition warning、output status 或 presentation，也不替代项目的 raw facts。

Run callback-local dependency view 只授权当前 Check 的 normalized effective `dependsOn ∪ observes` direct ID。`dependencies.get(checkId)` 读取 Check-facts package-private settled Check seam：`passed` / `failed` 返回同一个 canonical final data 引用；`not-applicable` / `unavailable` 返回 closed read failure；未声明、transitive 或 malformed ID 不返回任何 upstream fact。Product 不调用 provider parser、不读取 supplemental Records，也不为 dependency reads 建立第二套 facts store。

## Caller-keyed cache boundary

`src/cache/**` 是独立 package-root helper：它只拥有 caller-keyed canonical JSON object 的本地存储 mechanics，不拥有 caller key correctness、payload meaning 或缓存 observation 如何影响 Check/项目行为的 policy。它既不发现项目输入，也不获得 project root、scanner、Check facts、diagnostic logger、output 或 Run lifecycle capability；cache hit 也不跳过 execution 或重放 Check settlement。完整 public contract 由 [API mechanics](api-mechanics.md#caller-keyed-json-cache) 拥有。

cache directory 是 caller-trusted disposable local state。atomic temporary publication 只保护完整 target，不引入 lock、single-flight、cleanup、remote sharing、tamper resistance 或 secret protection。duplicate detection 的 Check-local raw fragment cache 继续由该 Check 的 scanner/availability owner 解释，不因 standalone helper 而迁移或改变 unavailable mapping。

## Package-provided Checks and exact inputs

七个 package-provided exports 都从同一普通 Check 基础构造并返回 ordinary Check values；除
`maintenanceReminders(entries)` 外，其余六个 constructors 接收可省略 authoring policy、补齐完整 resolved options。它们
因为随 package 提供而方便使用，但不获得 Definition/Check facts 特权。每项 Check 完整拥有自己的
options type、runtime validation、execution、领域 measurement/finding model 与 documentation。三个基于 area 的代码质量
Check 只在 package-checks 内共享 `blocking | non-blocking` policy、重叠区域合并和 Finding 计数；各 Check 继续拥有阈值、
scanner protocol、candidate conversion、Record identity/data 与 unavailable vocabulary，Core 不解释这套 Finding policy。

需要项目文件的 Check 将完整 file selection 放在自己的 options 中，并独立调用 `src/package-checks/project-files/**` 的真实共同 collection/exact-membership mechanism；metric Check 也分别拥有自己的 code-area policy。jscpd、scc 与 Lizard adapter 分别位于唯一 producing Check 内，不存在集中 scanner owner 或 Definition registry。adapter 只接收所属 Check 的 exact accepted files、command options 与必要 Check-owned cache options，在 conversion 前拒绝任何 out-of-set result batch，且不向 Check facts 或 publication 暴露 raw scanner data。SCC 与 Lizard 的 CSV parsing 各由自身 adapter local module 承接，因 header/row 义务可独立变化。每个 Check 通过自己的 final data 表达 conclusion；只有详细 finding 是补充事实时才报告 Record。具体初始 option 值见对应[随包 Check 指南](navigation.md#随包-check-指南)，file mechanism 见 [Project files and Check exact inputs](scan-scope.md)，private tool 边界见 [Check-owned scanner dependencies](scanner-dependencies.md)。

## Output and downstream boundary

Publication 创建一个 validated machine v4 model，再从它投影 `run.json` 和 `records.ndjson`。v4 Check row 投影 terminal status 及 passed/failed final data；Record row 投影 `{ checkId, id, data }`。aggregation、output status 与人读展示仍留在各自的 Run/consumer boundary。`diagnostic-logging/**` 只在 Product 已知事实形成处连续追加 invocation-local 人读材料；它不从 final snapshot 或 process transcript 重建过程，不进入 machine v4，也不向 Check callback 增加 logger。每个 package-provided Check 的 parser 只验证自己的 final-data object，不替代 machine complete-set validation。精确 field、complete-set fingerprint 与 atomicity boundary 见 [Output](output.md)。

其中 Scheduler terminal summary 也只是这条一次性人读时间线的一项 private observation；它不能成为 public result field、machine field、progress field、warning/autotune input 或可发现/可解析的 telemetry contract。

每个 structured `RunResult` 都包含 definition warning。configuration、planning、cancellation、execution、completion 与 output result 是不同 outcome；run-level diagnostic code 只能取 documented result vocabulary。带 final snapshot 的 result 还携带 canonical per-Check duration summary、accepted detached terminal-message readback 与 optional aggregate。public inventory 只暴露 authoring/run value 与 type，绝不暴露 Check-facts capability、scanner adapter、task-engine internal、callback slot 或 lifecycle renderer/stream/clock handoff。

## Runtime boundary

项目 callback 在调用方的 Bun runtime 中执行。Product 不序列化 callback、不重启 module、不创建 whole-invocation worker，也不保证隔离 `process.exit`、infinite synchronous loop、global mutation 或 non-cooperative work。Product source 不 import `scripts/**`、docs、fixture 或 toolkit code。

Repository Gate 单向地从 exact installed `@zxyycom/vibe-check` public entry 导入 `run`。Gate adapter 为每次 invocation 创建并拥有其 directory，再只通过本次 Run Controls 将 Product diagnostic output 定向到根级 core log；Gate transcript 与 machine files 同样位于根级，Check-owned process transcripts 位于 `process/` 子目录。测试只使用并清理自己的 fixture directory。Workspace tooling 可以使用它拥有的 generic infrastructure，但不能获得 Product Check-facts 或 Check settlement capability。
