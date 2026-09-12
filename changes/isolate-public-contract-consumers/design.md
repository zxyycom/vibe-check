# Design

本 Plan 将 Finding presentation 与 `defineAdmissionPolicy` 迁入 `src/package-tools/<domain-owner>/`，建立两向依赖门禁，并保持公开 API 与行为兼容。

## Context

- [`src/index.ts`](../../src/index.ts) 是唯一 public package entry；[Architecture](../../docs/development/architecture.md#source-module-boundaries)拥有当前领域分工。
- 源码审计覆盖 28 个 runtime exports 和 127 个 type-only exports，结合调用关系、静态 imports 与类型探针形成下文判断。完整分类、基线和证据限制见 [Audit Reference](#audit-reference)。
- [两向依赖 Decision](../../docs/decisions/keep-core-independent-of-package-tools.md)拥有长期分类与依赖方向；本 Plan 拥有两个工具的迁移、门禁实施和验收。

## Goals / Non-Goals

目标是让 Core 独立于可选工具成立，并让统一目录自动约束 Non-core 的全部生产实现。各工具继续拥有自己的算法、I/O 和失败契约。

本 Change 调整源码归属与依赖接线，保持公开导出、签名语义、产品行为和单一算法实现。新增 API、deep-import surface、兼容 wrapper 与工具算法改造均不在范围内。

## Decisions

### Intended Change

#### 分类规则

Core 包含 ordinary Check contract、Definition、Invocation、Scheduler、settlement 及其所需基础机制；package-provided Checks 是该机制的消费者。

| 角色 | 判据 | 归属 |
| --- | --- | --- |
| Non-core tool | 移除具体工具及其 facade 导出后，Core 的契约、默认行为和机制仍完整，无需替代实现 | 统一工具目录中的领域子 owner |
| Core tool | Core 直接依赖该能力，或公开接口直接开放核心机制且缺少合理的独立拆分位置 | 实际 Core 机制 owner |
| Core API | 拥有产品 authoring、identity、defaults 或运行协议 | 对应产品 owner |
| Check constructor / parser | 构造具体 Check 或解释其数据契约 | 对应 Check owner |

分类核对必要职责，目录准入核对实际依赖：可选工具仍有 Core-private import 时，先解决耦合再迁入。Core 需要的基础实现继续属于 Core，即使该实现本身纯净。

Core 调用 caller 注入的公共 strategy/Check 协议，不构成对某个具体工具的依赖；硬编码 import、默认实例化和具体工具类型则属于依赖。package facade 的组合导出也与“直接开放已有 Core 机制”分别判断。

#### 实施范围

| 对象 | 当前判断与依据 | 本 Plan 处理 |
| --- | --- | --- |
| Finding presentation | Core 不调用；package Checks 使用；仅需公开 Check 类型 | 迁入，文件内 `appendCheckMessages` 随迁并供现有 Checks 使用 |
| `defineAdmissionPolicy` | Core 不调用；identity helper 和 exact authoring 类型依赖现有公开策略类型 | 提取，保持类型推断 |
| Cache、waiver、learned | Core 不依赖具体工具，但工具仍使用共享 canonical/closed-data 私有实现 | 范围外；后续加入目录前解决共享基础依赖 |
| `data-boundary` | Definition、Check snapshot、settlement 和 output 直接依赖 | 保留 Core 基础 owner |
| `createAdmissionGraph` | 与真实 Scheduler 共用 private state、reducer、forced microsteps 和 effects | 保留 Core tool，遵循[既有 Decision](../../docs/decisions/provide-immutable-admission-graph-state.md) |
| Collection、default selection 与相关 host adapters | 当前由 package Checks 使用；已确认的 file-input 方向将使 Invocation 依赖共享机制 | 范围外；由 file-input Change 收敛 Core 侧责任 |

本 Plan 的交付范围是两个工具与完整门禁。其他工具、data-boundary 和 collection/host 保留现有位置，不计为本次隔离成员。

目标位置：

```text
src/package-tools/
├── finding-presentation/finding-presentation.ts
└── admission-policy/define-admission-policy.ts
```

具体接线：

- 将 `src/check/finding-presentation.ts` 及近邻测试迁入目标目录，使用公开 `CheckResult` 推导 `CheckMessage`。`FindingOverflowContext` 与非公开 `appendCheckMessages` 随文件移动，更新 root 和 package Check imports。
- 从 `src/project-definition/project-definition.ts` 提取 `defineAdmissionPolicy`、五个 exact 类型及 JSDoc；只导入现有公开策略类型。`defineConfig`、Product defaults、validation 和 normalization 保留原 owner，原文件不保留兼容 re-export。
- 更新 `src/project-definition/project-definition.authoring-defaults.test.ts` 的 helper import，保留 Definition 集成断言；在工具近邻补充 identity 和 authoring 类型证据。既有 Case 的 Owner/Proves 与新增证据按测试策略维护。
- `src/index.ts` 只调整工具 value/type 的来源，保持 28 个 runtime exports 与 127 个 type-only exports 的集合；以 `scripts/package/public-api-inventory.ts` 核对。

#### 两向依赖边界

在 `scripts/validation/` 实现 `package-tools-boundary.ts`，接入现有 `validateRepositoryLayout`。受检集合由目录自动发现，规则集中维护。

| 依赖方向 | 门禁规则 |
| --- | --- |
| Core → Non-core | 禁止直接或经 helper、barrel、相邻 owner 间接依赖，覆盖 value/type imports 与 re-exports |
| Non-core → Product | 仅允许真正从 package root 公开的符号，按符号身份及 value/type 身份解析 |
| Non-core → 目录内实现 | 允许；支撑模块同样受检 |
| Non-core → 宿主 / 第三方 | 按确切 module、package/subpath 审核，并核对随包依赖投影 |
| package Checks → Non-core | 允许，保持 Check 自身行为 owner |

公共符号从定义处具名导入，跟随 alias 解析；内部不经 package root 回环导入。公开 API 背后的合法私有实现由该 API owner 负责，不能将整个来源文件作为公开符号白名单。

Core 受检 roots 固定为以下目录中的生产 TypeScript 文件，目标工具迁出后按新位置分类：

```text
src/check/
src/check-settlement/
src/data-boundary/
src/machine-output/
src/project-definition/
src/project-run/
```

以这些 roots 为起点遍历仓库内 type/value import、具名 re-export 和可解析的 literal 加载边；中间 owner 也进入遍历。`src/index.ts` 是组合 facade，不是起点，但 Core 若经中间模块导入它，仍继续检查其依赖。bare Node/npm 模块作为已知外部叶子，不展开其实现。路径规范化后检查目标，未解析的仓库依赖和加载语法报告违规。

生产集合排除 `.test.ts`、`.type-test.ts`、`.test-support.ts`、`test-support/` 与 `fixtures/` 材料；生产图指向这些材料时报告违规而非跳过边。新增 `src` 顶层 owner 仍受 layout 的闭合集约束，加入时必须明确其 Core roots 或非 Core 角色。

使用 TypeScript Program/TypeChecker 按当前工程 module resolution 解析 root 的公开符号与 alias，保留 value/type 身份后比对工具 imports；同名私有符号不放行。工具的两份生产模块没有宿主或第三方 import，本 Plan 初始外部允许集合为空，测试所需 Node 模块按测试角色处理。

Core-private helper、`scripts/**`、测试和 fixture 均不属于工具生产依赖允许集合。生产模块不能借被排除的测试材料绕行。语法处理与 fixture 要求见[门禁证据](#门禁证据)。

### Resulting Impacts

| 责任 | 本 Plan 处理 | 范围外关联 |
| --- | --- | --- |
| [Architecture](../../docs/development/architecture.md#source-module-boundaries)与 [Workspace tooling](../../docs/tooling/workspace.md#source-owners-and-dependency-direction) | 声明两向边界、Core 路径集合和两个工具 owner；更新 layout 检查 | 随新成员重验依赖闭包 |
| 工具用户说明与内部设计 | 更新 presentation、admission-policy 的源码定位、JSDoc 和 authoring 说明；Definition defaults 保持原 owner | collection 需同步 [Project files](../../docs/development/project-files.md)的范围、收集、exact-input 与验证章节，保持 Check-local fingerprint/acceptance 责任 |
| [包材料](../../docs/tooling/package-artifact.md)与[包验收](../../docs/tooling/package-lifecycle.md) | 更新 root 来源路径，核对 inventory、声明、source maps、shipped sources、compiler roots 与 installed consumer | 按最终成员追加相同验收 |
| [测试与 Case](../../docs/testing/strategy.md) | 迁移近邻测试及 Case links，保留 Proves/Owner 语义，新增两向门禁证据 | 保持各工具行为证据，不借目录迁移删减测试 |
| [知识治理](../../docs/governance/knowledge-maintenance.md) | 维护两向依赖 Decision 的对齐状态；由非实施代理基于实际 diff 反查用户说明与内部设计 | 各候选的新增取舍单独核对 |

公开用法和行为保持兼容，用户指南以路径、链接和示例影响为主要审查对象；内部 owner 随源码归属同步。语义审查与机械检查分别提供证据。

相邻 Changes 的分工：

- [File-input](../batch-declared-project-file-inputs/design.md)负责 Invocation barrier、slot、来源失败、取消及 settlement。其 active/unaligned [Decision](../../docs/decisions/batch-declared-project-file-inputs-at-invocation-boundary.md)要求唯一共享收集机制；若 Invocation 直接依赖它，公开单份入口按 Core tool 判断。“中立 owner”表示脱离特定 Check，不等于 Non-core。
- [Learned optimization](../optimize-learned-admission-strategy/design.md)保留算法和性能采用责任；该 Change 落地后需重验 learned 候选的 imports。
- [Scheduler performance reference](../add-scheduler-performance-reference/design.md)作为后续候选遵循同一目录边界，其公开方式和指标语义由自身 Change 决定。

实施验证顺序：

1. 修改测试前后运行 `bun run test-evidence -- check --root .`，执行工具和边界的最窄测试。
2. 以 Core roots 的生产闭包证明不存在工具依赖；用仅以该闭包为 roots 的内存 TypeScript Program 完成 no-emit 检查，并执行默认 Definition/Run 的代表性回归。Core-only 证据与同一完整包的 consumer 验收分别提供，不通过删除工作树文件构造环境。
3. 完成[门禁证据](#门禁证据)中的正反 fixture；对迁移前后声明作结构比对（允许模块位置和等价类型 alias 改变），验收 identity、static/simple/prepared 同步/异步推断、额外字段拒绝与 callback contextual types。
4. 运行 `bun run validate`、目标 typecheck/lint 和 Change check；维护 Decision 后运行 `bun run decisions -- check`。
5. 运行 `bun run check`，再以 `bun run check -- --all` 验收同一 candidate 的产物、声明和隔离 consumer。

## Risks / Trade-offs

- 两个工具足以建立真实硬边界；共享基础依赖仍会限制其他工具加入。复用方案需保持单一实现、公开面和 Core 独立性，不能通过复制算法或私有白名单换取目录合规。
- 符号可能与私有 exports 同文件，且 Core 可能经中间 owner 依赖工具；两向解析和 Core-only 验收均是必要证据。
- 路径和类型提取会影响声明、Case 与包材料。静态探针只支持可行性判断；门禁服务受信仓库治理，不是 JavaScript 安全沙箱。

## Open Questions

无阻止本 Plan 推进的未决选择。cache/waiver/learned 的共享基础复用及 collection/host 的最终 Core 归属均在本次范围外；其后续调整不改变本 Plan 的两个工具与两向门禁验收。

## Audit Reference

### 基线与覆盖

审计基线为 2026-09-12 工作树，Product source 对应 HEAD `e27e42c4ee2cb7feffb69afc91195ffbf16bee25`。AST 核对 `src/index.ts` 与 [tooling-owned inventory](../../scripts/package/public-api-inventory.ts)：28 个 runtime values、127 个 type-only exports 的名称集合一致。实施前重验基线差异。

下表保留逐项角色与源码定位；它是本 Plan 的审计材料，长期 public inventory 仍由 tooling 拥有。路径相对 `src/`。

### Runtime inventory

| Export | 当前 owner / 关键职责 | 分类依据 |
| --- | --- | --- |
| `cacheJsonByKey` | `cache/cache-json-by-key.ts`；caller key/parser/compute 与存储 | 可选工具；共享数据依赖待解 |
| `presentCheckFindings` | `check/finding-presentation.ts`；有界 messages | Non-core 迁移对象 |
| `reconcileFindingWaivers` | `finding-waivers/reconciliation.ts`；identity/waivers 对账 | 可选工具；共享数据依赖待解 |
| `createLearnedCriticalPathStrategy` | `learned-critical-path/strategy.ts`；公开策略与 caller history | 可选工具；共享数据依赖待解 |
| `defineCheck` | `check/check.ts`；authoring 与 handoff provider identity | Core API |
| `inherit` | `check/inherited-collection.ts`；Symbol/WeakSet identity | Core API |
| `defineConfig` | `project-definition/project-definition.ts`；Definition/defaults | Core API |
| `defineAdmissionPolicy` | `project-definition/project-definition.ts`；identity 与 exact 类型 | Non-core 迁移对象 |
| `run` | `project-run/run.ts`；Invocation、Scheduler、settlement 与 outputs | Core API |
| `createAdmissionGraph` | `project-run/task-scheduler/admission-core/core.ts`；共享 reducer/state/effects | Core tool |
| `collectProjectFiles` | `package-checks/project-files/public-collection.ts`；共享收集 façade | 与 file-input 收敛 Core 侧归属 |
| `defaultProjectFileSelection` | `package-checks/project-files/configuration.ts`；selection 默认值 | 随 selection contract 收敛归属 |
| `duplicateDetection` | `package-checks/duplicate-detection/default-check.ts`；execution/scanner/cache 接线 | Check constructor |
| `fileMetrics` | `package-checks/file-metrics/constructor.ts`；execution/scanner 接线 | Check constructor |
| `functionMetrics` | `package-checks/function-metrics/constructor.ts`；execution/private analyzer 接线 | Check constructor |
| `secretDetection` | `package-checks/secret-detection/default-check.ts`；files/detector/results 接线 | Check constructor |
| `jsonSchemaValidation` | `package-checks/json-schema-validation/default-check.ts`；schema/binding/execution 接线 | Check constructor |
| `jsonValidation` | `package-checks/json-validation/default-check.ts`；selection/validation/results 接线 | Check constructor |
| `markdownLinkValidation` | `package-checks/markdown-link-validation/default-check.ts`；links/options/cache 接线 | Check constructor |
| `maintenanceReminders` | `package-checks/maintenance-reminders/maintenance-reminders.ts`；Git assessment 接线 | Check constructor |
| `parseDuplicateDetectionData` | `package-checks/duplicate-detection/final-data.ts`；Finding counts | Check data parser |
| `parseFileMetricsData` | `package-checks/file-metrics/final-data.ts`；Finding counts | Check data parser |
| `parseFunctionMetricsData` | `package-checks/function-metrics/final-data.ts`；Finding counts | Check data parser |
| `parseSecretDetectionData` | `package-checks/secret-detection/final-data.ts`；coverage/waiver/counts | Check data parser |
| `parseJsonSchemaValidationData` | `package-checks/json-schema-validation/final-data.ts`；binding/issue counts/truncation | Check data parser |
| `parseJsonValidationData` | `package-checks/json-validation/final-data.ts`；valid/invalid/rejected counts | Check data parser |
| `parseMarkdownLinkValidationData` | `package-checks/markdown-link-validation/final-data.ts`；link summary | Check data parser |
| `parseMaintenanceRemindersData` | `package-checks/maintenance-reminders/final-data.ts`；assessment/identity/counts | Check data parser |

Check constructors 与 parsers 保留各自领域 owner；parser 的纯函数性质不改变其数据契约职责。

### 类型与调用证据

CodeGraph callers 与 Core 源码 imports 支持正文的入向依赖判断。静态闭包只展开仓库内 imports/re-exports，不展开 Node/npm 实现。

| 内部类型 | 工具可从公开类型推导的等价表达 |
| --- | --- |
| `CheckMessage` | `NonNullable<CheckResult["messages"]>[number]` |
| `SchedulerMeasurementAdmission` | `NonNullable<SchedulerRawMeasurement["timingFacts"]>["admissions"][number]` |

内存 TypeScript program 对上述两对类型的相等性检查均为 0 诊断。learned 其余策略、graph、measurement imports 已有 root 公开身份；canonical/closed-data 复用问题独立保留。

`defineAdmissionPolicy` 的五个 exact 类型仅依赖已公开的 `AdmissionPolicy`、`CustomAdmissionStrategy`、`CustomAdmissionPreparationContext`、`PreparedCustomAdmissionStrategy`。内存提取探针通过双向函数赋值、static/simple/prepared 同步与异步样例及负例；这些样例支持提取可行性。真实声明结构、callback contextual types 和 installed consumer 的兼容性由实施验证证明。

### 门禁证据

工具侧门禁按下表实现；Core 侧按前述闭包规则遍历。无法解析的依赖必须 fail closed。

| 语法 / 来源 | 处理 |
| --- | --- |
| 具名 static import/export、显式 type import | 解析路径、alias 和符号的 value/type 身份 |
| `import("literal").Type` | 首版明确拒绝；以普通具名 `import type` 表达 |
| Product namespace/default、`export *`、side-effect import、动态加载 | 拒绝 |
| `require`、import-equals、computed import、未知目标、解析失败 | 拒绝 |
| 获准 Node/npm 的 default/namespace import | 初始生产允许集合为空；以后按确切模块集中审核 |
| 目录内具名 re-export | 允许已受检的生产实现之间复用，保持单一领域 owner |

当前 `analyzeModuleSpecifiers` 能收集普通 type import 和 literal dynamic import 的路径，但未覆盖 import type query、computed import、`require` 的完整检查；namespace import 也只有路径信息。它可以复用，但仍需补充符号解析与 fail-closed 检查。

正反 fixture 至少覆盖：新目录自动受检、Core 直接/间接依赖工具、工具间接依赖 Core-private、合法公开 alias/type 与同文件私有符号、生产导入测试材料、上述语法和解析失败。公共 API 的合法私有实现、package facade 组合导出和 caller 注入协议应有避免误报的正例。

### 相关长期判断

- [Learned 通过公开策略接入](../../docs/decisions/provide-learned-admission-through-public-strategy.md)：保持普通扩展点权限。
- [Caller-keyed cache](../../docs/decisions/provide-caller-keyed-json-cache-without-run-caching.md)：保持 compute/parser 与 cache observation 边界。
- [单份 collection](../../docs/decisions/provide-synchronous-single-selection-file-collection.md)：复用唯一枚举机制。
- [Tooling-owned inventory](../../docs/decisions/keep-public-inventory-and-package-materials-tooling-owned.md)：分类材料不替代长期 inventory。
- [Supporting types](../../docs/decisions/export-consumer-named-supporting-types-from-package-root.md)：保持按真实 consumer 需求确定公开类型。
