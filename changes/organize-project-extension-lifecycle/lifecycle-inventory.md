# 生命周期函数与位置账目

本账目是本 Change 的闭合工作清单：每个逻辑位置说明当前消费者、目标实际契约或保留条件；每个现有函数说明唯一去向。设计理由和完整契约由 `design.md` 拥有。

## 读取规则

- **当前公开**：软件包根入口可达，必须具有公开路径、类型、调用与失败契约。
- **当前 Project**：仓库 Project Gate 自有，不是 Product 公共 API，但必须具有中央配置与 adapter 接线。
- **当前内部**：真实运行时消费者需要的私有机制；路径、依赖和顺序必须明确，但不得直接外放私有上下文。
- **相邻 Change**：长期方向已记录但不由本 Change 实现；这里只保存逻辑位置、owner 与采用条件。
- **逻辑保留**：没有当前即时消费者；不分配路径、签名、runtime dispatch 或 output status。

## 生命周期位置矩阵

### Product Check

| 逻辑位置 | 状态 | 本 Change 后的实际契约 | 职责、顺序与故障 | 精确 owner |
| --- | --- | --- | --- | --- |
| 单项准备 | 当前公开 | `Definition.checks[…].prepare`；`CheckPreparation`；`CheckPreparationResult` | Check 获准入后至多一次，先于 `execute`；省略则使用 authored options；block/throw/invalid 结算 unavailable，continue 使用 frozen fallback。 | `src/check/check.ts`、`src/project-definition/check-tree/**`、`src/project-run/check-execution/preparation*.ts` |
| 执行即将开始 | 当前内部 | `CheckExecutionLifecycle.started(fact)` | `prepare` 允许继续后、调用 `execute` 前同步一次；被准备阻止或未获准入时零次；观察不能控制结果。 | Check lifecycle、ready execution、progress projection |
| 领域执行 | 当前公开 | `Definition.checks[…].execute`；保留 `CheckExecution` / `CheckExecutionContext` | 形成当前 Check result、messages、Records 与 handoff；throw/invalid 由现有 Product 结算规则 containment。 | `src/check/check.ts`、Check execution owner 与 package Checks |
| 单项结算完成 | 当前内部 | `CheckExecutionLifecycle.settled(fact)` | Core 接受唯一 terminal fact 后同步一次；覆盖 control、dependency、preparation、execution 与 cancellation settlement。 | Check lifecycle、execution settlement、progress projection |

#### Product Check 局部函数

| 函数 | 路径 | 分类与去向 |
| --- | --- | --- |
| `parseData(data)` | `Check.parseData` / `defineCheck({ parseData })` | 数据 parser/type anchor；保留现状，不是生命周期 callback。 |
| `records.report` | `CheckExecutionContext.records.report` | 当前 Check 的 supplemental fact writer；保留现状。 |
| dependency `get/list` | `CheckExecutionContext.dependencies.get/list` | 已授权 direct relation readback；保留现状。 |

### Project / Invocation

| 逻辑位置 | 状态 | 本 Change 后的实际契约 | 职责、顺序与故障 | 精确 owner |
| --- | --- | --- | --- | --- |
| Project 准备 | 相邻 Change | 无当前路径；`add-project-change-flags` 在选择前形成 Project facts。 | 采用条件是该 Change 固定声明、失败和 fingerprint 契约；本 Change 不建 `prepareProject`。 | 相邻 Change与 Project Definition owner |
| 有效选择完成 | 当前内部 | `InvocationLifecycle.selectionSettled()` | 全部 flag-control settlements 被接受后、Scheduler graph run 前同步一次；不到达边界为零次。与逐 Check lifecycle 分开。 | Check lifecycle、resolved checks、progress projection |
| 有效 Check 输入准备 | 相邻 Change | 无当前路径；`batch-declared-project-file-inputs` 设计 Product 输入屏障。 | 采用条件是声明来源、选择后批处理、局部预结算与取消语义闭合；本 Change 不建通用 callback。 | 相邻 Change 与 Project Run owner |

### Admission / Scheduler

| 逻辑位置 | 状态 | 本 Change 后的实际契约 | 职责、顺序与故障 | 精确 owner |
| --- | --- | --- | --- | --- |
| 策略准备 | 当前公开 | `Definition.scheduler.admissionPolicy.strategy.prepare(context)` | 当前在静态图验证后至多一次，返回 `decide` 与可选 `terminalEffect`；throw/invalid 为 admission-strategy-preparation failure。有效图重排由相邻 Change 负责。 | scheduler policy、admission strategy provider |
| 单次准入决策 | 当前公开 | simple strategy `.decide` 或 `PreparedCustomAdmissionStrategy.decide` | 每个真实 decision boundary 同步提出 `select` / `wait`；Scheduler 验证 proposal 并执行状态转换。 | Scheduler policy 与 admission core |
| accepted action 后观察 | 当前内部 | private measurement collector；下一次 `AdmissionPolicyContext.measurement` | Scheduler 先完成 accepted action/state transition，collector 再记录 post-state；下一次 `decide` 读取冻结 captured prefix。私有 collector context 不外放。 | task-scheduler measurement owner |
| Scheduler 终态摘要 | 当前内部 | internal summary participant | sealed terminal context 形成后最先运行；writer failure 自行 containment，不进入 caller output aggregate。 | terminal measurement、measurement diagnostics |
| Scheduler 终态作用 | 当前公开 | `Definition.scheduler.terminalEffects[]`；`SchedulerTerminalEffect` | internal summary 后按声明顺序逐个 await；每项均获调用机会；故障记入 `outputs.terminalEffects`。 | Project Definition、task scheduler、Run output owner |
| prepared 策略终态作用 | 当前公开 | `PreparedCustomAdmissionStrategy.terminalEffect` | 公开数组完成后、sealed context 存在时至多一次；失败与公开 effects 共用 output aggregate。 | admission provider 与 Invocation orchestration |
| prepared 策略资源释放 | 逻辑保留 | 无路径 | 当前没有必须在所有分支必达清理的公开消费者；未来资源场景另行决定 guarantees。 | 未来 Change |

#### Admission / Scheduler 局部函数

| 函数 | 路径 | 分类与去向 |
| --- | --- | --- |
| 状态检查/假设转换 | `AdmissionPolicyContext.admissionState.*` | 准入策略只读/模拟能力；保留现状。 |
| `identityForTask` | `createLearnedCriticalPathStrategy({ identityForTask })` | 学习策略自有 Task identity mapper；保留局部。 |
| `observe` | `createLearnedCriticalPathStrategy({ observe })` | 学习策略内部 event consumer；保留局部，不并入 lifecycle effects。 |
| task runner callbacks | private `RunTaskGraphOptions` 与 state-machine handoff | 内部执行接线；只将现有 terminal consumer 命名迁移到 terminal effects。 |

### Run output

| 逻辑位置 | 状态 | 本 Change 后的实际契约 | 职责、顺序与故障 | 精确 owner |
| --- | --- | --- | --- | --- |
| Check 详情展示 | 当前公开 | `Definition.outputs.progressRendering.formatter`；Controls 同路径覆盖 | 同步形成受预算限制的 preview；只控制展示字符串。 | progress rendering owner |
| terminal effect readback | 当前公开 | `RunResult.outputs.terminalEffects` | 聚合 Definition effects 与 prepared effect 的 enabled/not-run/succeeded/failed；不能由 Controls 注入。 | output status 与 Run result |
| Run 结果观察 | 逻辑保留 | 无路径 | 调用方可在 `await run(...)` 后处理；没有 Product 内即时消费者。 | 未来 Change |
| Run 结果决策 | 逻辑保留 | 无路径 | 当前没有 Product 内策略消费者；RunResult 继续由 Product owner 形成。 | 未来 Change |
| 输出关闭 | 当前内部 | `ProgressRendering.final/close`、`ProgressWriter.close`、`DiagnosticLoggingRouter.close` | 各 owner 按依赖关闭并保持独立 failure status；不合并公开槽位。 | completion 与 output owners |

### Project Gate

| 逻辑位置 | 状态 | 本 Change 后的实际契约 | 职责、顺序与故障 | 精确 owner |
| --- | --- | --- | --- | --- |
| Gate 结果贡献 | 当前 Project | `PROJECT_GATE_RUN_CONFIG.resultContributor`；`ProjectGateResultContributor` | exact candidate Run 形成 initial result 后至多一次；返回 closed message 数组。adapter 追加消息且不允许改变 status；throw/invalid → unavailable。 | Gate definition、result contribution、root adapter |
| Gate 结果决定 | 当前内部 | `createInitialProjectGateResult` → contributor application → `projectGateExitStatus` | Product result/warnings/progress 唯一形成 initial status；合法 contributor 保留 status；exit mapper 唯一形成 0/1/2。没有 Project policy slot。 | Gate result 与 root adapter |
| Gate transcript 完成 | 当前内部 | `ProjectGateTranscript.complete(completion)` | 在 final result/exit 已确定后写入并关闭一次；失败使 process result unavailable。 | Gate transcript owner |

## 现有函数迁移矩阵

| 现有身份 | 最终身份或处理 | 兼容与验证 |
| --- | --- | --- |
| `Check.preflight` | `Check.prepare` | 旧字段 rejected；task-local 调用与 result vocabulary 保持。 |
| `CheckPreflight` | `CheckPreparation` | 根导出直接替换，旧 import 类型失败。 |
| `CheckPreflightResult` | `CheckPreparationResult` | result branches/fields 不改。 |
| `Check.execution` | `Check.execute` | 旧字段 rejected；执行结果语义不改。 |
| `CheckExecution` / `CheckExecutionContext` | 保留 | 名称仍准确描述领域执行，不是 Hook。 |
| `CheckExecutionLifecycle.flagControlCompleted` | `InvocationLifecycle.selectionSettled` | 拆成独立 internal input；同一 runtime 边界一次。 |
| `CheckExecutionLifecycle.started/settled` | 保留在缩窄后的接口 | 逐 Check facts与进度顺序不改。 |
| `scheduler.measurementHooks[]` | `scheduler.terminalEffects[]` | 旧字段 rejected；顺序、await-all-chance 与 context 保持。 |
| `SchedulerMeasurementHook` | `SchedulerTerminalEffect` | `SchedulerMeasurementContext` 与 measurement DTO 保留。 |
| prepared `complete` | prepared `terminalEffect` | 旧字段使 prepared result invalid；sealed context 后至多一次。 |
| `outputs.measurementHooks` | `outputs.terminalEffects` | 旧 key/type/diagnostic 移除；聚合语义保持。 |
| `scheduler-measurement-hooks-failed` | `scheduler-terminal-effects-failed` | 直接 diagnostic vocabulary 切换。 |
| `scheduler.measurement-hook-failed` | `scheduler.terminal-effect-failed` | 直接 diagnostic event 切换。 |
| Gate `afterGate` / `ProjectGateAfterHook` | `PROJECT_GATE_RUN_CONFIG.resultContributor` / `ProjectGateResultContributor` | 删除 full-result transform；只接受 validated message array。 |
| `observeProjectGatePerformance` | `contributeProjectGatePerformanceMessages` | 返回消息贡献，不再构造或复制完整 result。 |
| `parseProjectGateResult` | contributor message-list parser | initial result constructor 保留；贡献不能携带 status。 |

## 其他函数的归属

| 函数 | 定义或使用路径 | 归属与处理 |
| --- | --- | --- |
| `message` / `omittedMessage` | `presentCheckFindings({ message, omittedMessage })` | 展示 helper 的 mapping callbacks；保留局部。 |
| `identify` | `reconcileFindingWaivers({ identify })` | waiver 操作的 identity mapper；保留局部。 |
| `compute` / `parse` | `cacheJsonByKey({ compute, parse })` | cache 状态机 callbacks；保留局部。 |
| process-check descriptor callbacks | `createProcessCheck*` 的 `environment/fromStdout/parseData/validateDependencyData/recordsFromStdout/successData` | Project Gate Check adapter；只同步受 Check `prepare` / `execute` 命名影响的字段。 |
| loader、clock、writer factories 与测试 callbacks | 正式构造 dependencies 或 test seams | 依赖注入；不属于产品生命周期扩展面。 |

## 目标文件与证明边界

| 实施单元 | 必须覆盖的范围 | 最小直接证据 |
| --- | --- | --- |
| Check prepare/execute | `src/check`、check tree、check execution、package Checks、root exports、Gate Checks、examples/fixtures/docs | authoring/type、preparation failure/cancellation/messages、execution/settlement、fingerprint、external consumer |
| Internal lifecycle split | lifecycle type、resolved execution inputs/state、progress presentation、selection/settlement tests | selection boundary 0/1 次、started/settled 顺序、disabled progress |
| Scheduler terminal effects | scheduler policy/validation、terminal delivery、prepared provider、output/result、learned strategy、exports/docs | definition validation、order/all-chance、prepared lifecycle、cancellation/no-context、output priority、fingerprint |
| Gate contribution | central config、bound module、root adapter、result parser、performance contribution、transcript/reporting docs | bound identity、status preservation、message ordering、throw/invalid/hostile、exit mapping |
| Stable documentation | callbacks guide、API timeline、development owners、Gate tooling、README/navigation/changelog/package material | docs/API/install checks、external consumer、independent semantic review |

公开 Check observation、Project change functions、Project file input callback、prepared dispose、RunResult effect/policy、Gate result policy 与 contributor array 都不在本 Change 建立实际接口。
