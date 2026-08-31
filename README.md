# Vibe Check

Vibe Check 是由 consumer 项目在 **Bun** runtime 中调用的 TypeScript API。项目把一个质量动作定义为 **Check**，把 Checks 组成 **Project Definition**，再通过一次 **Run** 获得可审计结果。所有公开能力都从 `vibe-check` package root 导入，Definition 和 Run invocation 由 consumer 项目代码拥有。

本 README 直接列出常用自定义 API 的参数、默认值和可观察效果，并给出从 Check 定义到结果读取的完整最小路径。需要 options preflight、typed dependency、aggregation policy 或 output failure 的完整机制时，继续阅读[深入 API 机制](./docs/api-mechanics.md)；读取 `run.json` 与 `records.ndjson` 时，使用随包发布的[机器输出契约](./docs/output.md)；配置随包 Check 时，直接阅读对应的独立指南；查询精确 TypeScript overload 时，以 installed declarations 的 JSDoc 为准。

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
    diagnosticLogging: { enabled: false },
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

示例关闭三个 Run-owned outputs，以形成无文件写入、无 progress rendering 的独立调用。默认情况下，diagnostic logging 关闭；machine publication 与 progress rendering 开启，machine files 写到 project root 下的 `artifacts/vibe-check`。同一份 Definition 可以重复传给 `run`，每次调用都会形成独立的 invocation facts。

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

callback 可以同步返回或通过 `Promise` 返回四种 terminal status 之一。通用 API 的每个分支都**允许但不保证**附加有序的 `messages`；是否提供以及何时提供由 owning Check 决定：

| callback 返回值 | 含义与可观察结果 |
| --- | --- |
| `{ status: "passed", data, messages? }` | Check 完成并形成通过的主要终态数据。 |
| `{ status: "failed", data, messages? }` | Check 完成并形成失败的主要终态数据。 |
| `{ status: "not-applicable", reason?, messages? }` | 当前输入没有适用工作；可以附带 Check-owned reason code。 |
| `{ status: "unavailable", reason, messages? }` | Check 无法形成可信 final data；必须提供 Check-owned reason code。 |

`reason` 的形状是 `{ code: string }`，其中 `code` 非空；每条 message 的形状是 `{ level: "info" | "warning" | "error", code: string, message: string }`，其中 `code` 与 `message` 非空。Product 将 callback throw 或 malformed terminal result 转换为 owning Check 的 `unavailable` outcome。

`passed` / `failed` 的 final `data` 和 `records.report({ id }, data)` 的 Record data 使用 object-shaped canonical JSON：plain objects、dense arrays、finite numbers、strings、booleans 和 `null`。超出该数据 grammar 的 terminal data 或 Record 会把 owning Check 结算为 `unavailable`。

`data` 保存 Check 的主要终态事实；Records 保存 Check-local supplemental facts，每个 `id` 在 owning Check 内唯一；terminal `messages` 保存可选、有序的人读说明。consumer 分别读取这三类信息并解释业务含义，不能从 generic `CheckResult` 的类型推断某个 Check 一定携带 message。

### `defineConfig(value)`：组成可重复运行的 Definition

`defineConfig` 接受一个 Project Definition input，补齐默认值并返回 `ProjectDefinition`。它不会执行 Checks；`run` 会在 callback work 前验证 Definition 的 closed shape。

| `value` 字段 | 默认值 | 对 Run 的效果 |
| --- | --- | --- |
| `apiVersion` | `"1"` | 选择当前 Project Definition grammar。 |
| `checks` | `[]` | 提供递归 Check tree；只有带 `execution` 的节点产生 Check facts。 |
| `outputs.machinePublication.enabled` | `true` | 在 terminal snapshot 形成后发布 `run.json` 与 `records.ndjson`。 |
| `outputs.machinePublication.directory` | `"artifacts/vibe-check"` | 指定 machine files 目录；相对路径按本次 project root 解析。 |
| `outputs.diagnosticLogging.enabled` | `false` | 启用本次 invocation 的 Product core 人读诊断日志。 |
| `outputs.diagnosticLogging.directory` | `".log/vibe-check"` | 指定 invocation-specific `run-<UTC 紧凑时间>-<UUID>.log` 的目录；相对路径按本次 project root 解析。 |
| `outputs.progressRendering.enabled` | `true` | 呈现本次 Run 的人读 Check lifecycle 与汇总。 |
| `scheduler.maxParallel` | `4` | 设置 Check scheduler 的最外层并行预算；必须是正安全整数。 |

`outputs` 与 `scheduler` 的 nested fields 都可以只提供需要覆盖的部分；`defineConfig` 会补齐其余默认值。Definition 可以重复传给 `run`，而不会保存某次 invocation 的 flags、signal 或结果。

### `run(definition, controls?)`：执行一次 invocation

`run` 的第一个参数是 `defineConfig(...)` 返回的 Definition；第二个参数只控制当前 invocation。它先验证 Definition 与 controls，再准备 options、调度 Checks、结算 facts，并处理已启用 outputs，最终始终以 `Promise<RunResult>` 返回可判别结果。

| `controls` 字段 | 默认值 | 对当前 invocation 的效果 |
| --- | --- | --- |
| `projectRoot` | `process.cwd()` | 解析为绝对路径，并通过 `context.project.root` 提供给 Checks；相对 output 也以此为根。 |
| `flags` | `[]` | 接受非空 string tokens，复制、去重、排序后提供给每个 callback。 |
| `signal` | 未取消 | 把 caller 的 `AbortSignal` 传给 preflight 与 execution，并在 RunResult 中区分取消 phase。 |
| `outputs` | 使用 Definition outputs | 只覆盖本次 diagnostic logging、machine publication 或 progress rendering，不改写 Definition。 |
| `checkAggregation` | 不聚合，`aggregate` 为 `null` | 选择 Checks 及四态折叠 policy，在单项 outcomes 之外形成 invocation-level aggregate。 |

Definition 或 controls 的 unknown / invalid field 会得到 `kind: "configuration"`，并且不会调用 Check execution。合法调用的 Check 业务状态继续由每项 outcome 表达；`failed` Check 可以存在于成功完成的 `kind: "completed"` Run 中。

### 读取 Run 和 Check 结果

| 要判断的内容      | 读取位置                                                         | 处理方式                                                                  |
| ----------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Run lifecycle     | `RunResult.kind`                                                 | 先缩窄分支，再读取该分支提供的字段。                                      |
| 单项 Check 结果   | `snapshot.checks[].outcome`                                      | 按 `checkId` 找到 `passed`、`failed`、`not-applicable` 或 `unavailable`。 |
| 调用级 Check 结论 | `aggregate`                                                      | 在 `RunControls.checkAggregation` 中显式选择 policy 后读取。              |
| 补充与呈现事实    | `snapshot.records`、`checkMessages`、`checkDurations`、`outputs` | 按对应责任分别消费。                                                      |

对非 configuration result，启用的 diagnostic logging 通过
`outputs.diagnosticLogging` 返回 status 与 project-root-relative `file`；禁用时 `file` 为 `null`。它只供本次人工排障，
不应作为 machine input。配置、失败边界和完整读回规则见[深入 API 机制](./docs/api-mechanics.md#outputs-与-runresult-边界)。

`RunResult.kind` 的各分支表示 invocation lifecycle，而不是单项 Check 的业务通过或失败：

| `kind` | 可观察效果与处理入口 |
| --- | --- |
| `"completed"` | Checks 与已启用 outputs 均已完成；读取完整 snapshot、messages、durations、output statuses 与可选 aggregate。 |
| `"output"` | Check facts 已完整形成，但 diagnostic logging、machine publication 或 progress rendering 失败；读取 facts，并处理 `diagnostic` 指出的 output。 |
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

随包提供的七个导出都是返回普通 Check 的函数。除 `maintenanceReminders(entries)` 必须接收提醒条目外，其余函数都可无参调用并补齐默认 options。参数、默认值、结果和运行前提由表中的独立指南完整说明。

| 导出与 Check ID | 调用形式与主要效果 | 默认运行前提 |
| --- | --- | --- |
| [`duplicateDetection`](./docs/checks/duplicate-detection.md)；`duplicate-detection` | `duplicateDetection(options?)` 使用 jscpd 报告重复代码片段。 | package 解析并执行随安装依赖提供的兼容 jscpd v5。 |
| [`fileMetrics`](./docs/checks/file-metrics.md)；`file-metrics` | `fileMetrics(options?)` 使用 SCC 评估文件代码行指标。 | project runtime 可以执行兼容 SCC 3.7.0 version output 与 CSV contract 的 command；默认名为 `scc`。 |
| [`functionMetrics`](./docs/checks/function-metrics.md)；`function-metrics` | `functionMetrics(options?)` 使用 Lizard 评估函数规模、复杂度与参数数量。 | project runtime 可以执行兼容 Lizard 1.23 version output 与 CSV contract 的 command；默认名为 `lizard`。 |
| [`jsonValidation`](./docs/checks/json-validation.md)；`json-validation` | `jsonValidation(options?)` 严格验证自己选中的 JSON 文档。 | 只读取本地文件，不执行外部 command，不发起网络请求。 |
| [`jsonSchemaValidation`](./docs/checks/json-schema-validation.md)；`json-schema-validation` | `jsonSchemaValidation(options?)` 按显式 schema 与 binding 验证 JSON instances。 | 默认离线；只有显式 allowlisted HTTPS source 才会发起网络请求。 |
| [`markdownLinkValidation`](./docs/checks/markdown-link-validation.md)；`markdown-link-validation` | `markdownLinkValidation(options?)` 离线验证本地 Markdown 链接与锚点。 | 只读取经过 policy 授权的本地路径，不执行外部 command 或网络请求。 |
| [`maintenanceReminders`](./docs/checks/maintenance-reminders.md)；`maintenance-reminders` | `maintenanceReminders(entries)` 按 Git first-parent 历史提示维护复核。 | project root 是 Git repository，且 runtime 可以执行 `git`。 |

六个 defaulting constructor 会同步拒绝 unknown 或非法 authoring fields；`maintenanceReminders` 在 Run 的全局 preflight barrier 中验证 entries。显式数组是完整替换值；constructor 返回后若用普通对象组合替换 `check.options`，替换值必须是完整 resolved shape。

六个读取项目文件的 constructor 共用并从 package root 导出深冻结的 `defaultProjectFileSelection`。它是可组合的通用
基线，排除常见 VCS/Product state、dependency、build/generated、cache、coverage、log、temporary 与
virtual-environment paths。`duplicateDetection`、`fileMetrics` 与 `jsonSchemaValidation` 原样采用它；
`functionMetrics`、`jsonValidation` 与 `markdownLinkValidation` 则保留相同 source/exclude，并派生各自支持类型的精准默认
include。

显式数组始终完整替换 owning Check 的对应默认值。显式宽泛 include 选中但不受支持的每个路径会成为 non-blocking
`input-rejected` Record，而不是被静默丢弃。需要追加项目排除时，可组合
`{ ...defaultProjectFileSelection, exclude: [...defaultProjectFileSelection.exclude, "**/fixtures/**"] }`，而不复制整份默认
数组或修改全局状态。

`duplicateDetection`、`fileMetrics`、`functionMetrics` 与 `markdownLinkValidation` 的 normal Finding 默认 non-blocking：Check 保留 Records/final data、返回 `passed` 并附 warning。要让 Finding 直接使该 Check `failed`，请显式设置 `findingPolicy: "blocking"`；Run aggregation 仍只消费各 Check 最终 status。

[`reconcileFindingWaivers({ findings, identify, waivers })`](./docs/api-mechanics.md#finding-waiver-reconciliation) 是独立的公开 helper，供 custom Check author 在完整 finding 集合形成后按自己选择的稳定语义 identity 对账 waiver。它的输入、audit、materialized evidence 与错误边界见该 API section；`fileMetrics` 已采用它，其声明式 `findingWaivers` 与 Record/audit 语义见对应指南。

每项随包 Check 都在返回对象上提供 `parseData(unknown)`，并从 package root 导出同一 final-data parser 与相关类型；具体名称见对应指南。parser 只处理 `passed` / `failed` 的单项 final data，不验证 machine bytes。随包 Check 自己结算的失败、不可用和 non-blocking finding 会附带可操作 message；通用 API 和自定义 Check 仍只保证可选的 `messages?`。

三个 area-based 代码质量 Check 都用 `codeAreas[id]` 组合文件范围、阈值与 `blocking | non-blocking` policy；Markdown Link 在顶层拥有同类 Finding policy。每项指南分别拥有该 Check 的指标和 scanner options。consumer 按目标 Check 的指南配置，imports 始终使用 `vibe-check` package root。

## 包内结构与源码恢复

安装包根部的 `index.mjs` 是公开 runtime entry，并转发到可读的 `dist/esm/**.mjs` 实现模块；`types/**.d.ts` 提供 TypeScript declarations。每个 runtime module 都有对应 source map，`src/**.ts` 保留生成模块的 Product source，供实现检查和堆栈定位。`docs/output.md`、当前 v4 run / Record schemas，以及一组由 TypeScript Definition 支撑、混合内置与自定义 Check 的完整 artifact example 也随包发布，供 machine consumer 在安装目录内直接核对输入、契约和输出 bytes。

consumer code 从 `vibe-check` 导入；`dist/**`、`types/**` 和 `src/**` 用于 package inspection、类型解析与调试。

## 分发与兼容范围

当前经过验证的分发物是仓库生成的 exact local candidate 与对应 tarball。registry channel 尚未发布；现阶段使用构建流程提供的精确 candidate version，正式 release 后以 release 说明中的 exact `0.0.x` version 安装。`0.0.x` patch 之间不承诺 package-level 兼容，consumer 应精确锁定所选版本。

当前 public contract 是由 **Bun `>=1.3.14`** 直接 import 的 TypeScript root API；通过 npm 分发不表示 Node.js host 已受支持。CLI、Node.js host、plugin API 与 subpath imports 位于该 public contract 之外。Package 使用 MIT license，tarball 中的 `LICENSE` 保留 `Copyright (c) 2026 zxyycom` notice。
