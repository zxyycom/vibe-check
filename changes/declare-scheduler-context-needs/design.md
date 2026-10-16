# Design

按 Scheduler 的 preparation、decision、terminal 阶段收集可选需求，以薄查询和共享冻结投影减少未消费工作。实施与上轮组合验收已完成；本 Plan 保留设计和交付依据，尚未结项删除。

## Context

实施前 static decision 每轮构造完整 inspection、settled 表、blocker summary 与观察用 candidate facts；custom 无条件启用在线 measurement；terminal effect 的交付依赖完整 collector。候选全扫本身仍有执行用途，仅减少 DTO 复制不足以分开执行与观察责任。

- [公开调度指南](../../docs/guides/scheduling.md)拥有输入、顺序、失败与取消承诺；[Scheduler](../../docs/development/scheduler.md)拥有 reducer、shell、需求闭包、measurement 与终态交付。
- [Project Definition](../../docs/development/project-definition.md)拥有 closed validation、normalization 与 fingerprint；[Project Run](../../docs/development/project-run.md)拥有策略准备和 Run-local handoff；[package tools](../../docs/development/package-tools.md)拥有 authoring helper。
- 本 Change 形成时的[需求声明方向](../../docs/decisions/archive/declare-scheduler-context-demand.md)已修订归档；以下为形成时沿用的[不可变 state](../../docs/decisions/provide-immutable-admission-graph-state.md)、[完整 diagnostics](../../docs/decisions/keep-gate-run-evidence-complete-with-owner-scoped-scheduler-context.md)、[captured prefix](../../docs/decisions/archive/observe-post-action-policy-measurement.md)、[terminal effects](../../docs/decisions/archive/name-scheduler-terminal-consumers-as-effects.md)及[统一 runner](../../docs/decisions/archive/unify-default-summary-with-terminal-measurement-hooks.md)依据。
- [诊断独立性](../../docs/decisions/keep-run-diagnostics-independent-of-optional-strategies.md)排除 learned 特殊通道；[规模取舍](../../docs/decisions/weigh-performance-costs-against-scaling-benefits.md)要求同时保留规模收益、小输入绝对代价和噪声。

| 消费阶段 | 事实与生命周期义务 |
| --- | --- |
| prepared `prepare` / preparation | graph 有效且取消门禁通过后至多一次；throw、reject 或非法返回归入 preparation failure。只消费静态图，空声明通常收益很小。 |
| simple 或 prepared `decide` / decision | 同步提交 select/wait；Scheduler 重检真实 guards，fault 后停止 admission、取消 pending、drain started。需求决定动态 DTO 和在线 reader 的生产。 |
| Definition effects 与 prepared effect / terminal | drain 后共享 sealed context；Definition effects 依序 await、失败继续，prepared 最后至多一次；不承担必达 disposal。 |
| diagnostics 与 internal summary | 启用时保留完整 graph、动态 decision evidence 与 raw summary；writer failure 由 summary wrapper 包含。 |
| static selection 与私有 observer | static 消费 core 候选、active scopes、容量及 runtime；私有 observer 按既有 seam 消费事实，不由公开声明改写。 |

## Goals / Non-Goals

- 目标：保留原 function 的完整上下文与生命周期；需求在生产前减少投影和采集；每阶段合并一次、边界对象冻结；执行与观察事实各有唯一来源。
- 非目标：改变选择算法、guards、默认 policy、输出 schema 或 Check facts；整体 Run 线性化；跨 Run 缓存、第二套全量索引、动态需求、callback sandbox 或通用 Hook registry。Check、progress、aggregation 和 learned observer 保持各自契约。
- 准备事实复用有独立 Change，本 Change 消费其私有 capability。尚未对齐的 effective-opportunity 方向不构成改 router 或 heuristic 的授权。

## Decisions

### Intended Change

#### 1. 声明与 TypeScript 边界

Scheduler callback 槽位接受原 function 或精确的 `{ contextNeeds?, callback }`：simple `decide`、prepared `prepare`、其返回的 `decide` / `terminalEffect`，以及 `scheduler.terminalEffects[]`。

- 原 function，或 descriptor 省略／自有 `undefined` 的需求：full，保留阶段完整字段。
- 显式 `[]`：none，消费者不增加字段需求，仍按正常生命周期获调用。
- 合法字段 tuple：只保证自身声明字段。同阶段共享对象可能包含其它消费者要求的额外字段，不构成权限隔离或精确物理裁剪。

只选择既有 Context 的阶段顶层字段，精确集合见[公开规则](../../docs/guides/scheduling.md#声明-callback-的-context-需求)；不接受子路径，`execution` 与 `rawMeasurement` 保持整体粒度。minimal 是按任务选择的集合，例如 decision 的 `["candidates", "runtime"]` 或 terminal 的 `["execution"]`，不是新增枚举或默认值。

`defineSchedulerContextCallback(phase, descriptor)` 保留阶段、literal tuple、只读 `Pick` 和实际返回类型，不执行 callback，不替代验证。宽化数组、union token 和 tuple union 只保证每种可能输入均确定请求的字段；共同 head 可保证，可选 tail 不保证，重排 union 保守少承诺。decision Promise/thenable 和 prepared-result 多余 key 仍拒绝。

公共兼容存储槽使用安全类型抹除：

```ts
type SchedulerContextCallbackInput<C, R> =
  | ((this: void, context: C) => R)
  | Readonly<{
      contextNeeds?: readonly (keyof C)[] | undefined;
      callback: (this: void, context: never) => R;
    }>;
```

helper 的精确 descriptor 可赋给此槽；raw TypeScript descriptor 的 context 为 `never`，读字段时使用 helper。closed normalization 验证后，私有边界才恢复携带已知需求的 callable，不能宽 cast 绕过检查。旧 function 保留完整 contextual typing；输入槽不是直接调用接口：取出 `SchedulerTerminalEffect` 或 `PreparedCustomAdmissionStrategy` 等槽位值时，须先以 `typeof value === "function"` 收窄，descriptor 交给 Core 构建 context 后调用。兼容覆盖旧 function authoring、完整 context、顺序和失败语义，不覆盖所有类型消费零修改。learned factory 的具体返回类型仍保证 function `prepare` / `decide` 可调用。

#### 2. Closed grammar 与失败

- descriptor 只接受自有 data 字段 `callback` 与可选 `contextNeeds`；callback 必须是函数。needs 为当前阶段合法 token 的 dense 数组，复制、去重、按固定字段序冻结，调用方后改无效。
- descriptor-safe snapshot 拒绝 unknown key/token、其它阶段字段、hole、accessor、symbol 和非 string；不执行 accessor getter，不从函数属性推测需求，不接受动态需求函数或任意 mutable map。
- Definition 内非法声明在 author work 前形成 configuration failure；prepared 返回的非法声明形成 `admission-strategy-preparation-failed`。callback throw、thenable、malformed/illegal proposal 与不可 drain wait 保持既有 policy fault taxonomy，绝不 fallback static。
- needs 与 callback 同属 runtime consumer 配置，不进入 declarative snapshot/fingerprint，也不回写 Definition。

#### 3. 阶段需求与共享生产

Definition 保存归一化消费者；Invocation 在 prepare 后收齐 Run-local decision/terminal 需求。Core 合并各阶段请求与固定执行／诊断义务，再计算私有生产闭包；生产依赖不自动成为公共字段。

| 请求 | 生产依赖 |
| --- | --- |
| 各阶段 `graph` | 本 Run 已验证的同一 frozen graph；graph-ready 与取消门禁先于 preparation。 |
| decision `candidates`、`capacity`、`activeScopeIds`、running/settled IDs | 同一 core 候选与 canAdmit 查询、root/effective cap 与运行数、lifecycle index 或相应 statuses。只构造请求的 DTO。 |
| decision `admissionState`、`runtime` | captured opaque core handle（catalog/inspection 保留既有 lazy getter）、shell abort/cancel facts。 |
| decision `measurement` | 从 Scheduler 开始的完整 collector；实际 callback 前 flush，形成固定 prefix reader。 |
| terminal `execution`、`rawMeasurement` | 分别使用真实 first-admission/settlement facts，或从 Scheduler 开始的完整采集。effect 存在本身只要求终态交付。 |
| diagnostics enabled | 完整 graph record、decision evidence 与 summary collector，由 Invocation 显式 enabled fact 驱动。 |

同阶段任一 full 消费者使该阶段 union 为 full，跨阶段不传播。每个 decision boundary 至多物化一个 detached 冻结动态对象；旧对象不随后续 boundary 变化。静态图在 Run 内复用。terminal drain 后 seal 一次，所有 terminal participants 共享 identity，callback 失败也不重建对象。

需求在生产前决定路径，不是构建 full 后隐藏字段，也不按 callback 实际访问遥测推断历史采集。static/no-observer 使用同一 core 的薄查询，跳过完整 inspection、settled/blocker DTO、candidate observation 与 diagnostic detail；取消需要保序 pending IDs 时才物化。候选全扫、priority/scope/tie 和 callback-return guards 保留。

无其它采集义务时，custom `["candidates", "runtime"]` 只生产候选 DTO/runtime，不启动 collector 或构建历史 DTO。terminal raw demand 可启用 collector，但不令 decision 自动 full。none 的 decide 仍在既有候选条件下调用并接受真实 guards。

#### 4. 终态交付与执行事实

`SealedSchedulerTerminalContext` 通过 `terminalContext` / `terminalSchedulerContext` 交接；collector 只生产 rawMeasurement。停止 admission、drain started work、seal facts 后，同一 ordered runner 依次执行启用的 internal summary 和 Definition effects，Invocation 最后交付 prepared effect。早期 setup/preparation/invariant failure 未 seal 时保持 not-run；取消或 policy fault 成功 drain 后照常交付。

可选 `ShellAdmissionFacts` 由 execution-state/task-lifecycle owner 维护 first-admission 顺序，terminal execution 或 raw/online measurement demand 才创建。成功 applyAdmission 并安装 running entry 后记录 start；pre-admission 结果、blocked 和 pending cancellation 不算 admitted。terminal execution 与 collector 的 admittedCount 共用此来源；settled 读取既有 settlementsByTaskId，不建第二 ledger。

acceptedWait、maxRunning、tail、timing、chronology、delay 和 captured prefix 仍由 measurement owner 负责。none/graph/execution-only terminal 不触发 raw timing/queue/per-Task delay 采集；none 即使没有 admission source 也获交付。完整 diagnostics 与 full terminal 保留 rawMeasurement；缺字段 context 不称为完整 measurement。

### Resulting Impacts

1. **类型与输入边界**：Definition、prepared-result parser、defineAdmissionPolicy exact types、新 helper/root export 与 installed declarations 共同接线，保留 callback identity 和冻结需求。
2. **Run/Scheduler handoff**：策略 provider、Invocation、Check execution 与 Scheduler 交接需求。collector 继续独占 clock、积分与 prefix；observation setup 拥有需求／collector 配置、shell 创建及 graph-before-collector 初始化，loop、selection 和 reconciliation 留在 shell。
3. **准备事实协调**：`ExecutableTaskGraph` 绑定 immutable PlannedTaskGraph 与 validated root cap；`PreparedCheckExecution` 绑定 normalized Checks 与该图。共享入口先由准备事实切面写入再串行集成；需求为独立 runtime 值，flags/preAdmissionTaskResults 为动态 seed，raw 入口继续验证。
4. **说明与包材料**：同步公开 scheduling/callbacks/API mechanics、Definition/Run/Scheduler/package-tools、JSDoc、legacy/declared 示例、API inventory 和 Case。RunResult、machine schemas、Check facts、aggregation、terminalEffects statuses 与 failure priority 不变；不新增 subpath、依赖或 CLI。
5. **私有 workbench**：固定 fixture registry 只消费 function-valued callbacks，私有输入据此收窄，以 `satisfies AdmissionPolicy` 保留 public conformance，descriptor-slot negative 防止误扩张。不新增 descriptor interpreter、公开 normalization API 或 runtime rejection。
6. **验收**：覆盖 grammar/snapshot、健全 tuple/exactness、legacy/full、phase union/shared identity、detached boundary、完整 diagnostics、captured prefix、terminal none/graph/execution/raw、取消/fault drain、prepared 最后、失败继续与 priority。操作计数验证未请求工作确实跳过；性能按 N/shape/P 的 public Run 同协议对照，区别实施与 opt-in adoption，保留绝对代价和噪声。证据见[性能](performance-evidence.md)及[交付](tasks.md#delivery-evidence)。

## Risks / Trade-offs

- 同阶段 full 消费者或启用 diagnostics 保留完整成本，subset 可能收益有限；依赖未声明的同行字段会在其它消费者移除时失效。
- 历史采集不能在终态补造。需求须在 Scheduler 开始前收齐，运行中固定；measurement 只在实际 callback 前 flush。
- 候选全扫和完整 diagnostic 输出仍有成本；不承诺整体 O(N)、所有规模更快或经验尺寸路由。
- helper 与存储槽增加类型复杂度；source/installed negative probes 验证真实保证，不能说所有 inline 位置自动推导。
- terminal 解耦须保持单一事实源、shared identity、失败 containment 与所有参与者调用机会。
- 共享 owner 串行写入；`closed-values.ts` 的 exact-key 优化属于同轮独立切面，不归因于本 Change。

## Open Questions

无待选择的设计问题。本轮普通 Git 提交与已启用 hook 的受限自动推送遵循[工作区提交规则](../../docs/tooling/workspace.md#local-post-commit-auto-push)；Plan 保留，Change finalize/delete 另行授权，提交状态以实际 Git 结果为准。

## Implementation Observations

- 独立审查修正 tuple-union tail 分配递归造成的 P1：graph-only 或 graph/execution 输入不能共同保证 execution。source helper 与 consumer fixture 保留负例；实际 API、严格 tsgo 和 installed declarations 已验证。
- 首轮 Gate 40/43 揭示 workbench 私有 contract 与 filemetrics owner 问题。随后收窄 fixture 输入、提取 learned `strategy-contract.ts` 和 `scheduler-observation-setup.ts`；AST 审查确认移动语句顺序、loop、guards 与 learned body 不变。新的 call-once runtime 边界因此绑定新 source freeze。
- 上轮 738-file 性能证据与原 736-file freeze 分开保存，不混合样本或覆盖 raw；完整表、hash、操作量与不利结果见[本轮性能证据](performance-evidence.md)和[原冻结证据](performance-evidence.original-freeze.md)。上轮 Gate 43/43、日志、告警及未覆盖边界见[交付证据](tasks.md#delivery-evidence)，不作为额外性能样本。
- 本次文档与等价代码整理发生在上述验收之后。已有性能数值仍绑定对应冻结镜像，不证明整理后源码重新测量；整理后材料和组合验收由主线程另行记录。
