# 按项目约束调度 Check

本专题面向已经有多个自定义 Check、需要表达并发约束、改变 ready task 的选择顺序的调用方。默认 `{ kind: "static" }` 已经遵守依赖、mutex、root/scoped 并行预算、named resource capacity 和取消；只有这些不变式之外的**选择偏好**需要项目规则时，才使用 custom policy（包括 learned helper 返回的 prepared strategy）。Check 自己的 options、preparation、execution 与取消处理见[编写自定义 Check](extending-check-lifecycle.md)。

## 选择正确的工具

| 目标 | 使用 | 作用边界 |
| --- | --- | --- |
| 让一组 Task 互斥执行 | 在每个相关 Check 的 `mutex` 写入同一个名称 | 同一互斥名称下，同一时刻最多运行一个 Task。 |
| 为可计数共享资源声明并发容量 | `scheduler.resourceCapacities` 与 Check 的 `resourceClaims` | capacity 与 claim 都是本次 Run 的静态 units。 |
| 只指定静态相对顺序 | Check 的 `admissionPriority` | 在 Scheduler 的 relation、mutex、容量和取消约束内排序 ready Task。 |
| 每次 ready selection 根据当前事实选择一个 task | `scheduler.admissionPolicy` 的 `custom/simple` strategy | 向 Scheduler 提交一个 selection proposal。 |
| 先异步准备本 Run 专用决策 closure，或在 drained/sealed 终态边界后收尾 | `custom/prepared` strategy | `prepare` 形成 Run-local closure，`terminalEffect` 消费所请求的 terminal context。 |
| 对独立静态图比较假设分支 | [`createAdmissionGraph(...)`](simulating-admission.md) | 不执行 Check；在独立专题中建立并比较 immutable successor。 |
| 多次运行后按本地时长历史改善选择 | `createLearnedCriticalPathStrategy(...)` 作为 `custom/prepared` strategy | 使用调用方管理的本地 history 形成选择偏好。 |
| Run 结束后保存项目自己的调度统计 | `scheduler.terminalEffects` | 接收冻结的 terminal context 作为 side effect 输入。 |

`admissionPriority` 必须是有符号 safe integer；Check 节点省略时继承最近显式祖先值，没有祖先声明时为 `0`。

## 限制 named resource 并发

`scheduler.maxParallel` 限制同时运行的 Check 总数，必须是正 safe integer，`defineConfig` 省略时默认 `4`。Check 节点的 `maxParallel` 也必须是正 safe integer，省略时继承最近显式祖先值；没有祖先声明时使用 root 预算。除表中的 `mutex` 外，需要让不同 Check 消耗同一种资源的不同 units 时，配置静态 named resource capacity：

```ts
import { defineCheck, defineConfig } from "@zxyycom/vibe-check";

const firstAudit = defineCheck({
  checkId: "first-audit",
  displayName: "First audit",
  mutex: ["exclusive-audit"],
  resourceClaims: { worker: 1, capacityUnits: 2 },
  execute: () => ({ status: "passed", data: {} })
});

const secondAudit = defineCheck({
  checkId: "second-audit",
  displayName: "Second audit",
  mutex: ["exclusive-audit"],
  execute: () => ({ status: "passed", data: {} })
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

声明对应字段的 `decide` 读取 frozen 的 graph、候选和 immutable `admissionState`，只返回 `{ kind: "select", taskId }` 或 `{ kind: "wait" }`。Scheduler 独占 readiness、mutex、容量、Task 启动与结算；策略只能提出 proposal，不能保证 proposal 会被接受。下面两个独立 Check 同时 ready，且只有一个槽位；policy 优先选择静态优先级较低的 `publish`，因此观察到 `publish,compile`。实际有依赖的工作仍须声明关系，policy 不能绕过它。

```ts
import { defineContextCallback, defineAdmissionPolicy, defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

const executionOrder: string[] = [];

const compile = defineCheck({
  checkId: "compile",
  displayName: "Compile",
  execute() {
    executionOrder.push("compile");
    return { status: "passed", data: {} };
  }
});

const publish = defineCheck({
  admissionPriority: -10,
  checkId: "publish",
  displayName: "Publish",
  execute() {
    executionOrder.push("publish");
    return { status: "passed", data: {} };
  }
});

const preferPublish = defineAdmissionPolicy({
  kind: "custom",
  strategy: {
    kind: "simple",
    decide: defineContextCallback("scheduler.decide", { contextNeeds: ["candidates","graph"], callback: (context) => {
      const publishTask = context.graph.tasks.find((task) => task.taskId === publish.checkId);
      const publishCandidate = context.candidates.find(
        (candidate) => candidate.taskId === publish.checkId && candidate.canAdmit
      );
      if (publishTask?.admissionPriority === -10 && publishCandidate !== undefined) {
        return { kind: "select", taskId: publishCandidate.taskId };
      }

      const nextCandidate = context.candidates.find((candidate) => candidate.canAdmit);
      return nextCandidate === undefined
        ? { kind: "wait" }
        : { kind: "select", taskId: nextCandidate.taskId };
    } })
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
if (executionOrder.join(",") !== "publish,compile") {
  throw new Error(`Unexpected execution order: ${executionOrder.join(",")}`);
}
```

`decide` 必须同步且给出合法、可 drain 的 proposal。throw、thenable、malformed/illegal proposal 或不可 drain 的 `wait` 会产生 `admission-policy-failed`：Scheduler 停止新的 admission、取消 pending work 并等待已启动 work。这个 invocation failure 不是任一 Check outcome。

### 声明 callback 的 context 需求

simple `decide`、prepared `prepare`、返回的 `decide` / `terminalEffect` 和 `scheduler.terminalEffects[]`
均接受[共同 callback 声明](callback-context.md)。普通 function 或省略 needs 都是零需求；
需要字段时用 `defineContextCallback(phase, descriptor)`。

| helper phase | 可声明的完整顶层字段 |
| --- | --- |
| `scheduler.prepare` | `graph` |
| `scheduler.decide` | `graph`、`admissionState`、`candidates`、`capacity`、`activeScopeIds`、`runningTaskIds`、`settledTaskIds`、`cumulative`、`actionHistory`、`runtime` |
| `scheduler.terminal` | `graph`、`execution`、`runMeasurement`、`taskTimings` |

descriptor 的 TypeScript 推导、调用和宽化边界见[共同类型规则](callback-context.md#声明与类型)。Definition 在 author work 前固定 simple/prepare/Definition effects；prepared 返回的 decide/effect 在 Scheduler 启动前固定，非法结果形成 `admission-strategy-preparation-failed`。每个 callback 只取得自己声明的字段；原声明后续 mutation 不影响本 Run。没有需求不妨碍 terminal 调用，未 seal 的早期失败不调用 effects。

按实际消费选择字段：当前候选和取消状态可声明 `candidates`、`runtime`；累计统计请求 `cumulative`，观察前缀增加 `actionHistory`；终态汇总与逐 Task 数据分别请求 `runMeasurement`、`taskTimings`。不请求 timing 且无诊断义务时不采集额外 measurement clock；需求不改变准入 hard guards、取消或错误规则。

### 在线选择时读取 observation prefix

声明 `cumulative` 可读取当前 decision boundary 前已 flush 的冻结累计 counters、peaks 和 timing availability；
只有 `timing.availability === "available"` 才有 `timingFacts`。声明 `actionHistory` 可通过 `SchedulerActionHistory` 读取独立的冻结**观察前缀**：

- `actionHistory.measurementCount` 是当前捕获 action observation 的 end-count。
- `actionHistory.measurementAt(index)` 只读该 prefix；越界返回 `undefined`，旧 reader 看不到未来 append。
- observation 从上一 accepted `select`/`wait` 完成后的 post-state 开始，到下一实际 custom callback 前关闭，
  包含期间 admitted/settled effects 和 occupancy interval；不声明 action 因果、critical path 或 CPU 归因。
- interval 为 closed timing union：合法零区间仍 available；timing 不可用时只给 reason，不伪造成全零。

已启用 timing 组共享唯一 collector 的 clock、采样边界和 first-fault validity；clock throw/non-finite/backward 或
已启用计算的 invalid interval/integral 令后续 timing view 不可用，不为关闭组额外计算以寻找故障。
cumulative/runMeasurement 仍保留离散事实与 peaks；taskTimings 不交付伪造数值，history 保留离散 action/effects。
每个 reader 固定自己的 availability、数值与 prefix；后续 fault 或 append 不回写旧 view。
读取统计字段不会额外采样或改变 availability，字段读取顺序不影响结果。统计保留原有单位、采样边界和区间归属，
不保证与旧版本逐位相同的浮点累加结果；消费方不要依赖最后几位或对独立舍入的分类值做严格相等判断。

在线观察不是完整逐 Task 历史或终态报告。Run 结束后的汇总和逐 Task 表分别通过下面的 terminal effects 请求
`runMeasurement` / `taskTimings`；交付 effect 本身不要求任一测量需求。

## 已准备的 custom strategy

需要在 Scheduler 开始前异步读取调用方自己的配置，并把结果形成本 Run 专用 decision closure 时，使用 `{ kind: "prepared", prepare }`。每个 graph-ready Run 最多调用一次 `prepare`；它返回同步 `decide` 和可选的 `terminalEffect`。
下例声明 preparation 不需字段、decision 只需候选与取消状态、terminal 只需 execution：优先选择可准入的 `second`，
否则选择第一个可准入候选，并保存终态任务计数。未启用 diagnostics，也没有 timing 字段需求，
因此不启动 timing collector；上面的 simple 示例同样显式声明所需字段：

```ts
import {
  defineAdmissionPolicy,
  defineCheck,
  defineConfig,
  defineContextCallback,
  run
} from "@zxyycom/vibe-check";

let settledTaskCount: number | null = null;
const executionOrder: string[] = [];

function scheduledCheck(checkId: string) {
  return defineCheck({
    checkId,
    displayName: checkId,
    execute: () => {
      executionOrder.push(checkId);
      return { status: "passed" as const, data: {} };
    }
  });
}

const strategy = defineAdmissionPolicy({
  kind: "custom",
  strategy: {
    kind: "prepared",
    prepare: defineContextCallback("scheduler.prepare", {
      contextNeeds: [],
      async callback() {
        // 模拟异步读取调用方自己的配置，并将其捕获在本 Run 的 closure 中。
        const preferredTaskId = await Promise.resolve("second");
        return {
          decide: defineContextCallback("scheduler.decide", {
            contextNeeds: ["candidates", "runtime"],
            callback(context) {
              if (context.runtime.abortRequested || context.runtime.cancelled) {
                return { kind: "wait" };
              }
              const next = context.candidates.find(
                ({ canAdmit, taskId }) => canAdmit && taskId === preferredTaskId
              ) ?? context.candidates.find(({ canAdmit }) => canAdmit);
              return next === undefined
                ? { kind: "wait" }
                : { kind: "select", taskId: next.taskId };
            }
          }),
          terminalEffect: defineContextCallback("scheduler.terminal", {
            contextNeeds: ["execution"],
            callback(terminal) {
              settledTaskCount = terminal.execution.settledTasks.length;
            }
          })
        };
      }
    })
  }
});

const definition = defineConfig({
  checks: [scheduledCheck("first"), scheduledCheck("second")],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  },
  scheduler: { admissionPolicy: strategy, maxParallel: 1 }
});

const result = await run(definition);
if (result.kind !== "completed" || settledTaskCount !== 2 || executionOrder.join(",") !== "second,first") {
  throw new Error("Expected a completed Run and terminal execution facts for both Checks");
}
```

策略需要的配置、logger 或 clock 由调用方提供并捕获在 closure 中；context 只提供调度事实，真实 Task 启动与结算由 Scheduler 控制。

`prepare` 只在 graph 已有效且 Run 尚未于 pre-work / planning 取消后调用；它没有 cancellation signal、timeout 或“必有 terminalEffect”的 cleanup 保证。prepare reject 会结束为 `admission-strategy-preparation-failed`。一旦 Run 进入 Scheduler，正常结束、取消或 policy fault 的 drain 只要 seal 出 terminal context，都会在 Definition effects 后调用 `terminalEffect`；早期 setup / execution failure 没有 terminal context 时不会调用它。因此不要在 `prepare` 中取得必须依赖 `terminalEffect` 释放的资源。

## 交付终态 measurement

任何 scheduler policy 都可配置 `scheduler.terminalEffects`。每个 effect 在 Scheduler drain 并 seal 后收到只含自身声明字段的冻结视图（普通 function 为冻结空视图）；不同 effect 不保证外层 identity 相同。

effect 适合调用方自己的统计、记录或后续处理，不能修改 Task、Check facts、aggregate 或选择历史。

若同时配置 Definition effect 与 prepared `terminalEffect`，Definition effects 先结算，随后才调用 `terminalEffect`。

如果任一 effect 或 `terminalEffect` 抛错或 reject，`result.outputs.terminalEffects.status` 为 `failed`；Check facts 不变，原本正常完成的 Run 可映射为 `kind: "output"`，已有 `cancelled` / `execution` 主结果保持不变。

终态测量分为两个可独立请求的类型：

- `SchedulerRunMeasurement`（`runMeasurement`）：Run fingerprint、离散事实、peaks，以及 available 分支的 Run timing facts；不含逐 Task admissions。
- `SchedulerTaskTimings`（`taskTimings`）：closed `{ timing: { availability: "available" }, admissions }` 或
  `{ timing: { availability: "unavailable", reason } }`。可用表覆盖进入过 admission-viable pending 集合的 Tasks，
  不只实际 admitted Tasks；按 canonical Task ID 顺序保存分类 delay、admitted/settled timestamps 等事实。
  `execution.admittedTaskIds` 则只包含实际启动者，按首次 admission 顺序排列。

这里的 admission-viable 指 Task 仍 pending、全部 `dependsOn` 已 completed 且全部 `observes` 已 settled；
仅仅依赖已终态但未满足，不计入等待统计。available 的时长、等待与积分在交付前已验证为有限且非负；
无法有效表示所请求结果时返回 unavailable，既有离散事实与 peaks 仍保留。后续执行或其它推演分支不会修改已保存的视图。

它们不同于 decision 的 `cumulative` / `actionHistory`。逐项业务数据、失败原因或 Records 由 Check 的 `execute` 形成，再从 `RunResult` 读取。

保存后续 Run 会使用的 caller-owned data 时，先根据自己的目标定义“可接受样本”。若业务只允许成功 Run，按以下顺序处理：

1. 在 terminal effect 中暂存候选数据；context 不提供 `RunResult.kind`，此时尚不能判断 Run 的最终结果。
2. 等待 `run(...)` 返回，同时核对 `result.kind` 与业务要求的 Check outcomes 或 aggregate。
3. 只有符合样本条件时，才提交供后续 Run 使用的数据。

`runMeasurement` 或 `taskTimings` 的 `timing.availability === "available"` 只证明终态 timing facts 可读；`settledTasks.kind === "completed"` 只表示 Scheduler settlement，不等于 Check `passed`。`RunResult.kind === "completed"` 同样不表示质量检查全部通过。

## 复用本地时长历史

同一项目反复运行、希望依据历史时长安排 ready Tasks 时，阅读[用本地时长历史调度 Check](learned-scheduling.md)。该专题说明 `createLearnedCriticalPathStrategy`、caller-owned history 与观察回调。
