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

<!-- package-api-example:quick-start -->

## 默认 Check、组合与继承

`duplicateDetection`、`fileMetrics`、`functionMetrics`、`jsonValidation`、`jsonSchemaValidation` 与 `markdownLinkValidation` 是完整的默认 Check 值。`jsonValidation` 只检查当前项目 global `quality` scope 已包含且以小写 `.json` 结尾的 paths；其 `options` 必须恰为 `{ maximumBytes }`，导出的默认值为 `1_048_576`。

### `jsonSchemaValidation` 的配置边界

`jsonSchemaValidation` 不会自动发现 schema 或遍历所有 JSON。项目必须以 closed `schemas` registry 与
`bindings` 指定 scope-approved path；没有 binding 时，这个 Check 是 `not-applicable`。导出值的默认
`options` 逐项如下：

| `options` branch | 默认值 |
| --- | --- |
| `maximumBytes` | `1_048_576` |
| `schemaIdentity` | `{ mode: "require-match" }` |
| `referenceResolution` | `{ mode: "offline" }` |
| `schemas` | `[]` |
| `bindings` | `[]` |

`schemas` 的每项是 `{ id, path }`，`bindings` 的每项是 `{ id, instancePath, schemaId }`。两者都是 closed
dense arrays；每个 binding 只能引用已声明 schema，且 configuration validation 会拒绝遗漏、未知或重复的
branch、ID 与 path。`schemaIdentity` 是整个 Check 的一项选择：

| Mode | Root 与 engine identity |
| --- | --- |
| `require-match`（默认） | root `$id` 必须与 configured schema ID 相同。 |
| `configuration-authoritative` | configured schema ID 是 engine identity；object root 会在 private compile copy 中覆盖 `$id`，boolean root 直接使用该 ID。 |
| `document-authoritative` | safe root `$id` 是 engine identity；configured schema ID 仍是 binding/Record label。 |

默认模式不会发起网络 request。只有 `referenceResolution: { mode: "allowlisted", sources }` 中精确声明的 HTTPS
origin/path prefix 才能提供额外 `$ref`；adapter 不使用 credentials、headers、redirect 或任意 resolver callback。
allowlisted `sources` 只能使用 `{ kind: "bundled", catalog: "json-schema-2020-12" }` 或
`{ kind: "https", id, origin, pathPrefix }`；后者的 `origin` 与 `pathPrefix` 必须精确匹配。package-fixed JSON
Schema 2020-12 catalog 不需要 request。首版把 `format` 视为 2020-12 annotation，不安装 format assertion plugin；
Ajv `$async` schema 与 `$dynamicRef`/`$recursiveRef` 会安全失败。

`markdownLinkValidation` 只校验受支持 Markdown occurrence 的**离线本机**目标与标题锚点：它不把 Markdown 文本当作风格/语法检查，也不请求 HTTP、DNS、TLS 或重定向。默认的 `rootExternalTargetMode: "report"` 会安全报告 root 外本机目标而不读取它；只有项目显式改为 `"validate"` 才允许读取该 direct target，因此只能用于已信任的本机配置。installed `MarkdownLinkValidationOptions` 的 JSDoc 说明 option field；在仓库工作区，Configuration 拥有完整 default 与 validation，Scan Scope 拥有 source/direct-target boundary，Quality Metrics 拥有 finding/final data，Output 拥有 Record projection。

<!-- package-api-example:markdown-link-validation -->

通过对象组合替换任一 default 的 `options` branch 时，必须提供完整 closed shape；Definition validation 不会填充
遗漏 branch。普通对象组合还可以替换 display name 或 scheduling fields；递归 `checks` 形成编写树。直接提供
`dependsOn` 或 `mutex` 数组会替换继承集合；使用 `inherit({ add, remove })` 才是在父集合上显式增删。

## 维护提醒

`maintenanceReminders(entries)` 是唯一的专用构造函数，而不是另一个无参默认 Check 值。它固定创建 ID 为 `maintenance-reminders` 的注意型 Check；多个条目仅保存在该 Check 按声明顺序排列的最终数据中，绝不会成为子 Check、Record 或单条聚合目标。每个条目都需要唯一的小写短横线命名 `id`、作为已复核基线的完整 40 或 64 位十六进制 `baseCommit`、至少一个正的 `commits` 或 `changedLines` 上限、非空 `message`，以及可省略的 `advisory` 或 `enforcing` `mode`。维护者在真实复核后手动更新基线；Product 只测量已提交的 `first-parent` 历史，不读取工作区或暂存区，也不会自动推进基线。

条目到期或无法测量时，默认 `advisory` 仍返回 `passed` 和完整最终数据，并附加警告；`enforcing` 保留相同数据、附加错误并使所属 Check `failed`。只有 callback 无法形成完整、可信的条目评估数据时，整个 Check 才会 `unavailable`。需要阻断进程时，调用方仍须在 `RunControls.checkAggregation` 中显式选择 `maintenance-reminders`。

<!-- package-api-example:maintenance-reminders -->

## 自定义 Check、Records 与 messages

`defineCheck` 只改善 TypeScript inference；Definition validation 仍在 `run` 的边界关闭声明式 data。每个可执行 Check 返回恰好一个 terminal result：`passed`/`failed` 带对象 final data，`not-applicable`/`unavailable` 以 reason 表示没有 final data 的边界。`records.report({ id }, data)` 追加 supplemental Record；有序 `messages` 是补充 detail，`visibility: "attention"` 只影响人读 progress，二者都不改变 terminal status。

下面的 Run 复用同一 source program 中已定义的 `licensePolicy`，并展示 controls 如何在调用处显式传入。

<!-- package-api-example:custom-check -->

## 类型化依赖数据

类型化 provider 通过同时声明 `execution` 与 `parseData` 建立 final-data contract。consumer 先用非泛型的 `dependencies.get(checkId)` 读取已声明的直接依赖、收窄 `ok`，再调用 producer 自己的 parser；未声明、transitive 或没有 final data 的读取不会泄露 upstream facts。parser 的 version 和业务 shape validation 始终由 provider 拥有。

<!-- package-api-example:typed-dependency -->

## Controls、effects 与结果边界

`RunControls` 只在调用 `run` 时提供，例如 `changedFiles`、`flags`、`signal`、`effects` 与显式 `checkAggregation`。对 cache、output、progress 的覆盖只作用于当前调用；它们不改变 Check 定义、scanner commands 或 dependency 声明。machine output 的可信边界、human presentation 和 artifact reader 都不是 package 额外提供的 reader API。

按 `RunResult.kind` 与 cancellation `phase` 收窄结果：

- `completed`：有完整 final snapshot，且表示成功完成的 Run。
- `effect`：有完整 final snapshot，但至少一个 presentation effect 已失败，因此不是成功的 Run。
- `kind: "cancelled", phase: "execution"`：有取消时关闭的 `snapshot`、`checkDurations` 与 `checkMessages`，但不是成功的 Run。
- `configuration`、`planning`、`execution`，以及 `phase: "pre-work" | "planning"` 的 `cancelled`：没有可作为成功 Check data 处理的完整 snapshot；应处理各自的 diagnostic 或 cancellation 边界。

## 支持边界

这是预稳定的 API-only surface：没有 public CLI、Node.js host、plugin API、subpath exports 或 compatibility alias。不要依赖未承诺的路径、registry 可用性或版本兼容性；任何 release、host 或 public surface 扩展都需要对应 owner 的单独变更与新的 candidate 验证。
