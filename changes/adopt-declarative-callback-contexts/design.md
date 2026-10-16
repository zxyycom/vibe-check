# Design

以业务输入独立、需求静态固定、领域按需生产和消费者精确视图实现统一 context 契约；实施顺序与验收见 [Tasks](tasks.md)。

## Context

当前公开签名由 [Check lifecycle](../../docs/guides/extending-check-lifecycle.md)、[Scheduler](../../docs/guides/scheduling.md)与
[command Check](../../docs/guides/command-check.md)拥有；[覆盖清单](callback-surfaces.md)连接实际公开槽位、调用入口和本次目标。
`defineSchedulerContextCallback` 已有 literal tuple、宽化、union 与阶段错误的类型证据，新 helper 在此基础上推广。

已确认：`options` 属于业务输入；框架字段必须显式声明并自动推导类型；需求在生产开始前固定；默认无需求；一次 breaking 切换。
允许改变 terminal context 外层共享 identity，执行顺序、取消、权限、失败优先级与 snapshot 隔离继续保持。

[需求声明 Decision](../../docs/decisions/declare-scheduler-context-demand.md)仍描述当前已实现的 full 默认与共享 union；
相关 summary、terminal 命名和在线观察 Decision 的演进范围见下方迁移表。本 Plan 记录目标，不提前改变现行记录。
[immutable admission state](../../docs/decisions/provide-immutable-admission-graph-state.md)继续约束状态与推演。

## Goals / Non-Goals

- 目标：用同一套声明与精确交付规则覆盖真实框架注入位置，保持业务参数、领域生产及失败责任清楚；完整迁移后独立验收。
- 边界：只共享 callback descriptor、类型选择、声明 snapshot 和精确投影机制；阶段字段表、业务参数、调用时机与事实源由领域拥有。
- 非目标：动态订阅/撤销、历史回补、全局字段 registry、callback 沙箱、权限扩张、默认策略改变，以及 Scheduler typed 索引或浮点算法重构。

## Decisions

### Intended Change

#### 1. Authoring 与通用 helper

所有纳入位置接受普通 function 或 closed `{ contextNeeds?, callback }`。function、缺省或自有 `undefined` 的 `contextNeeds`、`[]` 均为零需求。
有业务输入时签名是 `callback(input, context)`，没有业务输入的 Scheduler 签名是 `callback(context)`；零需求同样传冻结空 context。
需要字段的 TypeScript authoring 使用 `defineContextCallback(phase, descriptor)`；helper 返回保留精确类型的 descriptor，不执行 callback。

以下是目标 API 示例，实施后应成为真实 consumer 类型与运行证据：

```ts
interface AuditOptions {
  readonly limit: number;
}

const execute = defineContextCallback("check.execute", {
  contextNeeds: ["signal", "records"],
  callback(options: AuditOptions, { signal, records }) {
    if (signal.aborted) {
      return { status: "unavailable", reason: { code: "cancelled" } };
    }
    records.report({ id: "configured-limit" }, { limit: options.limit });
    return { status: "passed", data: { limit: options.limit } };
  }
});

const decide = defineContextCallback("scheduler.decide", {
  contextNeeds: ["candidates"],
  callback({ candidates }) {
    const next = candidates.find(candidate => candidate.canAdmit);
    return next === undefined
      ? { kind: "wait" }
      : { kind: "select", taskId: next.taskId };
  }
});
```

- `phase` 使用覆盖表中的固定标识；helper 由阶段推导合法字段和结果约束，由 literal needs 推导只读选中字段。phase 只用于 helper 选型，不写入 descriptor；实际槽位提供 runtime 字段 schema。
- 泛型业务 input、prepared options、final data、handoff 与返回 literal 保持贯通。独立编写 helper 时可标注业务 input 类型，如上例；无需手写 context `Pick`、字段类型或断言。
  普通 Check 的现有 options 推导继续保留；跨 `defineCheck` 嵌套的全部泛型推导由实现任务中的类型原型验收，不能以放宽 context 类型通过检查。
- 宽化数组、union token 和 tuple union 只承诺每种可能声明都保证的字段，沿用当前 helper 的健全规则；运行时按本次实际复制的声明交付。
- 原始 TS descriptor 保留安全的存储边界，context 为 `never`；JS 可直接编写 descriptor。普通 function 获得空 context 的 contextual typing。
- 具体 helper 返回值可直接调用 `.callback`，调用方必须自行提供符合选中类型的业务 input/context；广义槽位是存储接口，须收窄 function/descriptor 后调用。
  直接调用不创建 Run、授权或自动生产能力；learned/command 的具体返回类型同步改为 descriptor，不再承诺旧 function callable 形状。

共同底层类型表达业务参数 tuple、context 字段 schema 与结果类型；Check/Scheduler/command 提供各自映射。
纯 descriptor/需求 snapshot 机制归现有 Core 数据边界，领域 validator 传入合法 key 集合；自动类型 helper 归可移除的 package tool，只引用公开类型。
Core 不依赖 helper 实现，command 仍通过普通 Check 协议接入，Admission Core 不接管 I/O、业务 options 或 callback registry。

#### 2. 验证与需求固定

1. 接收边界只接受自有 data 字段 `callback` 和可选 `contextNeeds`；callback 为函数，needs 为 dense 合法顶层 key 数组。
   拒绝未知/跨阶段 key、accessor、symbol 扩展、空洞、非数组和需求函数；数组复制、去重并按阶段固定顺序冻结。
2. Definition 在 author work 前固定 Check、simple/prepared preparation 与 Definition terminal effects；非法声明仍为 configuration failure。
   command constructor 固定两个下游 callback，非法 input 仍抛 `TypeError`；环境结果和 completion failure 维持 command/Check 的既有归类。
3. prepared strategy 返回后、Scheduler 启动前验证并固定 `decide`/`terminalEffect`，非法结果仍为 `admission-strategy-preparation-failed`。
   此后汇总所有 Scheduler 需求和内部义务，生成本 Run 唯一、不可变的生产配置；这是合法的启动准备，不是运行中订阅。
4. 执行期间使用固定配置。需求不能新增、取消或补采；需求数组或原 descriptor 后续修改不影响本 Run。
   `AbortSignal` 的取消状态仍可变化，取消 Run 与取消 context 订阅是不同机制。
5. callback、needs 和 phase helper 元数据不进入 declarative fingerprint；业务 options 和既有声明字段继续按当前 owner 处理。

#### 3. 字段生产与统计分组

字段集合、最早采集点和成本依赖由[覆盖清单](callback-surfaces.md#生产与采集边界)完整列出。生产顺序为：
固定需求 → 合并生产依赖与内部义务 → 领域采集/维护 → 调用边界物化 → 各消费者精确投影。
同阶段生产可共享；合并后的需求不是 callback 的可读字段集合。

Scheduler 保持当前统计定义、单位与 interval 归属，拆分表示和开关：

| 目标字段 | 值与旧数据的对应 | 独立成本 |
| --- | --- | --- |
| decision `cumulative` | 当前 `measurement.cumulative`，保持其 closed timing union。 | 有界 counters、peaks 与 cumulative timing integrals。 |
| decision `actionHistory` | 当前 `measurementCount` / `measurementAt` captured-prefix reader。 | accepted action、effects、interval contributions 与追加历史。 |
| terminal `runMeasurement` | 当前 rawMeasurement，available 的 `timingFacts` 去除 `admissions`；其余 fingerprint、discrete、peaks 与 Run timing 字段保持。 | Run counters、tail、peaks 与 aggregate/control-path timing。 |
| terminal `taskTimings` | closed `{ timing: { availability: "available" }, admissions }` 或 `{ timing: { availability: "unavailable", reason } }`；admissions 保留现有 Task ID、分类 delay、admitted/settled timestamp 与顺序。 | 逐 Task delay 累计、admission/settlement chronology 与终态表。 |

`measurement` / `rawMeasurement` 及旧 helper 被新字段与 helper 替代。只有 `cumulative` 时不记录 action history、逐 Task delay 或 chronology；
只有 `taskTimings` 时不创建 action history、Run tail 或无消费者的 aggregate DTO。共享中间量仅因真实生产依赖启用。

启用的 timing 组共享 collector 的一份 clock、采样边界及 validity 状态：clock throw/non-finite/backward 或已启用计算的 invalid interval/integral
按既有 first-fault 规则使后续 timing view 不可用；不会为了寻找故障而计算已关闭的组。合法零区间仍有效。
`cumulative` / `runMeasurement` 在不可用时保留各自离散事实与 peaks；`taskTimings` 不交付伪造数值；history 继续保留离散 action/effects，新增 interval 使用不可用分支。
每个 reader 在自己的调用边界固定 availability、数值和 prefix；后来的 fault 或 append 不回写旧 view。
本项按启用统计定义所需的原采样边界与逐项累加次序拆开维护路径，新的数值保证和累加算法留给 Scheduler 重构。

Check 需求只关闭可选注入生产：执行取消、relation guards、session settlement、console capture、既有 output/diagnostic 义务照常运行。
`project` 的注入视图可按需建立；已配置的 Git facts/flag selection 仍按原生命周期完成。
`records` wrapper、dependencies facade 和 Check artifact path 只在需求或独立的既有输出义务要求时建立，保留授权与 reporter close 边界。

#### 4. 精确视图与生命周期

- 每个 context 只含自身声明的 own data fields，外层冻结；不同消费者没有外层 identity 相等保证。空视图可以复用同一冻结对象。
- 同 Run 的冻结 graph/project、同 boundary 的 immutable state/投影可复用嵌套值；旧 snapshot、假设分支和 captured history prefix 不随后续执行变化。
  Check `signal` 仍为该 Run 同一取消能力，records 是同一 Check scope 的受控 reporter；外层冻结不冻结这些能力的内部生命周期。
- declaration 只选择既有能力。`dependencies` 仍限 direct relations，handoff 与 artifact 授权不扩大；没有字段需求不改变 hard guards 或 Check 结算。
- terminal internal summary、Definition effects 顺序、prepared effect 最后、失败继续交付、drain/seal 与 primary failure 优先级保持；无需求 effect 仍交付。
  未 seal 的早期失败仍不调用 terminal effects，prepared `terminalEffect` 仍不是资源释放的 finally。

### Resulting Impacts

#### 契约交接与迁移

| 对象 | 实施动作与完成证据 |
| --- | --- |
| 需求声明方向 | 演进 [261013](../../docs/decisions/declare-scheduler-context-demand.md)：替换 full 默认、union 交付与旧 identity，承接静态需求、按需生产、领域事实源及交付与采集分离。 |
| summary / terminal 方向 | 复核并按真实改变演进 [260902 summary](../../docs/decisions/unify-default-summary-with-terminal-measurement-hooks.md)的共享 identity 与 [260914 terminal effects](../../docs/decisions/name-scheduler-terminal-consumers-as-effects.md)的 measurement DTO 保留承诺；完整承接命名、顺序、writer containment、not-run 与 failure priority。 |
| 在线观察方向 | 演进 [260902 post-action measurement](../../docs/decisions/observe-post-action-policy-measurement.md)的公共聚合形状；保留 post-state interval、无因果主张、固定 prefix 和唯一 collector。实现前形成未来方向，完整验收后核对各后继 alignment。 |
| Check / command | 业务 input 移到第一参数、框架字段加声明；command 汇总自身执行义务与两个下游需求，上游取得并集、下游各取精确字段。所有随包 Check、typed provider、handoff 和直接调用测试同步迁移。 |
| Scheduler / learned | simple/prepared/effects 改用新 helper；learned 只声明 graph、实际 decision 字段与记录样本所需 taskTimings/execution，移除 legacy/full callable 依赖；identity/observe 的业务签名保持。 |
| 仓库 consumer | 更新 `scripts/project/**`、开发 benchmark/workbench、当前可执行 examples、fixtures 与测试 support；历史 Investigation 正文保留形成时语义，仍参与当前编译/运行的历史代码按其受管入口处理。 |
| 公共材料 | 同步 root exports、API inventory、JSDoc、公开/内部 owner、受管 API examples、installed TS/JS fixtures 和 changelog 升级节。只保留实现中的新契约。 |
| 升级与恢复 | 升级说明对照签名、默认空、统计分组、helper/槽位直接调用和 terminal identity；外部 consumer 实际编译/运行新用法。恢复说明要求旧包与对应调用方同时回退；发布版本由发布流程在冻结源时确定。 |

完整完成本项实现、迁移、独立审查及 package 验收后，再按[协调入口](../../docs/governance/change-coordination.md#全局声明式上下文与-scheduler-底层重构)推进底层重构。
本项使用当前 Scheduler facts/query 接口完成局部 producer 拆分；后续重构不承担本项遗漏的生产开关或消费者接线。

## Risks / Trade-offs

- 精确外层对象会增加小量分配；共享已请求的底层值与边界局部物化，先以生产探针证明按需语义，再独立测量成本，不承诺每个规模都更快。
- 声明为静态开关，换取可预测的完整历史与低维护复杂度；需要多种运行策略时，在启动前生成不同声明，而不是运行中订阅。
- 聚合字段拆分会扩大一次性迁移量，但直接消除“读累计也必须维护历史/逐 Task 表”的隐藏成本。
- function 仍然合法但语义改为无需求，无法靠 runtime 检出所有旧 closure 的隐式读取；升级核对、真实 consumer 与编译证据共同闭合迁移。
- 统一大 context 会混淆阶段权限及输入，完全局部实现会重复声明规则；选择共同机制加领域映射，保留独立的执行/生产 owner。

## Open Questions

无阻塞本 Plan 推进的用户决策。跨扩展点泛型接线与 producer 拆分属于 [Implementation](tasks.md#implementation) 的明确工作及验收义务。
若证据表明必须改变已确认的生命周期、权限、统计含义或两个 Change 的独立交付边界，先更新方案并取得相应决定，不能降低成功标准后继续提交。
