# Project Run

本文说明一次 Run 如何验证输入、冻结路径与回调能力、执行 Check、交接依赖并连接输出，也拥有对应子模块职责。
公开 Controls 和 RunResult 由[API 机制](../api-mechanics.md)定义，输出配置与 readback 由[输出指南](../guides/run-outputs.md)定义。
Definition validation、normalization 与 fingerprint 实现由 [Project Definition](project-definition.md) 拥有。

## Run 子模块

以下路径相对于 `src/project-run/`，列出 Run 内部的职责划分：

| 路径 | 下级 owner 的职责 |
| --- | --- |
| `invocation/**` | 一次 invocation 的创建、路径、Scheduler handoff、execution candidate 与 progress counter。 |
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

flags 在进入 control barrier 前复制、去重、排序并冻结；省略/undefined/空数组形成同一空集合，malformed dense-token input 形成 invalid-run-controls。Product 只解释声明的 presence predicates，不定义 token vocabulary；完整 canonical flags 继续交给 callback project context。

`checkAggregation` 没有默认值，是唯一的多 Check aggregation 输入：

```ts
{
  checks: "all" | "effective" | readonly string[],
  mode: "all" | "any",
  unavailable: "propagate" | "fail" | "exclude",
  notApplicable: "exclude" | "pass" | "fail",
  empty: "passed" | "failed" | "not-applicable"
}
```

Run 在 work 前拒绝 unknown、duplicate 或 non-normalized ID-list selection；effective selector 复用唯一 private flag-and-dependsOn closure，不公开成员表或建立第二 resolver。状态派生接线见 [Check results](check-results.md#explicit-aggregation-and-repository-gate-mapping)，公开折叠规则见 [API 机制](../api-mechanics.md)。

所有 invocation path facts 在 callback 前冻结，后续只消费其 absolute representation，不再次解释 caller directory text。Check artifact base 与其它 directory target 使用同一 trusted grammar，不提供 containment、cleanup 或跨 Run state capability；省略时 callback artifactDirectory 为 null。

| Fact | Authoring authority | Frozen invocation projection | Check callback visibility |
| --- | --- | --- | --- |
| project root | `RunControls.projectRoot`，省略时为 Product current working directory | absolute effective root | `project.root` |
| Check artifact base | 仅 `RunControls.checkArtifactBaseDirectory` | absolute base 或 `null`，不进入 Definition fingerprint | 当前 Check 的 `artifactDirectory` 或 `null` |
| Gate exact Check base | Gate 选择 exact absolute `<invocation>/checks/` 后作为同一 control 传入 | Product 直接使用该 base，不创建另一层 invocation directory | 当前 Check 仍只见自己的 directory |
| machine / diagnostic target | Definition defaults 加对应 output override | owner-private absolute target；diagnostic 按 owner-channel `RunResult` file readback 投影 | 不可见 |
| progress transcript target | 仅 `RunControls.progressLogFile` | current-Run absolute target 或 `null`；terminal 仍为 primary presentation | 不可见 |
| scheduler history、Check cache、candidate state、external-tool workspace | 各自 owner 的 options / lifecycle | 不属于 invocation path representation | 不可见 |

callback capability 按上表投影；完整 context shape 由[Check authoring 指南](../guides/extending-check-lifecycle.md)定义。Check artifactDirectory 从 stable Check ID 确定性派生，采用 bounded filesystem-safe encoding，避免 traversal、component-length 和直接 sanitize collision；raw ID 留在 Check facts。

options 为 canonical authored snapshot 或 invocation-local prepared/fallback；file selection、领域 policy 与 cache 留在 owning options。
dependencies 的授权与引用生命周期见[依赖交接](#依赖读取与引用生命周期)。artifact base、sibling namespace、output target 和 scheduler/cross-Run state 不进入 callback context。

invalid Definition、controls 或 aggregation selection 在 author work 前返回 configuration result。ordinary callback throw、
malformed result、Record misuse 与 cancellation 按 owning execution boundary 结算；精确 `RunResult` branches、durations、
messages 与 Run 分支见 [API 机制](../api-mechanics.md#runresult-分支)，output failure priority 和 readback 见[输出指南](../guides/run-outputs.md#输出状态与失败处理)。

## Check 执行与依赖交接

Invocation 冻结 root/output/artifact paths、验证完整 graph，并在 cancellation precedence 之后完成一次 flag-control barrier；Scheduler 再对 admitted Task 运行 task-local preflight 和 execution。独立 ready preflight 可并行，不能形成全局 barrier。路径与 callback capability 由[本次调用](#invocation-and-results)投影，preflight snapshot 与 flag selection 见[Project Definition](project-definition.md)。

Scheduler 是 Run-private child，使用共同 immutable admission reducer 维护 graph、relations、mutex、root/scoped/named capacity、cancellation 与 settlement；real shell 独占真实 Task/Promise 和 effects。policy 只交回决定，不获得执行权限。reducer、simulation、hard guards、measurement 与 terminal handoff 由[Scheduler 实现](scheduler.md)完整拥有。

### 策略生命周期

Invocation 拥有 prepare/complete，Scheduler 只接收同步 policy，并在 drain 后 seal measurement、交付 generic Hooks；返回 sealed context 后 Invocation 才 complete。[完整生命周期与 failure containment](scheduler.md#public-prepared-admission-strategy-lifecycle)说明两层的交接，公开使用见[调度指南](../guides/scheduling.md)。

### Check 执行与结算

每个 admitted callback 只接收[本次调用](#invocation-and-results)投影的 Check-local capability。
execution owner 验证 terminal result 和 messages attachment，将 stripped four-state result 交给 settlement；只有 settlement
接受后，accepted Records 与 detached author messages 才进入 private lifecycle feedback，messages 另进入 RunResult readback。

async console capture 独立于 author attachment：throw 或 malformed result 不丢弃已经捕获的文本。console router 的安装/恢复、分阶段 message 顺序和唯一 progress preview owner 见[人读输出](human-output.md#check-console-capture-maintenance)。renderer 只能消费反馈，不能回写 accepted facts、RunResult 或 machine publication。

execution owner 在 author execution 前开始 monotonic per-Check timing，在 result/Record validation 与 settlement 后结束；同一 `{ checkId, durationMs | null }` 事实供 lifecycle feedback 和 `RunResult.checkDurations` 使用。flag-control、preflight-blocked 与 prerequisite-blocked 没有 started fact，duration 为 null；timing/messages 都不进入 CheckOutcome、Record 或 machine model。

ordinary throw、malformed result、Record misuse 和 cancellation 在 owning execution boundary 结算 unavailable。Scheduler 对 non-passed prerequisites 阻止 author work，对 observes 只等待 terminal；cancellation 停止新 admission 并向 started callbacks 传同一 signal，drain 后保留已 settled facts、安全关闭剩余 Check。host runtime 不能强停 non-cooperative callback。

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

## Run outputs and compatibility boundary

公开的三项 output defaults 与逐字段覆盖由[输出指南](../guides/run-outputs.md#默认输出与本次覆盖)定义；Run 先合成并冻结有效配置，再分别初始化输出，不能从一项 output 开关推断其它输出。以下是维护解析与接线必须保持的约束。

machine/diagnostic directory、artifact base 和 progressLogFile 共用非空、无 U+0000 trusted-target grammar：不 trim 文本，relative 从 effective root resolve，absolute 直接使用，`..` 合法。不额外建立字符禁用表、allowlist、lexical/realpath/symlink containment 或 sandbox。Definition author directory text 进入 fingerprint；Controls paths 不进入。

progress overrides 与 Definition 复用同型 grammar：undefined/省略不覆盖，数量 0 有效，formatter null 明确清除。disabled progress 仍验证全部字段；effective policy 在初始化前冻结，不改变 progress `{ enabled, status }` readback。progressLogFile 是 invocation-only tee，不创建第二 Definition output；terminal-first 与 file-only failure 的实作见[人读输出](human-output.md#lifecycle-与写入)。

Controls output parser 保留各 output object / leaf 的 typed failure，并将共享 progress grammar 的字段诊断映射到
`controls.outputs.<output>.<field>`；无效 object 停在当前 node，unknown key 保留 `unknown-key`，非法值带封闭的
`expected` 提示，不读取 accessor 或回显原值。Definition 使用同一 progress grammar，但仍把 failure 折叠为
既有 `definition.outputs` 诊断，不依赖 Controls error type。消费者的定位方式与提示值由[输出配置诊断](../guides/run-outputs.md#排查输出配置错误)拥有。

Definition、controls 或 aggregation selection 无效时尚无可信 effective output configuration，因此不会创建 output。三项 output 的 status、failure isolation、machine/non-machine 边界与读取顺序由输出指南完整表达。

项目可以绑定 Definition/固定 Controls，向自己的调用方只暴露必要输入；这不新增 Product 配置层。Product 不发现配置文件或提供 CLI/bin，领域 baseline/comparison 由 producing Check 的 options/composition 承接。Gate afterGate 位于 Product RunResult 之后，其配置和失败规则仅见 [Project Gate](../tooling/project-gate.md#gate-result-post-processing-and-exits)，不是 Definition/Controls hook。

### Diagnostic file naming

公开 unique/channel 命名、collision 和状态读取由[输出指南](../guides/run-outputs.md)定义。Controls parser 即使 diagnostics disabled 也验证 closed naming enum；省略/undefined 规范化为 unique。该 control 不属于 Definition/output override，不参与 fingerprint，也不单独启用 diagnostics。

Invocation 只更换 basename；UUID、startedAt、sequence 和 elapsed correlation 保持同一次事实。每 channel 使用 exclusive-create (`wx`)，冲突不覆盖、不追加、不改名回退；两文件不构成事务，一个失败不回滚另一个已创建文件。失败 target 仍进入 channel file readback，事实闭合和 primary/output failure priority 不变。Product 不验证 caller directory 的独占性。
