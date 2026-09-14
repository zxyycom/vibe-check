# Proposal

本 Plan 固定 Product 与 Project Gate 的两层生命周期模型，并据此直接调整当前已经存在的函数、内部接口和稳定说明；没有当前消费者的位置只保留逻辑职责。

## Why

当前可配置函数覆盖 Check 准备与执行、Scheduler 准入、Scheduler 终态作用、进度展示和 Gate 结果贡献。它们在调用时点、上下文、控制权、组合方式和失败映射上各不相同，`Hook` 后缀或相邻时点不能证明它们属于同一执行槽位。

内部 `CheckExecutionLifecycle` 还同时承载调用级选择屏障与逐 Check 状态转换。相邻 Change 将在选择前后增加 Project 准备、共享输入和有效任务图阶段；如果不先区分逻辑位置与实际执行契约，后续实现会继续把不同 owner、优先级和依赖压入同一接口。

既有名称也没有稳定表达权限：Check 的 `preflight` / `execution` 实际承担准备 / 执行，Scheduler `measurementHooks` 与 prepared `complete` 实际构成只读终态作用流水线，Gate `afterGate` 当前只贡献提示消息却可以替换完整结果。需要以当前消费者为依据直接收窄这些契约，而不是为未来完整性增加兼容层或新扩展点。

## Outcome

完成后，软件包使用者和维护者可以从同一份稳定指南恢复完整逻辑生命周期，并能对每个当前实际契约确定其完整路径、专用上下文、调用顺序、控制权、失败映射和 owner。当前 Check、Scheduler 与 Gate 函数使用与其权限一致的名称和边界；逻辑保留位置不会产生公开字段、内部分发或输出状态。

## Scope

### Intended Change

- 在 `docs/guides/callbacks.md` 建立按 Product Check、Project / Invocation、Admission / Scheduler、Run output 和 Project Gate 组织的两层生命周期模型：逻辑位置负责说明阶段与职责，实际执行契约负责说明路径、上下文、顺序和失败。
- 将 Check authoring 字段 `preflight` / `execution` 直接切换为 `prepare` / `execute`，同步公开类型、内部命名、诊断词汇、默认 Checks、示例和调用方；不提供旧名别名或双读。
- 将 invocation-wide selection barrier 从逐 Check 生命周期接口中拆出；`InvocationLifecycle.selectionSettled` 与 `CheckExecutionLifecycle.started` / `settled` 使用独立内部接线，不改变本 Change 之外的阶段顺序。
- 将 `Definition.scheduler.measurementHooks[]`、`SchedulerMeasurementHook`、`PreparedCustomAdmissionStrategy.complete` 和 `outputs.measurementHooks` 直接切换为 `terminalEffects[]`、`SchedulerTerminalEffect`、`terminalEffect` 和 `outputs.terminalEffects`；保留 sealed measurement context、内部摘要优先、公开数组顺序等待、全部获得调用机会、prepared 作用最后运行及主结果优先级。
- 将 Project Gate 当前唯一的 `afterGate` 收窄为 `PROJECT_GATE_RUN_CONFIG.resultContributor`：它只返回消息贡献，不能改变初步状态；Gate adapter 验证贡献、追加消息并对 throw 或非法返回 fail closed。最终状态继续由内部 Run-result 映射与 exit 映射拥有，不新增 `resultPolicy`、数组注册或插件入口。
- 保持当前 declarative fingerprint 的语义边界：运行时函数及其存在性不进入 snapshot；改名后的等价 Definition 继续产生既有声明式 fingerprint。

### Resulting Impacts

- 软件包根导出、Definition closed grammar、规范化结构、Check 执行模块、Scheduler engine 接线、Run output 状态与稳定 diagnostic/event code 需要同步切换；仓库内旧字段必须在类型或运行时验证边界明确失败。
- 随包默认 Checks、Project Gate、测试支持、machine example、外部消费者 fixture、README、changelog、API 生成材料及领域 owner 文档必须在同一实施批次迁移。
- Scheduler 终态作用仍共享一个 output participant；任一公开 terminal effect 或 prepared terminal effect 失败时，`outputs.terminalEffects.status` 为 `failed`，正常完成分支映射为 `kind: "output"` 与 `scheduler-terminal-effects-failed`，已有 primary failure 不被覆盖。
- Gate contributor 失败或返回非法消息列表时，最终 Gate 结果为 `unavailable`；合法贡献只追加到初步消息，不能改变初步 `status`。
- `add-project-change-flags`、`batch-declared-project-file-inputs`、`optimize-learned-admission-strategy` 和配置组合 Change 继续拥有各自未来运行时调整；本 Change 只在稳定模型中保留其逻辑位置和采用条件。

## Success Criteria

- `docs/guides/callbacks.md` 覆盖所有逻辑位置，并明确区分当前公开、当前 Project、当前内部、相邻 Change 拥有和逻辑保留；只有当前实际契约具有可调用路径与签名。
- `lifecycle-inventory.md` 中每个当前函数都能反向映射到唯一职责和最终去向；完整 API/内部接线、顺序、取消、失败、输出和 fingerprint 契约与 `design.md` 一致。
- 旧的 `preflight`、`execution`、`measurementHooks`、prepared `complete` 与 Gate `afterGate` 用法不再被当前 authoring/runtime 接受；新名称覆盖根导出、默认 Checks、Project Gate、示例和安装后消费者。
- 目标测试证明 Check 调用次数与 task-local 顺序、选择屏障拆分、Scheduler 终态顺序与全部调用、取消/无 sealed context、输出失败优先级、Gate 贡献验证及 fingerprint 不变性。
- 用户说明、内部 owner 文档、长期 Decision、changelog 和包材料同步；非实施代理基于实际产品 diff 完成行为文档影响反查。
- `bun run test-evidence -- check --root .`、目标测试、`bun run decisions -- check`、`bun run change-plan -- check changes/organize-project-extension-lifecycle`、`bun run validate` 与 `bun run check` 通过。

## Affected Owners

- 稳定生命周期入口：`docs/guides/callbacks.md`；当前 Run 时间线与精确公开语义：`docs/api-mechanics.md`、`docs/development/project-definition.md`、`docs/development/project-run.md`、`docs/development/scheduler.md`、`docs/development/human-output.md`。
- Product runtime：`src/check/**`、`src/project-definition/**`、`src/project-run/**`、`src/package-checks/**`、`src/package-tools/**` 与 `src/index.ts`。
- Project Gate：`scripts/project/gate/definition.ts`、`scripts/project/gate/run.ts`、`scripts/project/gate/runtime/**`、Gate Checks 与相邻测试。
- 发布与消费者材料：`README.md`、`CHANGELOG.md`、`docs/package-documents.json`、machine examples、package API 材料及 `scripts/package/candidate/external-consumer/**`。
- 长期判断：Check 准备/执行命名、Check 观察位置、Scheduler terminal effects 与 Gate result contribution 的活动 Decision。
