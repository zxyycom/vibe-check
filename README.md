# Vibe Check

Vibe Check 是由 consumer 项目在 **Bun** runtime 中调用的 TypeScript API。项目把一个质量动作定义为 **Check**，把 Checks 组成 **Project Definition**，再通过一次 **Run** 获得可审计结果。所有公开能力都从 `vibe-check` package root 导入，Definition 和 Run invocation 由 consumer 项目代码拥有。

本 README 完整说明常见的自定义 Check 路径和结果读取方式。需要 options preflight、typed dependency、aggregation、outputs 或完整失败分支时，继续阅读[深入 API 机制](./docs/api-mechanics.md)；配置随包 Check 时，直接阅读对应的独立指南；查询单个类型、字段或函数签名时，以 installed declarations 的 JSDoc 为准。

## 用自定义 Check 完成一次 Run

三个核心术语对应三个责任：

- **Check** 是一个普通对象，拥有稳定 `checkId`、人读名称、可选 options 和可选 `execution` callback。可执行 Check 最终形成自己的 terminal outcome。
- **Project Definition** 是可重复执行的声明式输入，包含 Checks、output defaults 与 scheduler policy。
- **Run** 是 `run(definition, controls?)` 发起的一次 invocation。project context、prepared options、Check outcomes 和 output statuses 都是本次 Run 的事实。

按以下顺序完成常见集成：

1. 用 `defineCheck(value)` 保留 literal `checkId`、options 和 final data 的 TypeScript inference。符合 `Check` contract 的普通对象也可以直接进入 Definition。
2. 用 `defineConfig({ checks })` 组成 Project Definition，并补齐 `apiVersion`、outputs 与 scheduler defaults。
3. 用 `run(definition, controls?)` 验证并规范化 Definition 与本次 controls，再执行 Check callbacks。
4. 先按 `RunResult.kind` 读取 Run lifecycle；`completed` 分支提供完整 snapshot，再从中读取目标 Check outcome。

下面的 Check 读取本次 Run 的 `changedFiles`，筛选自己的 source scope，发布一条 supplemental Record，并用 final data 表示实际统计结果：

```ts
import { defineCheck, defineConfig, run } from "vibe-check";

const sourceChangeSummary = defineCheck({
  checkId: "source-change-summary",
  displayName: "Source change summary",
  options: { sourcePrefix: "src/" },
  execution({ options, project, records }) {
    const files = project.changedFiles.filter((path) => path.startsWith(options.sourcePrefix));
    if (files.length === 0) {
      return { status: "not-applicable", reason: { code: "no-source-changes" } };
    }

    records.report({ id: "changed-source-files" }, { files });
    return { status: "passed", data: { changedSourceFileCount: files.length } };
  }
});

const definition = defineConfig({
  checks: [sourceChangeSummary],
  outputs: {
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});

const result = await run(definition, { changedFiles: ["src/index.ts"] });
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
const outcome = result.snapshot.checks.find(
  ({ checkId }) => checkId === sourceChangeSummary.checkId
)?.outcome;
if (outcome?.status !== "passed" || outcome.data.changedSourceFileCount !== 1) {
  throw new Error("Source change summary did not produce the expected result");
}
```

示例选择关闭两个 Run-owned outputs，以形成无文件写入和无 progress rendering 的独立调用。项目也可以保留默认 outputs：machine publication 与 progress rendering 默认启用，machine files 写到 project root 下的 `artifacts/vibe-check`。同一份 Definition 可以重复传给 `run`，每次调用都会形成独立的 invocation facts。

### Check callback 形成的事实

`execution(context)` 可以读取本 Check 的 immutable prepared `options`、项目 `root` / `changedFiles` / `flags`、已声明 direct dependencies、同一次调用的 cancellation signal，以及 `records.report(...)`。callback 返回四种 terminal status 之一：

| Check status     | 含义与可观察结果                                     |
| ---------------- | ---------------------------------------------------- |
| `passed`         | Check 完成并形成通过的 `data`。                      |
| `failed`         | Check 完成并形成失败的 `data`。                      |
| `not-applicable` | 当前输入没有适用工作，可附受控 `reason`。            |
| `unavailable`    | Check 无法形成可信 final data，并提供受控 `reason`。 |

`passed` / `failed` 的 final `data` 和 `records.report({ id }, data)` 的 Record data 使用 object-shaped canonical JSON：plain objects、dense arrays、finite numbers、strings、booleans 和 `null`。超出该数据 grammar 的 terminal data 或 Record 会把 owning Check 结算为 `unavailable`。

`data` 保存 Check 的主要终态事实；Records 保存 Check-local supplemental facts，每个 `id` 在 owning Check 内唯一；terminal `messages` 保存有序的人读说明。consumer 分别读取这三类信息并解释业务含义。

### 读取 Run 和 Check 结果

| 要判断的内容      | 读取位置                                                         | 处理方式                                                                  |
| ----------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Run lifecycle     | `RunResult.kind`                                                 | 先缩窄分支，再读取该分支提供的字段。                                      |
| 单项 Check 结果   | `snapshot.checks[].outcome`                                      | 按 `checkId` 找到 `passed`、`failed`、`not-applicable` 或 `unavailable`。 |
| 调用级 Check 结论 | `aggregate`                                                      | 在 `RunControls.checkAggregation` 中显式选择 policy 后读取。              |
| 补充与呈现事实    | `snapshot.records`、`checkMessages`、`checkDurations`、`outputs` | 按对应责任分别消费。                                                      |

`kind: "completed"` 表示 Run lifecycle 和已启用 outputs 已完成；Check 的业务结论由每项 outcome 或显式 aggregate 表达。`kind: "output"` 保留完整 Check facts，并附带 output failure diagnostic。其它结果分支及 cancellation phase 见[outputs 与 RunResult 边界](./docs/api-mechanics.md#outputs-与-runresult-边界)。

### 组合多个 Check

`checks` 可以递归组织信息节点和可执行叶子；`dependsOn` 声明 final-data / scheduling dependency，`mutex` 与 `maxParallel` 声明调度约束。普通对象组合用于替换 display name、完整 `options` 或集合字段；`inherit({ add, remove })` 用于在父集合基础上增删 `dependsOn` / `mutex`。

options preparation、blocked Check、typed dependency parsing、aggregation、output failure 和 cancellation 的完整机制由[深入 API 机制](./docs/api-mechanics.md)说明。

## 随包提供的 Check

随包导出使用同一个 Check / execution contract。`jsonValidation`、`jsonSchemaValidation` 与
`markdownLinkValidation` 是可直接放入 `checks` 的完整 Check values；`duplicateDetection(options?)`、
`fileMetrics(options?)`、`functionMetrics(options?)` 与 `maintenanceReminders(entries)` 是返回普通 Check 的专用构造函数。

| 导出                     | 用途与独立说明                                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `duplicateDetection`     | 以带默认值的 policy 构造 jscpd 重复检测 Check；见[`duplicateDetection` 指南](./docs/checks/duplicate-detection.md)。 |
| `fileMetrics`            | 使用 scc 评估文件 code-line 指标；见[`fileMetrics` 指南](./docs/checks/file-metrics.md)。                            |
| `functionMetrics`        | 以带默认值的 area 与 finding policy 构造 Lizard 函数指标 Check；见[`functionMetrics` 指南](./docs/checks/function-metrics.md)。 |
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
