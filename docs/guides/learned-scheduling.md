# 用本地时长历史调度 Check

希望同一项目后续运行时依据历史时长选择 ready Check，可以用 `createLearnedCriticalPathStrategy` 创建策略，接入 `scheduler.admissionPolicy`。你提供本地状态目录和可比较任务的 identity，策略据此估计时长；下文说明配置、history 不可用时的退化与观察方式。通用 prepared strategy 的调用顺序与失败边界见[调度专题](scheduling.md#已准备的-custom-strategy)。

## learned critical-path strategy

```ts
import {
  createLearnedCriticalPathStrategy,
  defineCheck,
  defineConfig,
  run
} from "@zxyycom/vibe-check";

function scheduledCheck(checkId: string) {
  return defineCheck({
    checkId,
    displayName: checkId,
    execution: () => ({ status: "passed" as const, data: {} })
  });
}

// 调用方选择不与其它 Run 共用的绝对目录，并负责后续清理；不会从 projectRoot 解析。
const stateDirectory = `/tmp/vibe-check-learned-history-${Date.now()}-${Math.random()}`;
const strategy = createLearnedCriticalPathStrategy({
  stateDirectory,
  identityForTask: (task) => ({
    taskId: task.taskId,
    // 在调用方的 key 中保留所有影响时长可比性的因素。
    implementationVersion: "example-v1"
  }),
  observe(event) {
    // 这是调用方尽力而为的观察点，不是 Product diagnostic channel。
    if (event.kind === "history-unavailable") console.warn(event.reason);
  }
});
const definition = defineConfig({
  checks: [scheduledCheck("first"), scheduledCheck("second")],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  },
  scheduler: {
    admissionPolicy: { kind: "custom", strategy },
    maxParallel: 1
  }
});

const first = await run(definition);
const second = await run(definition);
if (first.kind !== "completed" || second.kind !== "completed") {
  throw new Error("Expected both learned strategy Runs to complete");
}
```

## 配置 history 与任务 identity

`stateDirectory` 必须是调用方提供的非空 absolute、可写且可删除的目录；helper 不从 effective
`projectRoot` 解析它。它是调用方信任的本地性能状态，不是 filesystem sandbox、secret storage、remote cache 或跨进程锁；
调用方负责 retention 和清理。history identity 虽会被 hash 成文件关联所用的 digest，digest 不是保密机制：不得把 secret、token
或低熵敏感输入放进 identity。`identityForTask(task)` 必须返回 canonical-JSON-compatible identity，并显式包含所有会改变
时长可比性的 options、flags、环境或实现版本；helper 不读取 normalized Check options、Run flags 或 `projectRoot` 来补全它。

`sampleWindow` 的范围是 1–32（默认 32），`maxHistorySeries` 是 1–4096（默认 4096），`coldStartDurationMs` 必须为正有限数（默认 1）；
这些 model knobs 会进入 helper 生成的 history key。非 absolute/空 `stateDirectory` 或非法 model knob 会在 factory 创建时 throw；
这类 authoring/configuration error 不属于一次 Run 的 optimization 退化。

## 退化与观察

首次运行、缺失、损坏、不兼容或 read-failed history
会被当作空 history：已有 learned estimate 的同一 Run 可为未知 Task 提供 project prior，否则使用 cold start。identity 无效、无法
完成 setup/prediction/critical-path preparation 时，策略退化为普通 static decision，并以 `history-unavailable` 报告；record/write
失败只影响后续 Run 的 history，并以 `recording-unavailable` 报告。上述 history 退化均不改变本次 Task membership、Check facts、
aggregate、machine output 或质量结算。

每个策略选择的 `select` proposal 会产生带 task ID、estimate、critical-path score、sample count 和 source 的
`selection-proposed` event；它不确认 Task 已实际 admission。observer 是 caller-owned best-effort callback：同步 throw 或 rejected
Promise 会被忽略，返回的 Promise 不会被 await，因此 callback 可以在 `run(...)` 返回后继续，Run 完成也不证明 observation sink
已完成。通过 `observe` 接收 helper 事件，通过 `stateDirectory` 保存 history；需要持久化事件时，由调用方管理自己的 sink。
这些 helper 状态独立于 Product 的 diagnostic channels、output statuses、Check facts、machine output 和 `RunResult`。

策略通过每次 decision 的 measurement context 工作，只在既有 selection layer 比较 score；Scheduler 仍重检[准入约束](scheduling.md)。实际运行成本取决于 graph、history 和 observer，应在目标 workload 上测量；history 优化不代表 [Run 或 Check 质量通过](../api-mechanics.md#runresult-分支)。
