# Project Run

本文说明一次 Run 如何验证输入、冻结路径与回调能力、执行 Check、交接依赖并连接输出，也拥有对应子模块职责。
公开 Controls 和 RunResult 由[API 机制](../api-mechanics.md)定义，输出配置与 readback 由[输出指南](../guides/run-outputs.md)定义。
Definition validation、normalization 与 fingerprint 实现由 [Project Definition](project-definition.md) 拥有。

## Run 子模块

以下路径相对于 `src/project-run/`，列出 Run 内部的职责划分：

| 路径 | 下级 owner 的职责 |
| --- | --- |
| `invocation/**` | 一次 invocation 的创建、路径、Scheduler handoff、execution result mapping、early-return results 与 progress counter。 |
| `completion/**` | sealed Check facts 之后的 machine publication 与 terminal result。 |
| `outputs/**` | Run output 的选择与 status。 |
| `task-scheduler/admission-core/**` | immutable admission graph/state 的编译、查询、选择与 transition。 |
| `task-scheduler/measurement/**` | timing、summary 与 diagnostic measurement。 |
| `task-scheduler/**` 父层 | 实际 Scheduler lifecycle、graph validation 与两个子簇间的 integration。 |
| 其它直接子 owner | `check-execution/**`、`controls/**`、`diagnostic-logging/**`、`progress-rendering/**` 与 `admission-strategy-provider/**` 各自拥有对应领域职责。 |

## Invocation and results

项目 callback 在调用方的 Node runtime 中执行。Product 不序列化 callback、不重启 module、不创建 whole-invocation worker，
也不保证隔离 `process.exit`、无限同步循环、全局 mutation 或不配合取消的工作。

Run 先验证 Definition 和 closed Controls，再生成 invocation-private inputs。公开字段归属见[参数位置](../api-mechanics.md#参数应该放在哪里)：唯一重叠是 Definition output defaults 被当前 Controls 逐字段覆盖，不是对象 merge，也不能借 Controls 改写 Checks 或 scheduler。

caller flags 在进入 control barrier 前复制、去重、排序并冻结；省略/undefined/空数组形成同一空集合，malformed dense-token input 形成 invalid-run-controls。caller 不得提供 `vibe-check:change:` 保留前缀；它在任何 author work 前同样形成 closed Controls failure。

signal 已取消时，Run 在静态 graph validation 和 Git acquisition 前以 pre-work cancellation 结束；若在 graph validation 期间取消，后续 pre-work check 同样阻止 Git acquisition。

无效 Definition 或 Controls 在 author work 前返回 configuration result。

### 调用路径与回调投影

调用路径在 callback 前解析并冻结为绝对路径，后续不再次解释调用方文本。Check artifact base 与其它目录目标共用可信路径规则，不提供目录包含保证、清理或跨 Run 状态；省略 base 时 callback 的 artifactDirectory 为 null。

| Fact                                                                     | Authoring authority                                                     | Frozen invocation projection                                                              | Check callback visibility                                              |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| project root                                                             | `RunControls.projectRoot`，省略时为 Product current working directory   | absolute effective root                                                                   | `project.root`                                                         |
| project flags                                                            | caller `RunControls.flags`，以及配置 changes 后的 Product-derived flags | 去重、排序、冻结的唯一 effective set；未配置 changes 时等于 canonical caller flags           | `project.flags`                                                        |
| project changes                                                          | Definition 的可选 `changes`                                             | 冻结的成功 file evidence 或 unavailable reason；不配置时不运行 Git             | 配置时的 `project.changes`；prepare 与 execute 请求时共享同一 project 值 |
| Check artifact base                                                      | 仅 `RunControls.checkArtifactBaseDirectory`                             | absolute base 或 `null`，不进入 Definition fingerprint                                    | 当前 Check 的 `artifactDirectory` 或 `null`                            |
| Gate exact Check base                                                    | Gate 选择 exact absolute `<invocation>/checks/` 后作为同一 control 传入 | Product 直接使用该 base，不创建另一层 invocation directory                                | 当前 Check 仍只见自己的 directory                                      |
| machine / diagnostic target                                              | Definition defaults 加对应 output override                              | owner-private absolute target；diagnostic 按 owner-channel `RunResult` file readback 投影 | 不可见                                                                 |
| progress transcript target                                               | 仅 `RunControls.progressLogFile`                                        | current-Run absolute target 或 `null`；terminal 仍为 primary presentation                 | 不可见                                                                 |
| scheduler history、Check cache、candidate state、external-tool workspace | 各自 owner 的 options / lifecycle                                       | 不属于 invocation path representation                                                     | 不可见                                                                 |

callback capability 按上表投影；合法字段与精确交付由[Check authoring 指南](../guides/extending-check-lifecycle.md)定义。Check artifactDirectory 从 stable Check ID 确定性派生，采用 bounded filesystem-safe encoding，避免 traversal、component-length 和直接 sanitize collision；raw ID 留在 Check facts。

options 作为第一业务参数，是 canonical authored snapshot 或 invocation-local prepared/fallback；file selection、领域 policy 与 cache 留在 owning options。
dependencies 的授权与引用生命周期见[依赖交接](#依赖读取与引用生命周期)。artifact base、sibling namespace、output target 和 scheduler/cross-Run state 不进入 callback context。

### 静态执行计划

pre-work cancellation 之后、Git acquisition 之前，`check-execution/static-execution-plan.ts` 的
`createStaticCheckExecutionPlan` 将 normalized Checks、validated static graph 与 root maxParallel 绑定为
同一个 invocation-local `StaticCheckExecutionPlan` capability。strategy preparation、Check execution 与 Scheduler 复用该成果；
flags 和 pre-admission settlements 仍在静态图之外形成本次动态 seed。独立 raw execution 入口先准备并验证自己的输入；
`executeStaticCheckPlan` 入口只接受已绑定事实来源的静态计划；该计划不表示 task-local Check preparation 已运行。

### Change preparation and flag projection

配置 `changes` 时，Run 在 effective selection 和 Scheduler admission 前至多取得一次 Git changed-path snapshot。数据流是：

```text
canonical caller flags ────────────────────┐
Git snapshot → derived change flags ───────┼→ canonical effective flags → selection and project.flags
Git snapshot ──────────────────────────────└→ project.changes (files or unavailable reason)
```

`prepare` 和 `execute` 各自声明 project 时，共用首次需要注入才构建的 frozen `project` 值；Git/flag 工作仍由 configured selection 义务决定。可信成功只把命中 region 的稳定 `{ path, flags }` records
放进 `project.changes.files`；可信零命中为空 files，effective flags 因而只含 caller flags。Git/repository/revision/path
不能形成可信结果时，`project.changes` 只含 unavailable reason，全部 declared change flags 仍注入同一个 effective
set，以保守选择。未配置 changes 时不获取 Git、`project.changes` 为 `undefined`，effective flags 等于 canonical caller flags。

有效 project root 可以嵌套在 repository 内，Git paths 会规范化为相对该 root；committed `compareWith...HEAD`、staged、
unstaged 与 untracked paths 合并，rename 的 old/new 和 delete 的 old path 都参与 region matching。Definition 只拥有
`changes` grammar 与 protected-token reference；Git acquisition 和此处的 projection 是 Run owner。状态派生接线见
[Check results](check-results.md#effective-aggregation-and-repository-gate-mapping)，公开折叠规则见 [API 机制](../api-mechanics.md)。

匹配投影以 Git changed paths 为 file source、flags 为 patterns regions，复用
[Core 文件—区域索引](../guides/file-region-index.md)。Core 只计算关系，Run 从全部 region IDs 映射 protected tokens；
零命中文件不发布为 change evidence，获取不可用仍走上述保守分支，不应用扫描默认排除。

## Check 执行与依赖交接

Invocation 冻结 root/output/artifact paths、验证完整 graph，并在 cancellation precedence 之后完成一次 flag-control barrier。Scheduler 再对 admitted Task 运行 task-local preparation 和 execution；独立 ready preparation 可并行，不能形成全局 barrier。每项 `prepare(options, context)` 和后续 `execute(options, context)` 独立获得精确声明视图；双方请求 project 时共享冻结 project 值。change flag flow 见[Change preparation and flag projection](#change-preparation-and-flag-projection)，preparation snapshot 与 Definition grammar 见[Project Definition](project-definition.md)。

`invocation/early-return-results.ts` 构造未经过正常执行结果映射的取消、静态图拒绝、strategy 准备失败与 task-engine 异常结果；
其中 task-engine 异常也可能发生在 Scheduler 执行期间。Definition / Controls configuration result 由公开 Run 校验边界处理。
`invocation/execution-result-mapping.ts` 将已解析的 Scheduler result 映射为 Run result candidate，随后交给输出闭合。

Scheduler 是 Run-private child，使用共同 immutable admission reducer 维护 graph、relations、mutex、root/scoped/named capacity、cancellation 与 settlement；real shell 独占真实 Task/Promise 和 effects。policy 只交回决定，不获得执行权限。reducer、simulation、hard guards、measurement 与 terminal handoff 由[Scheduler 实现](scheduler.md)完整拥有。

### 策略生命周期

Invocation 拥有 `prepare` / `terminalEffect`，Scheduler 只接收同步 policy。prepared result 验证后，decision 与 terminal
需求分别固定并交给 Scheduler：effect 存在决定交付，cumulative/actionHistory/runMeasurement/taskTimings 需求及 effective diagnostics 分别决定采集组。
diagnostics enabled fact 由 Invocation 显式传递，logger 方法形状不作为需求依据，disabled core logger 不作为 Scheduler observer。
Scheduler drain 后 seal terminal context、交付 generic effects；返回 sealed terminal facts 后 Invocation 才按 prepared 声明投影并交付 `terminalEffect`。
[完整生命周期与 failure containment](scheduler.md#public-prepared-admission-strategy-lifecycle)说明交接，公开使用见[调度指南](../guides/scheduling.md)。

### Check 执行与结算

每个 admitted callback 以 options 为第一业务参数，仅在第二 context 参数接收自身声明的[Check-local capability](#invocation-and-results)。
project 视图、dependency facade、Record reporter 及可选 artifact path 按需求建立；没有需求不取消 guards、
settlement、console capture、取消检查、已配置 Git/flags 或既有输出责任。已创建 reporter 在原 close 边界关闭，late writes 仍被拒绝。
execution owner 验证 terminal result 和 messages attachment，将 stripped four-state result 交给 settlement；只有 settlement
接受后，accepted Records 与 detached author messages 才进入 private lifecycle feedback，messages 另进入 RunResult readback。

async console capture 独立于 author attachment：throw 或 malformed result 不丢弃已经捕获的文本。console router 的安装/恢复、分阶段 message 顺序和唯一 progress preview owner 见[人读输出](human-output.md#check-console-capture-maintenance)。renderer 只能消费反馈，不能回写 accepted facts、RunResult 或 machine publication。

execution owner 在 author execution 前开始 monotonic per-Check timing，在 result/Record validation 与 settlement 后结束；同一 `{ checkId, durationMs | null }` 事实供 lifecycle feedback 和 `RunResult.checkDurations` 使用。flag-control、preparation-blocked 与 prerequisite-blocked 没有 started fact，duration 为 null；timing/messages 都不进入 CheckOutcome、Record 或 machine model。

ordinary throw、malformed result、Record misuse 和 cancellation 在 owning execution boundary 结算 unavailable。Scheduler 对 non-passed prerequisites 阻止 author work，对 observes 只等待 terminal；cancellation 停止新 admission 并向 started callbacks 传同一 signal，drain 后保留已 settled facts、安全关闭剩余 Check。host runtime 不能强停 non-cooperative callback。

### 私有 lifecycle feedback

`CheckExecutionLifecycle` 与 `InvocationLifecycle` 是 Run 内部的同步事实反馈，不是 package authoring hook：

- `CheckExecutionLifecycle.started` 在本项 preparation 允许继续后、execute 前投影，不拥有结果控制权。
- `CheckExecutionLifecycle.settled` 在 Core 接受唯一终态后同步一次，覆盖 control、dependency、preparation、execution 与取消分支。
- `InvocationLifecycle.selectionSettled()` 在全部 flag-control settlements 被接受后、Scheduler graph run 前一次；它与逐项 lifecycle 分离。

progress 等消费者只投影已接受事实，不能通过反馈回写 Check、改变选择或取得 callback 执行权限。
策略 terminal effects 的 sealed 时序与 summary containment 由[调度观察与终态交付](scheduler-observation.md#terminal-effects-与-delivery)拥有；
Gate 的 resultContributor、exit 与 transcript 由[Project Gate](../tooling/project-gate.md#gate-result-post-processing-and-exits)拥有，不属于这些私有反馈或公开回调。

### 依赖读取与引用生命周期

callback-local dependency view 的 string read/list 仅授权 normalized direct `dependsOn ∪ observes`。
它从 package-private settled Check seam 取得同一 canonical final-data 引用，不调用 provider parser、不读取 supplemental Records。

声明 `handoff: true` 的 provider 在 accepted `passed` settlement 后，向 execution-private store 提交内部 identity/value。
非法 attachment、非 `passed` branch、canonical settlement 拒绝或取消都不提交 partial handoff。provider-object read 按内部
provider identity 匹配，只授权同一 graph 中 effective direct `dependsOn` consumer，同时返回 Core-owned canonical data
与 original handoff reference；它不扩大 `observes`、transitive 或 string read。公开 get/list 类型与失败边界由[依赖数据指南](../guides/check-dependencies.md)定义。

invocation-private handoff 的 provider identity、value 和 presence metadata 不进入 Check facts、Core snapshot、RunResult、machine、progress、diagnostic、aggregation、cache 或 fingerprint。
execution owner 在 graph close 的 `finally` 中清空 private store，覆盖 completed、cancelled、admission-policy 和 invariant exit。
清空只释放 Product reference，不处置 producer/caller 资源。该 store 只承接调用内引用，不形成第二套 Check facts。

## 聚合已结算结果

`checkAggregation` 是可选的调用方同步函数；Controls 只接受 function 并保留其 identity，不将它纳入 Definition fingerprint。完整结算后，Run 从唯一的 flag 与 `dependsOn` 有效选择按 Check 标准顺序投影同一份已结算 `CoreCheck[]`，交给默认或自定义聚合；选择解析器不公开。默认聚合及返回类型的精确契约见 [API 机制](../api-mechanics.md)。

聚合抛错、返回 Promise/thenable 或非法结果会使 `run` Promise 拒绝，而不是将普通 Check 结算为 unavailable。此路径关闭 invocation-owned diagnostics 和 progress writer，清理错误不能掩盖原聚合错误；拒绝发生在最终呈现和发布之前，不形成 `RunResult`。

## Run outputs and compatibility boundary

公开的三项 output defaults 与逐字段覆盖由[输出指南](../guides/run-outputs.md#默认输出与本次覆盖)定义；Run 先合成并冻结有效配置，再分别初始化输出，不能从一项 output 开关推断其它输出。以下是维护解析与接线必须保持的约束。

machine/diagnostic directory、artifact base 和 progressLogFile 共用非空、无 U+0000 trusted-target grammar：不 trim 文本，relative 从 effective root resolve，absolute 直接使用，`..` 合法。不额外建立字符禁用表、allowlist、lexical/realpath/symlink containment 或 sandbox。Definition author directory text 进入 fingerprint；Controls paths 不进入。

progress overrides 与 Definition 复用同型 grammar：undefined/省略不覆盖，数量 0 有效，formatter null 明确清除。disabled progress 仍验证全部字段；effective policy 在初始化前冻结，不改变 progress `{ enabled, status }` readback。progressLogFile 是 invocation-only tee，不创建第二 Definition output；terminal-first 与 file-only failure 的实作见[人读输出](human-output.md#lifecycle-与写入)。

Controls output parser 保留各 output object / leaf 的 typed failure，并将共享 progress grammar 的字段诊断映射到
`controls.outputs.<output>.<field>`；无效 object 停在当前 node，unknown key 保留 `unknown-key`，非法值带封闭的
`expected` 提示，不读取 accessor 或回显原值。Definition 使用同一 progress grammar，但仍把 failure 折叠为
既有 `definition.outputs` 诊断，不依赖 Controls error type。消费者的定位方式与提示值由[输出配置诊断](../guides/run-outputs.md#排查输出配置错误)拥有。

Definition 或 Controls 无效时尚无可信有效输出配置，因此不会创建 output。三项 output 的 status、failure isolation、machine/non-machine 边界与读取顺序由输出指南完整表达。

项目可以绑定 Definition/固定 Controls，向自己的调用方只暴露必要输入；这不新增 Product 配置层。Product 不发现配置文件或提供 CLI/bin，领域 baseline/comparison 由 producing Check 的 options/composition 承接。Gate resultContributor 位于 Product RunResult 之后，其配置和失败规则仅见 [Project Gate](../tooling/project-gate.md#gate-result-post-processing-and-exits)，不是 Definition/Controls hook。

### Diagnostic file naming

公开 unique/channel 命名、collision 和状态读取由[输出指南](../guides/run-outputs.md)定义。Controls parser 即使 diagnostics disabled 也验证 closed naming enum；省略/undefined 规范化为 unique。该 control 不属于 Definition/output override，不参与 fingerprint，也不单独启用 diagnostics。

Invocation 只更换 basename；UUID、startedAt、sequence 和 elapsed correlation 保持同一次事实。每 channel 使用 exclusive-create (`wx`)，冲突不覆盖、不追加、不改名回退；两文件不构成事务，一个失败不回滚另一个已创建文件。失败 target 仍进入 channel file readback，事实闭合和 primary/output failure priority 不变。Product 不验证 caller directory 的独占性。
