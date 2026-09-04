# Vibe Check

Vibe Check 是面向 Bun 项目的 TypeScript 质量检查库。你可以直接使用随包提供的代码、JSON、Schema、Markdown 和维护检查，也可以把项目自己的规则写成 Check，然后在项目脚本、测试或 CI 中获得结构化结果。

所有公开能力都从 `@zxyycom/vibe-check` package root 导入。Vibe Check 不要求额外的配置文件，也不提供 CLI：检查内容、组合方式和运行时机都由你的 TypeScript 代码决定。

## 安装

```sh
npm install @zxyycom/vibe-check
```

npm 负责安装 package；应用代码和质量脚本使用 **Bun `>=1.3.14`** 执行。安装完成后，可以用 `bun run <file>` 运行下面的示例。

## 自定义 Check 快速开始

下面的 `quality.ts` 展示一条完整的最小路径：定义 bundle 大小规则、运行它，并确认 Check 通过。为使示例能够独立运行，`actualBytes` 使用固定输入；接入项目时，把这部分替换为项目真实的测量逻辑即可。

- `defineCheck(...)` 定义一项检查，以及通过或失败时要返回的数据。
- `defineConfig(...)` 把一项或多项 Check 组成可重复运行的 Project Definition。
- `run(...)` 执行 Definition，并返回本次运行的结果。

示例保留默认的进度输出，但关闭 machine publication，因此第一次运行不会写入 `run.json` 或 `records.ndjson`：

```ts
import { defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

const bundleSize = defineCheck({
  checkId: "bundle-size",
  displayName: "Bundle size",
  execution() {
    const actualBytes = 82_000;
    const maximumBytes = 100_000;
    const data = {
      actualBytes,
      maximumBytes
    };
    return actualBytes <= maximumBytes
      ? { status: "passed", data }
      : { status: "failed", data };
  }
});

const definition = defineConfig({
  checks: [bundleSize],
  outputs: {
    machinePublication: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
const outcome = result.snapshot.checks.find(
  ({ checkId }) => checkId === bundleSize.checkId
)?.outcome;
if (outcome?.status !== "passed" || outcome.data.actualBytes !== 82_000) {
  throw new Error("Bundle-size Check did not produce the expected result");
}
```

运行它：

```sh
bun run quality.ts
```

`RunResult.kind === "completed"` 表示这次 Run 已经完整结算，不等于其中每项 Check 都通过。示例继续读取 `bundle-size` 的 `outcome.status`，并在结果不符合预期时让脚本失败。

## 复用 caller-owned JSON cache

当 custom Check 或普通项目代码已经能生成**完整的 semantic key**时，使用 `cacheJsonByKey(...)` 复用本地 canonical JSON object。`key` 必须随所有会改变计算结果的输入、实现版本、options、toolchain 与声明的外部状态变化；helper 不会自动分析依赖，也不会跳过或重放整个 Check。

调用方提供 absolute、信任且可删除的 `directory`，并用同步 `parse` 验证缓存 payload。文件名只使用 identity digest，但 digest 不是 secret protection：不要把 secret、token 或低熵敏感值放进 `key`。`read`/`write` observation 让调用方决定缓存退化如何影响自己的 Check 或项目代码。完整输入、结果、并发和安全边界见[Caller-keyed JSON cache](./docs/api-mechanics.md#caller-keyed-json-cache)。

```ts
import { cacheJsonByKey } from "@zxyycom/vibe-check";

const directory = `/tmp/my-project-vibe-check-cache-${Date.now()}-${Math.random()}`;
let measurements = 0;
const options = {
  compute: () => ({ bytes: ++measurements * 1024 }),
  directory,
  key: "bundle-input:source-v3:tool-v1",
  namespace: "my-project.bundle-size",
  parse(value: unknown): { readonly bytes: number } {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      typeof (value as { bytes?: unknown }).bytes !== "number"
    ) {
      throw new TypeError("Invalid bundle-size cache payload");
    }
    return value as { readonly bytes: number };
  },
  version: "1"
};
const first = await cacheJsonByKey(options);
const second = await cacheJsonByKey(options);
if (first.source !== "computed" || second.source !== "cache" || measurements !== 1) {
  throw new Error("Expected one computation followed by a cache hit");
}
```

## 随包提供的 Check

如果项目需要的是常见质量检查，可以先从以下函数开始，而不必自己实现 `execution`。除 `maintenanceReminders(entries)` 与 `secretDetection({ files })` 有必填输入外，其余函数都可以无参调用；每份指南都包含最小用法、options、默认值、结果和安全边界。

| 你想检查什么 | 使用的导出 | 运行前提 |
| --- | --- | --- |
| 重复代码 | [`duplicateDetection(options?)`](./docs/checks/duplicate-detection.md) | package 使用随安装依赖提供的兼容 jscpd v5。 |
| 文件代码行指标 | [`fileMetrics(options?)`](./docs/checks/file-metrics.md) | 环境中有兼容精确 SCC 4.0.0 输出契约的 `scc` command。 |
| 函数规模、复杂度、最大嵌套和参数数量 | [`functionMetrics(options?)`](./docs/checks/function-metrics.md) | 内置 TypeScript analyzer；支持 55 个 suffix，不执行外部 command。 |
| JSON 语法和输入范围 | [`jsonValidation(options?)`](./docs/checks/json-validation.md) | 只读取本地文件，不执行 command 或网络请求。 |
| JSON 与 Schema 的匹配关系 | [`jsonSchemaValidation(options?)`](./docs/checks/json-schema-validation.md) | 默认离线；只有显式允许的 HTTPS source 才会触发网络请求。 |
| 本地 Markdown 链接与锚点 | [`markdownLinkValidation(options?)`](./docs/checks/markdown-link-validation.md) | 只读取 policy 允许的本地路径，不执行 command 或网络请求；parse-facts cache 默认关闭，启用时由调用方提供 trusted、可删除的 absolute directory。 |
| 基于 Git 历史的维护提醒 | [`maintenanceReminders(entries)`](./docs/checks/maintenance-reminders.md) | 项目根目录是 Git repository，且环境可以执行 `git`。 |
| 高置信 PEM private key | [`secretDetection({ files })`](./docs/checks/secret-detection.md) | 只读取显式 files policy 选择的本地文本；随包 Secretlint rule 不执行 command 或网络请求。 |

`duplicateDetection`、`fileMetrics`、`functionMetrics` 和 `markdownLinkValidation` 默认把普通 Finding 作为 non-blocking 警告保留下来；需要让 Finding 直接使 Check 失败时，在对应 options 中设置 `findingPolicy: "blocking"`。文件选择、阈值、外部工具和具体结果字段以各 Check 指南为准。

`markdownLinkValidation` 的 cache 只是 opt-in local performance state：它可能保存 source-derived link destination、heading
slug 与 range，不提供 confidentiality 或 automatic cleanup。调用方只有在接受这项 material 并拥有目录生命周期时，才传入
`cache: { enabled: true, directory: "/absolute/removable/cache" }`；完整 option、failure 与 memo boundary 见其 Check guide。

自定义 Check 可用 `presentCheckFindings(...)` 生成有界摘要：Check 自己设置显示上限、选择安全字段，并在超限 hook
中明确完整明细的实际读取位置。helper 不定义 Finding shape，也不会替 Check 保存或发布完整 facts；详见
[Finding presentation](./docs/api-mechanics.md#finding-presentation)。

### Finding waiver：保留证据地对账已知 Finding

`reconcileFindingWaivers(...)` 是 package root 的通用 helper，供自定义或随包 Finding 生产方在**完整**
Finding 集合形成后，按调用方定义的结构化 identity 对账 waiver。它不会按 message 过滤、在扫描前排除输入或删除
Finding；零次、一次和多次匹配分别形成 `unused`、`applied` 与 `overmatched` audit，过宽 identity 不会豁免任何
Finding。

```ts
import { reconcileFindingWaivers } from "@zxyycom/vibe-check";

const reconciled = reconcileFindingWaivers({
  findings: [{ metric: "api-compatibility", symbol: "createClient" }],
  identify: ({ metric, symbol }) => ({ metric, symbol }),
  waivers: [
    {
      identity: { metric: "api-compatibility", symbol: "createClient" },
      reason: "兼容窗口保留到下一个 major release。"
    }
  ]
});
```

helper 只返回 disposition 与 audit；采用方仍拥有 Records、messages 和 terminal outcome。当前原生 option 覆盖如下：

| 能力/Check | 当前入口 | identity owner |
| --- | --- | --- |
| 任意自定义 Finding producer | `reconcileFindingWaivers(...)` | 调用方的 `identify(finding)` |
| [`fileMetrics`](./docs/checks/file-metrics.md) | `findingWaivers` | `{ metric: "code-lines", path }` |
| [`functionMetrics`](./docs/checks/function-metrics.md) | `findingWaivers` | `{ metric, path, functionName, startLine }` |
| [`duplicateDetection`](./docs/checks/duplicate-detection.md) | `findingWaivers` | `{ metric: "duplicate-tokens", locations }` |
| 其它随包 Check | 暂无同名原生 option | 对应 Check 指南；不能据此推断自动支持 |

三个内置指标型 Check（`fileMetrics`、`functionMetrics` 与 `duplicateDetection`，下称 metric trio）都在完整 metric Finding
形成后对账，保留 applied Finding Record 与 reason，并把 stale/overbroad authoring 作为 audit evidence；各自完整 identity
grammar 见上表链接到的 Check 指南。通用 grammar 与带 getter 等 hostile input 的拒绝边界见
[深入 API 机制](./docs/api-mechanics.md#finding-waiver-reconciliation)。

## 自定义 Check API

只使用随包 Check 时，可以跳过本节。需要表达项目自己的规则时，通常只需要定义 Check、组成 Definition、运行并读取结果；preflight、依赖调度、waiver 对账、聚合和取消等进阶能力放在[深入 API 机制](./docs/api-mechanics.md)中。

### 定义 Check

`defineCheck(value)` 接受一个普通 Check object，并保留 `checkId`、options 和 final data 的 TypeScript inference。常用字段如下：

| 字段 | 用途 |
| --- | --- |
| `checkId` | 在同一 Definition 中唯一的稳定标识；用于查找 outcome、Record、message 和 duration。 |
| `displayName` | 进度和人读结果中显示的名称。 |
| `execution(context)` | 执行检查并返回一个 terminal outcome。省略时，当前节点只用于组织子 `checks`。 |
| `enabledByFlags` | 可选的 `{ flags, mode }`；条件不匹配时在任何 owning preflight / execution 前结算为 `not-applicable`，并作为未满足的 prerequisite 参与同一张图。 |
| `dependsOn` | 必须先结算为 `passed` 的 direct prerequisite IDs；任一非 `passed` 都阻止本 Check 的 preflight 和 execution。可用 `inherit({ add, remove })` 在容器继承值上显式编辑。 |
| `observes` | 所列每个 direct Check 都只需先各自形成任意 terminal outcome 的 IDs；用于审计、汇总或基于 outcome 形成本 Check 的 policy，不把上游非 `passed` 当作本 Check 的 prerequisite；同样可用 `inherit({ add, remove })` 显式编辑继承值。 |
| `admissionPriority` | 同一既有 ready 准入层级中的静态相对优先级；必须是安全整数，省略后继承最近的容器值，最终为 `0`。它是完整 Task graph 上的 metadata，不改变 Check tree 的声明顺序，也不越过依赖、mutex、并行上限或 cancellation/lifecycle hard guard。 |
| `options` | 当前 Check 的配置；Run 会把准备后的只读副本交给 `context.options`。 |
| `checks` | 可选的子 Check 列表，用于组织一组相关规则。 |

`execution` 可以同步返回，也可以返回 `Promise`。它通过 `context` 读取当前 options、project root、flags、两类 relation 授权的 direct outcome、取消 signal，并可用 `records.report(...)` 保存不决定终态的补充事实。

`enabledByFlags.flags` 必须是非空 token 集合；`mode` 可以是 `all`、`any`、`none` 或 `not-all`。其中 `any` 表示至少一个声明 token 存在，不是“恰好一个”；`not-all` 表示至少一个声明 token 不存在。需要带值 flag、“恰好一个”或嵌套布尔条件时，Check 继续在 callback 中解释 `context.project.flags`。条件不匹配的 Check 保留 `not-applicable / flag-condition-not-matched` 事实；以它为 `dependsOn` 的 Check 会因 prerequisite 未通过而不启动，以它为 `observes` 的 Check 仍可读取该终态。深入执行顺序与 settlement 见 [API 机制](docs/api-mechanics.md#一次-run-的生命周期)。

默认 progress 会把因 flag 条件未匹配而没有启动的 Checks 合成一个原因说明块，并在下面列出各自的
`displayName`；完整 Check facts、最终计数和 machine output 不会被压缩或删除。完整分组条件与其它未启动状态的
呈现边界见 [API 机制](docs/api-mechanics.md#outputs-与-runresult-边界)。

必须取得成功 provider data 才能开始工作时，使用 `dependsOn`，再以 `context.dependencies.get(checkId)` 读取 final data，并由 producing
Check 的 `parseData` 恢复其业务类型。需要在所有 observed upstream 各自结算为任意 terminal outcome 后审计时，使用 `observes`，再用零参数
`context.dependencies.list()`：它按 normalized effective direct ID 的稳定顺序返回冻结的 observation array；每项都是冻结的
`{ checkId, outcome }`，`outcome` 保留 Core 已结算的完整四态，包含两类 relation 分别继承后形成的 direct ID 并集。`get` 和 `list`
都只授权这个并集；同一 ID 不能同时出现在两类 relation。它不是全局已执行 Check 列表，
不包含 ambient executed、transitive 或未声明 Check，也不反映 scheduler history。consumer 只能根据这些只读事实形成自己
Check 的 I/O、Records、messages 和 terminal result，不能重跑、修改或重新结算上游。完整示例与 parser 边界见
[深入 API 机制的类型化依赖数据](./docs/api-mechanics.md#类型化依赖数据)。

| 返回状态 | 何时使用 |
| --- | --- |
| `passed` | 检查完成且满足规则；同时返回主要 final `data`。 |
| `failed` | 检查完成但不满足规则；同时返回主要 final `data`。 |
| `not-applicable` | 当前输入没有适用的工作；可以附带 reason。 |
| `unavailable` | 无法形成可信结果；必须附带 reason。 |

final `data` 和 supplemental Record 使用 object-shaped canonical JSON。Check 可以附带有序的人读 `messages`，但通用 API
不保证每个结果都有 message。默认 progress 会在 TTY 中维护临时 running region；Check preflight/execution 通过全局
`console.*` 写入的文本会按异步 Check context 捕获，settlement 后统一呈现并保留在 `RunResult.checkMessages`，不会破坏
running region。`process.stdout.write` / `process.stderr.write` 绕过这个 console router；如果直接写入 progress 使用的
terminal stream，文本可能与光标控制交错，造成内容被覆盖或遗留 running row。直接 stream write、高容量或流式日志应改用
Check-owned file、transcript 或独立 logger；完整边界见
[深入 API 机制的 Check 输出](./docs/api-mechanics.md#check-输出与受管-progress)。

### 组成 Project Definition

`defineConfig({ checks, ... })` 组成可重复运行的 Project Definition，并补齐未声明的默认值。最常调整的默认项是：

| 配置 | 默认值 | 效果 |
| --- | --- | --- |
| `outputs.progressRendering.enabled` | `true` | 在终端呈现 Check 生命周期与汇总。 |
| `outputs.machinePublication.enabled` | `true` | 把 `run.json` 和 `records.ndjson` 写入 `artifacts/vibe-check`。 |
| `outputs.diagnosticLogging.enabled` | `false` | 需要排障时按 Product owner 写入 invocation-specific core、scheduler，以及仅 learned policy 使用的 learned-admission 日志。 |
| `scheduler.maxParallel` | `4` | 限制最外层 Check 并行数。 |
| `scheduler.admissionPolicy` | `{ kind: "static" }` | 每轮以完整静态图与当前事实重算的默认无状态准入 policy。 |

`outputs` 和 `scheduler` 都可以只覆盖需要改变的 nested field；同一份 Definition 可以安全地传给多次 `run(...)`。
machine publication 和 diagnostic logging 的 `directory` 在 Definition 与 RunControls 中使用同一受信任 target grammar：值必须是非空且不含 U+0000 的字符串。相对值（包括 `..`）从本次 effective `projectRoot` 解析；绝对值直接作为明确 target。两项仍是独立 output，可以填写同一目录（machine 只拥有 `run.json` 与 `records.ndjson`，diagnostic logging 只创建 invocation-specific `.log`）。这不是 filesystem sandbox、目录清空或 containment 承诺；可移植的可重复 Definition 应优先使用相对目录，把 invocation-specific 的外部绝对 target 放进 `run(..., { outputs })`。

### 自定义准入 policy

当调用方要根据完整 Task graph 和当前准入事实选择下一项 Task 时，设置
`scheduler.admissionPolicy` 为 `custom`。现行 public contract 有两种 strategy：`simple` 直接提供同步
`decide(context)`；需要为**本次 Run**异步准备选择 closure 或处理 sealed terminal measurement 时，使用下文的
`prepared`。两个 `decide` 都只能提出 `select(taskId)` 或 `wait`。它收到 detached、deep-frozen 的 decision DTO；Task
metadata 是 topology 与 priority 的唯一来源。需要比较假设分支时，callback 可从 `context.admissionState` 读取与下文
standalone `AdmissionGraph` 相同的 immutable state contract；其中的 `select` / `settle` 只产生 hypothetical successor，
不会为真实 Run 预留、启动或结算 Task。

Scheduler 仍独占 relation/mutex readiness、capacity、cancellation、Task 启动和结算的 hard guard。callback 是调用方
trusted host code：closure 可使用调用方自己持有的 capability；Vibe Check 传入 frozen context 并接收 result-only proposal，
但不暴露 mutable/private Scheduler state 或真实 Task control。`defineAdmissionPolicy(...)` 只改善 TypeScript inference，inline
同形 object 等价。

失败分流按 callback 阶段固定：simple/prepared 的 `decide` throw、thenable、malformed/illegal proposal 或不可 drain 的
`wait` 形成 `admission-policy-failed`，Scheduler 停止新 admission、取消 pending 并 drain 已启动 work；prepared 的
`prepare` throw、reject 或不能形成精确 closure 时，在 Scheduler 启动前形成
`admission-strategy-preparation-failed`。完整的终态 output 状态和 primary-result 优先级见
[深入 API 机制](./docs/api-mechanics.md#outputs-与-runresult-边界)。

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

### 模拟 AdmissionGraph

`createAdmissionGraph({ graph, maxParallel })` 对独立的静态 Scheduler graph 执行 validation/compile，返回可形成
immutable `AdmissionState` 的 `AdmissionGraph` handle；它不运行 Check。`catalog`、`inspection` 与
`validateSelection(taskId)` 只读取假设边界；`select(taskId)` 和 `settle(taskId, "satisfied" | "unsatisfied")` 返回
successor，保留原 state 即可比较分支。所有 DTO、transition result 与 handle 都是 frozen。

这个 public state 只表达 hypothetical admission：没有 Task、Promise、signal、取消、reservation、执行结果或 effect stream，
也不会写回真实 Run。完整 rejection precedence、binary settlement 与 live callback seed 的边界由
[深入 API 机制](./docs/api-mechanics.md#admissiongraph-simulation)拥有。

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

### 已准备的 custom strategy

当一次 Run 需要在 graph ready 后异步形成选择 closure，或需要在 sealed terminal measurement 上收尾时，使用
`strategy.kind: "prepared"`。其成功调用顺序是：

1. Invocation 对每个 graph-ready Run 一次调用 `prepare({ graph })`，得到只属于该 Run 的 `{ decide, complete? }`。
2. Scheduler 同步调用 returned `decide`，并独占所有 admission hard guard 与 Task lifecycle。
3. Scheduler seal terminal context 后，先运行启用的 internal summary 和所有 configured generic
   `scheduler.measurementHooks`。
4. Invocation 随后至多一次调用 optional `complete(context)`，并将实际 generic Hook/complete 的 settlement 写入既有
   `outputs.measurementHooks`。

`prepare` 的 public input 只有 frozen graph-ready facts；`complete` 的 public input 是 frozen
`SchedulerMeasurementContext`。调用方把需要的 host capability 捕获在 closure 中；Product 保留 state、logger、clock 和
Scheduler/Task control 的 owner。每个重叠 Run 都使用自己的 returned closure。prepare 失败会在 Scheduler 启动前形成
`admission-strategy-preparation-failed`；complete throw/reject 会令 `outputs.measurementHooks` 为 failed，但不会改写已经
sealed 的 primary facts。

```ts
import { defineAdmissionPolicy, defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

const events: string[] = [];
const check = defineCheck({
  checkId: "check",
  displayName: "Check",
  execution: () => ({ status: "passed" as const, data: {} })
});

const strategy = defineAdmissionPolicy({
  kind: "custom",
  strategy: {
    kind: "prepared",
    async prepare({ graph }) {
      const taskIds = new Set(graph.tasks.map((task) => task.taskId));
      await Promise.resolve();
      return {
        decide(context) {
          const candidate = context.candidates.find(
            ({ taskId, canAdmit }) => canAdmit && taskIds.has(taskId)
          );
          return candidate === undefined
            ? { kind: "wait" as const }
            : { kind: "select" as const, taskId: candidate.taskId };
        },
        complete(terminal) {
          if (!Object.isFrozen(terminal) || terminal.execution.settledTasks.length !== 1) {
            throw new Error("Expected one sealed terminal measurement");
          }
          events.push("complete");
        }
      };
    }
  }
});

const result = await run(
  defineConfig({
    checks: [check],
    outputs: {
      diagnosticLogging: { enabled: false },
      machinePublication: { enabled: false },
      progressRendering: { enabled: false }
    },
    scheduler: { admissionPolicy: strategy }
  })
);
if (result.kind !== "completed" || result.outputs.measurementHooks.status !== "succeeded") {
  throw new Error(`Run did not complete its prepared strategy: ${result.kind}`);
}
if (events.join(",") !== "complete") throw new Error("Prepared completion was not delivered");
```

### learned-critical-path 准入 policy

当同一项目会反复运行，并希望在**不改变**依赖、mutex、parallel budget 或 cancellation 规则的前提下，按本地历史时长
优先推进较长的后继路径时，设置 `scheduler.admissionPolicy` 为 `learned-critical-path`。`stateDirectory` 是 caller-owned
local state：非空、不得含 U+0000；relative path 从每次 `run` 的 effective `projectRoot` 解析，absolute path 直接使用。
它不是 sandbox、remote/cache service、锁、自动清理或 secret storage；请由项目自己选择可写、可删除且不含敏感路径成分的目录。

首次 Run 没有 history 仍可正常完成；v1 以 cold weight `1` 开始。后续 Run 使用 state directory 中按 model version、Check ID、
canonical authored options 与 effective flags 分桶的 digest-only local samples，当前实现优先同 identity 的 32-sample arithmetic mean、再用本次 Run 的 median prior，并最多保留
4096 个最近更新的 identity。窗口也计算 nearest-rank `p90` 以公开当前模型；它不替代 mean 进入 score。以上窗口、统计、file
envelope 和 heuristic 是当前优化实现说明，而非 storage/model compatibility commitment。`expectedDurationMs` 不是 v1 authoring
field。missing、malformed、incompatible 或 read-failed state 形成 learned cold/project-prior model；无法构造 canonical
prediction input，或 local setup、prediction 或 score table 时，该 invocation 回退 static selection；Scheduler 闭合后的 record/write
failure 只丢失未来样本。它们只在启用时记录有界
diagnostic，不改变本次质量结算，也不会向 Check facts、machine output 或 `RunResult` 增加 history 数据。完整状态流和算法边界见
[深入 API 机制](./docs/api-mechanics.md#learned-critical-path-准入)。

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

learned policy 先在同一 existing Scheduler selection layer 内比较 critical-path score；仅 score 相同时才使用已有
`admissionPriority`，最后按 Task ID，不能越过任何 Scheduler hard guard。详见[深入 API 机制](./docs/api-mechanics.md#learned-critical-path-准入)。

### 运行并读取结果

`run(definition, controls?)` 执行一次独立 invocation。常用 controls 包括 `projectRoot`、`flags`、`signal`、
`checkArtifactBaseDirectory`、`progressLogFile` 和仅对本次运行生效的 `outputs` overrides。`progressLogFile` 是本次 Run 的可选 transcript target，仍会保留终端呈现。需要让某个 Check 写 invocation-local artifact 时，
调用方显式设置 base；callback 只会得到自己的 absolute `artifactDirectory`（未设置时为 `null`），不会得到 sibling Check、
machine、diagnostic 或跨 Run state 的路径。

读取结果时分两层判断：

1. 先读取 `RunResult.kind`，确认 invocation 是完整结算、配置错误、规划失败、输出失败、执行失败还是被取消。
2. 对有 snapshot 的结果，按 `checkId` 查找 `snapshot.checks[].outcome`，再处理 `passed`、`failed`、`not-applicable` 或 `unavailable`。

合法运行中，即使某项 Check 返回 `failed`，Run 仍可能是 `kind: "completed"`。若 custom admission policy 发生 fault，结果是 `kind: "execution"` 且 `diagnostic.code` 为 `admission-policy-failed`；它不是 Check outcome，也不含 partial snapshot。如果 CI 需要因质量 Finding 退出非零状态，调用方必须像快速开始那样显式判断目标 outcome，或配置并读取 invocation-level aggregation。

## 输出与进阶用法

- [深入 API 机制](./docs/api-mechanics.md)说明 options preflight、依赖、组合、Finding presentation/waiver、console capture、cancellation 和 output failure 边界。
- [机器输出契约](./docs/output.md)说明 `run.json`、`records.ndjson` 和对应 schemas；只有需要把结果交给其他工具时才需要读取它。
- 精确 overload、泛型推断和字段 JSDoc 以安装包中的 `types/**.d.ts` 为准。

## 包内结构与调试

业务代码始终从 `@zxyycom/vibe-check` 导入。安装包中的 `index.mjs` 是公开 runtime entry，`types/**.d.ts` 提供 TypeScript declarations；source maps、`src/**.ts` 和可读的 `dist/esm/**.mjs` 用于堆栈定位与实现检查，不是额外的 public import path。

安装包还包含机器输出文档、v4 run / Record schemas 和一组完整 artifact example，便于需要消费机器结果的工具核对实际 bytes。

## 分发与兼容范围

npm 只负责分发和安装 package；受支持的产品 host 是 **Bun `>=1.3.14`**。通过 npm 安装不表示 Node.js runtime 已受支持。

当前 public contract 只有 `@zxyycom/vibe-check` package root 的程序化 API。CLI、`bin`、plugin API、CommonJS/browser entry 和 subpath imports 都不在支持范围内。

`0.0.x` patch 之间不承诺 package-level 兼容。项目应提交 lockfile，并在升级前检查对应版本的变更。Vibe Check 自有材料使用 MIT；安装包中的 `THIRD_PARTY_NOTICES.md` 与 `licenses/**` 承载翻译 analyzer 的适用第三方材料。
