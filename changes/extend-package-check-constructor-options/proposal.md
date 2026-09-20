# Proposal

本 Change 让固定身份的随包 Check 构造器通过现有顶层选项直接接收项目声明。

## Why

随包构造器已经返回带 literal identity、resolved options、execution 和 final-data parser 的原生 typed Check。当前缺口是构造输入只表达领域 policy：项目无法在同一次调用中设置 `checkId`、选择条件、关系、调度和资源字段。同一 Project Definition 需要两个同类 Check 时，调用方只能在构造后重新组合对象，专用构造器没有完整承接项目 authoring。

这项能力适用于全部固定身份构造器，而不是 `fileMetrics` 或 SCC 的专用扩展。统一输入可以让项目直接创建多个可独立选择、执行和报告的同类 Check，并保持各构造器的默认值、验证和类型推断一致。

## Outcome

九个固定身份构造器在现有顶层输入中接收共享的 `PackageCheckAuthoringOptions`。省略项目字段时，现有调用、默认 identity、display name、resolved options 和执行结果不变；显式 `checkId` 时，返回的 `TypedCheckWithOptions` 保留该 literal type。

构造器将领域字段解析到 Check `options`，将项目字段投影到 Check 声明。项目字段不会进入 execution `context.options`；package 继续拥有 `prepare`、`execute`、`parseData` 和 handoff 边界。

## Scope

### Intended Change

- 新增并从 package root 导出 `PackageCheckAuthoringOptions<Id>`，字段为 `checkId`、`displayName`、`enabledByFlags`、`checks`、`dependsOn`、`observes`、`maxParallel`、`admissionPriority`、`mutex`、`resourceClaims` 和 `omitQuietPassedRow`。
- 将 `fileMetrics`、`functionMetrics`、`duplicateDetection`、`jsonValidation`、`jsonSchemaValidation`、`markdownLinkValidation`、`markdownLint`、`secretDetection` 与 `maintenanceReminders` 接入同一解析与投影规则。
- 让现有 authored options 类型包含共享字段，并让构造函数从可选 `checkId` 推断返回 identity；resolved options 类型保持领域专用且不包含项目字段。
- 保留 `maintenanceReminders(entries)`，并增加 `{ entries, ...projectFields }` object input；两种形式使用同一默认 policy 和执行实现。
- 保持 `commandCheck` 的现有公共 contract；它作为已具备同类 ordinary Check 字段的行为基线。

### Resulting Impacts

- 公共声明、九个构造器及其 input resolver 需要共同处理默认 identity、顶层 closed input、字段分流和 literal generic。
- Project Definition 继续拥有唯一 ID、关系、flag、调度、资源和组合校验；构造器不复制 Definition normalization。
- 每项随包 Check 的 guide、README、API mechanics、Project Definition 说明和公共 API inventory 需要同步新的 authoring 入口。
- 类型和 runtime 证据需要覆盖默认调用、自定义 identity、完整共享字段、两个同类实例、resolved-options 隔离以及旧调用兼容。
- 实施完成后，将 active Decision `260920-configure-package-checks-through-constructor-options` 从 `unaligned` 标记为 `aligned`。

## Success Criteria

1. 九个目标构造器均可在一次调用中接收领域 policy 与共享项目字段；默认调用和既有输入形式保持兼容。
2. 默认调用保留当前 literal ID；自定义 `checkId` 在返回类型、Definition、bound Run、选择和报告中保持同一 literal identity。
3. 两个 `fileMetrics` 实例及至少另一个目标构造器的自定义实例能够同时进入一个 Definition，并正确应用 flags、relations、scheduling 和 resource claims。
4. `.options` 与 execution `context.options` 只包含完整冻结的领域值；新增项目字段不会改变 native execution、Finding、Record 或 parser contract。
5. `PackageCheckAuthoringOptions` 可从 exact candidate 的 package root 导入并用于可复用配置片段；生成声明和隔离 consumer 类型检查通过。
6. 最窄测试、公共 API inventory、文档示例、Test Evidence、Decision、`bun run check` 与 `bun run check -- --all` 全部通过，且非实施审阅确认稳定 owner 与实际行为一致。

## Affected Owners

- `src/check/**` 与 `src/package-checks/**`：共享 authoring 类型、字段投影、构造器和领域 options 分流。
- `src/project-definition/**`：Definition 集成、唯一 ID、关系、selection、scheduling 与 resource acceptance。
- `src/index.ts` 与公共 API inventory：root type export 和 declaration acceptance。
- `README.md`、`docs/api-mechanics.md`、`docs/development/project-definition.md` 与九项 Check guide：公共使用方式和 owner 边界。
- `docs/decisions/configure-package-checks-through-constructor-options.md`：长期 constructor contract 与兼容策略。
- package candidate、external consumer 与 Project Gate：发布形态下的类型、文档和 runtime 验收。
