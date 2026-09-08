# 文档导航

本文只负责把任务路由到稳定规则的唯一 owner、必要工作流和交付验证入口。行为细节、当前实现
快照、schema 字段和工具机械契约均在对应 owner 中维护，不在本文复述。

## 读者、发布范围与规则归属

**用户文档也是项目公开行为的规范 owner。** 修改实现时先读取对应用户契约，再进入内部实现 owner；“主要面向用户”不表示维护者可跳过，“随包发布”也不表示每篇教程、入口或示例都是规范。

三个维度分别判断：主要读者决定解释方式；随包范围决定消费者实际可获得哪些材料；owner 决定规则在哪里完整定义。一个规则保留一个定义位置，其它页面用摘要或设计推导链接它。下面是阅读与责任映射；发布事实继续以现有 [package material registries](tooling/documentation.md#documentation-validation-and-package-material) 为准，不由此表增加发布项。

### 随包用户材料

表内“用户”包括使用 package 的项目开发者；维护者修改相关能力时也必须读取该行公开承诺。

| 文档 | 主要读者 | 随包 | 内容角色与规则范围 | 对应实现 / 验证入口 |
| --- | --- | --- | --- | --- |
| [README](../README.md) | 首次集成用户 | 是 | 唯一用户总入口；安装、支持范围与最小路径，专题内容只给摘要和链接 | [包生命周期](tooling/package-lifecycle.md)、package consumer acceptance |
| [API 机制](api-mechanics.md) | 集成与自定义 Check 用户 | 是 | 公开 Run 生命周期、Definition/Controls 归属、通用 Check facts、组合、aggregation 与结果分支 | [Project Definition](development/project-definition.md)、[Project Run](development/project-run.md)、[Check 结果](development/check-results.md)及相邻 tests |
| [回调位置](guides/callbacks.md) | 选择扩展点的用户 | 是 | 定位表与链路摘要；具体回调契约引用对应专题 | 各回调 owner 与 package API examples |
| [自定义 Check](guides/extending-check-lifecycle.md) | Check author | 是 | preflight/execution authoring、callback context、flags 与协作取消 | Definition / Check execution / settlement tests |
| [依赖与类型化数据](guides/check-dependencies.md) | producer / consumer author | 是 | direct relations、get/list 授权、typed provider 与 parser 边界 | [Definition](development/project-definition.md#typed-dependency-data)、dependency tests 与 consumer typecheck |
| [Run 输出与诊断](guides/run-outputs.md) | 配置输出或排障的用户 | 是 | 输出配置、progress/console/diagnostic、readback 与失败优先级；machine bytes 引用独立契约 | [人读输出实现](development/human-output.md)、[Run 接线](development/project-run.md)、output tests |
| [调度 Check](guides/scheduling.md) | 配置并发或策略的用户 | 是 | 资源与准入、simple/prepared lifecycle、simulation 与终态 measurement | [Architecture](development/architecture.md)、scheduler / simulation tests |
| [本地时长历史调度](guides/learned-scheduling.md) | 使用 learned strategy 的用户 | 是 | factory、identity、history、安全、退化与 observation | [learned owner](development/architecture.md#learned-critical-path-helper-owner)、helper tests 与 consumer examples |
| [选择与收集项目文件](guides/collecting-project-files.md) | 文件选择与工具调用方 | 是 | 共同 selection 与默认基线；同步 collectProjectFiles 的完整输入、结果和失败边界 | [Project files](development/project-files.md)、selection/collection tests |
| [缓存计算结果](guides/cache-results.md) | 本地缓存调用方 | 是 | cacheJsonByKey 的 key、结果与信任边界 | helper 相邻 tests 与 consumer examples |
| [Finding waiver](guides/finding-waivers.md) | Finding producer / policy author | 是 | 通用 reconciliation 与 audit；Check-specific identity 引用各 Check | waiver helper 与各 Check tests |
| [Finding 呈现](guides/presenting-findings.md) | Finding producer | 是 | message helper、数量与省略结果；不定义 Check outcome | presentation helper 与各 Check tests |
| [八项 Check 指南的逐项入口](../README.md#随包提供的-check) | 随包 Check 用户 | 是，全部已注册 guide | 每篇分别定义所属 Check 的 options、默认值、结果、Records/messages、不可用原因与安全边界 | 对应 package-check owner / tests，Check guide registry 验收 |
| [机器输出契约](output.md) | machine artifact consumer | 是 | publication set、DTO 语义、版本与消费边界 | [机器输出维护](development/output-maintenance.md)、独立 schema/example/consumer acceptance |
| current [schemas](schemas/) 与 [artifact example](examples/artifacts/mixed-outcomes/) | machine artifact consumer | 仅 current registry 项 | schema 拥有精确机器结构；example 是可验证实例，不新增规则 | machine material registry、generation 与独立验收 |
| API example sources 与 source JSDoc / emitted declarations | API 用户、维护者 | 仅注册示例与声明/源码包材料 | 类型声明拥有精确签名；JSDoc 提供局部说明，示例证明用法而不替代契约 | [投影维护](tooling/documentation.md)、docs:api 与 consumer types/runtime |

### 仅工作区维护材料

| 文档范围 / 入口 | 主要读者 | 随包 | 所拥有的责任 |
| --- | --- | --- | --- |
| 本文与 AGENTS.md | 维护者、编码代理 | 否 | 任务路由与工作区执行要求；不复制领域契约 |
| [Architecture](development/architecture.md) 与 development 中下表指定的领域 owner | 产品维护者 | 否 | 实现职责、内部不变量与设计推导；公开承诺回链用户 owner |
| [编码规范](development/coding-style.md) | 实施者、reviewer | 否 | 代码组织和工程实现规则 |
| [Tooling](tooling/workspace.md)、[Project Gate](tooling/project-gate.md)、[Package lifecycle](tooling/package-lifecycle.md)、[文档材料](tooling/documentation.md) | 仓库工具与发布维护者 | 否 | 开发命令、exact candidate、项目 Gate、包与文档维护工作流 |
| [测试策略](testing/strategy.md)、[Case 维护](testing/case-maintenance.md)与 Case 账本 | 测试实施者、reviewer | 否 | 测试证明职责与证据完整性 |
| [知识治理](governance/knowledge-maintenance.md)、[Change 协调](governance/change-coordination.md) | 维护者、交接代理 | 否 | 知识载体归属、文档影响审查与跨 Change 协调 |
| Decisions、current Changes 与 Investigations | 按明确任务进入的维护者 | 否 | 分别记录长期方向、实施上下文和形成时认识；已完成 Change 不作为持久知识载体 |

## 如何阅读这些文档

先从上表找到公开行为 owner，再按任务读取下表的内部“主入口”，最后读取目标附近的源码与测试。纯工具或治理任务直接进入其主入口。“需要时再读”只用于确实跨越对应边界的
任务；不要为获取上下文遍历全部文档。

| 任务                                                                                                                                                   | 主入口                                                                                                                           | 需要时再读                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 修改 TypeScript/Bun 产品实现、组件职责、调用链或运行边界                                                                                               | [Architecture](development/architecture.md)、[编码规范](development/coding-style.md)                                             | 下列对应行为 owner、`src/**` 与相邻测试                                                                                                                   |
| 修改项目 Run adapter、project root 或 Run Controls                                                                                                     | [Project Run](development/project-run.md)、[编码规范](development/coding-style.md)                                               | [Output](output.md)、`src/index.ts` 与项目 wrapper 测试                                                                                                   |
| 修改 Project Definition、`defineConfig` defaults、ordinary Check grammar、validation、normalization 或 `inherit` composition                           | [Project Definition](development/project-definition.md)、[编码规范](development/coding-style.md)                                 | [Project files and Check exact inputs](development/project-files.md) 与 Project Definition tests                                                          |
| 修改随包 Check 的 consumer options、默认值、Finding、outcome、Record、message、不可用原因或安全边界                                                    | 对应[随包 Check 指南](#随包-check-指南)、[编码规范](development/coding-style.md)                                                 | [Project Definition](development/project-definition.md)、[Check results](development/check-results.md)、相邻 Check 源码与测试                             |
| 修改 Check-owned file selection、项目文件收集、默认排除、supported file 分类、exact inputs 或 collection diagnostic                                    | [Project files and Check exact inputs](development/project-files.md)、[编码规范](development/coding-style.md)                    | [Architecture](development/architecture.md)、[Check-owned scanner dependencies](development/scanner-dependencies.md) 与相邻 Check/collection tests        |
| 修改普通 Check four-state status、通用 final/supplemental Record data、Run aggregation 或 repository Gate exit mapping                                 | [Check results](development/check-results.md)、[编码规范](development/coding-style.md)                                           | [Output](output.md)、[Scanner 依赖选择](development/scanner-dependencies.md)与相关测试                                                                    |
| 修改 package-provided Check 的 scanner command、owner-local adapter、eligibility、exact-input handoff、cache identity 或 tool 替换                     | [Check-owned scanner dependencies](development/scanner-dependencies.md)、[Architecture](development/architecture.md)             | [Check results](development/check-results.md)、对应 Check owner 内的 adapter tests 与 fixtures                                                            |
| 修改 machine DTO/schema、contract-valid set / published set、serialization、validator、publication/evidence、console/report、artifact 或 output status | [机器输出契约](output.md)、[机器输出实现与材料维护](development/output-maintenance.md)、[编码规范](development/coding-style.md)  | [Project Definition](development/project-definition.md)、[Check results](development/check-results.md)、`docs/schemas/`、`docs/examples/` 与 output tests |
| 修改 package Markdown、Check guide、可验证 API 示例或 Markdown/JSDoc projection                                                                        | [Documentation and package material](tooling/documentation.md)、[编码规范](development/coding-style.md)                          | 目标 Markdown、`docs/examples/package-api/`、projection registry/renderer/command、declaration owner 与 candidate tests                                   |
| 修改开发脚本、共享 process/repository capability、根级诊断/值守卫或 docs validator                                                                     | [工作区工具](tooling/workspace.md)、[编码规范](development/coding-style.md)                                                      | docs provider 见 `scripts/docs/**`，docs acceptance 见 `scripts/validation/documentation/**`；涉及产品时再读正式产品入口及 consumer contract              |
| 修改 Project Gate 的 candidate、selection、aggregation、`afterGate`、diagnostics 或 exit mapping                                                       | [Project Gate](tooling/project-gate.md)、[编码规范](development/coding-style.md)                                                 | `scripts/project/gate/definition.ts`、对应 `checks/**` owner 与 candidate contract                                                                        |
| 修改 package artifact、candidate、external consumer 或 formal release lifecycle                                                                        | [Package lifecycle](tooling/package-lifecycle.md)、[编码规范](development/coding-style.md)                                       | [Project Gate](tooling/project-gate.md)、package material 与 consumer acceptance                                                                          |
| 新增或修改测试、fixture、Case 或验证脚本                                                                                                               | [测试策略](testing/strategy.md)、[测试证据维护](testing/case-maintenance.md)、[编码规范](development/coding-style.md)            | `docs/testing/cases/`、`test-evidence-review` skill、行为 owner 与相邻测试                                                                                |
| 恢复、审阅或维护跨任务沿用的长期判断                                                                                                                   | `decision-records` skill、`bun run decisions -- list`、目标决策与相关行为 owner                                                  | 与 Change 交接时读[项目知识与变更治理](governance/knowledge-maintenance.md)                                                                               |
| 创建、恢复、实施、搁置、验收或完成较大 change                                                                                                          | `change-plan` skill、`bun run change-plan -- list changes`、目标 `changes/<change>/`                                             | [项目知识与变更治理](governance/knowledge-maintenance.md)、相关决策与行为 owner                                                                           |
| 协调多个 active Change 的依赖、合入顺序或 Git worktree                                                                                                 | [Change 执行依赖与 Worktree 协调](governance/change-coordination.md)、`bun run change-plan -- list changes`                      | 目标 Change artifacts、[项目知识与变更治理](governance/knowledge-maintenance.md)                                                                          |
| 调查或修复中确认 Bug 达到项目定义的复杂或严重条件                                                                                                      | [复杂或严重 Bug 的自动调查沉淀](governance/knowledge-maintenance.md#复杂或严重-bug-的自动调查沉淀)、`investigation-report` skill | 目标报告、按需随附资源与 [Governance adapters](tooling/workspace.md#governance-and-test-evidence-adapters)                                                |
| 创建、更新或审阅其他持久调查报告                                                                                                                       | `investigation-report` skill                                                                                                     | [Governance adapters](tooling/workspace.md#governance-and-test-evidence-adapters)、目标报告与按需随附资源                                                 |

## 文档变更审查

产品行为、使用方案或内部职责变化时，按[文档影响审查](governance/knowledge-maintenance.md#行为变更的交付审查)分别核对公开承诺与内部实现说明，并由非实施代理以实际 diff 反查。两类页面可为各自任务解释同一能力，但完整规则只在所属 owner 修改；用户任务不能依赖未发布文档。新增、移动或改变发布范围时，同步上表阅读路径、既有 registry、README 直链与包内链接。

## 随包 Check 指南

随包 Check 的唯一逐项索引由 [package README](../README.md#随包提供的-check) 拥有，并由 package guide registry
验证其与 public constructors 和已发布 guides 完整闭合。每项指南完整拥有该 Check 的 consumer options、resolved
defaults、execution、outcomes、final data、Records、messages、不可用原因、I/O 与安全边界；Check Definition 和 Check results 只保留跨 Check 通用契约。本文只提供任务路由，不复制该清单。

## 权威性与状态

上表指定的公开与内部 owner 文档承接各自当前稳定规则；代码、测试和 release artifact 证明当前实现状态；活动决策
承接已确认且跨 change 持续有效的方向；active Change Plan 承接单次 change 的实施上下文；调查
报告保存形成时认识。完整载体分工、调查与实施交接、Decision / Change 协作和历史审计边界只见
[项目知识与变更治理](governance/knowledge-maintenance.md)。

除非文档明确标注 Current 或已实现，目标性 `MUST` / `SHALL` 只表示目标契约或决策要求，不证明
当前二进制已经支持。发现材料不一致时，先判断它是稳定规则、未来方向、当前计划、实现证据还是
历史记录，再更新对应 owner；版本历史不参与当前规范、计划或验证。

## 交付验证

先运行最窄验证，再按改动跨越的边界升级：

| 改动面                                                  | 验证入口                                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 文档、schema、examples 或 whitespace                    | `bun run validate`；局部 docs 可先运行 `bun run validate -- docs`                     |
| 决策 Markdown、生命周期、关系或索引                     | `bun run decisions -- check`                                                          |
| Change Plan                                             | `bun run change-plan -- check changes/<change>`                                       |
| Investigation Report                                    | `bun run investigations`                                                              |
| 测试正文、实体或语义 Case                               | 最窄目标测试，再运行 `bun run test-evidence -- check --root .`                        |
| 产品行为或脚本工具                                      | 按 owner 与 package scripts 运行目标 test、typecheck、lint、dependency 和入口检查     |
| 跨产品行为、Change Plan、schema、示例、输出或多个包边界 | `bun run check`                                                                       |
| 大范围重构、发布前或显式全量 Project Gate 验收          | `bun run check -- --all`（显式选择 package artifact 与 external-consumer acceptance） |

验证必须覆盖受影响边界；无法运行的检查及其影响应在交付时明确说明。Workspace tooling 的细分命令见
[Workspace tooling](tooling/workspace.md#verification)。
