# Vibe Check

Vibe Check 是由项目在 **Bun** runtime 中显式调用的 TypeScript API：项目先定义 Check，再执行一次可审计的 Run。package root 只提供 API；当前没有 public CLI、配置发现、Node.js host、plugin API 或 subpath exports。

本指南面向已经取得 package 的 consumer。按“当前可用性 → 最小 Run → Check 编写 → 依赖数据 → controls 与结果”阅读：先确认 package 的可用性，再由项目代码创建 Definition 并调用 `run`。单个类型、字段和函数的局部含义以 installed declarations 的 JSDoc 为准。

## 当前可用性与安装边界

当前事实是：仓库只验证本地 package candidate，尚未发布 registry package。本地 candidate 的准备、安装和隔离验证由仓库维护者执行；本文不提供未经验证的 shell 安装步骤。获得单独 release 授权后，consumer 才应按该 release 的说明使用精确 `0.0.x` version；不要把本文当作已发生发布或版本兼容承诺。

## 包内结构与源码恢复

安装包根部的 `index.mjs` 是唯一公开入口，它转发到可读的 `dist/esm/**.mjs` 实现模块；`types/**.d.ts` 提供 TypeScript 类型声明。每个运行时模块都有对应的源码映射，`src/**.ts` 同时保留生成这些模块的 Product 源码，便于检查实现和定位堆栈。

这些内部路径只用于阅读和调试，不是公开导入路径。`package.json` 的 `exports` 仍只开放根路径 `"."`：consumer 代码应从 `vibe-check` 导入，不得依赖 `vibe-check/dist/**`、`vibe-check/types/**` 或 `vibe-check/src/**`。

## 最小 Project Definition 与 Run

Project Definition 由项目代码拥有：用 `defineConfig` 创建普通对象值，再由项目自己的 wrapper 调用 `run(definition, controls)`。Product 不会发现、加载或重载第二个配置模块。

下面的示例只在 `result.kind === "completed"` 时继续处理，因为只有该分支表示成功的 Run。需要处理其它 `RunResult` 分支时，按后文的“Controls、effects 与结果边界”判断 snapshot 与失败边界。

```ts
import { defineConfig, run } from "vibe-check";

const definition = defineConfig({
  checks: [
    {
      checkId: "welcome",
      displayName: "Welcome",
      execution({ records }) {
        records.report({ id: "guide" }, { message: "Package Run completed." });
        return { status: "passed", data: { checked: true } };
      }
    }
  ],
  effects: {
    cache: { enabled: false },
    output: { enabled: false },
    progress: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
```

## 默认 Check、组合与继承

`duplicateDetection`、`fileMetrics` 与 `functionMetrics` 是完整的默认 Check 值。普通对象组合可以替换 display name、options 或 scheduling fields；递归 `checks` 形成编写树。直接提供 `dependsOn` 或 `mutex` 数组会替换继承集合；使用 `inherit({ add, remove })` 才是在父集合上显式增删。

## 维护提醒

`maintenanceReminders(entries)` 是唯一的专用构造函数，而不是第四个默认 Check 值。它固定创建 ID 为 `maintenance-reminders` 的注意型 Check；多个条目仅保存在该 Check 按声明顺序排列的最终数据中，绝不会成为子 Check、Record 或单条聚合目标。每个条目都需要唯一的小写短横线命名 `id`、作为已复核基线的完整 40 或 64 位十六进制 `baseCommit`、至少一个正的 `commits` 或 `changedLines` 上限、非空 `message`，以及可省略的 `advisory` 或 `enforcing` `mode`。维护者在真实复核后手动更新基线；Product 只测量已提交的 `first-parent` 历史，不读取工作区或暂存区，也不会自动推进基线。

条目到期或无法测量时，默认 `advisory` 仍返回 `passed` 和完整最终数据，并附加警告；`enforcing` 保留相同数据、附加错误并使所属 Check `failed`。只有 callback 无法形成完整、可信的条目评估数据时，整个 Check 才会 `unavailable`。需要阻断进程时，调用方仍须在 `RunControls.checkAggregation` 中显式选择 `maintenance-reminders`。

```ts
import { defineConfig, maintenanceReminders, run } from "vibe-check";

// 下列 baseCommit 都是示例占位值；实际使用时，每条都必须替换为该提醒最近一次真实复核对应的完整 commit ID。
const maintenance = maintenanceReminders([
  {
    id: "documentation-review",
    baseCommit: "0123456789abcdef0123456789abcdef01234567",
    limits: { commits: 40, changedLines: 2_000 },
    message: "Review the documentation structure after this body of change."
  },
  {
    id: "optimization-audit",
    baseCommit: "89abcdef0123456789abcdef0123456789abcdef",
    limits: { commits: 80 },
    message: "Audit optimization quality before this becomes older.",
    mode: "enforcing"
  }
]);

const definition = defineConfig({
  checks: [maintenance],
  effects: {
    cache: { enabled: false },
    output: { enabled: false },
    progress: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
```

## 自定义 Check、Records 与 messages

`defineCheck` 只改善 TypeScript inference；Definition validation 仍在 `run` 的边界关闭声明式 data。每个可执行 Check 返回恰好一个 terminal result：`passed`/`failed` 带对象 final data，`not-applicable`/`unavailable` 以 reason 表示没有 final data 的边界。`records.report({ id }, data)` 追加 supplemental Record；有序 `messages` 是补充 detail，`visibility: "attention"` 只影响人读 progress，二者都不改变 terminal status。

下面的 Run 复用同一 source program 中已定义的 `licensePolicy`，并展示 controls 如何在调用处显式传入。

```ts
import { defineCheck, defineConfig, run } from "vibe-check";

const licensePolicy = defineCheck({
  checkId: "license-policy",
  displayName: "License policy",
  options: { denied: ["GPL-3.0-only"] },
  visibility: "attention",
  execution({ options, records, signal }) {
    if (signal.aborted) return { status: "unavailable", reason: { code: "cancelled" } };

    const deniedCount = options.denied.length;
    if (deniedCount > 0) {
      records.report({ id: "denied-license" }, { count: deniedCount });
      return {
        status: "failed",
        data: { deniedCount },
        messages: [{ level: "warning", code: "denied-license", message: "Denied licenses found." }]
      };
    }
    return { status: "passed", data: { deniedCount: 0 } };
  }
});

const definition = defineConfig({
  checks: [licensePolicy],
  effects: {
    cache: { enabled: false },
    output: { enabled: false },
    progress: { enabled: false }
  }
});

const result = await run(definition, {
  checkAggregation: {
    checks: "all",
    mode: "all",
    unavailable: "propagate",
    notApplicable: "exclude",
    empty: "passed"
  }
});
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
```

## 类型化依赖数据

类型化 provider 通过同时声明 `execution` 与 `parseData` 建立 final-data contract。consumer 先用非泛型的 `dependencies.get(checkId)` 读取已声明的直接依赖、收窄 `ok`，再调用 producer 自己的 parser；未声明、transitive 或没有 final data 的读取不会泄露 upstream facts。parser 的 version 和业务 shape validation 始终由 provider 拥有。

```ts
import { defineCheck, defineConfig, run } from "vibe-check";

const CHANGED_FILES_DATA_VERSION = 1 as const;

type ChangedFilesData = Readonly<{
  readonly files: readonly string[];
  readonly version: typeof CHANGED_FILES_DATA_VERSION;
}>;

const changedFiles = defineCheck({
  checkId: "changed-files",
  displayName: "Changed files",
  parseData(data): ChangedFilesData {
    if (
      data.version !== CHANGED_FILES_DATA_VERSION ||
      !Array.isArray(data.files) ||
      !data.files.every((value): value is string => typeof value === "string")
    ) {
      throw new TypeError("Unsupported changed-files data");
    }
    return { files: data.files, version: data.version };
  },
  execution() {
    return {
      status: "passed",
      data: { files: ["src/index.ts"], version: CHANGED_FILES_DATA_VERSION }
    };
  }
});

const analyzeChangedFiles = defineCheck({
  checkId: "analyze-changed-files",
  displayName: "Analyze changed files",
  dependsOn: [changedFiles.checkId],
  execution({ dependencies }) {
    const read = dependencies.get(changedFiles.checkId);
    if (!read.ok) return { status: "unavailable", reason: { code: read.error.code } };

    const data = changedFiles.parseData(read.data);
    return { status: read.status, data: { analyzedFileCount: data.files.length } };
  }
});

const definition = defineConfig({
  checks: [changedFiles, analyzeChangedFiles],
  effects: {
    cache: { enabled: false },
    output: { enabled: false },
    progress: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
```

## Controls、effects 与结果边界

`RunControls` 只在调用 `run` 时提供，例如 `changedFiles`、`flags`、`signal`、`effects` 与显式 `checkAggregation`。对 cache、output、progress 的覆盖只作用于当前调用；它们不改变 Check 定义、scanner commands 或 dependency 声明。machine output 的可信边界、human presentation 和 artifact reader 都不是 package 额外提供的 reader API。

按 `RunResult.kind` 与 cancellation `phase` 收窄结果：

- `completed`：有完整 final snapshot，且表示成功完成的 Run。
- `effect`：有完整 final snapshot，但至少一个 presentation effect 已失败，因此不是成功的 Run。
- `kind: "cancelled", phase: "execution"`：有取消时关闭的 `snapshot`、`checkDurations` 与 `checkMessages`，但不是成功的 Run。
- `configuration`、`planning`、`execution`，以及 `phase: "pre-work" | "planning"` 的 `cancelled`：没有可作为成功 Check data 处理的完整 snapshot；应处理各自的 diagnostic 或 cancellation 边界。

## 支持边界

这是预稳定的 API-only surface：没有 public CLI、Node.js host、plugin API、subpath exports 或 compatibility alias。不要依赖未承诺的路径、registry 可用性或版本兼容性；任何 release、host 或 public surface 扩展都需要对应 owner 的单独变更与新的 candidate 验证。
