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
| [`secretDetection`](./docs/checks/secret-detection.md) | `findingWaivers` | `{ path, ruleId, structuralClass, ordinal }`；不含 secret 值、message、line 或 hash。 |
| 其它随包 Check | 暂无同名原生 option | 对应 Check 指南；不能据此推断自动支持 |

三个内置指标型 Check（`fileMetrics`、`functionMetrics` 与 `duplicateDetection`，下称 metric trio）都在完整 metric Finding
形成后对账，保留 applied Finding Record 与 reason，并把 stale/overbroad authoring 作为 audit evidence；各自完整 identity
grammar 见上表链接到的 Check 指南。`secretDetection` 同样在完整安全投影 Finding 后对账，但其 waiver 只能匹配表中的
非敏感 identity，不能豁免 coverage gap 或 `unavailable`；reason 也会作为 evidence 发布，不能包含敏感材料。通用 grammar
与带 getter 等 hostile input 的拒绝边界见[深入 API 机制](./docs/api-mechanics.md#finding-waiver-reconciliation)。

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
| `scheduler.admissionPolicy` | `{ kind: "static" }` | 按静态图与当前 ready facts 选择 task。 |

machine publication 与 diagnostic logging 的 `directory` 都是调用方选择的 target：相对路径从这次 effective `projectRoot` 解析，绝对路径直接使用。它们不是 sandbox、目录清空或 containment 承诺；可移植的 Definition 优先使用相对路径，将 invocation-specific 绝对 target 放入 `run(..., { outputs })`。

### 调度多个 Check 与终态统计

默认静态调度已经保证 `dependsOn`、`observes`、mutex、并行预算和取消边界。只有需要为 ready task 定义项目自己的选择偏好、模拟静态图分支、为一次 Run 准备策略，或复用调用方拥有的本地时长 history 时，阅读[按项目约束调度 Check](./docs/guides/scheduling.md)。

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

- [API 机制](./docs/api-mechanics.md)解释一次 Run 如何从 Definition、选择、preflight、execution 到结果、aggregation 与 outputs；它是理解公共数据流的参考，不是另一个 API 入口。
- [编写会正确结算的自定义 Check](./docs/guides/extending-check-lifecycle.md)解决“在哪个 callback 写规则、能读写什么、怎样取消或失败”的 authoring 任务。
- [按项目约束调度 Check](./docs/guides/scheduling.md)解决“何时需要改变调度选择、怎样不越过 Scheduler guard”的 scheduling 任务。
- [机器输出契约](./docs/output.md)说明 `run.json`、`records.ndjson` 和对应 schemas；只有需要把结果交给其他工具时才需要读取它。
- 精确 overload、泛型推断和字段 JSDoc 以安装包中的 `types/**.d.ts` 为准。

## 包内结构与调试

业务代码始终从 `@zxyycom/vibe-check` 导入。安装包中的 `index.mjs` 是公开 runtime entry，`types/**.d.ts` 提供 TypeScript declarations；source maps、`src/**.ts` 和可读的 `dist/esm/**.mjs` 用于堆栈定位与实现检查，不是额外的 public import path。

安装包还包含机器输出文档、v4 run / Record schemas 和一组完整 artifact example，便于需要消费机器结果的工具核对实际 bytes。

## 分发与兼容范围

npm 只负责分发和安装 package；受支持的产品 host 是 **Bun `>=1.3.14`**。通过 npm 安装不表示 Node.js runtime 已受支持。

当前 public contract 只有 `@zxyycom/vibe-check` package root 的程序化 API。CLI、`bin`、plugin API、CommonJS/browser entry 和 subpath imports 都不在支持范围内。

`0.0.x` patch 之间不承诺 package-level 兼容。项目应提交 lockfile，并在升级前检查对应版本的变更。Vibe Check 自有材料使用 MIT；安装包中的 `THIRD_PARTY_NOTICES.md` 与 `licenses/**` 承载翻译 analyzer 的适用第三方材料。
