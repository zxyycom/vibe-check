# 按项目约束调度 Check

本专题面向已经有多个自定义 Check、需要表达并发约束、改变 ready task 的选择顺序或分析假设调度分支的调用方。默认 `{ kind: "static" }` 已经遵守依赖、mutex、root/scoped 并行预算、named resource capacity 和取消；只有这些不变式之外的**选择偏好**需要项目规则时，才使用 custom policy（包括 learned helper 返回的 prepared strategy）。Check 自己的 options、preflight、execution 与取消处理见[编写自定义 Check](extending-check-lifecycle.md)。

## 选择正确的工具

| 目标 | 使用 | 作用边界 |
| --- | --- | --- |
| 让一组 Task 互斥执行 | 在每个相关 Check 的 `mutex` 写入同一个名称 | 同一互斥名称下，同一时刻最多运行一个 Task。 |
| 为可计数共享资源声明并发容量 | `scheduler.resourceCapacities` 与 Check 的 `resourceClaims` | capacity 与 claim 都是本次 Run 的静态 units。 |
| 只指定静态相对顺序 | Check 的 `admissionPriority` | 在 Scheduler 的 relation、mutex、容量和取消约束内排序 ready Task。 |
| 每次 ready selection 根据当前事实选择一个 task | `scheduler.admissionPolicy` 的 `custom/simple` strategy | 向 Scheduler 提交一个 selection proposal。 |
| 先异步准备本 Run 专用决策 closure，或在终态 measurement 后收尾 | `custom/prepared` strategy | `prepare` 形成 Run-local closure，`complete` 消费 terminal measurement。 |
| 对独立静态图比较假设分支 | `createAdmissionGraph(...)` | 创建 immutable simulation，并从 predecessor 派生独立 successor。 |
| 多次运行后按本地时长历史改善选择 | `createLearnedCriticalPathStrategy(...)` 作为 `custom/prepared` strategy | 使用调用方管理的本地 history 形成选择偏好。 |
| Run 结束后保存项目自己的调度统计 | `scheduler.measurementHooks` | 接收冻结的 terminal measurement 作为 side effect 输入。 |

## 限制 named resource 并发

`scheduler.maxParallel` 限制同时运行的 Check 总数。用 `mutex` 为需要互斥执行的 Task 声明同一个逻辑组名称；同一互斥名称下，同一时刻最多运行一个 Task。需要为同一种可计数资源声明容量、并让不同 Check 消耗不同 units 时，使用静态 named resource capacity：

```ts
import { defineCheck, defineConfig } from "@zxyycom/vibe-check";

const firstAudit = defineCheck({
  checkId: "first-audit",
  displayName: "First audit",
  mutex: ["exclusive-audit"],
  resourceClaims: { worker: 1, capacityUnits: 2 },
  execution: () => ({ status: "passed", data: {} })
});

const secondAudit = defineCheck({
  checkId: "second-audit",
  displayName: "Second audit",
  mutex: ["exclusive-audit"],
  execution: () => ({ status: "passed", data: {} })
});

export default defineConfig({
  checks: [firstAudit, secondAudit],
  scheduler: {
    maxParallel: 4,
    resourceCapacities: { worker: 2, capacityUnits: 8 }
  }
});
```

两个 Check 共享 `exclusive-audit`，因此同一时刻最多运行其中一个；它们仍可分别声明不同的 resource claims。resource ID 必须是非空白字符串，capacity 和 claim 都必须是正 safe integer。每个 claim 必须引用已声明资源且不大于其总 capacity，否则 Definition 在任何 Check work 前失败。一个 Task 的全部 claims 在 admission 时原子取得，并在任意 settlement（成功、失败或其它终态）后一起释放；Scheduler 不会先占一部分再等待另一部分。同一 ordinary selection layer 中，没有 claim 的 ready work 仍可使用空闲 root slot，不会因为另一个 Task 正等待 named resource 而被扣留；既有 tighter-scope activation/continuation 层级仍先于 ordinary work。

`resourceClaims` 与 `maxParallel`、relations 和 mutex 一样可写在 container 上供 descendants 继承；省略保留最近的完整 mapping，显式 `{}` 清空，任何其它显式 mapping 都完整替换而不与父 mapping 合并。named resources 是 invocation-local 静态计数；`mutex` 表达逻辑组互斥，`resourceClaims` 表达 units 容量，两者可以按项目约束组合。

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
    resourceCapacities: [{ resourceId: "browser", units: 1 }],
    scopes: [],
    tasks: [
      {
        admissionPriority: 0,
        dependsOn: [],
        mutex: [],
        observes: [],
        resourceClaims: [{ resourceId: "browser", units: 1 }],
        scopeId: null,
        taskId: "compile"
      },
      {
        admissionPriority: 0,
        dependsOn: ["compile"],
        mutex: [],
        observes: [],
        resourceClaims: [],
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

需要在 Scheduler 开始前异步读取调用方自己的配置，并把结果形成本 Run 专用 decision closure 时，使用 `{ kind: "prepared", prepare }`。每个 graph-ready Run 最多调用一次 `prepare`；它返回同步 `decide` 和可选的 `complete(terminal)`。下例选择第一个可准入候选，并在可用 timing 下保存一次终态计数：

```ts
import { defineAdmissionPolicy, defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

let settledTaskCount: number | null = null;

function scheduledCheck(checkId: string) {
  return defineCheck({
    checkId,
    displayName: checkId,
    execution: () => ({ status: "passed" as const, data: {} })
  });
}

const strategy = defineAdmissionPolicy({
  kind: "custom",
  strategy: {
    kind: "prepared",
    async prepare() {
      // 模拟异步读取调用方自己的配置，并将其捕获在本 Run 的 closure 中。
      const preferredTaskId = await Promise.resolve("second");
      return {
        decide(context) {
          const next = context.candidates.find(
            ({ canAdmit, taskId }) => canAdmit && taskId === preferredTaskId
          ) ?? context.candidates.find(({ canAdmit }) => canAdmit);
          return next === undefined
            ? { kind: "wait" as const }
            : { kind: "select" as const, taskId: next.taskId };
        },
        complete(terminal) {
          settledTaskCount = terminal.execution.settledTasks.length;
        }
      };
    }
  }
});

const definition = defineConfig({
  checks: [scheduledCheck("first"), scheduledCheck("second")],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  },
  scheduler: { admissionPolicy: strategy }
});

const result = await run(definition);
if (result.kind !== "completed" || settledTaskCount !== 2) {
  throw new Error("Expected a completed Run and terminal measurement for both Checks");
}
```

`prepare` 失败会在 Scheduler 启动前使 Run 成为 `admission-strategy-preparation-failed`。`complete` throw/reject 会让 `outputs.measurementHooks.status` 为 failed，但不能改变已 sealed 的 primary Check facts 或 aggregate。将调用方自己的 capability 捕获在 closure 中；不要期待 context 暴露 Product 的 state、logger、clock 或真实 Task control。

### 观察终态 measurement

任何 scheduler policy 都可配置 `scheduler.measurementHooks`。每个 hook 在 Scheduler 已有 terminal measurement 后收到冻结的 `{ graph, execution, rawMeasurement }`；它适合调用方自己的统计、记录或后续处理，不能修改 Task、Check facts、aggregate 或选择历史。若同时配置 generic hook 与 prepared `complete`，generic hooks 先结算，随后才调用 `complete`。如果任一 hook 抛错或 reject，`result.outputs.measurementHooks.status` 为 `failed`；Check facts 不变，原本正常完成的 Run 可映射为 `kind: "output"`，已有 `cancelled` / `execution` 主结果保持不变。

三种 measurement 入口服务不同阶段：`decide(context)` 中的 `context.measurement` 只读在线 action-observation prefix；`scheduler.measurementHooks` 消费每个有 terminal measurement 的 Run；prepared strategy 的 `complete` 在同一终态 measurement、且 generic hooks 都结算后处理调用方在 `prepare` 时捕获的 Run-local state。不要把任一入口当成每 task event stream、执行前 hook 或 Check callback。它们没有 Task data、errors、Records、可变 engine、logger 或时钟 capability；需要逐项规则事实时，在 Check 的 `execution` 中用 final data / Records 表达。

`prepare` 只在 graph 已有效且 Run 尚未于 pre-work / planning 取消后调用；它没有 cancellation signal、timeout 或“必有 complete”的 cleanup 保证。prepare reject 会结束为 `admission-strategy-preparation-failed`。一旦 Run 进入 Scheduler，正常结束、取消或 policy fault 的 drain 只要 seal 出 terminal measurement，都会在 generic hooks 后调用 `complete`；早期 setup / execution failure 没有 terminal measurement 时不会调用它。因此不要在 `prepare` 中取得必须依赖 `complete` 释放的资源。

保存后续 Run 会使用的 caller-owned data 时，先根据自己的目标定义“可接受样本”。`rawMeasurement.timing.availability === "available"` 只证明终态 timing facts 可读，不证明 Run quality 成功；`settledTasks.kind === "completed"` 是 Scheduler settlement，不等于 Check `passed`，且 context 不提供 `RunResult.kind`。若业务只允许成功 Run，先暂存候选，在 `run(...)` 返回后同时核对 `result.kind` 与业务要求的 Check outcomes 或 aggregate，再决定是否提交。`kind: "completed"` 本身不表示质量检查全部通过。

## learned critical-path strategy

当同一项目反复运行、且本地目录可以保存调用方拥有的非敏感性能状态时，使用
`createLearnedCriticalPathStrategy(...)` 返回的 prepared strategy：

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

`stateDirectory` 必须是调用方提供的非空 absolute、可写且可删除的目录；helper 不从 effective
`projectRoot` 解析它。它是调用方信任的本地性能状态，不是 filesystem sandbox、secret storage、remote cache 或跨进程锁；
调用方负责 retention 和清理。history identity 虽会被 hash 成文件关联所用的 digest，digest 不是保密机制：不得把 secret、token
或低熵敏感输入放进 identity。`identityForTask(task)` 必须返回 canonical-JSON-compatible identity，并显式包含所有会改变
时长可比性的 options、flags、环境或实现版本；helper 不读取 normalized Check options、Run flags 或 `projectRoot` 来补全它。

`sampleWindow` 的范围是 1–32（默认 32），`maxHistorySeries` 是 1–4096（默认 4096），`coldStartDurationMs` 必须为正有限数（默认 1）；
这些 model knobs 会进入 helper 生成的 history key。非 absolute/空 `stateDirectory` 或非法 model knob 会在 factory 创建时 throw；
这类 authoring/configuration error 不属于一次 Run 的 optimization 退化。首次运行、缺失、损坏、不兼容或 read-failed history
会被当作空 history：已有 learned estimate 的同一 Run 可为未知 Task 提供 project prior，否则使用 cold start。identity 无效、无法
完成 setup/prediction/critical-path preparation 时，策略退化为普通 static decision，并以 `history-unavailable` 报告；record/write
失败只影响后续 Run 的 history，并以 `recording-unavailable` 报告。上述 history 退化均不改变本次 Task membership、Check facts、
aggregate、machine output 或质量结算。

每个策略选择的 `select` proposal 会产生带 task ID、estimate、critical-path score、sample count 和 source 的
`selection-proposed` event；它不确认 Task 已实际 admission。observer 是 caller-owned best-effort callback：同步 throw 或 rejected
Promise 会被忽略，返回的 Promise 不会被 await，因此 callback 可以在 `run(...)` 返回后继续，Run 完成也不证明 observation sink
已完成。它不创建 Product diagnostic channel、output status 或 file，也不把 history 写入 Check facts、machine output 或 `RunResult`。

工厂返回普通 public prepared custom strategy，并通过每次 decision 的 measurement context 工作。它只在既有 Scheduler
selection layer 比较 score，随后仍由 Scheduler 应用依赖、mutex、parallel budget 与 cancellation guard。策略的实际运行成本
取决于项目的 graph、history 和 observer；需要据此选择或调优时，由项目在目标 workload 上测量。

## 下一步

需要解释 Run lifecycle、dependency data、aggregation 或 outputs 的通用模型时，阅读 [API 机制](../api-mechanics.md)；需要实现 Check 规则本身时，回到[编写自定义 Check](extending-check-lifecycle.md)。
