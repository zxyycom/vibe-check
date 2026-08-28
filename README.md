# Vibe Check

Vibe Check 是由 consumer 项目在 **Bun** runtime 中调用的 TypeScript API。项目把一个质量动作定义为 **Check**，把 Checks 组成 **Project Definition**，再通过一次 **Run** 获得可审计结果。所有公开能力都从 `vibe-check` package root 导入，Definition 和 Run invocation 由 consumer 项目代码拥有。

本 README 直接列出常用自定义 API 的参数、默认值和可观察效果，并给出从 Check 定义到结果读取的完整最小路径。需要 options preflight、typed dependency、aggregation policy 或 output failure 的完整机制时，继续阅读[深入 API 机制](./docs/api-mechanics.md)；配置随包 Check 时，直接阅读对应的独立指南；查询精确 TypeScript overload 时，以 installed declarations 的 JSDoc 为准。

## 自定义 Check 快速开始

三个核心术语对应三个责任：

- **Check** 是一个普通对象，拥有稳定 `checkId`、人读名称、可选 options 和可选 `execution` callback。可执行 Check 最终形成自己的 terminal outcome。
- **Project Definition** 是可重复执行的声明式输入，包含 Checks、output defaults 与 scheduler policy。
- **Run** 是 `run(definition, controls?)` 发起的一次 invocation。project context、prepared options、Check outcomes 和 output statuses 都是本次 Run 的事实。

按以下顺序完成常见集成：

1. 用 `defineCheck(value)` 保留 literal `checkId`、options 和 `parseData` return type 的 TypeScript inference。符合 `Check` contract 的普通对象也可以直接进入 Definition。
2. 用 `defineConfig({ checks })` 组成 Project Definition，并补齐 `apiVersion`、outputs 与 scheduler defaults。
3. 用 `run(definition, controls?)` 验证并规范化 Definition 与本次 controls，再执行 Check callbacks。
4. 先按 `RunResult.kind` 读取 Run lifecycle；`completed` 分支提供完整 snapshot，再从中读取目标 Check outcome。

下面的 `bundle-size` Check 把本 Check 的输入与阈值放在 `options`，用一条 supplemental Record 保存被评估的 artifact，并用 final data 表示大小评估的主要结果：

```ts
import { defineCheck, defineConfig, run } from "vibe-check";

const bundleSize = defineCheck({
  checkId: "bundle-size",
  displayName: "Bundle size",
  options: {
    actualBytes: 82_000,
    artifactPath: "build/app.mjs",
    maximumBytes: 100_000
  },
  execution({ options, records }) {
    records.report({ id: "artifact-input" }, { path: options.artifactPath });
    const data = {
      actualBytes: options.actualBytes,
      maximumBytes: options.maximumBytes
    };
    return options.actualBytes <= options.maximumBytes
      ? { status: "passed", data }
      : { status: "failed", data };
  }
});

const definition = defineConfig({
  checks: [bundleSize],
  outputs: {
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
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

示例选择关闭两个 Run-owned outputs，以形成无文件写入和无 progress rendering 的独立调用。项目也可以保留默认 outputs：machine publication 与 progress rendering 默认启用，machine files 写到 project root 下的 `artifacts/vibe-check`。同一份 Definition 可以重复传给 `run`，每次调用都会形成独立的 invocation facts。

## 基础 API 的参数与效果

### `defineCheck(value)`：声明一个 Check

`defineCheck` 接受一个普通 Check object，并返回保留 literal inference 的同一 authoring value。运行时 validation、options snapshot 与执行发生在 `run`。Check object 可以是带 `execution` 的执行节点、只带子 `checks` 的组织节点，或同时承担两种责任。

| `value` 字段 | 是否必需与默认值 | 对 Run 的效果 |
| --- | --- | --- |
| `checkId` | 必需；非空，并在同一 Definition 中保持唯一 | 作为 outcome、Record、dependency、message 与 duration 的稳定 Check identity。 |
| `displayName` | 必需；非空 | 作为 progress 与人读结果中的名称。 |
| `execution(context)` | 执行节点必需；组织节点省略 | 使当前节点产生一个 terminal Check outcome；省略时当前节点只组织子 `checks`，自身不产生 outcome。 |
| `options` | 执行节点可选；默认 `{}` | Run 将其复制为 canonical、deep-readonly 的 invocation-local value，再通过 `context.options` 交给本 Check。 |
| `checks` | 可选；默认无子节点 | 递归包含子 Check，并把当前节点的 scheduling context 传给 descendants。 |
| `preflight(options, signal)` | 可选 | Run 先完成所有 Check 的 preflight 全局 barrier；整个 barrier 结束后，任一 Check 才能开始 execution。当前 Check 的 preflight 可以准备 options，或把当前 Check 结算为 `unavailable`。 |
| `dependsOn` | 可选；根节点默认 `[]`，子节点默认继承父集合 | 声明 direct prerequisite Check IDs；同时决定调度顺序，并授权 `context.dependencies.get(checkId)` 读取 direct dependency final data。 |
| `maxParallel` | 可选；继承上层预算 | 用正安全整数限制当前节点及 descendants 的并行预算。最外层预算来自 Definition scheduler，默认 `4`。 |
| `mutex` | 可选；根节点默认 `[]`，子节点默认继承父集合 | 声明共享资源名称；持有同一 mutex 的 Checks 不会并行执行。 |
| `visibility` | 执行节点可选；默认 `"always"` | `"attention"` 会在 progress 中隐藏无 messages 的 passed 行；不改变 outcome、Records 或 machine output。 |
| `parseData(data)` | 可选 | 建立 typed-provider final-data contract；依赖方读取 canonical data 后显式调用它恢复 provider type。 |

执行节点的 `options` 是 owning Check 的完整配置对象；普通对象组合会完整替换该字段。`dependsOn` 与 `mutex` 的显式数组同样替换 inherited collection；需要基于父集合增删时使用 [`inherit({ add, remove })`](#组合多个-check)。`preflight` 与 `parseData` 的结果分支和类型边界见[深入 API 机制](./docs/api-mechanics.md)。

### `execution(context)`：读取输入并形成 Check 结果

Run 传给 callback 的 `context` 恰好包含以下字段：

| `context` 字段 | callback 获得的值与用途 |
| --- | --- |
| `options` | 当前 Check 的 immutable prepared options；未声明 options 时为 `{}`。 |
| `project.root` | 本次 Run 使用的绝对 project root。 |
| `project.flags` | caller flags 去重并按字典序排序后的只读数组。 |
| `dependencies.get(checkId)` | 读取已声明 direct dependency 的 canonical final data；未声明或 upstream 没有 final data 时返回 `ok: false`。 |
| `records.report({ id }, data)` | 为当前 Check 写入 supplemental Record；`id` 在当前 Check 内唯一，Record 不决定 terminal status。 |
| `signal` | 本次 invocation 的 `AbortSignal`，供 preflight 与 execution 协作取消。 |

callback 可以同步返回或通过 `Promise` 返回四种 terminal status 之一；所有分支都可以附加有序的 `messages`：

| callback 返回值 | 含义与可观察结果 |
| --- | --- |
| `{ status: "passed", data, messages? }` | Check 完成并形成通过的主要终态数据。 |
| `{ status: "failed", data, messages? }` | Check 完成并形成失败的主要终态数据。 |
| `{ status: "not-applicable", reason?, messages? }` | 当前输入没有适用工作；可以附带 Check-owned reason code。 |
| `{ status: "unavailable", reason, messages? }` | Check 无法形成可信 final data；必须提供 Check-owned reason code。 |

`reason` 的形状是 `{ code: string }`，其中 `code` 非空；每条 message 的形状是 `{ level: "info" | "warning" | "error", code: string, message: string }`，其中 `code` 与 `message` 非空。Product 将 callback throw 或 malformed terminal result 转换为 owning Check 的 `unavailable` outcome。

`passed` / `failed` 的 final `data` 和 `records.report({ id }, data)` 的 Record data 使用 object-shaped canonical JSON：plain objects、dense arrays、finite numbers、strings、booleans 和 `null`。超出该数据 grammar 的 terminal data 或 Record 会把 owning Check 结算为 `unavailable`。

`data` 保存 Check 的主要终态事实；Records 保存 Check-local supplemental facts，每个 `id` 在 owning Check 内唯一；terminal `messages` 保存有序的人读说明。consumer 分别读取这三类信息并解释业务含义。

### `defineConfig(value)`：组成可重复运行的 Definition

`defineConfig` 接受一个 Project Definition input，补齐默认值并返回 `ProjectDefinition`。它不会执行 Checks；`run` 会在 callback work 前验证 Definition 的 closed shape。

| `value` 字段 | 默认值 | 对 Run 的效果 |
| --- | --- | --- |
| `apiVersion` | `"1"` | 选择当前 Project Definition grammar。 |
| `checks` | `[]` | 提供递归 Check tree；只有带 `execution` 的节点产生 Check facts。 |
| `outputs.machinePublication.enabled` | `true` | 在 terminal snapshot 形成后发布 `run.json` 与 `records.ndjson`。 |
| `outputs.machinePublication.directory` | `"artifacts/vibe-check"` | 指定 machine files 目录；相对路径按本次 project root 解析。 |
| `outputs.progressRendering.enabled` | `true` | 呈现本次 Run 的人读 Check lifecycle 与汇总。 |
| `scheduler.maxParallel` | `4` | 设置 Check scheduler 的最外层并行预算；必须是正安全整数。 |

`outputs` 与 `scheduler` 的 nested fields 都可以只提供需要覆盖的部分；`defineConfig` 会补齐其余默认值。Definition 可以重复传给 `run`，而不会保存某次 invocation 的 flags、signal 或结果。

### `run(definition, controls?)`：执行一次 invocation

`run` 的第一个参数是 `defineConfig(...)` 返回的 Definition；第二个参数只控制当前 invocation。它先验证 Definition 与 controls，再准备 options、调度 Checks、结算 facts，并处理已启用 outputs，最终始终以 `Promise<RunResult>` 返回可判别结果。

| `controls` 字段 | 默认值 | 对当前 invocation 的效果 |
| --- | --- | --- |
| `projectRoot` | `process.cwd()` | 解析为绝对路径，并通过 `context.project.root` 提供给 Checks；相对 machine output 也以此为根。 |
| `flags` | `[]` | 接受非空 string tokens，复制、去重、排序后提供给每个 callback。 |
| `signal` | 未取消 | 把 caller 的 `AbortSignal` 传给 preflight 与 execution，并在 RunResult 中区分取消 phase。 |
| `outputs` | 使用 Definition outputs | 只覆盖本次 machine publication 或 progress rendering，不改写 Definition。 |
| `checkAggregation` | 不聚合，`aggregate` 为 `null` | 选择 Checks 及四态折叠 policy，在单项 outcomes 之外形成 invocation-level aggregate。 |

Definition 或 controls 的 unknown / invalid field 会得到 `kind: "configuration"`，并且不会调用 Check execution。合法调用的 Check 业务状态继续由每项 outcome 表达；`failed` Check 可以存在于成功完成的 `kind: "completed"` Run 中。

### 读取 Run 和 Check 结果

| 要判断的内容      | 读取位置                                                         | 处理方式                                                                  |
| ----------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Run lifecycle     | `RunResult.kind`                                                 | 先缩窄分支，再读取该分支提供的字段。                                      |
| 单项 Check 结果   | `snapshot.checks[].outcome`                                      | 按 `checkId` 找到 `passed`、`failed`、`not-applicable` 或 `unavailable`。 |
| 调用级 Check 结论 | `aggregate`                                                      | 在 `RunControls.checkAggregation` 中显式选择 policy 后读取。              |
| 补充与呈现事实    | `snapshot.records`、`checkMessages`、`checkDurations`、`outputs` | 按对应责任分别消费。                                                      |

`RunResult.kind` 的各分支表示 invocation lifecycle，而不是单项 Check 的业务通过或失败：

| `kind` | 可观察效果与处理入口 |
| --- | --- |
| `"completed"` | Checks 与已启用 outputs 均已完成；读取完整 snapshot、messages、durations、output statuses 与可选 aggregate。 |
| `"output"` | Check facts 已完整形成，但 machine publication 或 progress rendering 失败；读取 facts，并处理 `diagnostic` 指出的 output。 |
| `"configuration"` | Definition、RunControls 或 aggregation selection 无效；读取字段路径 diagnostic，Check execution 未开始。 |
| `"planning"` | Definition 已验证，但 task graph 无法形成；读取 planning diagnostic。 |
| `"execution"` | invocation infrastructure 未能完成可信 settlement；读取 execution diagnostic。 |
| `"cancelled"` | caller signal 终止 invocation；按 `phase` 判断是否还提供 execution snapshot。 |

各分支的精确字段、cancellation phase 与 output failure 边界见[深入 API 机制](./docs/api-mechanics.md#outputs-与-runresult-边界)。

### 组合多个 Check

`checks` 可以递归组织信息节点和可执行节点；container 自身不形成 outcome，但会把 `dependsOn`、`mutex` 与 `maxParallel` 的 scheduling context 传给 descendants。声明顺序不等于执行顺序；scheduler 同时遵守 dependencies、mutexes 和 effective parallel budget。

`dependsOn` 与 `mutex` 有三种组合方式：

| 子 Check 写法 | 对 inherited collection 的效果 |
| --- | --- |
| 省略字段 | 保留父节点的 effective collection。 |
| `dependsOn: [...]` / `mutex: [...]` | 用给定数组完整替换父集合；`[]` 表示清空。 |
| `inherit({ add, remove })` | 在父集合上显式添加和移除条目。 |

options preparation、blocked Check、typed dependency parsing、aggregation、output failure 和 cancellation 的完整机制由[深入 API 机制](./docs/api-mechanics.md)说明。

## 随包提供的 Check

随包导出使用同一个 Check / execution contract。`jsonValidation`、`jsonSchemaValidation` 与
`markdownLinkValidation` 是可直接放入 `checks` 的完整 Check values；`duplicateDetection(options?)`、
`fileMetrics(options?)`、`functionMetrics(options?)` 与 `maintenanceReminders(entries)` 是返回普通 Check 的专用构造函数。

| 导出                     | 用途与独立说明                                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `duplicateDetection`     | 使用 jscpd 报告重复代码片段；见[`duplicateDetection` 指南](./docs/checks/duplicate-detection.md)。                    |
| `fileMetrics`            | 使用 SCC 评估文件代码行指标；见[`fileMetrics` 指南](./docs/checks/file-metrics.md)。                                |
| `functionMetrics`        | 使用 Lizard 评估函数规模、复杂度与参数数量；见[`functionMetrics` 指南](./docs/checks/function-metrics.md)。           |
| `jsonValidation`         | 严格验证 Check 自己选中的 JSON 文档；见[`jsonValidation` 指南](./docs/checks/json-validation.md)。                   |
| `jsonSchemaValidation`   | 按显式 schema 与 binding 验证 JSON 实例；见[`jsonSchemaValidation` 指南](./docs/checks/json-schema-validation.md)。  |
| `markdownLinkValidation` | 离线验证本地 Markdown 链接与锚点；见[`markdownLinkValidation` 指南](./docs/checks/markdown-link-validation.md)。     |
| `maintenanceReminders`   | 按 Git first-parent 历史提示维护复核；见[`maintenanceReminders` 指南](./docs/checks/maintenance-reminders.md)。      |

每份指南负责该 Check 的完整初始 options、工作过程、terminal effects、可用性、安全边界、最小用法和适用边界。consumer imports 继续使用 `vibe-check` package root。

## 包内结构与源码恢复

安装包根部的 `index.mjs` 是公开 runtime entry，并转发到可读的 `dist/esm/**.mjs` 实现模块；`types/**.d.ts` 提供 TypeScript declarations。每个 runtime module 都有对应 source map，`src/**.ts` 保留生成模块的 Product source，供实现检查和堆栈定位。

consumer code 从 `vibe-check` 导入；`dist/**`、`types/**` 和 `src/**` 用于 package inspection、类型解析与调试。

## 分发与兼容范围

当前经过验证的分发物是仓库生成的 exact local candidate 与对应 tarball。registry channel 尚未发布；现阶段使用构建流程提供的精确 candidate version，正式 release 后以 release 说明作为安装和兼容依据。

当前 public contract 是本文说明的 Bun / TypeScript root API。CLI、Node.js host、plugin API 与 subpath imports 位于该 public contract 之外。
