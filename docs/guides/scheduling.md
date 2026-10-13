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

原 function 形式的 `decide(context)` 读取 frozen 的 graph、候选和 immutable `admissionState`，只返回 `{ kind: "select", taskId }` 或 `{ kind: "wait" }`。Scheduler 独占 readiness、mutex、容量、Task 启动与结算；策略只能提出 proposal，不能保证 proposal 会被接受。

```ts
import { defineAdmissionPolicy, defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

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
  admissionPriority: 10,
  checkId: "publish",
  dependsOn: [compile.checkId],
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

### 声明 callback 的 context 需求

需要减少回调未消费字段的构建成本时，使用 `{ contextNeeds?, callback }` descriptor；TypeScript 中通过
`defineSchedulerContextCallback(phase, descriptor)` 编写。simple `decide`、prepared `prepare`、其返回的
`decide` / `terminalEffect`，以及 `scheduler.terminalEffects[]` 都接受 descriptor 或 function。

function 保留完整 context；descriptor 省略 `contextNeeds` 或自有 `undefined` 表示 **full**。显式 `[]`
表示 **none**：该消费者不增加字段需求，仍按正常生命周期获调用。三个阶段只接受以下顶层字段，不接受子路径或其它阶段字段：

| `phase` | 可声明字段 |
| --- | --- |
| `preparation` | `graph` |
| `decision` | `graph`、`admissionState`、`candidates`、`capacity`、`activeScopeIds`、`runningTaskIds`、`settledTaskIds`、`measurement`、`runtime` |
| `terminal` | `graph`、`execution`、`rawMeasurement` |

#### TypeScript 编写与槽位消费

helper 保留 literal tuple 对应的只读 `Pick` 和回调结果类型，静态可读字段限于声明保证。推荐 literal tuple；
已宽化的数组、某个位置的 union token 或 tuple union 只保证每种可能输入都确定请求的字段，不把可能出现的 key 全部视为保证。

function 具有完整 contextual typing；**直接写 raw TypeScript descriptor 时，callback context 为 `never`**，
需要读字段时使用 helper。helper 不执行 callback，不替代 validation；直接 descriptor 在 runtime 同样合法。
`SchedulerContextByPhase`、`SchedulerContextPhase` 与 `SchedulerContextResultByPhase` 描述阶段输入和结果；
`DeclaredSchedulerContextCallback` / `FullSchedulerContextCallback` 描述 helper 返回形状。

`SchedulerContextCallbackInput` 是存储输入的槽位类型，不是直接调用接口。升级后 `SchedulerTerminalEffect`、
`PreparedCustomAdmissionStrategy` 等 callback 槽位包含 function/descriptor 联合；取出已标注为槽位类型的值直接调用时，
须先以 `typeof value === "function"` 收窄。descriptor 由 Core 验证并构建 context 后调用，不能绕过 `never`
存储边界。兼容承诺覆盖旧 function 的编写、完整 context、顺序与失败语义，并不表示所有既有类型消费代码都无需修改。
`createLearnedCriticalPathStrategy` 的具体返回类型仍保证 function `prepare` / `decide` 可调用。

#### 运行时验证与共享对象

需求在所属边界验证、复制、去重并冻结，调用方随后修改数组不会影响本 Run。descriptor 只接受自有 data 字段
`callback` 与可选 `contextNeeds`：callback 必须是函数，needs 必须是无空洞的合法字段数组，拒绝 getter、
unknown 字段和动态需求函数。Definition 内非法声明在 author work 前形成 configuration failure；prepared 返回的
非法声明形成 `admission-strategy-preparation-failed`。`contextNeeds` 与 callback 一样不进入 declarative fingerprint。

Core 合并**同阶段**需求与固定执行／诊断义务，在该边界构造共享冻结对象。每个 callback 只依赖自身声明字段；
对象可能包含同阶段其它消费者要求的额外字段，**需求不是权限隔离或精确物理裁剪保证**。不同阶段独立；
新的 decision boundary 使用新的冻结快照。Definition effects 和 prepared `terminalEffect` 共享同一 sealed context identity。

#### 选择需求与采集成本

- 只需当前候选和取消状态时，decision 声明 `["candidates", "runtime"]`；需要在线观察前缀时增加 `measurement`。
- terminal 按任务选择 none、`graph` 或 `execution`；需要完整 raw facts 时声明 `rawMeasurement` 或保留 function。
- 没有其它采集义务时，上述不需 measurement/rawMeasurement 的消费者不启动完整 timing/history 采集，terminal 仍正常交付。
- 同阶段一个 full 消费者保留该阶段完整成本，但不会令其它阶段自动 full。已启用的 scheduler diagnostics 始终保留完整证据。

需求只改变事实生产；selection proposal、真实准入 guards、取消和错误规则仍完整执行。

### 在线选择时读取 observation prefix

原 function 或声明了 `measurement` 的 custom `decide` 可通过 `context.measurement` 读取当前 decision boundary 已冻结的**观察前缀**：

- `cumulative` 提供当前累计的离散计数、peaks 和 timing availability；只有 `timing.availability === "available"` 才有 `timingFacts`。
- `measurementCount` 是当前已捕获 action observation 的数量。
- `measurementAt(index)` 只读取这个 context 冻结的 prefix；`0 <= index < measurementCount` 之外返回 `undefined`。每项说明上一次 accepted `select` 或 `wait` 后的 effects 与 interval，不声明某个 action 导致了时长、critical path 或 CPU 使用。

用它在**在线选择**时比较当前累计事实；不要把它当作完整逐 Task 历史或终态报告。需要 Run 结束后的完整 graph、settled tasks 与 raw measurement，改用下面的 `scheduler.terminalEffects`；prepared strategy 的 `terminalEffect` 同样只在 sealed terminal context 存在时运行，不要求请求 raw measurement。

## 已准备的 custom strategy

需要在 Scheduler 开始前异步读取调用方自己的配置，并把结果形成本 Run 专用 decision closure 时，使用 `{ kind: "prepared", prepare }`。每个 graph-ready Run 最多调用一次 `prepare`；它返回同步 `decide` 和可选的 `terminalEffect`。
下例声明 preparation 不需字段、decision 只需候选与取消状态、terminal 只需 execution：优先选择可准入的 `second`，
否则选择第一个可准入候选，并保存终态任务计数。未启用 diagnostics，也没有 measurement/rawMeasurement demand，
因此不要求完整 raw collector；上面的 simple 示例保留原 function 的完整 context 用法：

```ts
import {
  defineAdmissionPolicy,
  defineCheck,
  defineConfig,
  defineSchedulerContextCallback,
  run
} from "@zxyycom/vibe-check";

let settledTaskCount: number | null = null;

function scheduledCheck(checkId: string) {
  return defineCheck({
    checkId,
    displayName: checkId,
    execute: () => ({ status: "passed" as const, data: {} })
  });
}

const strategy = defineAdmissionPolicy({
  kind: "custom",
  strategy: {
    kind: "prepared",
    prepare: defineSchedulerContextCallback("preparation", {
      contextNeeds: [],
      async callback() {
        // 模拟异步读取调用方自己的配置，并将其捕获在本 Run 的 closure 中。
        const preferredTaskId = await Promise.resolve("second");
        return {
          decide: defineSchedulerContextCallback("decision", {
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
          terminalEffect: defineSchedulerContextCallback("terminal", {
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
  scheduler: { admissionPolicy: strategy }
});

const result = await run(definition);
if (result.kind !== "completed" || settledTaskCount !== 2) {
  throw new Error("Expected a completed Run and terminal execution facts for both Checks");
}
```

策略需要的配置、logger 或 clock 由调用方提供并捕获在 closure 中；context 只提供调度事实，真实 Task 启动与结算由 Scheduler 控制。准备失败与终态收尾边界如下。

### 交付终态 measurement

任何 scheduler policy 都可配置 `scheduler.terminalEffects`。每个 effect 在 Scheduler drain 并 seal terminal context 后收到同阶段共享的冻结对象；原 function 仍收到完整 `{ graph, execution, rawMeasurement }`，descriptor 保证自身所声明字段；它适合调用方自己的统计、记录或后续处理，不能修改 Task、Check facts、aggregate 或选择历史。若同时配置 Definition effect 与 prepared `terminalEffect`，Definition effects 先结算，随后才调用 `terminalEffect`。如果任一 effect 或 `terminalEffect` 抛错或 reject，`result.outputs.terminalEffects.status` 为 `failed`；Check facts 不变，原本正常完成的 Run 可映射为 `kind: "output"`，已有 `cancelled` / `execution` 主结果保持不变。

终态 measurement 不同于 `decide` 所读 `context.measurement` 的在线观察前缀。需要逐项业务数据、失败原因或 Records 时，在 Check 的 `execute` 中形成事实，再从 `RunResult` 读取。

`prepare` 只在 graph 已有效且 Run 尚未于 pre-work / planning 取消后调用；它没有 cancellation signal、timeout 或“必有 terminalEffect”的 cleanup 保证。prepare reject 会结束为 `admission-strategy-preparation-failed`。一旦 Run 进入 Scheduler，正常结束、取消或 policy fault 的 drain 只要 seal 出 terminal context，都会在 Definition effects 后调用 `terminalEffect`；早期 setup / execution failure 没有 terminal context 时不会调用它。因此不要在 `prepare` 中取得必须依赖 `terminalEffect` 释放的资源。

保存后续 Run 会使用的 caller-owned data 时，先根据自己的目标定义“可接受样本”。请求了 `rawMeasurement` 时，`rawMeasurement.timing.availability === "available"` 只证明终态 timing facts 可读，不证明 Run quality 成功；`settledTasks.kind === "completed"` 是 Scheduler settlement，不等于 Check `passed`，且 context 不提供 `RunResult.kind`。若业务只允许成功 Run，先暂存候选，在 `run(...)` 返回后同时核对 `result.kind` 与业务要求的 Check outcomes 或 aggregate，再决定是否提交。`kind: "completed"` 本身不表示质量检查全部通过。

## 复用本地时长历史

同一项目反复运行、希望依据历史时长安排 ready Tasks 时，阅读[用本地时长历史调度 Check](learned-scheduling.md)。该专题说明 `createLearnedCriticalPathStrategy`、caller-owned history 与观察回调。
