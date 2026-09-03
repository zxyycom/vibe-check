# Design

本 Draft 的核心判断是：simulation 不是与真实 Scheduler 并列的第二个实现。Scheduler 应把一次 graph compile 产出的 machine 与纯 state transition 作为唯一调度语义；真实 shell 真的推进并执行 effects，simulation facade 在不执行 effects 的前提下让 caller 假设推进同一 core。

## Context

### Confirmed facts

- `AdmissionPolicyContext` 是当前 public custom callback 的同步、冻结数据输入。它已有静态 graph、relation/mutex 已就绪的 candidates 及 `canAdmit`、capacity、active scope IDs、running/settled Task IDs、measurement prefix 与 cancellation facts；它没有 public full pending catalog、per-task validator 或可推进 simulation。
- private `decideScheduler`/inspection 从 immutable `SchedulerSnapshot` 判断 terminal、blocked、relation、mutex、capacity 与 scope；imperative lifecycle 再从 mutable execution state 移除 pending、占用/释放 mutex、激活/关闭 scope、执行 Promise 并记录 settlement。当前 cancellation path 也会逐个结算 pending Task；这些相邻路径不应继续作为可独立演化的规则来源。
- `dependsOn` 仅在 upstream settlement 为 `completed` 时满足；`observes` 在 upstream 有任意 settlement 时满足。pending Task 只有在其**全部 direct `dependsOn` 已 terminal**且至少一个不满足时才可 forced-block。每次 `settle-blocked` 后，真实 decision loop 都从更新状态再次选择，直至下一 policy boundary；不能在一个 unsatisfied upstream 出现时提前结算仍在等待其它 direct dependency 的 Task。
- current candidates 不是全部 pending：relation/mutex 不满足的 Task 不在列表，relation/mutex 已就绪但 capacity 不足的 Task 仍出现为 `canAdmit: false`。现有 blockers 为汇总值，不能解释每个 pending Task。
- public custom policy 是 trusted synchronous callback；返回后真实 Scheduler 仍重查 candidate、capacity、lifecycle/cancellation 等 hard guard。任何 snapshot 或 simulation 都不是 reservation。
- 当前源码可见的每-boundary projection 会复制 pending/running/settled/scope arrays，并在 `inspectSnapshot` 重建 task-ID `Map`；settlement lookup 使用 `find`，mutex/scope/relation 也存在 `includes`/`find` 或逐项扫描。这是结构性现状，不是测得的时间/内存 baseline。

### Change relationships

- `separate-duration-learning-from-admission-strategy` 是行为等价的 private provider lifecycle/model-algorithm 解耦 Plan，不交付本 Change 的 machine。两者有 task-scheduler/invocation owner 重叠，推荐 simulation 在 1A 稳定提交后串行实施并继承基线；这不是语义硬依赖。
- `support-invocation-scoped-custom-admission-strategies` 评审 outer custom lifecycle。本 Change 自己闭合 decision-time facade/context 的 Definition normalization、fingerprint 与 compatibility；custom lifecycle 只闭合 outer `prepare`/`complete` authoring shape、其 normalization/fingerprint 与 failure/output。两者不合并 public contract，也不把 `prepare`/`complete` 放入 machine core。
- `optimize-learned-admission-strategy` 可共享 future private machine 或 deterministic harness，但不能依赖本 Change 的 public simulation SDK；算法证据也不能替代 public compatibility 或 simulation performance evidence。
- `add-invocation-fail-fast-policy`、`add-named-resource-capacity` 若先实施，会改变 settlement、capacity 与 hard-guard facts。simulation 实施前必须按它们的实际状态复核 transition、catalog 和 reason completeness。
- 现有 aligned stateless/hard-guard Scheduler Decisions 未授权 public branchable simulator。进入 Plan 前仍须按 `decision-records` 流程审阅对齐和后继记录需要；本 Draft 不将该待审阅事项伪装为长期授权。

## Goals / Non-Goals

**Goals**

- 让 selector 获得 Scheduler-owned inspect view：selectable、带稳定原因的 non-selectable pending、running、settled/终态、root/effective capacity 与 scope；不要求 caller 手工 list 并逐项重建合法性。
- 提供独立 per-task selection validator；它和 catalog/transition 使用同一 core，却不会为了验证单个 task 而构建完整 catalog。
- 明确表达 `select`、`wait` 与真实 terminal `complete` 的 next-boundary 合法性，使 caller 不必从 running/pending 列表自行推导“是否可 drain”。
- 以 immutable、可分支的 `select` 与 caller-specified `settle` 推进调度 state；在同一 core 内处理 capacity/mutex/scope、relations 和 forced blocked propagation。
- 一次验证/编译 static graph，并让 real shell 与 simulation facade 复用同一 transition/legality/effect order；包括 private `cancel-pending` 从每个 canonical pending settlement、scope 变化到 running drain/complete boundary 的迁移，防止规则漂移。
- 保持 signal 检测和 policy-fault diagnostics/failure mapping 由 real shell 拥有，但要求 shell 将其造成的 pending cancellation 作为 private core action 提交。
- 将搜索场景的 CPU、allocation 和 memory 放入 Plan 前的结构设计、benchmark 与预算证据，而非上线后补救。

**Non-Goals**

- core 不选择“哪个 Check 更优”：static、learned、custom policy/selector 都在 core 外，向 core 提交合法 action 或读取 inspect view；`prepare` 与 `complete` 亦不进入 core。
- simulation 不执行 Check/preflight/callback、Task/Promise、clock/duration、signal、measurement/history、diagnostics、RunResult、messages、Task values/errors 或真实 output，且不能写回 real run。
- 不把 simulation 当作 reservation，不移除 callback-return 后的 real hard revalidation，也不授予 public imperative cancel/start/settle capability。
- 不在本 Draft 增加第二种 graph format、通用 graph executor、public runtime-state constructor、默认算法替换或 public strategy registry。
- 不预先承诺具体 persistent data structure、public state hash/global interning、transition cache、mutable undo/search HOF、固定 branch limit 或 batch/replay API。搜索树的指数爆炸不能由 API 消除；全局 cache 也可能以无界内存换取局部 CPU。

## Decisions

### Intended Change

#### 1. 一个 compiled machine、一个 data-first core、两个 shell

实施方向是：graph 在 Scheduler setup 时验证/编译一次，生成 private `SchedulerMachine`（仅为暂定名）。machine 持有不随 branch 改变的 static facts：ID 索引、正反 dependency/observation 邻接、mutex 与 scope 映射、scope activation/terminal 信息，以及所有需要公开 effects 时使用的 canonical order。它不是 public graph 替身，准确私有/public 名称仍待 Plan。

machine 接受一个小型 pure core state，并以 data-first reducer/queries 返回 next state、legality、inspection facts 与 canonical effects。core state 只承接调度事实，如 pending/running/settled、mutex claim、capacity、scope lifecycle 与 closed/cancellation boundary；它不携带 Promise、callback、measurement、diagnostic logger、Task value/error 或 RunResult。真实 shell 保有这些 execution ledger 与副作用 owner，并把可投影的调度事实交给 core；core state 与 execution ledger 必须明确分离。private `cancel-pending` 也是 core action：它按 canonical pending order 产生每个 `cancelled-before-start` settlement、相应 terminal-scope 变化和随后 running-drain/complete boundary，而非 shell 调用另一套 `cancelPendingTasks` 迁移。

不要用“以 high-order function 包一层真实 scheduler”或 effect-runner callback 来抽象共享性：async、闭包和 effect ownership 会污染 pure contract，反而使 simulation 与 real path 难以同源测试。推荐 compiled machine object + data input/output reducer；exact method/function names 在 Plan 再决定。

```text
compiled graph ──> private machine + static indexes/canonical order
                         │
             pure queries / transition / canonical effects
                         │
        ┌────────────────┴────────────────┐
        │                                 │
real shell                         simulation facade
policy reads inspect view          caller reads inspect view
submits select | wait              submits hypothetical select | settle
executes effects / awaits Promise  never executes effects
receives actual settlement          returns immutable branch state
owns signal, diagnostics, run       owns no real execution state
```

real shell 在 boundary 让 policy/selector 从 inspect view 选择 `select | wait`，把 action 交给 core 后执行 resulting effects：启动 Task/Promise、等待实际 settlement，并写 diagnostics/measurement/RunResult。shell 负责检测 signal 与记录/映射 policy fault；它不得另写 pending-cancellation state mutation，而是提交 private `cancel-pending` event/action 给 core，再执行 core 产生的 canonical cancellation effects。它继续拥有 callback-return hard revalidation；simulation 仅表示“该 snapshot 与其后显式假设下”的合法性。

simulation facade 不重实现 reducer：它包裹同一 machine/core state，不执行 effects；caller 对 current branch 显式 `select` 或 `settle`，取得 successor branch。v1 不公开 caller cancel action；若 real seed 已 closed/cancelled，facade 的 catalog、next-boundary 与 terminal/drain view 必须由同一 core state 得出。public facade 不应要求 caller 伪造 real execution state，也不应把 machine 直接暴露为可控制 Run 的对象。

#### 2. catalog、validator 与 next-boundary view 是 selector surface，不是手工推导任务

每个 public decision boundary 可获得 Scheduler-created inspect/simulation entry。它应包含足以选择的 catalog：selectable、pending-but-not-selectable（稳定 reason）、running、settled/终态、capacity 与 scope。多重 blocker 的 canonical reason grammar、DTO 投影与 public 名称留待 Plan；不得泄漏 values、errors、messages 或 mutable state。

entry 同时必须明确 `select | wait | complete` 的 next-boundary 合法性。`wait` 当前只有 running 可 drain 时有效；`complete` 由 Scheduler 的 pending/running terminal state 形成，而不是 caller 可任意提交的 policy proposal。Plan 可采用 next-boundary view 或扩展 proposal validator，但不得让 caller从 list 反推规则。

per-task validator 是独立 pure query：给定 task ID，返回 accepted/rejected 和与 catalog 对齐的 stable reason/facts；未发生 transition 时，它必须与 selectable 分区同义。其性能契约是**不构建 full catalog**。full catalog 为显式 `O(P)` 输出（`P` 为 pending 数），且只在该 state 被请求时 lazy memo；单项 validate 只能计算该 task 的必要 legality，不以“先建所有 pending DTO”实现。

catalog/memo 属于 facade 的派生 view，不得使 static、learned 或不访问 simulation 的 custom policy 路径构建 public catalog 或其他 facade 重活。每个 branch 的 memo 只服务该 branch，不能据此预先承诺 global cache/interning。

#### 3. select、settle、forced block 与 canonical effects

`select` 与 `settle` 是分开的 primitive：成功 select 把 pending Task 变为 branch-local running，局部更新 mutex/capacity，必要时激活 scope；成功 settle 只接受 branch 中 running Task，caller 指定 scheduler-relevant `satisfied | unsatisfied` outcome（该最小 vocabulary仍待 Plan）。这样保留并发 running、资源占用与完成顺序，而不是把“选择即完成”伪装成一个动作。

settle 会释放 mutex/capacity，关闭 terminal scope，并更新 `dependsOn`/`observes` 关系。随后 machine 应用与真实 runtime 相同的 canonical microstep：选择一个当前 forced blocked Task、产出 effect、更新 state，然后再次判断，直到到达 policy boundary。private `cancel-pending` 也使用同一 reducer/effect stream：按 canonical pending order 逐个产生 cancellation settlement 与 scope 变化，之后形成 running drain 或 complete boundary。real shell 逐个执行/记录这些 effects；simulation 可以提供便利的 drain-to-boundary，但若其 effects 顺序公开，必须来自同一 canonical microstep/order，不能另写一套批处理规则。一个 upstream unsatisfied 不得提前 block 仍等待其它 direct dependencies 的 Task。

拒绝的 `select`/`settle` 保留原 branch，并给出与 validator 或 action legality 对齐的 result，而非要求 caller 捕获内部异常。对 unknown、non-running、already-settled、closed/cancelled 等 action 的 precise public result union 在 Plan 闭合。

#### 4. branch state、局部更新与复杂度边界

immutable 不等于每次 transition 全量复制。Plan 的结构要求如下：

- successor branch 必须与 predecessor 共享未变化结构；不得在每个 select/settle 全量 clone pending/running/settled arrays、`Map`/`Set` 或 static graph，也不得对每 branch deep-freeze/复制 graph。
- select 仅接触该 Task、其局部 mutex/scope/capacity facts 和必要的 canonical effects；它不重新扫描或重建整个 graph。
- settle 仅接触该 Task 的 reverse-reachable affected set，再连同实际触发的 forced effects 推进；它不以 full graph rescan 作为默认实现。fanout 本身仍是必要工作，应在复杂度与 benchmark 中显式体现。
- graph compile/validate 只做一次，并建立 ID、正反邻接、mutex/scope 与 canonical-order indexes；不在每 boundary 重建这些 indexes。
- core state 与 execution ledger 分离，既避免 simulation 带入 Promise/diagnostics，也避免真实 hot path 为 facade 复制无关 public DTO。

这里的要求不指定 concrete persistent collection、hashing、transition memo、undo log 或 fixed branch limit。若将来 benchmark 证明某一结构需要，Plan 才可用具体 workload、CPU/allocation/heap 取舍作出有限选择；global transition cache 必须证明命中与内存上界，不能默认引入。

#### 5. 性能证据是进入 Plan 前的硬义务

在创建 `tasks.md` 或切换为 Plan 前，必须建立可复现 benchmark harness、记录 baseline，并根据结果决定优化、预算与数值门槛。每次结果都要记录 Bun version、host/CPU/OS、seed、warmup、iterations、p50、p95 与 heap/allocation 观测方式；输入图/trace、脚本与采样方法必须可重放。

基准至少覆盖：

1. graph compile/validate；
2. simulation facade 未被访问时的 real decision boundary；
3. selectable 与 full catalog 的 cold/warm access；
4. repeated per-task validation；
5. select、settle 与 fork；
6. mutex/scope 争用与高 fanout forced-block cascade；
7. 高分支遍历/workload；
8. real static、custom 与 learned policy 的 hot path。

结构复杂度（例如 full catalog 的显式 `O(P)`、single validation 不建 catalog、local select、reverse-reachable settle、shared successor branch）可成为 required acceptance。wall-clock timing 默认仅 advisory，除非在受控/专用 host 上冻结了可重复 baseline；任何 numeric threshold 都必须在该 baseline 出现后才写入 Plan。不得把临时或本机探索数字冒充正式 baseline。

#### 6. compatibility、evidence 与 consumer boundary

Plan 必须审阅 simulation public facade/context 自身的新字段、frozen/identity 行为、reason/outcome vocabulary、Definition normalization/fingerprint、TypeScript compatibility、error containment、docs 和 installed-consumer evidence；不得把这些 facade 影响交给 custom lifecycle Change。它还必须用 shared-core oracle 对照 real shell：catalog/validator、select/settle、wait/complete、scope、mutex/capacity、observes、dependsOn 与 ordered forced effects 在同一 trace 上同义；真正执行仍只由 real shell 证明。

primitive catalog/validate/select/settle 足以证明真实 lookahead consumer 与 deterministic branch tests后，才评审 batch/replay convenience。任何 convenience 必须复用同一 action/reducer/effect contract，不得创建第二组 legality semantics。

### Resulting Impacts

- `src/project-run/task-scheduler/**` 将从当前 snapshot inspection 与 imperative lifecycle 中明确抽取 compiled machine、pure core state/reducer、canonical effects 与 execution ledger shell；real 和 simulation 两条路径都要证明没有复制 legality/transition。
- `src/project-definition/scheduler-policy.ts`、public export/docs owner 将评审 inspect entry、catalog、per-task validator、next-boundary legality、immutable facade、错误语义及该 facade/context 的 Definition normalization/fingerprint/compatibility；custom lifecycle contract 只在其 own outer authoring shape 复用已接受的 decision-time DTO。这里不是给 private selector 增加一个 helper。
- Scheduler/task-engine/public API tests 将覆盖全 pending 分类、validator 不依赖 full catalog、wait/complete、divergent branches、select 后 settle、并行 completion order、observes、mutex/capacity release、scope lifecycle、逆向 fanout、forced-block microstep order、invalid action、closed/cancelled seed view，以及 signal/policy-fault 检测后由 private `cancel-pending` 按 canonical pending order产生 cancellation settlement、scope 变化和 running-drain/complete boundary；还须覆盖 callback-return race 的 real hard guard。
- performance evidence 将新增可复现 harness 与记录，分别证明 compile、lazy facade、catalog、validation、branch、fanout/search、static/custom/learned real path；在 baseline 出现前不宣称具体时间、heap 或 branch 数预算。
- docs/architecture、API mechanics、configuration/testing/case owner 与 examples 必须区分 shared core、real execution 与 non-authoritative simulation，并用实际 lookahead consumer 示范，而非让 example 重实现 Scheduler rules。
- 本 Change 与 lifecycle、duration/algorithm、fail-fast、named capacity 共享 Scheduler owner，默认串行实施；不写同一 runtime/public owner 的 contract research 或 deterministic evidence 才可并行。

## Risks / Trade-offs

- stable blocker reason 是 public compatibility surface：太少会逼 consumer 重写逻辑，太多会锁死内部策略。Plan 必须以 concrete consumer 决定最小 grammar。
- `satisfied | unsatisfied` 与现有 scheduler relation 对齐，却不等同于完整 Check outcome/cancellation 语义；不应为了模拟“更完整”泄漏 value/error 或完整 internal settlement union。
- structural sharing 降低 branch copy 成本，但 search tree 仍可指数增长；API 只能使每一步尽量局部，不能承诺任意遍历可承受。
- lazy catalog 防止未使用 facade 污染 hot path，但 first catalog read 仍是 `O(P)`；Plan 要根据真实 selector 需要区分 selectable 和完整 catalog 的访问模式。
- 统一 core 降低 drift，却可能把 real hot path 设计得过度抽象。必须同时以 real-shell oracle、profile 与 benchmark 证明正确性和没有无意回归。
- future fail-fast/named capacity 若改变 runtime rule，必须同步更新 compiled indexes、core action、catalog/reason 与 tests；不得只修 real shell。

## Open Questions

1. private machine、core state、effect 与 public facade 的最终命名/模块边界是什么，怎样保留现有 public compatibility？
2. pending catalog 的 minimal stable reason algebra 是单一主因、canonical ordered reasons 还是分区加细节；多重 blocker 怎样 deterministic？
3. `select | wait | complete` 应以何种 public next-boundary/proposal validator DTO 表达，且不把 complete 误称为 custom proposal？
4. public settle 是否固定 `satisfied | unsatisfied`；何种真实 consumer 才证明需要 generic/full settlement vocabulary？
5. scope lifecycle 要公开到何种程度，怎样由 terminal settlement 稳定推导 unactivated/active/closed 而不误述 runtime boolean？
6. canonical microstep effects 是否公开；若公开，DTO/order 如何与 real shell trace 同源并保持兼容？
7. 哪种 branch representation 在基准下满足 local update/shared-state 义务，是否需要任何 bounded cache、memo eviction 或 diagnostics？
8. high-branch workload 应代表哪些实际 custom/learned lookahead；在哪里冻结 controlled-host numeric thresholds，哪些环境只能保留 advisory timing？
9. simulation 对 seed 中 real running Task 的 hypothetical settle 如何命名/说明，才能清楚它不是真实 control capability？
10. private `cancel-pending` 的 core action/effect DTO、canonical order 与 execution-ledger handoff 如何设计，才能保留 signal detection 和 policy-fault diagnostics/failure mapping 的 real-shell owner，同时保证 cancellation 不另有 state transition？
11. callback 内错误输入、stale snapshot 与 facade throw/result union 如何对齐现有 trusted custom policy fault contract？
12. fail-fast/named capacity 的实际落地顺序是否需要改变 reason/outcome grammar、benchmark matrix 或验收顺序？
13. existing Decisions 与 lifecycle Draft 对 public branchable simulation 的边界是什么；进入 Plan 前是否需新增/演进 Decision？
