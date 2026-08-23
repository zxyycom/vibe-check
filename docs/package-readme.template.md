# Vibe Check

Vibe Check 是由项目在 **Bun** runtime 中显式调用的 TypeScript API：项目定义 Check，再执行一次可审计的 Run。package root 只提供 API；当前没有 public CLI、配置发现、Node.js host、plugin API 或 subpath exports。

本指南面向已经取得 package 的 consumer。推荐按“当前可用性 → 最小 Run → Check authoring → dependency data → controls 与结果”阅读；单个类型、字段和函数的局部含义以 installed declarations 的 JSDoc 为准。

## 当前可用性与安装边界

当前仓库只验证 local package candidate，尚未发布 registry package。local candidate 的准备、安装和隔离验证由仓库维护者执行；本文不提供未经验证的 shell 安装步骤。获得单独 release 授权后，consumer 才应按该 release 的说明使用精确 `0.0.x` version；不要把本文当作已发生发布或版本兼容承诺。

## 最小 Project Definition 与 Run

Project Definition 由项目代码拥有：用 `defineConfig` 创建 plain value，再由项目自己的 wrapper 调用 `run(definition, controls)`。Product 不会发现、加载或重载第二个配置模块。

`RunResult` 由 `kind` 判别：`completed` 有完整 final snapshot；`effect` 也保留完整 final snapshot，但表示一个 effect 已失败；`cancelled` 只有 `phase: "execution"` 时带已关闭的 snapshot facts。`configuration`、`planning`、早期 `cancelled` 与 `execution` 不应被当成 successful Check data。

<!-- package-api-example:quick-start -->

## Default Checks、组合与继承

`duplicateDetection`、`fileMetrics` 与 `functionMetrics` 是完整 default Check values。普通 object composition 可以替换 display name、options 或 scheduling fields；递归 `checks` 形成 authoring tree。直接提供 `dependsOn` 或 `mutex` 数组会替换继承集合；使用 `inherit({ add, remove })` 才是在父集合上显式增删。

## 自定义 Check、Records 与 messages

`defineCheck` 只改善 TypeScript inference；Definition validation 仍在 `run` 的边界关闭 declarative data。每个可执行 Check 返回恰好一个 terminal result：`passed`/`failed` 带 object final data，`not-applicable`/`unavailable` 以 reason 表示没有 final data 的边界。`records.report({ id }, data)` 追加 supplemental Record；有序 `messages` 是 supplemental detail，`visibility: "attention"` 只影响人读 progress，二者都不改变 terminal status。

下面的 Run 复用同一 source program 中已定义的 `licensePolicy`，并展示 controls 如何在 invocation 处显式传入。

<!-- package-api-example:custom-check -->

## Typed dependency data

Typed provider 通过同时声明 `execution` 与 `parseData` 建立 final-data contract。consumer 先用非泛型的 `dependencies.get(checkId)` 读取已声明的直接依赖、narrow `ok`，再调用 producer 自己的 parser；未声明、transitive 或没有 final data 的读取不会泄露 upstream facts。parser 的 version 和 business-shape validation 始终由 provider 拥有。

<!-- package-api-example:typed-dependency -->

## Controls、effects 与结果边界

`RunControls` 只在调用 `run` 时提供，例如 `changedFiles`、`flags`、`signal`、`effects` 与 explicit `checkAggregation`。对 cache、output、progress 的覆盖只作用于当前 invocation；它们不改变 Check 定义、scanner commands 或 dependency 声明。machine output 的可信边界、human presentation 和 artifact reader 都不是 package 额外提供的 reader API。根据 `RunResult.kind` narrow：`completed` 与 `effect` 有完整正常完成 facts；`cancelled` 仅在 `phase: "execution"` 时有已关闭的 `snapshot`、`checkDurations` 与 `checkMessages`，它仍不是 successful Run；其它分支保持各自的 diagnostic 或 execution 边界。

## 支持边界

这是 prestable API-only surface：没有 public CLI、Node.js host、plugin API、subpath exports 或 compatibility alias。不要依赖未承诺的路径、registry 可用性或版本兼容性；任何 release、host 或 public surface 扩展都需要对应 owner 的单独变更与新的 candidate 验证。
