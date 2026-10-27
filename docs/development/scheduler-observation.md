# 调度观察与终态交付

本文拥有 Scheduler 按需观察、measurement collector 与终态效果交付的内部职责和验证。准入事实、执行与取消由 [Scheduler](scheduler.md) 拥有；观察只消费同源事实，不回写执行或建立第二状态真相。公开字段和失败语义分别见[调度指南](../guides/scheduling.md)与[输出指南](../guides/run-outputs.md)。数值目标与 oracle 由[测量精度](scheduler-measurement-precision.md)完整定义。

## Measurement collector 与 immutable context

消费者需求按所属边界验证和固定，在 Scheduler 启动前收齐并汇总真实依赖及执行/诊断义务，形成不可变生产配置。
function、缺省/undefined needs 和 [] 均为零需求；生产并集不作为交付字段集合。
每个消费者只取得自己声明的 own data fields，外层冻结且不保证跨消费者 identity 相同。
同 Run graph 按需构造一次并复用，同 boundary 不可变投影可共享；旧 state/fork/reader 不随后续执行改变。

存在 cumulative、actionHistory、runMeasurement、taskTimings 或 effective diagnostics 的真实依赖时才创建
invocation-local timing collector，通过 private handoff 接收 clock 与既有 declarative fingerprint。
仅 execution/state 或零需求且无诊断义务时，不创建 collector、不读额外 measurement clock；Check duration clock 属既有结算义务。

| 启用组 | 维护与物化边界 |
| --- | --- |
| cumulative | 保持 bounded counters/peaks、accepted wait 与 slot/capacity integrals；decision 前 flush、固定 view；不维护 history、逐 Task delay/chronology 或 Run tail。 |
| actionHistory | 首个 accepted action 前启用 sequence/effects/post-state interval；下一实际 callback 前 append frozen observation，交付 captured end-count reader；不建逐 Task delay 表。 |
| runMeasurement | 保持 Run counters/peaks、Run timing、control/diagnostic timing 与 tail，seal 时物化；不含 admissions，也不启用 history 或逐 Task delay 表。 |
| taskTimings | 从首个采样前启用 admission-viable 分类 delay 与 admission/settlement chronology；seal 时按原顺序物化；不启用 history、Run tail 或无消费者 aggregate DTO。 |

组间只因真实生产依赖共享中间量，不能先 full 后裁剪。diagnostics 的完整 decision/summary 证据是独立固定义务，
但不无条件启用无人使用的 actionHistory。字段与统计公开含义由[调度指南](../guides/scheduling.md#在线选择时读取-observation-prefix)定义。

每次实际 custom callback 前，启用的 history flush open interval、append 已完成 action observation，再创建固定 prefix reader。
它从 accepted select/wait 的 post-state 延续到下次实际 callback 前，包含期间 admitted/settled effects，不宣称 action causality。
blocked/cancel/settlement 不创建 callback，只有 pending action 才形成 since-action effect；policy fault 不形成有效 action。

所有启用 timing 组共享唯一 collector clock、原采样边界与 first-fault validity。clock throw/non-finite/backward 或
启用计算的 invalid interval/integral 使后续 timing 不可用；关闭组不为发现 fault 而计算。合法 zero span 仍有效。
cumulative/runMeasurement 保留离散事实和 peaks，taskTimings 不交付伪造数值，history 保留离散 action/effects 并以不可用 interval 继续。
每个 reader 固定自身边界的 availability、数值与 prefix，之后 fault/append 不回写旧 view。保持原单位、采样边界与 interval 归属；
累加算法与最后几位舍入可变化，精度及检查点由[数值专题](scheduler-measurement-precision.md)定义。getter 不推进 clock，也不通过读取顺序改变 availability。

shell 继续拥有真实执行离散事实，collector 独占 clock、interval、积分和 history，不创建第二 Scheduler state 或 admissions truth。
可选 ShellAdmissionFacts 在成功 pending-to-running 且安装 running entry 后记录 first-admission 顺序；pre-admission、blocked、
pending cancellation 不算 admitted，settled projection 只消费既有 settlements。只有 execution 或其它真实顺序依赖才建此 ledger。

terminal runMeasurement 保留 fingerprint、离散 lifecycle、queue peaks 和可用时的 Run timing；taskTimings 单独交付
closed timing union 与可用时的 admissions。Task value/error/callback、clock、mutable collections 和 human summary projection 不进入观察 facts。
summary 的 top-N、ratio、queue total 与 tail contributor 由[人读输出 owner](human-output.md#scheduler-summary-projections)推导。

### 增量分类与惰性等待

`measurement/queue.ts` 拥有分类聚合与惰性等待，协同 `measurement/queue-constraints.ts` 仅在 collector 已启用时建立
measurement-only 反向索引。后者只编译索引并定位 delta 影响的组，分类与合法性判断仍由 Core 查询拥有。
分组复用 Core constraint groups 的等价关系：
完整 mutex-ID 集合、canonical resource claims（含 units）以及 tighter-scope/activation 维度。异量 claims 不能仅按 resource ID 合组。
分类顺序仍为 mutex-blocked → capacity-blocked → admissible-pending；admission-viable 与分类含义见
[summary owner](human-output.md#scheduler-summary-projections)。

组保存成员数与 local kind，root/当前 active-scope capacity 用一个共享 global gate 表达。mutex 只在 holders 跨零时定位相关组，
resource 与 inactive activation cap 用有序 threshold 索引定位实际跨越阈值的组；membership 直接消费 Core delta。
shared gate 翻转只改变全局 open/closed 时钟与计数解释，不给所有组或 pending Tasks 重新打标签，多来源 blocker 仍由 Core 完整 accounting。

逐 Task delay 以组类别累计时钟与进入标记惰性结算：组 local kind 改变时先结清该组时钟，成员离开、admission 或终态物化时
减去自己的精确进入标记。每个 interval 只推进共享 elapsed/open/closed 时钟，不逐 pending Task 累加。
只请求 peaks/counts 时不建立逐 Task delay marks；无 collector 时不维护这些观察专用索引。

### 精确计算、精度与 availability

测量以有限 binary64 samples 的精确实值计算，在每个交付结果处一次正确舍入；availability 在实际生产检查点固定，后续 fault 不回写旧 reader。精度目标、公式、有效域、检查点和独立 oracle 由[调度测量精度](scheduler-measurement-precision.md)完整定义。

## Terminal effects 与 delivery

停止 admission 且全部 started work drain 后，Scheduler seal 同一终态事实边界，按需要生产 graph、admitted/settled kind-only execution、Run measurement 与逐 Task timings，再为每个消费者分别投影精确冻结视图。交付与 collector 是否存在分离，none/graph/execution-only effect 仍取得 sealed context；没有 collector 不能作为跳过 effect 的条件。diagnostic-enabled internal summary wrapper 与 caller terminal effects 使用同一 ordered runner，不保证外层 context identity 相同，prepared effect 也按自己的需求取得精确视图；summary wrapper 包含 projection/writer failure，runner 只执行各 wrapper 的 failure policy，不识别 summary identity。

ordered runner 先交付 internal summary wrapper，再按声明顺序交付 caller terminal effects。
sync/async terminal effects 逐个 await，effect elapsed 不计已 seal 的 measurement；一个 caller terminal effect throw/reject 不阻止后续 terminal effect，也不改写 sealed facts。Scheduler 返回完成 delivery 的 sealed terminal facts 后，Invocation 才交付 `terminalEffect`；成功 terminalEffect 不能覆盖已记录的 generic terminal effect failure。

nonempty caller terminal effects 或 successful prepared result 实际含 terminalEffect 才启用 terminalEffects output；无 sealed context 时 enabled output 保持 not-run。所有实际 participants 成功才 succeeded，任一失败即 failed。无 primary failure 时按输出指南形成保留完整 facts 的 output failure；已有 cancellation、policy fault 或其它 primary failure 时只记录 terminal effect status，不覆盖 primary kind/diagnostic。pre-work/planning 没有 context，不交付 terminal effects；summary writer failure 属于 diagnostic writer containment，不是 caller terminal effect failure。

terminal effect identity/source/closure 与 contextNeeds 不进入 fingerprint；该 seam 不创建 effect registry、machine/progress/Check facts 或自动学习。修改此链路时核对相邻 scheduler、invocation 与 output tests；capacity/hard-guard 变动还须同步审查[summary denominator、queue 分类与 boundary](human-output.md#scheduler-summary-projections)。

### 观察成本边界

collector seed 与索引建立保留按 Task/constraint 的必要工作；每个 interval 的 count/integral 更新不再扫描 pending，
局部分类变化按实际受影响组、阈值跨越及 membership 计成本。完整 terminal per-Task 表仍需枚举并按公开顺序排序；
启用 summary 才在该必要输出工作中形成精确 queue/delay 合计。BigInt 的位宽与 prefix 增长影响运算及 retained memory，
不能把常数次精确算术称为与位宽无关的 O(1)，也不能据此声称所有 demand/workload 都更快。

## 验证边界

Scheduler diagnostic Case 只证明 shell-owned human observation。scripted clock 分别证明 timing unavailable 与有效 zero span、single terminal summary attempt、writer containment、declarative-configuration matching、离散 facts，以及 capacity/wait/queue/delay/tail 投影。
独立低优化 trace oracle 核对 action/rejection/effect、seed viability、取消单次结算及 fork；数值精度与独立 oracle 见[数值专题](scheduler-measurement-precision.md)。

queue evidence 使用同一 admission-viable pending 集合，证明 mutex/capacity/admissible 三类互斥 task·ms 与各自 peaks；named shortage 与 root/scoped shortage 共用 capacity 分类。graph/core/shell evidence 另证明 claims validation、atomic accounting、无关 work 可填充 root slot 和 settlement release。delay 三类 breakdown 必须完整组成 delay；tail 证明 last-admission post-state active count 与有界 contributors，不把结果解释为 policy 原因或 critical path。

formula/state-boundary tests 属于 Scheduler；logger formatting tests 只证明 bounded safe rendering，machine/public/progress tests 证明 summary 不扩张原契约。future fail-fast 或 capacity/hard-guard 变化后，须重审 denominator、queue classification、boundary 和 wait evidence。
