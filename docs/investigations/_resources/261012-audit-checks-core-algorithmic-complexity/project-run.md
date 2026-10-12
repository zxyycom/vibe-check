# Project Run 全模块复杂度审计切面

## 范围、方法与证据强度

- 基线：`21777db37c0284308b8c69eb2cc92ab0b012cd9b`；形成时实际读取 `src/project-run/**` 的全部 81 个 production TypeScript 文件，共 12008 行。精确文件归属见 `project-run-coverage.json`，与 root 的 `source-inventory.json` 闭合；tests/type-tests/test-support/fixtures 不作为 production。
- 读取入口：AGENTS、navigation、architecture、Project Run、Scheduler owner；优先 CodeGraph。当前工具表没有其文档推荐的 explore，`codegraph_node` 实际可用并用于逐文件读取。读取结果未报告过期；源码未修改。邻近 Run fixture 仅用来确认有效 public Definition 形状，不修改或新增测试/Case。
- 静态审查关注整个 Run 的累计工作，包含正常、flag-control、取消、blocked replay、custom、measurement 与输出分支；不声称生产时延、耗时占比或达到某个预算。
- **计数证据**：`project-run-probe.ts` 在未修改实现上临时包装 `Array.prototype.find`、`JSON.stringify`、`Promise.race` 和 `Object.freeze`，finally 恢复；无时间测量、安装依赖、产品输出文件或外部写入。正式命令：`mise exec -- bun run docs/investigations/_resources/261012-audit-checks-core-algorithmic-complexity/project-run-probe.ts`，宿主 **Bun 1.3.14**，20 个 bounded 样本（5 shape × 16/32/64/128）。完整结果在 `project-run-observations.json`。
- 两个 public 样本直接调用 public `defineConfig` 和 `run` 的拥有模块，保留真实 normalization、invocation、Check execution 与 Scheduler；不经过测试 helper。Definition 创建在计数窗口外，整个 `run` 在窗口内。static policy、root maxParallel=1、全部 output disabled、常数 `passed {}` callback。其它三个 direct-Scheduler 样本隔离机制，不冒充完整 public Run。
- 首次普通 shell Bun 1.4.2 的探索计数与锁定版本一致，但正式资源只保留 1.3.14 输出。计数包装增加运行工作，因此不可从本探针推断毫秒结果；计数是所分类实际 predicate / stringify / input promise / DTO freeze 次数，不是所有机器操作。
- 证据等级：**S+C**=当前静态调用链、复杂度推导及 bounded 实际操作计数；**S**=静态确认，未实测成本；**B**=有界/必要成本或未发现额外候选。优先级为后续测量/优化建议，不表示已确认用户故障。

变量：V=Task/Check 数，E=direct relation occurrence 数，S=scope 数，D=decision 数（正常 finite Run 为 O(V)），P=最大同时 running，G=immutable graph JSON 字节/字符量，R=resource 数，M=mutex occurrence 数，F=effective flags 数，K=某一 callback 的 dependency get 次数，B=消息或 Record 数据量。字符串比较/排序另受文本长度影响。persistent List 的 get/set 按索引树成本计为 O(log V) 上界，不沿用旧 parent+delta 扫链估算。

## 已确认候选

### R01 — decision blocker summary 重复线性寻找已结算 Task（P1，S+C）

**位置与可达链**：`scheduler.ts:77-95` → `decideScheduler`（`scheduler-decision.ts:67-80`）→ `decisionContext`（`scheduler-decision-inspection.ts:31-40`）→ `summarizeSchedulerBlockers`（`scheduler-blocker-summary.ts:5-19,41-66`）。在调用 logger 前形成 context，因此 **默认 static、关闭 diagnostics 仍可达**。

**工作**：pending Tasks 的每个 inspected dependency/observation 用 `settledTasks.find` 寻找事实；mutex `.includes` 和 resource `.find` 同样退回线性列表。单 decision 为 O(E_pending·settledCount + M_pending·heldMutexCount + claims_pending·R)，短路可以减小实耗，不能普遍说所有输入都是三次。

**具体稀疏 cubic 证明**：合法链 `t_i dependsOn t_(i-1)`，maxParallel=1，全通过，E=V-1。已有 s 项按链顺序结算时，下一项的 dependency 在 settled 列表末尾，其余 pending 的 dependency 不在列表；每个 pending 最少执行 s 个 find predicates。admission 与其后的 await 边界分别有 V-s 与 V-s-1 项 pending。累计计数为 `Σ_(s=1..V-1) s(2(V-s)-1) = V(V-1)(2V-1)/6 = Θ(V³)`。这是具体 shape 的下界，不是所有 graph 的固定复杂度。

**实际证据**：public-chain V=16/32/64/128，settlement find predicates=1240/10416/85344/690880，精确等于上述式；全部 completed/passed。graph 无大 fanout、callback 常数，观察性 summary 的三次成本不属于必须输出 V³ 的成本。

**最小建议/约束**：消费已有 compiled task slots/status/counters，或在边界建一次 settled/resource/mutex membership 索引；保留 blocker 分类顺序、unsatisfied vs waiting semantics、capacity 标量与诊断字段。不能因 diagnostics disabled 就删去 custom policy 需要的 capacity 事实，也不能把 observation summary 改成 admission 的第二份 legality。

### R02 — static policy 逐候选扫描全部 scopes（P1，S+C）

**位置**：`plan.ts:13-23,38-45` 为每项 Check 产生独立 singleton scope，所以真实 public Run **S=V**；`admission-selection-policy.ts:61-77,94-109` 两轮 `.filter`，经 `admission-scope-layers.ts:5-11,15-43` 的 `graph.scopes.find`、activation/active `.includes`。无紧缩 scope 仍先运行这些过滤。

**工作/触发**：每 decision 的 scope lookup 约 O(candidateCount·S)，有 constrained 排序时 comparator 每次重新 lookup，另有 O(candidateCount log candidateCount·S) 上界；这里的排序倍率是未实测 conditional 上界。具体 public-independent shape，maxParallel=1，所有 singleton scope 的 cap=1，因不紧缩而不进入 sort，但两轮 filter 仍 each candidate `.find` 到 declaration slot。编号 i 的候选共出现 2i-1 次，每次两轮 scope lookup 共 2i predicates：总计 `2Σ_(i=1..V) i(2i-1) = V(V+1)(4V-1)/3 = Θ(V³)`。

**证据**：public-independent V=16/32/64/128 的 scope find predicates=5712/44704/353600/2812544，与式相等；E=0、outputs disabled、无自定义回调工作。dependency 为空不代表 Run overhead 只是 V²。

**建议/约束**：通过 compiled scopesById/taskScopeSlots 获取 scope；active/activation membership 使用已有 exact index；选最小 constrained rank 可一次 fold，保留 cap→priority→scope ID→task ID tie-break 与 ordinary declaration-order tie。不要移除 singleton scope 或推断它“无效”，因为它同时承接 Check-local maxParallel 的稳定行为。

### R03 — immutable graph 每 decision 重新 stringify/hash，disabled logger 也做（P1，S+C）

**位置**：`scheduler-observation.ts:29-43,47-65,69-77`。`observeSchedulerDecision` 先无条件调用 `schedulerDecisionDetails`；`schedulerGraphFingerprint` 使用 `JSON.stringify(graph)` 后 SHA-256，随后才走 optional/no-op logger。public disabled router 仍提供 inert logger 对象，单靠 undefined guard 不足。

**工作**：同一 frozen graph 的 hash 在 initial graph observation 与每个 decision 重算，整个 Run O(D·G) 序列化/哈希与临时分配。public 两 shape 都实际 stringify graph `2V+2` 次；public-independent V=128 计 258 次、7,531,536 字符（是处理量，不是磁盘输出量），全部输出关闭。graph DTO identity 原本已经共享，hash 也可共享。

**建议/约束**：在 invocation/graph 编译时一次计算并复用，必要时按 effective channel demand 惰性创建；保留完全相同 JSON bytes→SHA256 匹配协议、graph/decision correlation 与 disabled/no-op 路径。这里主要是重复 immutable work，不是 SHA256 本身复杂度 bug。

### R04 — graph planning 的全 scope/task 扫描与重复 validation（P2，S+C 部分）

**位置**：`graph-validation.ts:113-121,177-207` 每 scope 对全部 tasks 扫描，再对每个 scoped 非terminal Task 从 terminal 重跑 relation reachability。singleton scope 虽没有要验证的非terminal Task，仍扫描 V 项，public **Θ(SV)=Θ(V²)**。一般多Task scope 的 reachability 上界 O(SV + Σ_scoped_nonterminal(V+E))；`validateTaskRelations:54-65` 的 dependsOn × observes `.includes` 另为 Σ d_i·o_i。

**重复调用已确认**：`invocation/run.ts:115-123`（Git前完整静态验证）→ `invocation/execution.ts:85-94`（strategy context graph）→ `resolved-checks.ts:68-74`（execution前）→ `scheduler.ts:52`（actual Scheduler graph）。成功 public Run 每个样本 `graphDtoFreezes=4`，对应这四次 `prepareTaskGraph`；direct Scheduler 为1。每次均包括 normalize/validation/DTO creation，而不是四次同一 Graph compiler call；`compilePreparedAdmissionGraph` 的 dense indexes 在实际 Scheduler 内一次。重复乘4是常数因子，不将其另升一个大O阶。

**其它 graph 边界**：cycle visit `graph-validation.ts:83-110` 的 visited 集使工作 O(V+E)，递归深度至多为最长 relation chain，并受声明/访问顺序影响：依赖前项的正序链可因visited保持浅栈，逆序声明等形态可达到长链深度，存在host stack溢出风险（S，未在本切面复现）。scope reachability 的 iterative traversal 每次有独立 visited，不是指数遍历。`compiled-graph.ts:231-237` 每 task activation `.includes` 在多Task scope 可 O(Σ n_s·a_s)，public singleton 为线性。

**建议/约束**：按 scope membership 分组；每 scope terminal 计算一次 reachable set；validated prepared graph 向后传递，保留 cancellation/Git acquisition/strategy prepare 的先后和完整 invalid-graph 拒绝。递归 visit 可改迭代。取消早返不能被错误“复用”绕过；不扩大 mutable graph 或 public deep-import 能力。

### R05 — indexed reducer 外围仍有每边界 whole-state projection 与 candidate 全扫（P2，S）

**位置**：`execution-state.ts:191-210` snapshot pending/running/settled/scopes；`admission-core/projection.ts:79-119` 重新遍历全 V statuses 并 materialize arrays；`selection-query.ts:228-238` candidate sieve 再扫全部 V；`scheduler-admission-decision.ts:32-36,103-110` 再复制 candidates；`admission-selection-policy.ts:80-91` ordinary candidate filter/rest/reduce。shell 接到 shared core 仍每轮 `snapshotSchedulerState`，不是为旧 test-only fallback 重编 core。

**累计**：单 decision 至少 Ω(V) 扫描/复制，具有 Θ(V) boundaries 的 shape 累计 Ω(V²)（List 查询另含树索引成本）；仅有 O(V) 边界上界不足以推出这个下界。`takePendingTask`（`scheduler-task-lifecycle.ts:116-125`）与 flag pre-admission `recordPreAdmissionTaskResults`（`execution-state.ts:167-187`）逐次 `findIndex`/splice；选择靠后 declaration ID 时 predicate 也能累计 V²。cancel `.shift` 有重索引/engine 优化相关成本，未将其定为所有宿主必然 V²。

**建议/约束**：shell只传所需标量，复用核心状态或 incremental ready frontier；避免无消费的完整 inspection；pending membership按ID索引。不得破坏 custom callback frozen captured boundary、declaration order、hard guards、旧 AdmissionState 的 immutable successor 或 blocker/result事实。此条不重复计 R01 的关系 `.find` 或 R02 的scope `.find`。

### R06 — repeated Promise.race 在 drain 时重复订阅 long-lived promises（P2，S+C）

**位置**：`scheduler-task-lifecycle.ts:73-80` 每 await 将当前 running completions 全部转换数组并 `Promise.race`。单次 O(running)，整个 Run O(Σ running_at_drain)≤O(VP)，P=V 可 Θ(V²)。每次 race 为全部 promise 注册反应，不是只当前获胜者；多次短Task结算伴随同一长Task时，其未决 promise 可保留多轮反应，实际 heap影响未测。

**隔离计数**：direct independent-parallel（全部Task常数返回、maxParallel=V）V=16/32/64/128 的 race 输入 promise 数=136/528/2080/8256，精确 `V(V+1)/2`。这是实际 repeated subscription/input 工作，不是 async callback自身复杂度；public P=1 样本此项仅 V。

**建议/约束**：每 admitted completion 一次挂接到 invocation-owned completion queue，保留当前 completion winner 与同轮已fulfilled的 tie 语义、drain、取消与失败结算不丢项。需要针对同步完成/并行/late cancel验证，不以未测heap量给预算。

### R07 — mutex reverse fanout 在每 acquire/release 触达全部声明者（P2，S）

**位置**：`selection-transition.ts:101-120,141-175` 经 `mutexBlockerDeltasFor` 对 admitted task 每个mutex occurrence循环该mutex的全部 reverse occurrences，再 `withNumberDeltas` 聚合并更新 persistent List（`selection-index.ts:88-103`）。

**累计**：单无重复mutex m 被 f_m 个Task持有声明，每Task运行有acquire/release各一次，累计 Θ(f_m²) 原始delta visits；总计 O(Σ_m f_m²)，树写入另乘索引成本。所有V项共用一个mutex且依次执行便为 Θ(V²)，即使静态M=V。当前实现也遍历已结算/自身 slots。duplicate occurrences需保留，不可直接去重改变阻塞计数契约。

**建议/约束**：先测实际高fanout mutex shape；可考虑pending-only reverse frontier或query-side indexed holders，将主动 fanout 与候选query成本一起评估。preserve duplicate-occurrence语义、资源/锁准入atomic性、immutable successors；本切面无计时/更新counter计数，不声称该路径当前比 R01/R02 更贵。

### R08 — callback local 索引仍有可避免的 multiplicative 工作（P3，S）

- `flag-controls.ts:118-123` 每个 flags-enabled Check 重建 `Set(runFlags)`，整次 selection O(enabledChecks·F + inspectedConditionNodes)，可在入口建一次Set。dependsOn closure 有共享 expandedCheckIds，aggregate traversal O(V+E)，但递归仍有深度风险；不说它按root重复指数展开。
- `dependencies.ts:70-82,192-200` get授权 `.includes`，单 callback d 个direct IDs、K次get则 O(Kd)，list O(d) 属于必要返回成本。该 seam仅返回已 canonical outcome/reference，没有每get parser/Record全扫；Core session lookup另由 Core切面拥有，不重复计数。
- `invocation/paths.ts:117-123` Check artifactDirectory `.find`，配置base且全部Check execute时可累计 Θ(V²)；无base数组为空，因此默认仅常数。SHA256 encoding/碰撞检查仅建立一次，O(total ID bytes)，不是额外候选。

最小建议为各自 invocation/callback-local Set/Map，不扩大依赖权限或暴露 sibling artifact path；保持 flags canonical排序、get/list direct relation与handoff identity约束。

### R09 — demand-enabled measurement 每状态/区间扫所有 pending（P2，S）

**位置**：`scheduler-observation.ts:80-118` 先全图inspection，然后每pending调用 public-shaped validateSelection，blocked payload可能再次filter/sort relation/mutex IDs。`measurement/integrals.ts:37-65,69-79,121-150,172-177` 每安装projection和每interval多次 `.filter` count，最后逐pending更新delay。`diagnostics.ts:72-85` 另copy running task IDs作为tail。

**累计/条件**：normal finite Run有O(V) state/boundary，扫描pending项可 O(V²)，public-shaped rejection payload还含 inspected edges/排序量，不能只写 O(V)。只在 explicit diagnostics、custom per-decision measurement、generic terminal effects或prepared terminal demand存在时运行；plain static且无demand **不创建collector**，optional-call argument不求值。invalid clock后 per-Taskdelay累加停止，但分类/peaks尚需事实。

**建议/约束**：为measurement提供payload-free indexed blocker classification；维护分类count/每类别累计clock及Task进入/退出差值，而不是每interval触达每pending。保留互斥分类、timing-unavailable/zero-span区别、per-Task delay完整性、tail attribution和采样边界。`policy.ts:55-59,69-75` captured-prefix reader是O(1) snapshot，不复制全history；不能将其误记为每轮history²。terminal table一次sort为O(V logV)，与本条repeated scan区分。

### R10 — bounded preview/detail 不是严格 bounded preprocessing（P3，S）

**位置/条件**：enabled progress 的 `renderer-formatting.ts:165-175` 先 `canonicalJsonText(record.data)`；`boundedTerminalText:215-220` 先escape完整text（224-237），再完整codePoint count（240-243），最后才截取preview。数目limit提前slice有效，但选中的巨大Record/message即使textLimit=0仍可能支付O(B)完整序列化/escape。formatter收到完整text是公开行为，不能无条件改成只传prefix；canonical serialization内部成本由data-boundary切面承接，此处只指出截断接线顺序。

`diagnostic-detail-rendering.ts:54-58` 有depth16、values32768、width4096、characters1048576的结构budget；但scalar `JSON.stringify`（83-93）与record `Reflect.ownKeys`（165-174）发生在length/width拒绝之前，巨大scalar/keyset仍支付输入大小工作，不能把这些常数称作严格CPU/alloc上限。alias重复展开仍受values/depth budget，未发现这里的无界指数展开。

**建议/约束**：默认preview可streaming escape到足够prefix；当formatter存在保留fulltext契约或另行设计；diagnostic大scalar先检测可判断的长度，budget拒绝必须维持descriptor-safe、不调用author getter/proxy/toJSON。此项不是实测stall，且保留完整RunResult messages/Records本身O(B)属于必要产品成本。

## 有界、必要或未发现额外候选的部分

- 当前 reducer static dense graph indexes/reverse relations、persistent List counters/statuses、leftist forced maxheap已替代旧 parent+delta状态查链；normal relation transition只访问changed reverse fanout，累计relation occurrence访问O(E)，List update含树成本，heap进出O(logV)。旧报告的状态扫链/全frontier重排结论不能搬到当前实现。scope active insertion sort/filter仍付active scope量，但不等同旧状态链。
- public AdmissionState getter的catalog/inspection是按读取惰性创建；完整返回本就Ω(V+rejection payload)，同state重复读取会重建，但次数由trusted consumer决定。可选memoization不能被描述成consumer任意分支搜索的实现bug。custom context deepFreeze跳过已有frozen graph/measurement/admission handle，不每次递归重冻全graph，也不会触发admission getter。
- `trace.ts`虽是tracked production文件，仅private test oracle调用，不在public Run import路径。它每action形成catalog/inspection/每Taskvalidation与effect projection，对完整trace输出付费，未列默认Run热点。
- strategy preparation一次；terminal effects顺序交付一次sealed identity；trusted callback、external Git、writer/syscall耗时和用户custom algorithm不属于本切面已证明复杂度。
- console capture每phase一个context、snapshot一次；按call组合chunks。字符串`+=`的rope/flatten依赖engine，未凭表面循环宣称quadratic。message parse/组合/最终summary对完整输出线性，maxpreview只影响呈现。
- preparation authored/prepared options snapshot、terminal-message闭合验证、settlement/handoff只按阶段一次（诊断异常支路可能重复parse但没有跨所有Check的全历史scan）；必要detachment/canonical输出由各owning数据边界审查。
- aggregation一次Set membership filter+fold O(V)；completion/current-output-status/results wrapper为常量字段或终态O(V)投影；machine-publication仅调用machine-output owner，未在此重复评估其实现。
- Git acquisition固定次数的五个命令、NUL parse O(stdout bytes)、changed paths/flags canonical sort一次；region matching归Core file-region-index。Run不为每Check重复Git获取。
- human TTY running-region redraw per lifecycle/heartbeat O(running rows + rendered bytes)，符合显示全部active rows的当前presentation成本，可在明确UX预算后讨论throttle而不是直接判为算法bug。nonTTY不维护running rows。terminal top-3 summary仍fullsort O(V logV)，可线性topK但一次终态且有deterministictie，低于重复decision热点，未升级为独立优先候选。

## 检查与未覆盖边界

已完成81文件语义审阅、当前owner读取、20个bounded操作计数，并在锁定Bun1.3.14重跑计数结果。没有修改prod/tests/Case，未执行测试suite、lint/typecheck/full Gate（调查不实施优化；resource脚本不声称产品test证据）。没有timerbenchmark、heap profile、真实消费者规模/latency budget、Node24对照或第三方内部算法分析。R04深链stack、R07fanout、R08局部reads、R09测量及R10巨大text风险均保留静态证据而非已实测故障。报告后续必须以实际项目V/E/S/P/文本规模选shape和budget，再决定优化；若修改owner代码需按导航补对应行为测试和工程校验。
