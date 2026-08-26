# Vibe Check

Vibe Check 是由项目在 **Bun** runtime 中显式调用的 TypeScript API：项目先定义 Check，再执行一次可审计的 Run。package root 只提供 API；当前没有 public CLI、配置发现、Node.js host、plugin API 或 subpath exports。

本指南面向已经取得 package 的 consumer。按“当前可用性 → 最小 Run → Check 编写 → 依赖数据 → controls 与结果”阅读：先确认 package 的可用性，再由项目代码创建 Definition 并调用 `run`。单个类型、字段和函数的局部含义可从 installed declarations 的 JSDoc 查看；随 package 提供的每项普通 Check 另有可直接阅读的用途、完整默认配置、工作原理、结果与安全边界，见[包内 Check 指南](./docs/checks/index.md)。

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

## 随包提供的普通 Check、组合与继承

`duplicateDetection`、`fileMetrics`、`functionMetrics`、`jsonValidation`、`jsonSchemaValidation` 与 `markdownLinkValidation` 是随 package 提供的完整 ordinary Check values；Definition、Run 与 Core 不识别这些 ID 或 options shape。需要读取项目文件的 Check 在自己的 `options.files` 中完整拥有 `include`、`excludeDirs` 与 `generatedFiles`，不存在 Project-wide `quality` scope。`jsonValidation` 只检查它自己选中且以小写 `.json` 结尾的 paths；其 `options` 必须恰含 `{ files, maximumBytes }`，`maximumBytes` 初始值为 `1_048_576`。

### `jsonSchemaValidation` 的配置边界

`jsonSchemaValidation` 不会自动发现 schema 或遍历所有 JSON。项目必须以 closed `schemas` registry 与
`bindings` 指定必须同时属于本 Check `files` selection 的 path；没有 binding 时，这个 Check 是 `not-applicable`。导出值的默认
`options` 逐项如下：

| `options` branch      | 默认值                      |
| --------------------- | --------------------------- |
| `files`               | 完整 repository-file selection |
| `maximumBytes`        | `1_048_576`                 |
| `schemaIdentity`      | `{ mode: "require-match" }` |
| `referenceResolution` | `{ mode: "offline" }`       |
| `schemas`             | `[]`                        |
| `bindings`            | `[]`                        |

`schemas` 的每项是 `{ id, path }`，`bindings` 的每项是 `{ id, instancePath, schemaId }`。两者都是 closed
dense arrays；每个 binding 只能引用已声明 schema。该普通 Check 自带的 block preflight 会在它自己的 author execution、
file 或 network work 前，将遗漏、未知或重复的 branch、ID 与 path 结算为 owning
`unavailable / invalid-options`；direct execution 也会防御同一非法输入。`schemaIdentity` 是整个 Check 的一项选择：

| Mode                          | Root 与 engine identity                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `require-match`（默认）       | root `$id` 必须与 configured schema ID 相同。                                                                             |
| `configuration-authoritative` | configured schema ID 是 engine identity；object root 会在 private compile copy 中覆盖 `$id`，boolean root 直接使用该 ID。 |
| `document-authoritative`      | safe root `$id` 是 engine identity；configured schema ID 仍是 binding/Record label。                                      |

默认模式不会发起网络 request。只有 `referenceResolution: { mode: "allowlisted", sources }` 中精确声明的 HTTPS
origin/path prefix 才能提供额外 `$ref`；adapter 不使用 credentials、headers、redirect 或任意 resolver callback。
allowlisted `sources` 只能使用 `{ kind: "bundled", catalog: "json-schema-2020-12" }` 或
`{ kind: "https", id, origin, pathPrefix }`；后者的 `origin` 与 `pathPrefix` 必须精确匹配。package-fixed JSON
Schema 2020-12 catalog 不需要 request。首版把 `format` 视为 2020-12 annotation，不安装 format assertion plugin；
Ajv `$async` schema 与 `$dynamicRef`/`$recursiveRef` 会安全失败。

`markdownLinkValidation` 只校验它自己的 `options.files` 选中 Markdown sources 中，受支持 occurrence 的**离线本机**目标与标题锚点：它不把 Markdown 文本当作风格/语法检查，也不请求 HTTP、DNS、TLS 或重定向。默认的 `rootExternalTargetMode: "report"` 会安全报告 root 外本机目标而不读取它；只有项目显式改为 `"validate"` 才允许读取该 direct target，因此只能用于已信任的本机配置。完整 fields、defaults 和运行边界可直接阅读 package 内对应 Check 指南，不必只依赖 LSP。

```ts
import { defineConfig, markdownLinkValidation, run } from "vibe-check";

const definition = defineConfig({
  checks: [markdownLinkValidation],
  effects: {
    cache: { enabled: false },
    output: { enabled: false },
    progress: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
```

随包导出的 value 或构造函数结果本身始终是完整、合法的普通 Check，并携带自己的纯 `preflight`。通过对象组合
替换任一随包 Check 的 `options` branch 时，必须提供完整 closed shape；nested branch 不会自动深度合并。Run 在任一
author Check execution 前完成全局 preflight barrier；非法 replacement 只将 owning Check 结算为
`unavailable / invalid-options`，不会执行它的 author callback，也不会填充遗漏 branch。普通对象组合还可以替换
display name 或 scheduling fields；递归 `checks` 形成编写树。直接提供
`dependsOn` 或 `mutex` 数组会替换继承集合；使用 `inherit({ add, remove })` 才是在父集合上显式增删。

## 维护提醒

`maintenanceReminders(entries)` 是唯一的专用构造函数，而不是另一个无参默认 Check 值。它固定创建 ID 为 `maintenance-reminders` 的注意型 Check；多个条目仅保存在该 Check 按声明顺序排列的最终数据中，绝不会成为子 Check、Record 或单条聚合目标。每个条目都需要唯一的小写短横线命名 `id`、作为已复核基线的完整 40 或 64 位十六进制 `baseCommit`、至少一个正的 `commits` 或 `changedLines` 上限、非空 `message`，以及可省略的 `advisory` 或 `enforcing` `mode`。维护者在真实复核后手动更新基线；Product 只测量已提交的 `first-parent` 历史，不读取工作区或暂存区，也不会自动推进基线。

条目到期或无法测量时，默认 `advisory` 仍返回 `passed` 和完整最终数据，并附加警告；`enforcing` 保留相同数据、附加错误并使所属 Check `failed`。调用方替换出的无效完整 options 会在 Run preflight 中结算为 owning Check unavailable；合法 callback 无法形成完整、可信的条目评估数据时，整个 Check 才会 `unavailable`。需要阻断进程时，调用方仍须在 `RunControls.checkAggregation` 中显式选择 `maintenance-reminders`。

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

`defineCheck` 只改善 TypeScript inference；Definition validation 仍在 `run` 的边界关闭声明式 data。

### options preflight

可执行 Check 可以提供 `preflight(options, signal)`，为本次 invocation 准备 execution options。authored 与 prepared
options 同形时可以省略；显式使用不同 `PreparedOptions` shape 时，TypeScript 会要求提供 preflight。Run 在任一 author
Check execution 前，按 Definition 顺序完成所有已提供 preflight 的全局 barrier，并把同一个 cancellation signal 传给
preflight 与 execution。

preflight 必须返回以下三种结果之一：

- success：`{ status: "success", preparedOptions, messages? }`
- block failure：`{ status: "failure", action: "block", reason, messages? }`
- continue failure：`{ status: "failure", action: "continue", reason, fallback, messages? }`

`block` 不执行 owning Check 的 author callback；`continue` 必须提供 fallback，execution 使用 fallback 继续。prepared
options 与 fallback 都会成为 detached、canonical、deep-frozen 的 invocation-local value，不会回写 Definition authored
options 或改变 declarative fingerprint。`continue` reason 保留 Check-owned diagnostic identity，但当前不会单独成为
outcome；需要让调用方观察的说明应放在 messages 中。

### terminal result、Records 与 messages

每个可执行 Check 返回恰好一个 terminal result：`passed`/`failed` 带对象 final data，
`not-applicable`/`unavailable` 以 reason 表示没有 final data 的运行边界。`records.report({ id }, data)` 追加
supplemental Record；有序 `messages` 是补充 detail，`visibility: "attention"` 只影响人读 progress，二者都不改变
terminal status。

下面的 Run 复用同一 source program 中已定义的 `licensePolicy`，并展示 controls 如何在调用处显式传入。

```ts
import { defineCheck, defineConfig, run } from "vibe-check";

function hasValidLicensePolicyOptions(options: object): boolean {
  const denied: unknown = Reflect.get(options, "denied");
  return (
    Object.keys(options).length === 1 &&
    Object.hasOwn(options, "denied") &&
    Array.isArray(denied) &&
    denied.every((license) => typeof license === "string")
  );
}

const licensePolicy = defineCheck({
  checkId: "license-policy",
  displayName: "License policy",
  options: { denied: ["GPL-3.0-only"] },
  preflight(options) {
    return hasValidLicensePolicyOptions(options)
      ? { status: "success", preparedOptions: options }
      : { status: "failure", action: "block", reason: { code: "invalid-options" } };
  },
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
