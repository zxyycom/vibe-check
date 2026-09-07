# Vibe Check

Vibe Check 是通用 TypeScript 质量门禁工具，提供可组合 Check、类型安全 API 和结构化结果。你可以直接使用随包提供的代码、JSON、Schema、Markdown 和维护检查，也可以把项目自己的规则写成 Check，然后在项目脚本、测试或 CI 中运行它们。

所有公开能力都从 `@zxyycom/vibe-check` package root 导入。Vibe Check 不要求额外的配置文件，也不提供 CLI：检查内容、组合方式和运行时机都由你的 TypeScript 代码决定。

## 安装

```sh
npm install @zxyycom/vibe-check
```

npm 负责安装 package；应用代码和质量脚本的最低运行要求是 **Node `>=24.18`**。安装完成后，可以用 `node <file>` 运行下面的示例。

## 选择起步路径

- **使用随包 Check**：从下方的 Check 索引选择所需规则；每份指南说明 options、结果和运行前提。
- **编写自定义 Check**：从后面的最小示例开始，再按需要阅读生命周期与 callback 指南。

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

## 共享的 files 选择语义

`duplicateDetection`、`fileMetrics`、`functionMetrics` 与 `secretDetection` 都用 `files` 指定 Check-owned 的 project 文件范围。它不是 Product-wide setting、跨 Check cache 或新 public file tool；`files` 在 options 的位置、是否必填、默认值、accepted/rejected input 和后续 I/O 继续由对应 Check guide 拥有。

共同 shape 是 `{ source, include, exclude }`。`source` 只能是 `"filesystem"` 或 `"git-worktree"`：前者枚举普通文件且不解释 `.gitignore`，后者使用已跟踪文件和未被 Git 标准忽略规则排除的未跟踪文件。两种 source 都是显式选择；不能形成候选快照时 owning Check 以 `unavailable` 结算，不会改用另一种 source。

`include` 与 `exclude` 都以 project-root-relative、使用 `/` 的 path glob 匹配，且 `exclude` 优先。显式数组完整替换该 Check 的相应默认值：`include: []` 不选择路径，`exclude: []` 不排除路径。只有需要保留某 Check 的公开默认排除时，才从 `defaultProjectFileSelection` 显式组合。各 Check 的 area semantics、eligibility、精确输入、coverage 与安全处理并不相同，应继续阅读其指南。

`markdownLinkValidation` 的 cache 只是 opt-in local performance state：它可能保存 source-derived link destination、heading
slug 与 range，不提供 confidentiality 或 automatic cleanup。调用方只有在接受这项 material 并拥有目录生命周期时，才传入
`cache: { enabled: true, directory: "/absolute/removable/cache" }`；完整 option、failure 与 memo boundary 见其 Check guide。

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
node quality.ts
```

`RunResult.kind === "completed"` 表示这次 Run 已经完整结算，不等于其中每项 Check 都通过。示例继续读取 `bundle-size` 的 `outcome.status`，并在结果不符合预期时让脚本失败。

## Package 预提供的可选工具

除核心 Definition / Run API 与随包 Check constructors 外，package root 还提供以下可由项目代码或自定义 Check
显式调用的工具。调用方在项目代码或自定义 Check 中明确接入；下表说明各自的返回值和接入点。

| 目的 | 工具与接入方式 | 详解 |
| --- | --- | --- |
| 按完整语义 key 复用本地 JSON 计算 | `cacheJsonByKey(...)` 在普通项目代码或 Check 内返回一次调用的缓存结果 | [缓存计算结果](./docs/guides/cache-results.md) |
| 对账完整 Finding 集合与 waiver audit | `reconcileFindingWaivers(...)` 在 Finding 形成后返回 disposition 与 audit | [对账 Finding waiver](./docs/guides/finding-waivers.md) |
| 生成有限的 Finding 人读摘要 | `presentCheckFindings(...)` 返回 `CheckMessage[]`，由 producing Check 附到自己的 terminal result | [呈现 Check Finding](./docs/guides/presenting-findings.md) |
| 在不执行 Check 的前提下分析静态 admission 分支 | `createAdmissionGraph(...)` 独立创建 immutable simulation，不需要 `run(...)` 或 custom policy | [模拟 AdmissionGraph](./docs/guides/scheduling.md#模拟-admissiongraph) |
| 为重复 Run 准备基于本地时长 history 的选择策略 | `createLearnedCriticalPathStrategy(...)` 的返回值接入 `scheduler.admissionPolicy` 的 custom strategy | [learned critical-path strategy](./docs/guides/scheduling.md#learned-critical-path-strategy) |

`defineCheck`、`defineConfig`、`defineAdmissionPolicy` 与 `inherit` 用于 Definition authoring，`run` 执行一次 invocation。各随包 Check 的 `parse…Data` 导出用于解析该 Check 的 final data；其输入和结果由相应 Check 指南及 installed declarations 说明。此表提供通用可选工具的入口，完整 public export 仍以 installed declarations 为准。

## Project Definition 与 Run API

无论 Definition 只含随包 Check，还是也含自定义 Check，调用主线都是组成 Definition、运行一次 invocation，再读取结果。本节说明两类调用方共用的 defaults、调度与结果边界。

### 组成 Project Definition

`defineConfig({ checks, ... })` 会补齐 outputs 和 scheduler 的默认值。同一份 Definition 可安全用于多次 `run(...)`；需要只改变某个 nested field 时，只写该 field 即可。

| 配置 | 默认值 | 效果 |
| --- | --- | --- |
| `outputs.progressRendering.enabled` | `true` | 在终端呈现 Check 生命周期与汇总。 |
| `outputs.machinePublication.enabled` | `true` | 把 `run.json` 与 `records.ndjson` 写入 `artifacts/vibe-check`。 |
| `outputs.diagnosticLogging.enabled` | `false` | 为本次 invocation 写入维护者诊断日志。 |
| `scheduler.maxParallel` | `4` | 限制最外层 Check 并行数。 |
| `scheduler.resourceCapacities` | `{}` | 声明本次 Run 中可由 Check 原子占用的 named resource 总 units。 |
| `scheduler.admissionPolicy` | `{ kind: "static" }` | 按静态图与当前 ready facts 选择 task。 |

machine publication 与 diagnostic logging 的 `directory` 都是调用方选择的 target：相对路径从这次 effective `projectRoot` 解析，绝对路径直接使用。它们不是 sandbox、目录清空或 containment 承诺；可移植的 Definition 优先使用相对路径，将 invocation-specific 绝对 target 放入 `run(..., { outputs })`。

### 调度多个 Check 与终态统计

默认静态调度已经保证 `dependsOn`、`observes`、mutex、root/scoped 并行预算、named resource capacity 和取消边界。用 `mutex` 为需要互斥执行的 Task 声明同一个逻辑组名称；同一互斥名称下，同一时刻最多运行一个 Task。`scheduler.maxParallel` 限制总 slot，`resourceClaims` 则按 units 占用已声明的 named resource。需要表达有限容量时，先在 `scheduler.resourceCapacities` 声明总量，再由 Check 的 `resourceClaims` 声明从 admission 到 settlement 持有的 units；完整 grammar、继承和示例见[按项目约束调度 Check](./docs/guides/scheduling.md#限制-named-resource-并发)。只有需要为 ready task 定义项目自己的选择偏好、为一次 Run 准备策略，或通过 `createLearnedCriticalPathStrategy(...)` 复用调用方拥有的本地时长 history 时，才配置非默认 admission policy；`createAdmissionGraph(...)` 则可独立模拟静态图分支，无需配置或运行该 policy。

若目的不是改变选择，而是在 Run 结束后读取冻结的 scheduler graph、settlement 与 raw measurement 来保存项目自己的统计，直接阅读该专题的[观察终态 measurement](./docs/guides/scheduling.md#观察终态-measurement)。`scheduler.measurementHooks` 是终态 side effect，不是每个 Task 的 event stream，也不能改写已结算的 Check 或 aggregate。

### 运行并读取结果

`run(definition, controls?)` 执行一次独立 invocation。常用 controls 包括 `projectRoot`、`flags`、`signal`、`checkArtifactBaseDirectory`、`progressLogFile` 和仅对本次运行生效的 `outputs` overrides。需要让某个 Check 写 invocation-local artifact 时，调用方显式设置 base；callback 只会得到自己的 absolute `artifactDirectory`（未设置时为 `null`）。

读取结果时分两层判断：

1. 先读取 `RunResult.kind`，确认 invocation 是完整结算、配置错误、规划失败、输出失败、执行失败还是被取消。
2. 对有 snapshot 的结果，按 `checkId` 查找 `snapshot.checks[].outcome`，再处理 `passed`、`failed`、`not-applicable` 或 `unavailable`。

合法运行中，即使某项 Check 返回 `failed`，Run 仍可能是 `kind: "completed"`。若 CI 需要因质量 Finding 退出非零，调用方必须像快速开始那样显式判断目标 outcome，或配置并读取 invocation-level `checkAggregation`；其选择范围和空集合语义见 [API 机制](./docs/api-mechanics.md#runcontrols-与-check-aggregation)。

## 自定义 Check API

只使用随包 Check 时，可以跳过本节。项目自己的规则通常遵循“定义 Check、加入 Definition、运行并读取结果”的主线：

1. 使用 `defineCheck(...)` 声明稳定的 `checkId`、`displayName` 与 `execution`；`execution` 返回 `passed`、`failed`、`not-applicable` 或 `unavailable`。
2. 把该 Check 加入 `defineConfig({ checks, ... })` 的 `checks`，并按上一节运行和读取结果。

完整的 authoring 示例、`preflight`、callback context、typed dependencies、Records、messages、取消和不能做什么，见[编写会正确结算的自定义 Check](./docs/guides/extending-check-lifecycle.md)。

## 输出与进阶用法

- [API 机制](./docs/api-mechanics.md)解释一次 Run 如何从 Definition、选择、preflight、execution 到结果、aggregation 与 outputs。
- [编写会正确结算的自定义 Check](./docs/guides/extending-check-lifecycle.md)解决“在哪个 callback 写规则、能读写什么、怎样取消或失败”的 authoring 任务。
- [按项目约束调度 Check](./docs/guides/scheduling.md)解决“何时需要改变调度选择、怎样不越过 Scheduler guard”的 scheduling 任务。
- [缓存计算结果](./docs/guides/cache-results.md)与[对账 Finding waiver](./docs/guides/finding-waivers.md)说明对应的 package 预提供工具。
- [机器输出契约](./docs/output.md)说明 `run.json`、`records.ndjson` 和对应 schemas；只有需要把结果交给其他工具时才需要读取它。
- 精确 overload、泛型推断和字段 JSDoc 以安装包中的 `types/**.d.ts` 为准。

## 包内结构与调试

业务代码始终从 `@zxyycom/vibe-check` 导入。安装包中的 `index.mjs` 是公开 runtime entry，`types/**.d.ts` 提供 TypeScript declarations；source maps、`src/**.ts` 和可读的 `dist/esm/**.mjs` 用于堆栈定位与实现检查，不是额外的 public import path。

安装包还包含机器输出文档、v4 run / Record schemas 和一组完整 artifact example，便于需要消费机器结果的工具核对实际 bytes。

## 分发与兼容范围

npm 分发和安装 package；受支持的产品 host 是 Node，最低版本要求为 **`>=24.18`**。

当前 public contract 只有 `@zxyycom/vibe-check` package root 的程序化 API。CLI、`bin`、plugin API、CommonJS/browser entry 和 subpath imports 都不在支持范围内。

`0.0.x` patch 之间不承诺 package-level 兼容。项目应提交 lockfile，并在升级前检查对应版本的变更。

随包法律材料包括根 `LICENSE` 中的 Vibe Check MIT 文本，以及 `licenses/` 中的分析器翻译归属说明、第三方许可原文与来源记录。npm 依赖作为独立包安装，其许可声明及随附法律材料由各依赖包提供。
