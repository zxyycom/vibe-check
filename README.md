# Vibe Check

Vibe Check 是通用 TypeScript 质量门禁工具，提供可组合 Check、类型安全 API 和结构化结果。你可以直接使用随包提供的代码、JSON、Schema、Markdown 和维护检查，也可以把项目自己的规则写成 Check，然后在项目脚本、测试或 CI 中运行它们。

所有公开能力都从 `@zxyycom/vibe-check` package root 导入。Vibe Check 不要求额外的配置文件，也不提供 CLI：检查内容、组合方式和运行时机都由你的 TypeScript 代码决定。

## 安装

```sh
npm install @zxyycom/vibe-check
```

npm 负责安装 package；应用代码和质量脚本的最低运行要求是 **Node `>=24.18`**。安装完成后，可以用 `node <file>` 运行下面的示例。

升级前查看随包的[变更日志](./docs/changelog.md)，确认对应版本的变化与必要调整。

## 随包提供的 Check

如果项目需要的是常见质量检查，可以先从以下函数开始，而不必自己实现 `execution`。除 `maintenanceReminders(entries)` 与 `secretDetection({ files })` 有必填输入外，其余函数都可以无参调用；每份指南都包含最小用法、options、默认值、结果和安全边界。

| 你想检查什么 | 使用的导出 | 额外环境准备 |
| --- | --- | --- |
| 重复代码 | [`duplicateDetection(options?)`](./docs/checks/duplicate-detection.md) | 无需另装分析器。 |
| 文件代码行指标 | [`fileMetrics(options?)`](./docs/checks/file-metrics.md) | 环境中有兼容精确 SCC 4.0.0 输出契约的 `scc` command。 |
| 函数规模、复杂度、最大嵌套和参数数量 | [`functionMetrics(options?)`](./docs/checks/function-metrics.md) | 无需另装分析器。 |
| JSON 语法和输入范围 | [`jsonValidation(options?)`](./docs/checks/json-validation.md) | 无。 |
| JSON 与 Schema 的匹配关系 | [`jsonSchemaValidation(options?)`](./docs/checks/json-schema-validation.md) | 使用远程 Schema 时，需显式允许对应 HTTPS source 并具备网络访问条件。 |
| 本地 Markdown 链接与锚点 | [`markdownLinkValidation(options?)`](./docs/checks/markdown-link-validation.md) | 无。 |
| 基于 Git 历史的维护提醒 | [`maintenanceReminders(entries)`](./docs/checks/maintenance-reminders.md) | 项目根目录是 Git repository，且环境可以执行 `git`。 |
| 高置信 PEM private key | [`secretDetection({ files })`](./docs/checks/secret-detection.md) | 无需另装分析器。 |

`duplicateDetection`、`fileMetrics`、`functionMetrics` 和 `markdownLinkValidation` 默认把普通 Finding 作为 non-blocking 警告保留下来；需要让 Finding 直接使 Check 失败时，在对应 options 中设置 `findingPolicy: "blocking"`。文件选择、阈值、外部工具和具体结果字段以各 Check 指南为准。

## 自定义 Check 快速开始

下面的 `quality.ts` 展示一条完整的最小路径：定义 bundle 大小规则、运行它，并确认 Check 通过。为使示例能够独立运行，`actualBytes` 使用固定输入；接入项目时，把这部分替换为项目真实的测量逻辑即可。

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

## 运行、配置与读取结果

`defineConfig(...)` 定义可复用的 Checks、options、依赖、scheduler 和默认 outputs；`run(definition, controls?)` 的第二个参数只设置本次根目录、flags、取消、产物与日志目标、output overrides 和显式 aggregation。Controls 不能替换 Check 或 scheduler；字段位置和覆盖规则见 [API 机制](./docs/api-mechanics.md#参数应该放在哪里)。

默认最多并行运行四个 Check，显示进度并把 machine files 写入 `artifacts/vibe-check`；diagnostic logging 默认关闭。上例显式关闭 machine publication。配置方法见[输出指南](./docs/guides/run-outputs.md)与[调度指南](./docs/guides/scheduling.md)。

先判断 `RunResult.kind`；对有 snapshot 的结果，再按 `checkId` 读取 `snapshot.checks[].outcome` 的 `passed`、`failed`、`not-applicable` 或 `unavailable`。`completed` 不代表质量通过：CI 应显式判断目标 outcomes，或配置并读取 [`checkAggregation`](./docs/api-mechanics.md#runcontrols-与-check-aggregation)，再决定退出码。

## 按任务继续阅读

只读当前任务需要的专题；精确 overload、泛型推断和字段 JSDoc 以安装包中的 `types/**.d.ts` 为准。

- [API 机制](./docs/api-mechanics.md)：Run 生命周期、组合继承、结果与 aggregation。
- [选择回调位置](./docs/guides/callbacks.md)：确定执行前、检查中、显示时或结束后的接入点。
- [自定义 Check](./docs/guides/extending-check-lifecycle.md)：options 准备、callback context、Records 与协作取消。
- [Check 依赖与类型化数据](./docs/guides/check-dependencies.md)：`dependsOn` / `observes`、读取授权与 provider parser。
- [Run 输出与诊断](./docs/guides/run-outputs.md)：输出配置、progress、日志与失败处理。
- [调度 Check](./docs/guides/scheduling.md)：并发资源、准入策略与终态观察。
- [机器输出契约](./docs/output.md)：供其他工具读取 `run.json`、`records.ndjson` 与 schemas。

以下可选工具由项目代码或自定义 Check 显式调用：

| 目的 | 工具与接入方式 | 详解 |
| --- | --- | --- |
| 按一份完整 selection 收集项目文件 path | `collectProjectFiles(...)` 在普通项目代码或 custom Check 内返回冻结的 relative path 快照 | [收集项目文件](./docs/guides/collecting-project-files.md) |
| 按完整语义 key 复用本地 JSON 计算 | `cacheJsonByKey(...)` 在普通项目代码或 Check 内返回一次调用的缓存结果 | [缓存计算结果](./docs/guides/cache-results.md) |
| 对账完整 Finding 集合与 waiver audit | `reconcileFindingWaivers(...)` 在 Finding 形成后返回 disposition 与 audit | [对账 Finding waiver](./docs/guides/finding-waivers.md) |
| 生成有限的 Finding 人读摘要 | `presentCheckFindings(...)` 返回 `CheckMessage[]`，由 producing Check 附到自己的 terminal result | [呈现 Check Finding](./docs/guides/presenting-findings.md) |
| 在不执行 Check 的前提下分析静态 admission 分支 | `createAdmissionGraph(...)` 独立创建 immutable simulation，不需要 `run(...)` 或 custom policy | [模拟 AdmissionGraph](./docs/guides/simulating-admission.md) |
| 为重复 Run 准备基于本地时长 history 的选择策略 | `createLearnedCriticalPathStrategy(...)` 的返回值接入 `scheduler.admissionPolicy` 的 custom strategy | [learned critical-path strategy](./docs/guides/learned-scheduling.md) |

各随包 Check 的 `parse…Data` 导出用于解析该 Check 的 final data；完整签名与类型见相应 Check 指南及 installed declarations。

## 包内结构与调试

业务代码始终从 `@zxyycom/vibe-check` 导入。安装包中的 `index.mjs` 是公开 runtime entry，`types/**.d.ts` 提供 TypeScript declarations；source maps、`src/**.ts` 和可读的 `dist/esm/**.mjs` 用于堆栈定位与实现检查，不是额外的 public import path。

## 分发与兼容范围

当前 public contract 只有 `@zxyycom/vibe-check` package root 的程序化 API。CLI、`bin`、plugin API、CommonJS/browser entry 和 subpath imports 都不在支持范围内。

`0.0.x` patch 之间不承诺 package-level 兼容。项目应提交 lockfile，并在升级前检查对应版本的变更。

随包法律材料包括根 `LICENSE` 中的 Vibe Check MIT 文本，以及 `licenses/` 中的分析器翻译归属说明、第三方许可原文与来源记录。npm 依赖作为独立包安装，其许可声明及随附法律材料由各依赖包提供。
