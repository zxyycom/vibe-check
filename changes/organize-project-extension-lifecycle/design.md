# Design

本设计用“逻辑位置 → 实际执行契约”恢复完整生命周期，再为本 Change 触及的现有函数固定可直接实施的名称、接线、顺序、故障和迁移边界。

## Context

### 文档消费契约与权威性

- 本 Change 的直接消费者是后续实施代理和审查代理。它们必须仅凭 `proposal.md`、本文件、`lifecycle-inventory.md` 与 `tasks.md` 判断改什么、按什么顺序改、什么不改以及如何证明完成。
- Change artifacts 拥有本次目标、设计和实施账目；当前事实仍由源码、测试与稳定 owner 文档拥有。完成后，跨领域模型写入 `docs/guides/callbacks.md`，精确行为分别回写对应领域 owner。
- “逻辑位置”只说明职责相对领域事实的阶段。“实际执行契约”才拥有函数路径、上下文、优先级、调用顺序、失败和输出。一个逻辑位置可以映射零个、一个或多个实际契约；时点相近不产生共享插槽。
- `lifecycle-inventory.md` 是形成期的闭合账目。实施时如果源码出现未列入的函数型入口，先按相同分类规则补入清单和任务，再修改实现。

### 当前实现时间线

下表是本 Change 实施前的事实；它不表示目标命名。

| 顺序 | 当前阶段 | 当前接线 | 事实边界 |
| --- | --- | --- | --- |
| 1 | Definition / Controls 验证和规范化 | 无作者回调 | 非法 closed grammar 在任何作者函数前失败。 |
| 2 | pre-work 取消与静态 Task 图验证 | 无终态 measurement context | 早期取消或图失败不运行策略准备、Check 作者函数或终态作用。 |
| 3 | custom strategy 准备 | prepared strategy `prepare` 至多一次 | 当前接收完整静态图；有效图调整由相邻准入 Change 拥有。 |
| 4 | flag 有效选择与未命中结算 | `CheckExecutionLifecycle.flagControlCompleted` | invocation-wide 选择屏障当前混入逐 Check 生命周期接口。 |
| 5 | Scheduler 准入与 Check 工作 | `decide`；Check `preflight` → `execution` | 每个 Check 只有获准入后才运行自己的准备与执行。 |
| 6 | Check 结算 | `CheckExecutionLifecycle.settled` | 每个可执行 Check 只有一个 Product 接受的终态事实。 |
| 7 | Scheduler 终态 | internal summary → `scheduler.measurementHooks[]` | sealed context 一次形成；公开 Hooks 按声明顺序等待且全部获得调用机会。 |
| 8 | prepared strategy 终态 | prepared `complete` | sealed context 存在时在公开 Hooks 后至多一次；与公开 Hooks 共用 output aggregate。 |
| 9 | Run 完成 | progress、aggregate、machine/diagnostic outputs | output failure 遵循 RunResult 的 primary-result 优先级。 |
| 10 | Project Gate 后处理 | project `afterGate` | 当前默认实现只追加性能提示，但类型允许替换完整 `{status,messages}`。 |

### 完整逻辑阶段模型

稳定指南按以下相对顺序保存生命周期位置：

```text
Project 准备
  → 有效选择
  → Product 管理的有效 Check 输入准备 / 预结算
  → 有效 Scheduler 图与准入策略准备
  → Scheduler 准入
      ↳ accepted action 后的内部 measurement observation
      ↳ 每个已准入 Check 的 prepare → execute → settle
  → Scheduler sealed terminal measurement 与 terminal effects
  → Run 结果形成与输出关闭
  → Project Gate 结果贡献 → 内部最终状态 / exit 映射
```

这是一组逻辑位置，不是通用回调流水线。Project 准备、共享 Check 输入和有效图策略准备由已记录的相邻 Change 决定实际契约；本 Change 不重排当前运行时。Scheduler accepted action 后的 collector 依赖私有状态，下一次 `decide` 只读取其冻结 captured prefix，二者也不共享公开 callback context。

### 已确认的相邻方向

- `add-project-change-flags`：Project 在有效选择前形成 change facts。
- `batch-declared-project-file-inputs`：选择后、任一 Check 作者函数前批量取得声明输入；失败只预结算依赖相应来源的有效 Checks。
- `optimize-learned-admission-strategy`：策略最终基于选择后的有效调度机会和图准备。
- 配置组合：依据每个最终槽位的多值有序、唯一、按键合并或根配置拥有规则组合。

这些方向只解释逻辑阶段的采用条件，不授权本 Change 建立其候选路径或实现。

## Goals / Non-Goals

### Goals

1. 让稳定文档完整表达生命周期，同时让实现者不会把逻辑位置误当成公开 API 或单一实际插槽。
2. 让当前实际函数的名称、上下文与权限一致，并把完整迁移范围、调用顺序、失败映射和 fingerprint 规则固定到可执行粒度。
3. 拆开 invocation-wide selection barrier 与逐 Check transition，保留各自内部上下文和消费顺序。
4. 只调整已有实际消费者；未来位置继续由未来 Change 基于真实场景设计。

### Non-Goals

- 不新增通用事件总线、阶段/优先级注册表、运行时插件系统、公开 Check observation、prepared `dispose`、RunResult effect/policy、Gate result policy 或 contributor 数组。
- 不在本 Change 中实现 Project change facts、Project 文件输入屏障、有效 Scheduler 图准备、准入算法优化或配置组合器。
- 不改变 Check 四态结果、Records、aggregation、execution duration、Scheduler measurement payload、machine schema 版本或 Gate exit status vocabulary。
- 不保留旧字段别名、兼容适配器、双读、双写或 deprecation 周期。

## Decisions

### Intended Change

#### 1. 两层模型与共享边界

每个逻辑位置先找事实产生 owner，再按上下文能力、依赖、调用顺序、同步/异步和故障边界划分实际契约，最后只向公开或 Project 函数投影其职责需要的最小冻结输入。只有这些义务全部一致时才复用同一实际契约。

因此，Scheduler action collector 与下一次 `decide` 不共享公开 observer；Scheduler internal summary、公开 terminal effects 与 prepared terminal effect 保持三个有序 participant；Check `started` / `settled` 和 invocation `selectionSettled` 不再共享 lifecycle interface。

#### 2. Check authoring 直接切换

目标公开形状为：

```ts
defineCheck({
  checkId: "example",
  displayName: "Example",
  options: { source: "input" },
  prepare(options, signal): CheckPreparationResult {
    return { status: "success", preparedOptions: options };
  },
  execute(context) {
    return { status: "passed", data: {} };
  }
});
```

固定契约：

- `Check.preflight` → `Check.prepare`；`CheckPreflight` / `CheckPreflightResult` → `CheckPreparation` / `CheckPreparationResult`。结果分支和 `preparedOptions` / `fallback` 字段保持不变。
- `Check.execution` → `Check.execute`。`CheckExecution` 与 `CheckExecutionContext` 保留，因为它们准确描述 execute 所属领域，不是 Hook 名。
- `prepare` 仍在当前 Check 获准入后、`execute` 前至多一次；省略时直接使用 authored options。`block`、throw 或非法结果结算 owning Check 为 `unavailable` 且不调用 `execute`；`continue` 用 canonical frozen fallback 继续。
- 内部文件/类型/变量、JSDoc、诊断事件 `preflight.*`、reason code `preflight-threw` / `invalid-preflight-result` 与 settlement phase `preflight` 同步切换到 `preparation.*`、`preparation-threw` / `invalid-preparation-result` 与 `preparation`。
- closed grammar 只接受 `prepare` / `execute`。旧字段、同时出现新旧字段或陌生字段都使 Definition 验证失败；旧类型 import 在类型检查失败。

#### 3. 内部 lifecycle 按范围拆分

目标内部接线为：

```ts
interface InvocationLifecycle {
  selectionSettled(): void;
}
interface CheckExecutionLifecycle {
  started(fact: CheckStartedFact): void;
  settled(fact: CheckSettledFact): void;
}
```

- `ResolvedCheckExecutionInput` 分别接收 `invocationLifecycle` 与 `checkLifecycle`；execution settlement state 只保存 `checkLifecycle`。
- 所有 flag-control settlements 被 Product 接受后、Scheduler graph run 开始前，同步调用 `selectionSettled()` 一次；未到达该边界时零次。它不等待异步工作且不能改变 selection。
- `started` 在调用 `execute` 前同步投影；被 `prepare` 阻止的 Check 不产生 `started`。`settled` 在 Core 接受唯一终态事实后同步投影，包括 control、dependency、preparation、execution 和 cancellation 结算。
- `ProgressRendering` 暴露独立的 `invocationLifecycle` 与 `checkLifecycle` 私有投影。拆分不改变当前 strategy preparation、selection 或 Check work 的相对顺序，也不增加公开观察函数。

#### 4. Scheduler terminal effects 直接切换

目标公开形状为：

```ts
defineConfig({
  scheduler: {
    terminalEffects: [async (context: SchedulerMeasurementContext) => {}],
    admissionPolicy: {
      kind: "custom",
      strategy: {
        kind: "prepared",
        async prepare() {
          return {
            decide() { return { kind: "wait" }; },
            async terminalEffect(context) {}
          };
        }
      }
    }
  }
});
```

固定契约：

- `Definition.scheduler.measurementHooks[]` → `Definition.scheduler.terminalEffects[]`；`SchedulerMeasurementHook` → `SchedulerTerminalEffect`。`SchedulerMeasurementContext`、measurement DTO 和 collection demand 保留。
- `PreparedCustomAdmissionStrategy.complete` → `terminalEffect`。它仍属于 prepared strategy，不并入 Definition 数组，也不是必达资源释放；没有 sealed context 时不调用。
- sealed context 一次形成后：internal summary 先运行并自行 containment；公开 effects 按声明顺序逐个 `await`，某项 throw/reject 不阻止后续项；随后 prepared effect 至多一次。它们只读冻结事实，不能修改 Scheduler 或 Check 结果。
- `RunOutputStatuses.measurementHooks` → `terminalEffects`，内部 tracker 与 task-engine handoff 同步命名。任一公开或 prepared effect 存在时 enabled；到达 sealed sequence 前为 `not-run`；全部成功为 `succeeded`；任一失败为 `failed`。
- 正常完成分支的 effect failure 产生 `kind: "output"` 与 `scheduler-terminal-effects-failed`。取消、策略准备/决策或其他 primary failure 保持原 result kind，仅由 output status 反映已发生的 effect failure。诊断事件改为 `scheduler.terminal-effect-failed`。
- declarative snapshot 排除 `terminalEffects`，prepared strategy 只保留 declarative `kind`；函数身份、闭包和存在性不进入 fingerprint。

#### 5. Project Gate 收窄为结果贡献

目标 Project 接线为：

```ts
interface ProjectGateResultContributionContext extends ProjectGateContext {
  readonly initialResult: ProjectGateResult;
}
type ProjectGateResultContributor = (
  context: ProjectGateResultContributionContext
) => readonly ProjectGateMessage[] | Promise<readonly ProjectGateMessage[]>;

PROJECT_GATE_RUN_CONFIG.resultContributor = contributeProjectGatePerformanceMessages;
```

固定契约：

- 删除 `ProjectGateAfterHook` 与独立 `afterGate` export。`definition.ts` 的唯一中央配置项是 `PROJECT_GATE_RUN_CONFIG.resultContributor`；candidate-bound `runtime/bound-run.ts` 只投影该函数和 Product `run`。
- adapter 先以 exact candidate 的 Product Run 形成冻结 `initialResult` 与 context，再调用 contributor 至多一次。合法返回值是经 `ProjectGateMessage` closed grammar 验证并冻结的消息数组；adapter 按返回顺序追加到 initial messages，并原样保留 initial status。
- performance contributor 返回当前唯一的一条 advisory / not-comparable 消息；它可读取 initial status、timing、selection、candidate 与 Run facts，但不能返回状态。
- throw/reject 映射为 `unavailable` + `result-contributor-failed`；非数组、非法 message 或 hostile terminal text 映射为 `unavailable` + `result-contributor-invalid-result`。失败不保留未经验证的贡献。
- `createInitialProjectGateResult` 继续唯一映射 Product Run、Definition warnings 与 progress status；`projectGateExitStatus` 继续唯一映射最终状态到 `0/1/2`。不新增 result policy、第二配置来源、数组、优先级或插件发现。

#### 6. 稳定文档结构

`docs/guides/callbacks.md` 保留路径并改为“生命周期位置与函数契约”入口，按以下结构组织：

1. 定义逻辑位置、实际执行契约和当前公开、当前 Project、当前内部、相邻 Change、逻辑保留五种状态。
2. 给出完整逻辑时间线，并明确当前 runtime 与相邻未对齐方向的差异。
3. 按五个领域提供矩阵，列为逻辑位置、状态、实际路径、职责/控制权、调用顺序与故障、精确 owner。
4. 对已启用函数给出代表性用法；逻辑保留项不提供签名或候选路径。
5. 链接 `api-mechanics.md` 与各领域 owner；README、navigation、package mapping 和安装后材料只同步入口描述，不复制精确契约。

### Resulting Impacts

#### 迁移与兼容

这是一次直接切换。一个实施批次必须同时修改公开声明、closed grammar、仓库默认值、Project Gate、tests/fixtures、随包示例、安装后消费者和 changelog。验收包含负向证据：旧字段、旧类型导出、旧 output key 与旧 Gate module field 不再通过对应类型或运行时边界。

#### 当前顺序与相邻 Change

本 Change 不重排现有 strategy preparation 与 effective selection；只在 stable model 中说明最终逻辑位置和相邻 owner。后续相邻 Change 落地时更新稳定指南的状态与当前时间线，但不得复用本 Change 未建立的候选路径。

#### 测试与 Case 证据

首次修改测试前运行 `bun run test-evidence -- check --root .` 建立基线；改名、拆分或合并测试时按语义 Case 保留独立证明价值，完成后再次运行同一检查和最窄目标测试。不能用机械全局替换跳过旧用法负向测试、并发顺序或 primary-result 优先级。

#### 文档影响复核

行为实现后，由未参与实现的代理基于实际 diff 反查用户说明与内部设计 owner。复核结果指出已同步路径、无需修改路径及理由；该语义复核与机械文档检查分别提供证据。

## Risks / Trade-offs

| 风险或取舍 | 控制方式 |
| --- | --- |
| 直接改名会同时破坏源码、测试、示例和安装后消费者。 | 一个实施批次迁移全部盘点路径，并以旧用法负向测试与 external consumer evidence 证明无双名状态。 |
| terminal effect 改名可能误改 measurement facts。 | 保留 `SchedulerMeasurementContext` 与 measurement DTO，只改 consumer/effect、output 和诊断身份。 |
| lifecycle 拆分可能改变 selection 或 progress 时点。 | 保持原调用语句位置，并以零/一次、control settlement 与并发 Check 顺序测试证明。 |
| Gate 收窄可能丢失初步消息或让 contributor 改状态。 | adapter 自己追加经验证贡献并复制 initial status；测试全部 status、existing messages、throw、invalid 与 hostile text。 |
| 逻辑模型可能被误读为路线承诺。 | 每行标注状态；逻辑保留只写职责、消费者缺失和采用条件，不写路径、签名或示例。 |
| 相邻 Change 会改变当前时间线。 | 稳定指南分别标注当前事实与未对齐方向；未来实现由对应 owner 更新。 |

## Open Questions

无。当前函数去向、目标名称、接线、顺序、取消、故障、输出、fingerprint、兼容方式、文档落点与验证出口均已固定；实施中若发现会改变这些选择的新事实，必须先把 Change 退回设计审阅并同步 proposal、design、inventory、tasks 与相关 Decision。
