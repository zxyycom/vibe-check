# 生命周期函数设计清单

本文件按领域列出生命周期位置、声明或接线路径、拟设函数、作用和当前承接。现有名称用于解释形成依据，最终采用判断由 [`design.md`](./design.md) 统一维护。

## 如何读取清单

- **稳定交付：** 主表的领域与生命周期位置形成随包 [`docs/guides/callbacks.md`](../../docs/guides/callbacks.md) 的结构骨架。模型成员由生命周期职责决定，可用状态单独记录；已启用项再连接调用条件、权限、失败反馈和专题契约。Project Gate 的精确契约仍由其工具文档拥有。
- **路径记法：** `Definition` 是传给 `defineConfig(...)` 的项目定义；`Check` 是递归 `Definition.checks[…]` 中通常由 `defineCheck(...)` 形成的单项定义；`Controls` 是 `run(definition, controls)` 的第二个参数；`PreparedStrategy` 是策略 `prepare(...)` 的返回对象；`ProjectGateDefinition` 是项目中央 Gate 配置。“目标候选”表示 Draft 路径提案，“内部”表示维护者接线而非作者配置入口。
- **状态：** **公开已有**表示软件包用户当前可以配置；**内部已有**或**项目已有**表示已有内部或 Project 实现；**已确认待启用**表示已有实际场景且接口仍待交付；**逻辑保留**表示该位置已进入完整模型，启用时再补齐使用者与精确契约。

## 生命周期函数设计

### Product Check

| 生命周期位置 | 声明路径与函数 | 作用 | 状态与当前承接 |
| --- | --- | --- | --- |
| 单项准备 | `Definition.checks[…].prepare` → `prepare(context)` | 在 Scheduler 接受 Check 后、领域执行前准备运行参数，并形成 `ready`、`blocked` 或 `fallback`。 | **公开已有，建议改名**：当前路径为 `Definition.checks[…].preflight`。 |
| 执行即将开始 | 目标候选 `Definition.checkLifecycle.executionStarting[]` → `CheckExecutionStartingEffect(event)` | 只读观察即将调用领域执行函数这一已确认事实。 | **内部已有**：当前接线为内部 `CheckExecutionLifecycle.started`；是否公开待证。 |
| 领域执行 | `Definition.checks[…].execute` → `execute(context)` | 执行领域工作，形成结果、消息、Records 和交接数据。 | **公开已有，建议改名**：当前路径为 `Definition.checks[…].execution`。 |
| 单项结算完成 | 目标候选 `Definition.checkLifecycle.settled[]` → `CheckSettledEffect(event)` | 只读观察 Product 已接受的唯一终态结果。 | **内部已有**：当前接线为内部 `CheckExecutionLifecycle.settled`；是否公开待证。 |

#### Product Check 的局部能力

| 函数 | 定义或使用路径 | 作用 | 归属 |
| --- | --- | --- | --- |
| Check `parseData(data)` | `Check.parseData`，作者入口为 `defineCheck({ parseData })` | 同步解析领域数据并提供类型锚点。 | 类型化数据提供方；由数据使用者显式调用。 |
| `records.report` | `CheckExecutionContext.records.report` | 写入当前 Check 的补充事实。 | Check 上下文；权限限于当前 Check。 |
| dependency `get/list` | `CheckExecutionContext.dependencies.get/list` | 读取已授权的依赖事实。 | 依赖上下文。 |

### Project / Invocation

| 生命周期位置 | 声明路径与函数 | 作用 | 状态与当前承接 |
| --- | --- | --- | --- |
| Project 准备 | 目标 `Definition.changes` 声明驱动 → 内部 `ProjectPreparation.prepareChanges` | 在配置验证后、有效选择前形成 Project 拥有的调用级输入。 | **已确认待启用**：Change 事实是实际使用者，采用特定声明路径而非通用 `prepareProject` 回调。 |
| 有效选择完成 | 目标内部 `InvocationLifecycle.selectionSettled(fact)` | 表达有效 Check 集合与控制条件结算已经固定。 | **内部已有，建议调整归属**：当前为 `CheckExecutionLifecycle.flagControlCompleted`，保持维护者接线。 |
| 有效 Check 输入准备 | 目标 `Definition.checks[…].projectFiles` 声明驱动 → 内部 `InvocationInputLifecycle.prepareCheckInputs(context)` | 在有效选择后、任一 Check 作者函数前取得共享输入，并预结算不可用输入。 | **已确认待启用，保持 Product 管理**：声明字段驱动内部阶段。 |

### 准入 / Scheduler

| 生命周期位置 | 声明路径与函数 | 作用 | 状态与当前承接 |
| --- | --- | --- | --- |
| 调度策略准备 | `Definition.scheduler.admissionPolicy.strategy.prepare(context)` | 基于有效 Scheduler 任务图形成本次 Run 使用的 `decide` 和可选终态动作。 | **公开已有，建议调整时点**：当前读取完整静态任务图。 |
| 单次准入决策 | `simple`：`Definition.scheduler.admissionPolicy.strategy.decide(context)`；`prepared`：`PreparedStrategy.decide(context)` | 在真实准入边界提出 `select` / `wait` 提案。 | **公开已有，建议保留**：两个路径共享提案契约。 |
| Scheduler 终态观察 | `Definition.scheduler.terminalEffects[]` → `SchedulerTerminalEffect(context)` | 按声明顺序消费已封闭的 Scheduler 度量，并单独映射作用函数故障。 | **公开已有，建议改名**：当前路径为 `Definition.scheduler.measurementHooks[]`。 |
| 已准备策略的终态动作 | `PreparedStrategy.terminalEffect(context)` | 在 Scheduler 终态观察后更新策略自己的历史数据或局部状态。 | **公开已有，建议改名**：当前路径为 `PreparedStrategy.complete`。 |
| 已准备策略的资源释放 | `PreparedStrategy.dispose(context)` | 释放 `prepare` 获得且必须清理的局部资源。 | **逻辑保留**：资源消费者与必达调用保证成立时再启用。 |

#### 准入 / Scheduler 的局部能力

| 函数 | 定义或使用路径 | 作用 | 归属 |
| --- | --- | --- | --- |
| 准入状态的检查/转换方法 | `AdmissionPolicyContext.admissionState.*` | 向 `decide` 提供只读检查和假设状态转换。 | 准入状态对象；Scheduler 执行真实转换。 |
| 学习型策略辅助函数 `identityForTask` | `createLearnedCriticalPathStrategy({ identityForTask })` | 为历史数据形成策略自有的 Task 标识。 | 学习型策略辅助函数。 |
| 学习型策略辅助函数 `observe` | `createLearnedCriticalPathStrategy({ observe })` | 记录准备、提案和历史写入等内部事件。 | 学习型策略辅助函数；通用观察函数需要义务等价证据。 |
| Scheduler 运行器内部回调 | 内部 `RunTaskGraphOptions` 与 Scheduler 状态机接线 | 连接状态归约、真实执行、`blocked` / `measurement` 状态与输出。 | Scheduler 内部状态机。 |

### Run 输出

| 生命周期位置 | 声明路径与函数 | 作用 | 状态与当前承接 |
| --- | --- | --- | --- |
| Check 详情展示 | `Definition.outputs.progressRendering.formatter(context)`；调用覆盖为 `Controls.outputs.progressRendering.formatter(context)` | 同步生成受预算限制的进度预览文本。 | **公开已有，建议保留**：Definition 默认值与 Controls 覆盖使用同一契约。 |
| Run 结果观察 | 目标候选 `Definition.runResult.effects[]` → `RunResultEffect(result)` | 在最终聚合事实形成后、返回调用方前只读观察 Run 结果。 | **逻辑保留**：采用前证明 Product 内即时交付价值；调用方在 `await run(...)` 后处理是现有替代路径。 |
| Run 结果决策 | 目标候选 `Definition.runResult.policy` → `resolveRunResult(context)` | 在最终聚合事实形成后决定返回给调用方的 Run 结果。 | **逻辑保留**：以独占槽位表达结果控制权和独立失败语义。 |
| 输出关闭 | 内部 `ProgressRendering.final/close`、`ProgressWriter.close`、`DiagnosticLoggingRouter.close` | 发布并关闭诊断输出和进度写入器。 | **内部已有，保持内部**：由输出归属方接线。 |

### Project Gate

| 生命周期位置 | 声明路径与函数 | 作用 | 状态与当前承接 |
| --- | --- | --- | --- |
| Gate 结果贡献 | 目标候选 `ProjectGateDefinition.resultContributors[]` → `GateResultContributor(context)` | 基于初步 Gate 结果和上下文生成可组合的提示信息或其他结果片段。 | **项目已有，建议拆分**：当前由中央 `GateRunModule.afterGate` 内的性能观察动作追加提示信息。 |
| Gate 结果决策 | 目标候选 `ProjectGateDefinition.resultPolicy` → `resolveResult(context)` | 汇总初步结果和贡献项，决定唯一最终 Gate 状态。 | **项目已有，建议拆分**：当前接线路径为中央 `GateRunModule.afterGate`。 |
| Gate 记录关闭 | 内部 `ProjectGateTranscript.complete(completion)` | 记录并关闭一次 Gate 运行记录。 | **内部已有，保持内部**：由 Gate 适配器接线。 |

## 其他函数的归属

| 函数 | 定义或使用路径 | 类型 | 归属 |
| --- | --- | --- | --- |
| `message` / `omittedMessage` | `presentCheckFindings({ message, omittedMessage })` | 展示映射 | `presentCheckFindings` 辅助函数。 |
| `identify` | `reconcileFindingWaivers({ identify })` | 标识映射 | `reconcileFindingWaivers` 操作。 |
| `compute` / `parse` | `cacheJsonByKey({ compute, parse })` | 缓存操作回调 | 缓存辅助函数的读写状态机。 |
| Gate process-check `environment/fromStdout/parseData/validateDependencyData/recordsFromStdout/successData` | `createProcessCheck*` 的 descriptor、dependency、successData 参数 | Check 构造适配 | Check 执行契约。 |
| 加载器、时钟、写入器工厂与测试回调 | 对应正式构造函数的 dependencies 参数或测试边界 | 依赖注入 | 正式构造归属或测试边界。 |

## 实现范围

| 采用方向 | 主要实现范围 |
| --- | --- |
| Check `preflight` → `prepare`，`execution` → `execute` | Check 定义语法、验证与规范化、公开类型/JSDoc、fingerprint、示例、已安装调用方和测试。 |
| 有效选择的内部边界拆分 | Invocation/check-execution 接口、进度适配器与选择/结算路径测试。 |
| 策略准备调整时点 | 有效任务图、Invocation 到 Scheduler 的交接、早退路径和策略测试。 |
| Scheduler 终态函数改名 | `Definition` 结构校验、规范化、运行器、输出状态/诊断、文档和测试。 |
| Gate 结果贡献/决策拆分 | Gate 定义/绑定、结果构造/验证、性能观察、运行记录、退出映射和测试。 |

进入 Plan 前，按 [`design.md`](./design.md#进入-plan-的条件)关闭使用者、目标名称、调用方式、失败、兼容和验证问题。
