# 按项目约束调度 Check

返回 [README](../../README.md)。本专题面向已经有多个自定义 Check、且确实需要改变 ready task 的选择顺序或分析假设调度分支的调用方。默认 `{ kind: "static" }` 已经遵守依赖、mutex、并行预算和取消；只有这些不变式之外的**选择偏好**需要项目规则时，才使用 custom 或 learned policy。Check 自己的 options、preflight、execution 与取消处理见[编写自定义 Check](extending-check-lifecycle.md)。

## 选择正确的工具

| 目标 | 使用 | 不适用的情况 |
| --- | --- | --- |
| 只指定静态相对顺序 | Check 的 `admissionPriority` | 它不能越过依赖、mutex、容量或取消 guard。 |
| 每次 ready selection 根据当前事实选择一个 task | `scheduler.admissionPolicy` 的 `custom/simple` strategy | 不要用它启动、取消、结算 task 或绕过硬约束。 |
| 先异步准备本 Run 专用决策 closure，或在终态 measurement 后收尾 | `custom/prepared` strategy | 不是普通 Check lifecycle hook，也不能改写已 sealed 的结果。 |
| 对独立静态图比较假设分支 | `createAdmissionGraph(...)` | 它不运行 Check，也不影响真实 Run。 |
| 多次运行后按本地时长历史改善选择 | `learned-critical-path` | 不是可靠的时长承诺、remote cache 或锁服务。 |
| Run 结束后保存项目自己的调度统计 | `scheduler.measurementHooks` | 它不是每个 Task 的 event stream，也不改变选择。 |

## 自定义准入 policy

`decide(context)` 读取 frozen 的 graph、候选和 immutable `admissionState`，只返回 `{ kind: "select", taskId }` 或 `{ kind: "wait" }`。Scheduler 独占 readiness、mutex、容量、Task 启动与结算；策略只能提出 proposal，不能保证 proposal 会被接受。

```ts
import { defineAdmissionPolicy, defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

const executionOrder: string[] = [];

const compile = defineCheck({
  checkId: "compile",
  displayName: "Compile",
  execution() {
    executionOrder.push("compile");
    return { status: "passed", data: {} };
  }
});

const publish = defineCheck({
  admissionPriority: 10,
  checkId: "publish",
  dependsOn: [compile.checkId],
  displayName: "Publish",
  execution() {
    executionOrder.push("publish");
    return { status: "passed", data: {} };
  }
});

const preferPublish = defineAdmissionPolicy({
  kind: "custom",
  strategy: {
    kind: "simple",
    decide(context) {
      const publishTask = context.graph.tasks.find((task) => task.taskId === publish.checkId);
      const publishCandidate = context.candidates.find(
        (candidate) => candidate.taskId === publish.checkId && candidate.canAdmit
      );
      if (publishTask?.admissionPriority === 10 && publishCandidate !== undefined) {
        return { kind: "select", taskId: publishCandidate.taskId };
      }

      const nextCandidate = context.candidates.find((candidate) => candidate.canAdmit);
      return nextCandidate === undefined
        ? { kind: "wait" }
        : { kind: "select", taskId: nextCandidate.taskId };
    }
  }
});

const definition = defineConfig({
  checks: [compile, publish],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  },
  scheduler: {
    admissionPolicy: preferPublish,
    maxParallel: 1
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
if (executionOrder.join(",") !== "compile,publish") {
  throw new Error(`Unexpected execution order: ${executionOrder.join(",")}`);
}
```

`decide` 必须同步且给出合法、可 drain 的 proposal。throw、thenable、malformed/illegal proposal 或不可 drain 的 `wait` 会产生 `admission-policy-failed`：Scheduler 停止新的 admission、取消 pending work 并等待已启动 work。这个 invocation failure 不是任一 Check outcome。

### 在线选择时读取 observation prefix

custom `decide(context)` 还可读取 `context.measurement`，它是当前 decision boundary 已冻结的**前缀**，不是注册另一个 hook：

- `cumulative` 提供当前累计的离散计数、peaks 和 timing availability；只有 `timing.availability === "available"` 才有 `timingFacts`。
- `measurementCount` 是当前已捕获 action observation 的数量。
- `measurementAt(index)` 只读取这个 context 冻结的 prefix；`0 <= index < measurementCount` 之外返回 `undefined`。每项说明上一次 accepted `select` 或 `wait` 后的 effects 与 interval，不声明某个 action 导致了时长、critical path 或 CPU 使用。

用它在**在线选择**时比较当前累计事实；不要把它当作完整逐 Task 历史或终态报告。需要 Run 结束后的完整 graph、settled tasks 与 raw measurement，改用下面的 `scheduler.measurementHooks`；prepared strategy 的 `complete` 同样只在有 terminal measurement 时运行。

## 模拟 AdmissionGraph

`createAdmissionGraph({ graph, maxParallel })` 用于测试或比较静态图的假设分支。保留一个 predecessor state，并从它的 successor 分别选择或结算，即可得到彼此独立的分支。

```ts
import { createAdmissionGraph } from "@zxyycom/vibe-check";

const graph = createAdmissionGraph({
  graph: {
    scopes: [],
    tasks: [
      {
        admissionPriority: 0,
        dependsOn: [],
        mutex: [],
        observes: [],
        scopeId: null,
        taskId: "compile"
      },
      {
        admissionPriority: 0,
        dependsOn: ["compile"],
        mutex: [],
        observes: [],
        scopeId: null,
        taskId: "publish"
      }
    ]
  },
  maxParallel: 1
});

const initial = graph.initialState();
const compile = initial.select("compile");
if (!compile.accepted) throw new Error(`Cannot select compile: ${compile.reason.kind}`);

// Retaining `initial` and the successor forms two independent hypothetical branches.
const completed = compile.state.settle("compile", "satisfied");
if (!completed.accepted || !completed.state.catalog.selectableTaskIds.includes("publish")) {
  throw new Error("Expected publish to become selectable after hypothetical completion");
}
```

它只表达 immutable hypothetical admission state：没有 Task、Promise、signal、reservation、真实执行结果或 effect stream，也不会写回 Run。`select` / `settle` 返回 successor，原 state 不变。

## 已准备的 custom strategy

需要异步读取调用方自己的配置并形成本 Run 专用 closure 时，使用 `{ kind: "prepared", prepare }`。`prepare({ graph })` 每个 graph-ready Run 最多调用一次；它返回同步 `decide` 和可选 `complete(terminal)`。`complete` 在 Scheduler seal terminal context、generic measurement hooks 已结算后至多运行一次。

```ts
import { defineAdmissionPolicy, defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

type SchedulerSample = Readonly<{ readonly preferredTaskId: string }>;
const history: SchedulerSample[] = [];
const executionOrder: string[] = [];
const terminalEvents: string[] = [];

function scheduledCheck(checkId: string) {
  return defineCheck({
    checkId,
    displayName: checkId,
    execution() {
      executionOrder.push(checkId);
      return { status: "passed" as const, data: {} };
    }
  });
}

const first = scheduledCheck("first");
const second = scheduledCheck("second");
const strategy = defineAdmissionPolicy({
  kind: "custom",
  strategy: {
    kind: "prepared",
    async prepare({ graph }) {
      const previous = history.at(-1) ?? null;
      const taskIds = new Set(graph.tasks.map((task) => task.taskId));
      await Promise.resolve();
      return {
        decide(context) {
          const preferred = previous?.preferredTaskId;
          const preferredCandidate = context.candidates.find(
            ({ canAdmit, taskId }) => canAdmit && taskId === preferred && taskIds.has(taskId)
          );
          const next = preferredCandidate ?? context.candidates.find(({ canAdmit }) => canAdmit);
          return next === undefined
            ? { kind: "wait" as const }
            : { kind: "select" as const, taskId: next.taskId };
        },
        complete(terminal) {
          const completeTasks = terminal.execution.settledTasks.every(
            ({ kind }) => kind === "completed"
          );
          const timing = terminal.rawMeasurement.timing;
          if (
            timing.availability === "available" &&
            terminal.execution.admittedTaskIds.length === terminal.execution.settledTasks.length &&
            completeTasks &&
            terminal.rawMeasurement.discrete.lastSettledTaskId !== null
          ) {
            history.push({ preferredTaskId: terminal.rawMeasurement.discrete.lastSettledTaskId });
          }
          terminalEvents.push("complete");
        }
      };
    }
  }
});

const definition = defineConfig({
  checks: [first, second],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  },
  scheduler: {
    admissionPolicy: strategy,
    measurementHooks: [
      (terminal) => {
        if (terminal.execution.settledTasks.length !== 2) {
          throw new Error("Expected a terminal measurement for both Checks");
        }
        terminalEvents.push("generic");
      }
    ]
  }
});

const firstRun = await run(definition);
const secondRun = await run(definition);
if (firstRun.kind !== "completed" || secondRun.kind !== "completed") {
  throw new Error("Expected both Runs to complete");
}
if (history.length !== 2 || history[0]?.preferredTaskId !== "second") {
  throw new Error("Expected the first terminal measurement to seed caller-owned history");
}
if (executionOrder.join(",") !== "first,second,second,first") {
  throw new Error(`Unexpected execution order: ${executionOrder.join(",")}`);
}
if (terminalEvents.join(",") !== "generic,complete,generic,complete") {
  throw new Error("Expected generic hooks before prepared completion on both Runs");
}
```

`prepare` 失败会在 Scheduler 启动前使 Run 成为 `admission-strategy-preparation-failed`。`complete` throw/reject 会让 `outputs.measurementHooks.status` 为 failed，但不能改变已 sealed 的 primary Check facts 或 aggregate。将调用方自己的 capability 捕获在 closure 中；不要期待 context 暴露 Product 的 state、logger、clock 或真实 Task control。

### 观察终态 measurement

任何 scheduler policy 都可配置 `scheduler.measurementHooks`。每个 hook 在 Scheduler 已有 terminal measurement 后收到冻结的 `{ graph, execution, rawMeasurement }`；它适合调用方自己的统计、记录或后续处理，不能修改 Task、Check facts、aggregate 或选择历史。上方 runnable example 同时配置了 generic hook 和 prepared `complete`：generic hooks 先结算，随后才调用 `complete`。如果任一 hook 抛错或 reject，`result.outputs.measurementHooks.status` 为 `failed`；Check facts 不变，原本正常完成的 Run 可映射为 `kind: "output"`，已有 `cancelled` / `execution` 主结果保持不变。

三种 measurement 入口服务不同阶段：`decide(context)` 中的 `context.measurement` 只读在线 action-observation prefix；`scheduler.measurementHooks` 消费每个有 terminal measurement 的 Run；prepared strategy 的 `complete` 在同一终态 measurement、且 generic hooks 都结算后处理调用方在 `prepare` 时捕获的 Run-local state。不要把任一入口当成每 task event stream、执行前 hook 或 Check callback。它们没有 Task data、errors、Records、可变 engine、logger 或时钟 capability；需要逐项规则事实时，在 Check 的 `execution` 中用 final data / Records 表达。

`prepare` 只在 graph 已有效且 Run 尚未于 pre-work / planning 取消后调用；它没有 cancellation signal、timeout 或“必有 complete”的 cleanup 保证。prepare reject 会结束为 `admission-strategy-preparation-failed`。一旦 Run 进入 Scheduler，正常结束、取消或 policy fault 的 drain 只要 seal 出 terminal measurement，都会在 generic hooks 后调用 `complete`；早期 setup / execution failure 没有 terminal measurement 时不会调用它。因此不要在 `prepare` 中取得必须依赖 `complete` 释放的资源。

保存后续 Run 会使用的 caller-owned data 时，先根据自己的目标定义“可接受样本”。`rawMeasurement.timing.availability === "available"` 只证明终态 timing facts 可读，不证明 Run quality 成功；`settledTasks.kind === "completed"` 是 Scheduler settlement，不等于 Check `passed`，且 context 不提供 `RunResult.kind`。示例采取保守的“所有任务都被 admitted 且以 `completed` settlement 结束”筛选，只用于避免保存明显不完整的调度样本；若业务只允许成功 Run，先暂存候选，在 `run(...)` 返回后同时核对 `result.kind` 与业务要求的 Check outcomes 或 aggregate，再决定是否提交。`kind: "completed"` 本身不表示质量检查全部通过。

## learned-critical-path 准入 policy

当同一项目反复运行、且本地目录可以保存调用方拥有的非敏感性能状态时，设置：

```ts
import { defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

const executionOrder: string[] = [];

function delayedCheck(checkId: string, delayMs: number) {
  return defineCheck({
    checkId,
    displayName: checkId,
    async execution() {
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
      executionOrder.push(checkId);
      return { status: "passed" as const, data: {} };
    }
  });
}

// 以明显高于常见本地计时抖动的时长差演示 learned 排序。
const fast = delayedCheck("fast", 0);
const slow = delayedCheck("slow", 250);
const definition = defineConfig({
  checks: [fast, slow],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  },
  scheduler: {
    admissionPolicy: {
      kind: "learned-critical-path",
      // 调用方拥有的本地目录相对 effective projectRoot 解析。
      stateDirectory: ".vibe-check/scheduler-history"
    },
    maxParallel: 1
  }
});

const first = await run(definition);
const second = await run(definition);
if (first.kind !== "completed" || second.kind !== "completed") {
  throw new Error("Expected both learned-scheduling Runs to complete");
}
if (executionOrder.join(",") !== "fast,slow,slow,fast") {
  throw new Error(`Unexpected learned scheduling order: ${executionOrder.join(",")}`);
}
```

首次 Run 没有 history 也可完成；缺失、损坏或读写失败的 state 会回退为 static selection 或 cold/project-prior model，不改变本次质量结算。`stateDirectory` 相对本次 effective `projectRoot` 解析；调用方负责选择可写、可删除的目录、容量和清理。它不是 sandbox、secret storage、remote cache 或跨进程锁，也不把 history 写入 Check facts、machine output 或 `RunResult`。

完整可运行例子在 `docs/examples/package-api/learned-critical-path.ts`；它刻意使用延迟制造可观察排序，只适合作为示例，不应复制为生产计时模型。该策略只在既有 Scheduler selection layer 比较 score，不能越过依赖、mutex、parallel budget 或 cancellation guard。

## 下一步

需要解释 Run lifecycle、dependency data、aggregation 或 outputs 的通用模型时，阅读 [API 机制](../api-mechanics.md)；需要实现 Check 规则本身时，回到[编写自定义 Check](extending-check-lifecycle.md)。
