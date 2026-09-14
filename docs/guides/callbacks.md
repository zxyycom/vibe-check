# 生命周期位置与函数契约

本页用“逻辑位置 → 实际执行契约”定位 Vibe Check 的扩展点。逻辑位置只说明某项职责相对领域事实发生的阶段；实际执行契约才定义路径、输入、调用次数、顺序、控制权和失败。相邻时点不表示共享 Hook。

状态标记为：**当前公开**（package API）、**当前 Project**（Project Gate 自有）、**当前内部**（运行时私有）、**相邻 Change**（已有 owner、尚未接线）或**逻辑保留**（没有当前消费者）。只有当前实际契约给出可调用路径和签名。

## 当前时间线

```text
Definition / Controls validation
→ effective flag selection
→ static graph and admission-strategy preparation
→ Scheduler admission
  → admitted Check: prepare → execute → settle
→ sealed Scheduler measurement
  → internal summary → terminalEffects[] → prepared terminalEffect
→ Run result and output closure
→ Project Gate initial result → resultContributor → exit/transcript
```

早期取消、无效图和策略准备失败不会形成 sealed terminal measurement。Check `prepare` 只在该 Check 获准入后运行；它不是 invocation-wide hook。

## Product Check

| 逻辑位置 | 状态与路径 | 职责、顺序与失败 | owner |
| --- | --- | --- | --- |
| 单项 options 准备 | **当前公开**：`Definition.checks[].prepare`，`CheckPreparation` | admitted Check 至多一次、早于 `execute`；block、throw 或非法结果只将该 Check 结算为 unavailable。 | [自定义 Check](extending-check-lifecycle.md) |
| 开始执行 | **当前内部**：`CheckExecutionLifecycle.started` | prepare 成功后、execute 前同步投影；不能控制结果。 | Product Run |
| 领域执行 | **当前公开**：`Definition.checks[].execute` | 形成本 Check result、messages 与 Records。 | [自定义 Check](extending-check-lifecycle.md) |
| 单项结算 | **当前内部**：`CheckExecutionLifecycle.settled` | Core 接受唯一终态事实后同步一次，覆盖 control、dependency、preparation、execution 和取消。 | Product result model |

```ts
const check = defineCheck({
  checkId: "license-policy",
  displayName: "License policy",
  options: { denied: ["GPL-3.0-only"] },
  prepare(options) {
    return { status: "success", preparedOptions: options };
  },
  execute({ options }) {
    return { status: "passed", data: { deniedCount: options.denied.length } };
  }
});
```

## Project / invocation

| 逻辑位置 | 状态与路径 | 职责、顺序与失败 | owner |
| --- | --- | --- | --- |
| Project facts 准备 | **相邻 Change** | `add-project-change-flags` 拥有选择前 Project facts；本 Change 不建立 callback。 | Project Definition owner |
| 有效选择完成 | **当前内部**：`InvocationLifecycle.selectionSettled()` | 所有 flag-control settlements 被接受后、Scheduler graph run 前一次；与逐 Check 生命周期分离。 | Project Run owner |
| 批量有效输入准备 | **相邻 Change** | `batch-declared-project-file-inputs` 拥有选择后的输入屏障。 | Project Run owner |

## Admission / Scheduler

| 逻辑位置 | 状态与路径 | 职责、顺序与失败 | owner |
| --- | --- | --- | --- |
| 策略准备 | **当前公开**：prepared strategy `prepare(context)` | static graph 有效后至多一次，返回 `decide` 和可选 `terminalEffect`。 | [调度 Check](scheduling.md) |
| 准入决策 | **当前公开**：simple/prepared `.decide(context)` | 每个 decision boundary 同步提出 select/wait；Scheduler 验证并转换状态。 | Scheduler |
| accepted action 测量 | **当前内部**：private collector | accepted transition 后记录，下一次 decide 只读取冻结 prefix。 | Scheduler owner |
| 终态摘要 | **当前内部**：summary participant | sealed context 后最先运行并自行 contain writer failure。 | Scheduler owner |
| 终态作用 | **当前公开**：`scheduler.terminalEffects[]` | internal summary 后依声明顺序 await；任一失败不阻止后续作用。 | [调度 Check](scheduling.md) |
| prepared 策略终态作用 | **当前公开**：prepared `terminalEffect` | public effects 后、sealed context 存在时至多一次；与数组共享 `outputs.terminalEffects`。 | Scheduler owner |
| 必达资源释放 | **逻辑保留** | 没有当前公开消费者；terminalEffect 不是 `finally`。 | future Change |

terminal effect 可读取冻结 `SchedulerMeasurementContext`，不能修改 Scheduler 或 Check 结果。任一公开或 prepared effect 失败会使 `outputs.terminalEffects` 为 failed；正常 completed Run 映射为 `kind: "output"` / `scheduler-terminal-effects-failed`，取消或其它 primary failure 保持原结果。

## Run output

| 逻辑位置 | 状态与路径 | 职责、顺序与失败 | owner |
| --- | --- | --- | --- |
| Check preview | **当前公开**：`outputs.progressRendering.formatter` | 只格式化受预算限制的显示文本。 | [Run outputs](run-outputs.md) |
| terminal-effect readback | **当前公开**：`RunResult.outputs.terminalEffects` | 汇总 Definition effects 与 prepared effect；Controls 不能注入。 | Run output owner |
| Run result handling / policy | **逻辑保留** | 调用方在 `await run(...)` 后自行处理；Product 未提供内部 policy hook。 | future Change |

## Project Gate

| 逻辑位置 | 状态与路径 | 职责、顺序与失败 | owner |
| --- | --- | --- | --- |
| Gate 结果贡献 | **当前 Project**：`PROJECT_GATE_RUN_CONFIG.resultContributor(context)` | exact candidate Run 形成 `initialResult` 后至多一次；只能返回已验证 message list。 | Project Gate |
| Gate 结果决定 | **当前内部**：initial result → contribution → exit mapper | adapter 追加 messages、原样保留 initial status；throw 或非法列表为 unavailable。 | Project Gate owner |
| transcript 完成 | **当前内部**：`ProjectGateTranscript.complete` | final result 与 exit 已确定后写入一次；失败 fail closed。 | Project Gate owner |

`resultContributor` 不是 package API、插件系统或完整结果 transform。它能读 `initialResult`、selection、candidate、timing 与 Run facts，但不能重写 status。

## 精确契约

- Check authoring、取消、reason 和 callback context： [自定义 Check](extending-check-lifecycle.md)。
- Definition validation、closed grammar 和 fingerprint：Project Definition owner（工作区维护材料）。
- Scheduler measurement、策略及 output priority： [调度 Check](scheduling.md) 与 [Run outputs](run-outputs.md)。
- Gate candidate binding、result contribution、exit 与 transcript：Project Gate owner（工作区维护材料）。
