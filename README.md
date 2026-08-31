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

## 随包提供的 Check

如果项目需要的是常见质量检查，可以先从以下函数开始，而不必自己实现 `execution`。除 `maintenanceReminders(entries)` 必须接收提醒条目外，其余函数都可以无参调用；每份指南都包含最小用法、options、默认值、结果和安全边界。

| 你想检查什么 | 使用的导出 | 运行前提 |
| --- | --- | --- |
| 重复代码 | [`duplicateDetection(options?)`](./docs/checks/duplicate-detection.md) | package 使用随安装依赖提供的兼容 jscpd v5。 |
| 文件代码行指标 | [`fileMetrics(options?)`](./docs/checks/file-metrics.md) | 环境中有兼容 SCC 3.7.0 输出契约的 `scc` command。 |
| 函数规模、复杂度和参数数量 | [`functionMetrics(options?)`](./docs/checks/function-metrics.md) | 环境中有兼容 Lizard 1.23 输出契约的 `lizard` command。 |
| JSON 语法和输入范围 | [`jsonValidation(options?)`](./docs/checks/json-validation.md) | 只读取本地文件，不执行 command 或网络请求。 |
| JSON 与 Schema 的匹配关系 | [`jsonSchemaValidation(options?)`](./docs/checks/json-schema-validation.md) | 默认离线；只有显式允许的 HTTPS source 才会触发网络请求。 |
| 本地 Markdown 链接与锚点 | [`markdownLinkValidation(options?)`](./docs/checks/markdown-link-validation.md) | 只读取 policy 允许的本地路径，不执行 command 或网络请求。 |
| 基于 Git 历史的维护提醒 | [`maintenanceReminders(entries)`](./docs/checks/maintenance-reminders.md) | 项目根目录是 Git repository，且环境可以执行 `git`。 |

`duplicateDetection`、`fileMetrics`、`functionMetrics` 和 `markdownLinkValidation` 默认把普通 Finding 作为 non-blocking 警告保留下来；需要让 Finding 直接使 Check 失败时，在对应 options 中设置 `findingPolicy: "blocking"`。文件选择、阈值、外部工具和具体结果字段以各 Check 指南为准。

## 自定义 Check API

只使用随包 Check 时，可以跳过本节。需要表达项目自己的规则时，通常只需要定义 Check、组成 Definition、运行并读取结果；preflight、依赖调度、waiver 对账、聚合和取消等进阶能力放在[深入 API 机制](./docs/api-mechanics.md)中。

### 定义 Check

`defineCheck(value)` 接受一个普通 Check object，并保留 `checkId`、options 和 final data 的 TypeScript inference。常用字段如下：

| 字段 | 用途 |
| --- | --- |
| `checkId` | 在同一 Definition 中唯一的稳定标识；用于查找 outcome、Record、message 和 duration。 |
| `displayName` | 进度和人读结果中显示的名称。 |
| `execution(context)` | 执行检查并返回一个 terminal outcome。省略时，当前节点只用于组织子 `checks`。 |
| `options` | 当前 Check 的配置；Run 会把准备后的只读副本交给 `context.options`。 |
| `checks` | 可选的子 Check 列表，用于组织一组相关规则。 |

`execution` 可以同步返回，也可以返回 `Promise`。它通过 `context` 读取当前 options、project root、flags、已声明依赖的数据、取消 signal，并可用 `records.report(...)` 保存不决定终态的补充事实。

| 返回状态 | 何时使用 |
| --- | --- |
| `passed` | 检查完成且满足规则；同时返回主要 final `data`。 |
| `failed` | 检查完成但不满足规则；同时返回主要 final `data`。 |
| `not-applicable` | 当前输入没有适用的工作；可以附带 reason。 |
| `unavailable` | 无法形成可信结果；必须附带 reason。 |

final `data` 和 supplemental Record 使用 object-shaped canonical JSON。Check 可以附带有序的人读 `messages`，但通用 API 不保证每个结果都有 message。

### 组成 Project Definition

`defineConfig({ checks, ... })` 组成可重复运行的 Project Definition，并补齐未声明的默认值。最常调整的默认项是：

| 配置 | 默认值 | 效果 |
| --- | --- | --- |
| `outputs.progressRendering.enabled` | `true` | 在终端呈现 Check 生命周期与汇总。 |
| `outputs.machinePublication.enabled` | `true` | 把 `run.json` 和 `records.ndjson` 写入 `artifacts/vibe-check`。 |
| `outputs.diagnosticLogging.enabled` | `false` | 需要排障时写入 invocation-specific 日志。 |
| `scheduler.maxParallel` | `4` | 限制最外层 Check 并行数。 |

`outputs` 和 `scheduler` 都可以只覆盖需要改变的 nested field；同一份 Definition 可以安全地传给多次 `run(...)`。

### 运行并读取结果

`run(definition, controls?)` 执行一次独立 invocation。常用 controls 包括 `projectRoot`、`flags`、`signal` 和仅对本次运行生效的 `outputs` overrides。

读取结果时分两层判断：

1. 先读取 `RunResult.kind`，确认 invocation 是完整结算、配置错误、规划失败、输出失败、执行失败还是被取消。
2. 对有 snapshot 的结果，按 `checkId` 查找 `snapshot.checks[].outcome`，再处理 `passed`、`failed`、`not-applicable` 或 `unavailable`。

合法运行中，即使某项 Check 返回 `failed`，Run 仍可能是 `kind: "completed"`。如果 CI 需要因质量 Finding 退出非零状态，调用方必须像快速开始那样显式判断目标 outcome，或配置并读取 invocation-level aggregation。

## 输出与进阶用法

- [深入 API 机制](./docs/api-mechanics.md)说明 options preflight、依赖、组合、aggregation、finding waiver、cancellation 和 output failure 边界。
- [机器输出契约](./docs/output.md)说明 `run.json`、`records.ndjson` 和对应 schemas；只有需要把结果交给其他工具时才需要读取它。
- 精确 overload、泛型推断和字段 JSDoc 以安装包中的 `types/**.d.ts` 为准。

## 包内结构与调试

业务代码始终从 `@zxyycom/vibe-check` 导入。安装包中的 `index.mjs` 是公开 runtime entry，`types/**.d.ts` 提供 TypeScript declarations；source maps、`src/**.ts` 和可读的 `dist/esm/**.mjs` 用于堆栈定位与实现检查，不是额外的 public import path。

安装包还包含机器输出文档、v4 run / Record schemas 和一组完整 artifact example，便于需要消费机器结果的工具核对实际 bytes。

## 分发与兼容范围

npm 只负责分发和安装 package；受支持的产品 host 是 **Bun `>=1.3.14`**。通过 npm 安装不表示 Node.js runtime 已受支持。

当前 public contract 只有 `@zxyycom/vibe-check` package root 的程序化 API。CLI、`bin`、plugin API、CommonJS/browser entry 和 subpath imports 都不在支持范围内。

`0.0.x` patch 之间不承诺 package-level 兼容。项目应提交 lockfile，并在升级前检查对应版本的变更。Vibe Check 使用 MIT License，完整许可文本随 package 一起安装。
