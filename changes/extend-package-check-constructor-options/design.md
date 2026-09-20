# Design

本设计以一个共享顶层 authoring contract 扩展九个固定身份构造器，并将项目声明与领域 execution options 保持为两个明确投影。

## Context

- [`src/check/check.ts`](../../src/check/check.ts) 的 executable Check 已定义 identity、selection、composition、relations、scheduling、resources 和 presentation 字段；`options`、`prepare`、`execute` 与 `parseData` 承担另一组行为职责。
- 九个目标构造器均返回原生 typed Check。前八个接收 closed object policy；`maintenanceReminders` 接收 entries array，并在内部生成完整 options。
- [`commandCheck`](../../src/package-checks/command-check/contract.ts) 已在一个 closed input 中组合 command policy 与 ordinary Check fields，提供共享字段集合和运行时投影的现有基线。
- Project Definition 的 validation 与 normalization 继续是声明语义的 owner；构造器负责 accepted keys、package defaults、领域 options 和最终 Check value。
- active Decision [`260920-configure-package-checks-through-constructor-options`](../../docs/decisions/configure-package-checks-through-constructor-options.md) 固定本 Change 的长期方向。specialized-constructor 与 supporting-type Decisions 继续约束 resolved options 和 root exports。

## Goals / Non-Goals

**Goals**

- 用同一个顶层输入表达 package domain policy 与项目 Check 声明。
- 保留默认 identity 和旧调用，同时从自定义 `checkId` 推断 literal return identity。
- 复用一套字段、解析和验证规则，避免九个构造器产生不同变体。
- 以 Definition、bound Run 和 installed consumer 证明声明字段实际生效。

**Non-Goals**

- scanner protocol、文件 policy、Finding、Record、final data 和 execution failure semantics 保持不变。
- `prepare`、`execute`、`parseData`、`options` 整体替换和 handoff 不成为构造参数。
- 本 Change 不新增 scanner abstraction，也不改变 `defineCheck()` 或 `commandCheck()` 的公共行为。

## Decisions

### Intended Change

1. **共享输入类型。** 从 package root 导出以下公共概念；字段 shape 复用现有 Core 类型：

   ```ts
   interface PackageCheckAuthoringOptions<Id extends string = string> {
     readonly checkId?: Id;
     readonly displayName?: string;
     readonly enabledByFlags?: CheckFlagEnablement;
     readonly checks?: readonly Check[];
     readonly dependsOn?: InheritableCheckCollection<string>;
     readonly observes?: InheritableCheckCollection<string>;
     readonly maxParallel?: number;
     readonly admissionPriority?: number;
     readonly mutex?: InheritableCheckCollection<string>;
     readonly resourceClaims?: CheckResourceClaims;
     readonly omitQuietPassedRow?: boolean;
   }
   ```

   该类型有独立 consumer 用途：项目可以命名并复用 selection、relation 与 scheduling 配置片段。`omitQuietPassedRow` 在构造输入中接受 boolean；`true` 投影为 raw Check field，`false` 投影为省略，使 package 的 `true` 默认值也能被显式关闭。

2. **构造器签名。** 现有 authored options 类型扩展共享类型并接受 identity generic；构造函数 generic 的默认值是当前 package ID。例如：

   ```ts
   function fileMetrics<const Id extends string = "file-metrics">(
     options?: FileMetricsOptions<Id>
   ): TypedCheckWithOptions<Id, ResolvedFileMetricsOptions, typeof parseFileMetricsData>;
   ```

   没有 `checkId` 输入时使用默认 generic 和 runtime ID；literal `checkId` 同时决定返回类型与 runtime identity。省略 `displayName` 时继续使用 package default，自定义 identity 不派生新的名称。

3. **输入分流。** 共享 resolver 对输入建立 closed snapshot，分离项目字段与构造器声明的领域 keys。领域 resolver 只接收领域 projection，并继续生成原有完整冻结 options；项目 projection 与 package 默认 definition 合并后传给 `defineCheck()`。未知顶层 key 同步拒绝，项目字段不进入 `.options`、preparation 或 execution context。

4. **声明校验。** 构造器同步校验 closed input、identity、display name 和共享字段可安全 snapshot 的 shape；Project Definition 继续对 children、flags、relations、scheduling、resources 和唯一性执行现有权威校验。实现复用 Core parser 或共享 package helper，不建立第二套声明语义。

5. **目标 inventory。** 同一 helper 和类型规则覆盖 `fileMetrics`、`functionMetrics`、`duplicateDetection`、`jsonValidation`、`jsonSchemaValidation`、`markdownLinkValidation`、`markdownLint`、`secretDetection` 与 `maintenanceReminders`。各构造器只声明自己的 domain keys、默认 ID、默认 display name 和既有 presentation default。

6. **Maintenance reminders 兼容。** 保留 array overload，并新增 `MaintenanceRemindersInput<Id>` object overload：

   ```ts
   maintenanceReminders(entries)
   maintenanceReminders({ entries, checkId, displayName, ...projectFields })
   ```

   两个 overload 都生成相同的 `MaintenanceReminderOptions`；object input 只增加项目声明能力，不公开内部 `git` resolved option。

7. **证据边界。** 类型测试证明默认与自定义 identity、禁止字段和共享 options inference；constructor tests 证明 defaulting、projection、closed input 与 resolved-options 隔离；Definition/Run tests 证明两个同类实例的 selection、relations、scheduling、resources 和 reporting。exact candidate external consumer 直接导入共享类型并执行多实例 Definition。

### Resulting Impacts

- **公共 API：** `PackageCheckAuthoringOptions`、`MaintenanceRemindersInput` 和 generic authored options 进入 root declarations 与 inventory。现有无 generic type usage 继续以默认 `string` 工作。
- **Runtime：** package-owned callbacks、parser 和 resolved options 保持同一引用或同一实现入口；只有最终 Check declaration 的显式项目字段可以改变。
- **Validation：** constructor closed-key validation 与 Definition semantic validation 分工保持明确。测试覆盖 JavaScript/unknown input，不能只依赖 TypeScript excess-property checking。
- **Compatibility：** 无参 constructors、现有 object policies、required `secretDetection` policy 和 maintenance entries array 都保留。默认 constructed values 与当前 snapshots 相等。
- **Documentation：** 每项 guide 只解释共享入口在本 Check 上的使用；共享字段的完整规则由 API mechanics 与 Project Definition owner 持有，避免九份重复规格。
- **Governance：** 修改测试前后运行 Test Evidence checker；实现完成后同步 Decision alignment，并由非实施代理按实际 diff 反查行为与文档 owner。

## Risks / Trade-offs

- 顶层共享字段扩大了每个 closed input 的保留 key 集合；共享 resolver 与统一命名防止各构造器独立漂移，未来领域 option 不得复用这些名称。
- generic options 会增加声明复杂度；默认 generic、现有未参数化用法和 exact-candidate declarations 必须共同验收。
- `checks` 与 inherited scheduling fields 允许 package executable 同时作为组合节点；Definition 的现有递归 validation 和 normalization 必须保持唯一语义 owner。
- 九个构造器同时迁移扩大了测试范围，但这是统一公共 contract 的必要成本；分批交付不得留下不同字段集合或参数位置。

## Open Questions

无。字段集合、顶层输入、默认规则、maintenance 兼容形式、root type export、验证 owner 和目标 inventory 已确定；实现发现 contract 无法由统一 helper 兑现时，应先回到本 Plan 修订，而不是引入构造器特例。
