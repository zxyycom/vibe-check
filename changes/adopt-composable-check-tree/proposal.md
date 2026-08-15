# Proposal

本 Change 建立 composable Check tree 的基础契约：current definition-facing source 提供三个内置 Check
descriptor values，Project Definition 以 Task-like 树组合内置与 custom Check；下游 npm package 必须原样
投影这些 values。本 Change 消费既有 Project Definition / Product run 事实，不重写前置 Change 的完成状态。

独立后继 `support-check-scoped-concurrency` 已在这棵树上增加 group/leaf `maxParallel` authoring、private
cap handoff 和 shared-scheduler runtime 语义。本文只拥有 tree、dependency、mutex、options 与 flat Core
handoff 的基础契约；当前完整 authoring 以 `docs/configuration.md` 和该后继 Change 为准。

## Why

本 Change 实施前，Project Definition 的 `checks` authoring 同时要求 `builtIn`、`custom`、`schedules` 与 `selected` 四组并列资料。同一内置 Check 必须重复声明“已知”“被选择”和“无依赖”，而 Check 间的执行语义与使用项目真实看到的 Task system 不一致。

使用项目需要直接导入并组合 `duplicateDetection`、`fileMetrics`、`functionMetrics`。内置 Check 应自带可用的默认语义与类型化 options，并由 descriptor 自身提供字段感知的 `.replace()` / `.append()`，让项目只声明相对默认值发生的变化，而不是手写多层 object spread。内置与 custom Check 应能放在同一嵌套树中：叶存在即选择，数组顺序不构成串行；`dependsOn` 决定 Check prerequisite，`mutex` 决定 named resource，后继 Change 的 `maxParallel` 只在 Check active span 内收紧 shared scheduler capacity。

## Outcome

完成后，Project Definition 的 Check authoring 具有一个唯一的树入口。current definition-facing source 公开三个 frozen、non-callable built-in Check descriptors；项目可直接将它们放入 `checks` tree，也可用 value-owned `.replace()` / `.append()` 得到新的 frozen leaf。可安装 npm package 及其 `from "vibe-check"` import 仍由下游 Change 交付。

树 group 只服务 authoring 和归一化：不会产生 CheckRun、Record、policy identity 或 machine artifact。Product 在 work 前把树验证并压平为现有 Core 所需的 flat catalog、private bindings、resolved dependencies、selection 与 task mutex handoff；没有 `dependsOn` 或 `mutex` 的可运行 leaf 默认可并发。后继 Change 另外从同一树解析每个 leaf 的 effective `maxParallel`，通过 private map 交给同一 shared scheduler，不改变 group identity 或数组顺序语义。

## Scope

纳入范围：

- current definition-facing surface 的三个 non-callable built-in descriptor exports，以及下游 package 对同名 values 的投影要求；
- Task-like `checks` tree 的 authoring types、runtime validation、normalization、diagnostics 与 declarative fingerprint；
- 内置 Check 的 typed default options、字段感知的 immutable replacement / scheduling append，以及 built-in-specific quality option owner 的迁移；
- custom leaf 与 built-in leaf 的共树组合；group dependency/mutex 的追加继承与 leaf flattening；
- 从 resolved tree 到现有 flat Core catalog、private built-in/custom bindings、schedule/selection 与 Task mutex 的映射；
- repository dogfood、Configuration/current contract docs、tests/Cases 与 downstream npm package Change handoff。

不纳入范围：

- 重开、修改或归档 `adopt-typescript-project-definition`；其当前已交付的 definition/run、caller-runtime 与 Task-system 边界只是本 Change 的输入；
- 新增第三个顶层 callable package operation、package-level builder、registry、discovery、plugin protocol 或 Product CLI；
- 让 group 成为 Check、Record、policy 或 machine-output identity；
- 根据数组位置推断顺序，或增加 `parallel` boolean；
- 重写 Core 的 flat Check/Record model、private scanner bindings、Task scheduler 或 Package Run / Run Controls 的责任；
- npm manifest、installed delivery、pack 或 publish。本 Change 只更新 `establish-api-only-npm-product-boundary` 对其前置 contract 的依赖。
- Check-scoped `maxParallel` 的 active-span、reservation/drain 或 scheduler admission 语义；这些由独立后继 `support-check-scoped-concurrency` 拥有。

## Success Criteria

- `duplicateDetection`、`fileMetrics`、`functionMetrics` 是 current definition-facing source 导出的 frozen non-callable values，使用项目可直接放入 `checks` tree；下游 package 必须以相同名称和类型投影。
- `checks` tree 同时接收 built-in 和 custom leaves；叶出现即表示 selection，作者不再维护 `builtIn`、`selected` 或完整 `schedules` 平行列表。
- group 仅在 authoring/normalization 存在；所有输出、policy 和 Core catalog 继续只使用 flattened leaf `checkId`。
- 组与 leaf 的 `dependsOn`、`mutex` 按 Task group 一样向下追加、去重；group reference 展开为全部 descendant leaves；unknown reference、duplicate identity、self dependency 与环在 work 前以稳定 diagnostic 拒绝。
- 在本 Change 的基础契约中，没有显式 dependency 或同名 mutex 的 leaves 默认并发，root budget 由 `scheduler.maxParallel` 提供；独立后继允许 resolved Check 在 active span 内以 `maxParallel` 收紧同一 scheduler，但不引入数组顺序或 `parallel` mode。
- built-in-specific options 有完整类型和默认值；项目可从 descriptor 调用字段感知的 `.replace()` 局部覆写，并用 `.append()` 追加已声明的 scheduling collections，而不展开默认对象、不产生无类型通用 deep merge，也不暴露 scanner-private configuration。
- Core 继续消费 flat validated catalog 与 private execution bindings；Task mutex 能同时作用于 direct built-in work 和 custom TaskPlan leaves。
- repository dogfood、owner docs、test evidence 与 downstream npm package Change 都反映新的 authoring contract。

## Affected Owners

- `docs/decisions/configuration/**` 与 `docs/decisions/product-contract/**`：记录长期 public Check authoring、identity、Task/resource 与 quality-option owner 判断。
- `src/product/current-public-contract.ts`：definition-facing exported values 的唯一 current owner。
- `src/product/project-definition*.ts`：Check tree types、validation、normalization、fingerprint 和 diagnostics。
- `src/product/quality-configuration.ts` 与 built-in Check owners：将内置专有 defaults/options 迁到相应 descriptor，同时保留 project-wide shared quality input owner。
- `src/product/quality-core/src/check-record/**` 与 `src/product/task-orchestration/**`：flat catalog、schedule、selection 和 mutex handoff；不改变各自的核心责任。
- `scripts/quality/**`、`docs/configuration.md`、testing Cases 与 workspace verification：dogfood、canonical usage 与证据。
- `changes/establish-api-only-npm-product-boundary/`：消费更新后的 exported values/types，并在 npm projection阶段验证 exact package surface。
