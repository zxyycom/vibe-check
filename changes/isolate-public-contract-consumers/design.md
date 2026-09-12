# Design

以面向外部用户的公开数据契约完成五个可选工具的隔离；Core 保留单份数据基础和机制 owner，工具目录内实现全部接受两向门禁。

## Context

首批 Finding presentation 与 admission authoring 的迁移曾通过阶段验收；当前 candidate 已把 cache、waiver 和
learned 纳入同一范围。该阶段证据只说明首批迁移，不替代五个工具、公开数据 API、包材料和完整 Gate 的本次验收。
Core 的实际生产依赖闭包不引用这五个具体工具；此前的私有数据依赖是需要以公开数据契约解除的耦合，不改变工具的
Non-core 身份。

用户允许新增 API，并要求外部用户能独立使用，不仅供内部工具通行；完整应用方案可以后续演进，首版仍须有清晰契约和可执行证据。旧计划的“不新增 API”不是用户限制。

## Goals / Non-Goals

- 五个工具及其独立支撑实现进入统一目录，既有 API、算法、输入/输出和失败语义兼容。
- 新增最小数据 API，从唯一 package root 提供中文说明、支持类型、独立示例和安装后验收。
- 不迁走 Core 所需数据基础，不复制算法，不增加私有白名单、deep import、兼容 wrapper、第三方依赖或新 package。
- 不开展 learned 算法优化，不提前实施 collection 的 Invocation 接线。

## Decisions

### Intended Change

#### 工具归属与位置

| 对象 | 目标 owner | 处理 |
| --- | --- | --- |
| Finding presentation | src/package-tools/finding-presentation/ | 保留首批迁移与公开类型推导 |
| defineAdmissionPolicy | src/package-tools/admission-policy/ | 保留首批提取与 exact types |
| cacheJsonByKey | src/package-tools/cache/ | 迁移，使用公开数据能力 |
| reconcileFindingWaivers | src/package-tools/finding-waivers/ | 迁移，保持 canonical identity 与 audit 语义 |
| createLearnedCriticalPathStrategy | src/package-tools/learned-critical-path/ | 迁移完整 history/model/strategy；仅供 learned 使用的 critical-path-ranking 同迁 |
| canonical/closed data | src/data-boundary/ | 保留 Core owner，公开下述最小面；私有 helper 仍私有 |
| createAdmissionGraph | 实际 Scheduler owner | 保留共享 state/reducer/effects 的 Core tool |

工具身份取决于 Core 是否需要具体工具；现有私有 imports 不能成为排除理由。package Checks 使用工具属于消费者关系；Core 调用 caller 注入的公共策略不等于依赖 learned 实现。

#### 首版公开数据契约

| Runtime export | 外部用户可独立完成的任务 |
| --- | --- |
| canonicalizeJsonValue | 将 unknown 数据安全 materialize 为 detached、deep-frozen canonical JSON value，失败返回 undefined |
| canonicalizeJsonObject | 对需要 object payload 的边界采用同一 materialization，拒绝非 object root |
| canonicalJsonText | 生成项目定义的确定性 JSON 文本；不能 materialize 时抛 TypeError |
| canonicalJsonBytes | 取得同一 canonical 文本的 UTF-8 bytes，用于 caller 自有 fingerprint 或存储 |
| snapshotExactClosedRecord | 接受恰好具备声明 own keys 的闭合普通对象，返回浅冻结快照，失败返回 undefined |
| snapshotClosedArray | 接受 dense、无额外 own 属性的普通数组，返回浅冻结快照，失败返回 undefined |

公开 supporting types 为 CanonicalJsonPrimitive、CanonicalJsonValue、CanonicalJsonObject。既有 28 value / 127 type 基线保留，新增后预期 34 value / 130 type；以实际 inventory、声明和 installed consumer 核对，不沿用旧计数硬编码。

cache 与 learned 的 snapshotClosedRecord + hasExactPlainRecordKeys 合并使用既有 snapshotExactClosedRecord，避免公开私有 predicate；局部调用调整必须保持返回/失败与属性观察语义。测量中的私有 admission 类型从公开 SchedulerRawMeasurement 推导；其他私有类型逐项核对，不复制协议定义。

用户文档必须区分 canonical 深快照与 closed 浅快照、undefined 与 TypeError、getter/toJSON 不调用与 Proxy 反射仍可能触发 trap。canonical 文本是本项目顺序规则，不宣称 RFC 8785 或通用安全沙箱。首版可小，但不能省略这些行为边界。

#### 两向门禁

现有入口 scripts/validation/package-tools-boundary.ts 编排公开符号审计；module-graph 负责语法与工程 module resolution，core-closure 负责 Core 六类 roots 与 no-emit。稳定规则由 [Architecture](../../docs/development/architecture.md#source-module-boundaries) 与 [Workspace tooling](../../docs/tooling/workspace.md#source-owners-and-dependency-direction) 拥有。

- 统一扫描 src/package-tools/ 内全部生产模块；目录内支撑模块同样受检，不能借测试或 fixture 绕行。
- 工具消费 Product 时按 package-root 符号身份、alias 和 type/value 身份审计，定义处具名导入；不能经 package root 回环或整文件白名单。
- Core roots 保持 check、check-settlement、data-boundary、machine-output、project-definition、project-run；按实际 tsconfig 解析仓库内相对、绝对、alias、type/value/re-export 与 Core literal loading edge，传递阻止工具依赖。
- 工具动态加载、import type query、namespace/default Product import、star/side-effect import、require/import-equals 均拒绝；Core literal dynamic import 可遍历，非 literal 或 require/import-equals 拒绝。解析失败 fail closed。
- 宿主依赖按实际使用的确切 node: specifier 集中允许，并核对现有随包环境；不借本次引入新 npm dependency。该集合不是 Core-private 例外。
- 生产集合排除 .test.ts、.type-test.ts、.test-support.ts、test-support/ 与 fixtures/；生产图指向这些材料时必须报错。

### Resulting Impacts

- root 与 tooling inventory 同步新增公开值/类型、迁移 export 来源；compiler roots 仍是已有 package entry 与内部 worker，不建立工具 subpath。
- 公开数据专题/JSDoc/示例及随包 registry、README/navigation 形成可发现的用户入口；外部 consumer 只从安装后的 package root 获取能力，不依赖仓库路径。
- architecture、workspace、learned/cache/waiver 源码定位、Case entities 和相邻脚本引用随迁移更新。package Checks 仅调整 imports，不改变行为 owner。
- 维护 [公开数据契约 Decision](../../docs/decisions/provide-public-data-boundaries-for-tool-isolation.md) 的未对齐方向，完整验收后才标记 aligned；保留两向规则的已实现事实，不用其状态代替本次扩展目标完成度。
- learned optimization 仍按其恢复门禁暂停；当前只移动既有算法，不采纳历史优化方案。file-input Change 继续独立拥有 collection/Invocation 责任。

验证依次覆盖目标测试/Test Evidence、全部五工具边界和实际 Core-only no-emit、旧行为兼容及新 API 独立类型/runtime/docs consumer、语义审查、最终文档与代码优化、默认 Gate 与同一 candidate 的 --all 完整包验收。

## Risks / Trade-offs

新增公开能力承担长期兼容责任，因此以小且可解释的 surface 替代模块全公开。安全快照涉及 getter、descriptor、Proxy 与 shallow/deep 差异，必须按真实实现表达，不将宽泛“安全”措辞代替边界。共享存储/identity 算法保持单份且不改变旧 bytes，不把目录迁移混同于行为重写。

## Open Questions

无需要用户再决定的方向：已授权最小公开 API，具体实现、文档和验证由本任务完成。完整用户方案的后续演进不阻塞首版明确可用的契约。

## Audit Reference

### 基线与覆盖

审计基线为 2026-09-12 工作树，Product source 对应 HEAD `e27e42c4ee2cb7feffb69afc91195ffbf16bee25`。AST 核对 `src/index.ts` 与 [tooling-owned inventory](../../scripts/package/public-api-inventory.ts)：28 个 runtime values、127 个 type-only exports 的名称集合一致。该计数是基线核对结果，不表示本 Plan 的 Gate 已完成；实施前后均须重验实际差异。

下表保留逐项角色与**审计基线中的**源码定位；它不定义实施后的现行 owner。现行 owner 由本 Plan 的实施范围、Architecture
和实际源码共同确定；长期 public inventory 仍由 tooling 拥有。路径相对 `src/`。

### Runtime inventory

| Export | 基线 owner / 关键职责 | 分类依据 |
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
