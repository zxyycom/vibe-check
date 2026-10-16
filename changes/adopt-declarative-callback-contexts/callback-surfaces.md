# Callback 覆盖与生产边界

本表是本 Change 的实施清单，按当前 [package root](../../src/index.ts) 公开面、相邻类型与实际调用入口核对。
目标契约由 [Design](design.md)定义；表中的目标签名尚待实施，不描述当前运行时。实施者按行迁移并以 [Tasks](tasks.md)记录证据。

## 纳入声明式 context 的位置

`input` 是直接业务参数；context 只承接框架提供的环境、能力或观察事实。表中的字段是完整合法集合，未声明部分不交付。

| 公开槽位 / helper phase | 目标业务 input 与 callback | 可声明 context 字段 | 固定点、执行与失败 owner |
| --- | --- | --- | --- |
| Check `prepare` / `check.prepare` | authored options；`callback(options, context)`。prepared/fallback options 结果规则保持。 | `signal`、`project`。 | Definition validation 固定；admitted Check 至多一次；[preparation](../../src/project-run/check-execution/preparation.ts)保留取消、block/continue 与 Check-local failure。 |
| Check `execute` / `check.execute` | prepared options；`callback(options, context)`。CheckResult、typed data/handoff 保持。 | `artifactDirectory`、`dependencies`、`invocationId`、`project`、`records`、`signal`。 | Definition validation 固定；[execution callback](../../src/project-run/check-execution/callback.ts)保留 console capture、取消优先、reporter close 与 result validation。 |
| prepared strategy `prepare` / `scheduler.prepare` | 无；`callback(context)`。返回本 Run decide 与可选 effect。 | `graph`。 | Definition validation 固定；graph-ready 后调用；[prepared strategy](../../src/project-run/admission-strategy-provider/prepared-admission-strategy.ts)保留 preparation failure 与无 finally 保证。 |
| simple / prepared `decide` / `scheduler.decide` | 无；`callback(context)`。同步 select/wait proposal。 | `graph`、`admissionState`、`candidates`、`capacity`、`activeScopeIds`、`runningTaskIds`、`settledTaskIds`、`cumulative`、`actionHistory`、`runtime`。 | simple 在 Definition、prepared 在 prepare 返回边界固定；Scheduler 启动前收齐；每个实际 decision boundary 调用，hard guards 与 policy-fault/drain 保持。 |
| Definition `terminalEffects[]` / prepared `terminalEffect` / `scheduler.terminal` | 无；`callback(context)`。`void` 或 Promise。 | `graph`、`execution`、`runMeasurement`、`taskTimings`。 | Definition 或 prepare 返回边界固定；drained/sealed 后，internal summary → Definition 顺序 → prepared 最后；[terminal owner](../../docs/development/scheduler.md#terminal-effects-与-delivery)保留 continuation/output priority。 |
| `commandCheck.resolveEnvironment` / `command.environment` | prepared command options；`callback(options, context)`。返回 closed environment policy。 | `dependencies`、`project`、`signal`。 | [command constructor](../../src/package-checks/command-check/options.ts)固定；spawn 前调用；throw/非法结果仍为 command-environment-resolution-failed。 |
| `commandCheck.afterCommand.execute` / `command.complete` | 冻结 `{ options, command }`，其中 command 是完整 CompletedCommand；`callback(input, context)`。 | 同 Check execute 的六个框架字段。 | command constructor 固定；完整 numeric exit 且各 process/transcript 条件满足后调用；普通 Check settlement / Records 与失败语义保持。 |

command 的两个 callback 是普通 Check 内部的下游消费者。constructor 固定它们并将需求并入生成 Check 的 execution 声明；
command 自身为启动、取消、working directory、transcript 所需的字段继续显式请求。下游只取得自己声明的字段，不继承外层并集。

## 保持直接业务输入的位置

这些公开 callbacks 已核对；业务对象即操作目标，不增加空 wrapper，也不为统一形式扩张 context 能力。

| 位置 | 保留输入与理由 | 证据入口 |
| --- | --- | --- |
| Check `parseData`、`afterCommand.parseData` | 待验证 terminal data；parser 自身的业务转换，没有框架注入。 | [Check 契约](../../src/check/check.ts)、[command 契约](../../src/package-checks/command-check/contract.ts)。 |
| `RunControls.checkAggregation` | canonical-order 有效 `CoreCheck[]`；聚合的必需业务对象，继续同步四态。 | [Controls](../../src/project-run/controls/contract.ts)、[API 机制](../../docs/api-mechanics.md#runcontrols-与-check-aggregation)。 |
| `outputs.progressRendering.formatter` | `{ kind, text, maxCodePoints }`；当前 selected preview 及格式要求，不是额外 Run context。 | [formatter](../../src/project-definition/progress-rendering-output.ts)、[输出指南](../../docs/guides/run-outputs.md)。 |
| learned `identityForTask` / `observe` | 单个 graph Task 的 identity projection / helper 领域事件；生命周期与 observer fault containment 保持。 | [learned options](../../src/package-tools/learned-critical-path/strategy-contract.ts)。其上游 prepare/decide/terminal 消费另按上表迁移。 |
| `cacheJsonByKey.compute` / `parse` | 无输入的 caller computation / 待解析 payload；不获得 invocation 能力。 | [cache](../../src/package-tools/cache/cache-json-by-key.ts)。 |
| `reconcileFindingWaivers.identify` | 调用方 Finding，提取业务 identity。 | [waiver reconciliation](../../src/package-tools/finding-waivers/reconciliation.ts)。 |
| `presentCheckFindings.message` / `omittedMessage` | Finding/index 或 omitted findings/counts；均为呈现所需业务输入，虽命名 Context 仍不是 Core 注入。 | [finding presentation](../../src/package-tools/finding-presentation/finding-presentation.ts)。 |

[其余 root exports](../../src/index.ts)的 flag builders、数据/索引工具、文件选择/收集、debug helper、admission simulation 和随包 Check options
未提供额外 caller context 槽位；随包 Check 内部 prepare/execute 作为上表消费者迁移。
内部 `CheckExecutionLifecycle`、`InvocationLifecycle`、clock/logger/collector seams 不成为公共 hooks；按其实际生产依赖调整。
Project Gate 的 `resultContributor` 是 `scripts/**` 自有契约，保持原接口；Gate 中实际调用 Product 的 Checks、策略和 effects 则迁移。

## 生产与采集边界

“无需求不生产”针对可选注入及观察成本。执行和诊断的固定责任是独立消费者，不能因为公开 callback 不请求字段而删除。
生产配置一次固定；下表按最早必要事实点启用，之后只物化已启用字段，不支持临时订阅或取消。

| 需求 / owner | 最早必要事实与持续维护 | 物化、复用与关闭证明 |
| --- | --- | --- |
| Check `signal`、`invocationId` / Run | 使用 Run 原有 identity 与取消能力；取消检查始终存在。 | 仅投影请求字段；signal identity 保持，零需求 callback 也受 execution cancellation。 |
| Check `project` / Run | Git/flags 由 configured selection 义务决定；prepare/execute 共用同一 Run project facts。 | 首次需要注入时建立冻结视图并复用；证明无需求跳过视图，而非跳过已配置的 Git/flag 工作。 |
| Check `dependencies` / execution | Core relations/settlements/handoffs 保持；执行前按该 Check direct relations 绑定 facade。 | 无需求跳过 relation projection/facade；有需求保留 get/list 授权、typed provider 与 handoff。 |
| Check `records` / settlement + execution | session scope 始终负责合法结果；仅有需求时建立 reporter wrapper。 | 生命周期结束关闭已创建 reporter，保留 late write rejection；无需求不创建 wrapper。 |
| Check `artifactDirectory` / output paths | 按原 Controls/output 授权确定可用 base；字段需求不授予路径权限。 | 仅在请求或原输出义务要求时取得本 Check path；未授权仍为 null，既有输出失败语义保持。 |
| Scheduler `graph` / prepared graph | 已验证静态图始终是合法性输入。 | 仅有公开/内部投影需求时构造 graph DTO；同 Run 所有请求者复用冻结值。 |
| Scheduler 当前 state 字段 / Admission Core + shell | legality、资源、running/settled state 始终维护；shell 拥有取消与真实执行 facts。 | 每个 boundary 仅查询所需投影；内部依赖不额外交付。保留 canonical 顺序、旧 state/fork 隔离。 |
| terminal `execution` / shell | Scheduler 开始前启用 admission 顺序；actual pending-to-running 后记录；settlements 使用已有事实。 | seal 时物化；无 execution 或其它真实顺序需求时不建 admission-order ledger。 |
| `cumulative` / collector | Scheduler 首个采样前启用 counters、peaks、accepted-wait 与 slot/capacity integrals。 | decision 前 flush 并固定有界 view；不维护 action history、task chronology/delay 或 Run tail。 |
| `actionHistory` / collector | 首个 accepted action 前启用 sequence、effects、post-state interval contribution；下一实际 callback 前关闭 observation。 | 追加 frozen history，交付固定 end-count reader；不开逐 Task delay/chronology，旧 reader 不见 future append。 |
| `runMeasurement` / collector + shell facts | Scheduler 首个采样前启用 Run timing、counters、peaks、tail 与 control/diagnostic timing。 | seal 时物化现有 raw 的非 admissions 部分；不开 action history 或逐 Task delay 表。 |
| `taskTimings` / collector | Scheduler 首个采样前启用 admission-viable 分类 delay 与 admission/settlement chronology。 | seal 时形成原 admissions 顺序的 frozen table；不开 action history、tail 或无需求 aggregate DTO。 |
| diagnostics / diagnostic owner | effective diagnostics 在 Scheduler 前固定；按现行 decision observation 与 summary 的真正依赖启用 production closure。 | summary 从 runMeasurement/taskTimings 等已请求事实投影；完整诊断证据与 writer containment 保持，不无条件开启无人使用的 actionHistory。 |

所有 timing 组共享唯一 collector clock 与 validity，具体不可用及旧 snapshot 规则见 [Design](design.md#3-字段生产与统计分组)。
只需 execution/state 或零需求，且无诊断义务时不创建 timing collector、不读额外 measurement clock；Check 自身 duration clock 属于原结算义务。

## 实施定位与证据集合

- 类型与声明：`src/check/**`、`src/project-definition/scheduler-context-*`、通用 helper；现有
  [helper 正反例](../../src/package-tools/scheduler-context/define-scheduler-context-callback.test.ts)证明基础推导，新增跨扩展点原型证明本项接线。
- runtime：`src/project-run/check-execution/**`、`src/project-run/admission-strategy-provider/**`、`src/project-run/task-scheduler/**` 与 command constructor/execution。
- 消费者：全部 `src/package-checks/**` 的普通 Check、`src/package-tools/learned-critical-path/**` 的策略与 recording、`scripts/project/**`、当前 development/workbench 和测试 support。
- 交付材料：root API inventory、公开指南与 API examples、JSDoc、installed TS/JS consumer fixtures；按 [Tasks](tasks.md)分别证明生产成本、运行语义和包外用法。
