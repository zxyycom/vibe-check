# 文档导航

本文只负责把任务路由到稳定规则的唯一 owner、必要工作流和交付验证入口。行为细节、当前实现
快照、schema 字段和工具机械契约均在对应 owner 中维护，不在本文复述。

## 如何阅读这些文档

先按任务读取“主入口”，再读取目标附近的源码与测试。“需要时再读”只用于确实跨越对应边界的
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
| 创建、恢复、实施、搁置、验收或归档较大 change                                                                                                          | `change-plan` skill、`bun run change-plan -- list changes`、目标 `changes/<change>/`                                             | [项目知识与变更治理](governance/knowledge-maintenance.md)、相关决策与行为 owner                                                                           |
| 协调多个 active Change 的依赖、合入顺序或 Git worktree                                                                                                 | [Change 执行依赖与 Worktree 协调](governance/change-coordination.md)、`bun run change-plan -- list changes`                      | 目标 Change artifacts、[项目知识与变更治理](governance/knowledge-maintenance.md)                                                                          |
| 调查或修复中确认 Bug 达到项目定义的复杂或严重条件                                                                                                      | [复杂或严重 Bug 的自动调查沉淀](governance/knowledge-maintenance.md#复杂或严重-bug-的自动调查沉淀)、`investigation-report` skill | 目标报告、按需随附资源与 [Governance adapters](tooling/workspace.md#governance-and-test-evidence-adapters)                                                |
| 创建、更新或审阅其他持久调查报告                                                                                                                       | `investigation-report` skill                                                                                                     | [Governance adapters](tooling/workspace.md#governance-and-test-evidence-adapters)、目标报告与按需随附资源                                                 |

## 按受众选择文档

package 用户从 [README](../README.md) 的使用入口进入 Check 指南、公共 API 模型与深入任务专题；
这些页面必须在发布包中自足。维护者继续按上表进入内部职责、设计约束和验证 owner，也应读取本次
行为对应的用户说明。两种叙述允许为各自用途讲解同一能力，不因主题重叠合并或删除。

产品行为、使用方案或内部职责变化时，按[文档影响审查](governance/knowledge-maintenance.md#行为变更的交付审查)
分别判断两类文档和示例的影响，并在已有 Change 或局部交付中保存实际审查结果。这里不另建专题清单。

## 随包 Check 指南

随包 Check 的唯一逐项索引由 [package README](../README.md#随包提供的-check) 拥有，并由 package guide registry
验证其与 public constructors 和已发布 guides 完整闭合。每项指南完整拥有该 Check 的 consumer options、resolved
defaults、execution、outcomes、final data、Records、messages、不可用原因、I/O 与安全边界；Check Definition 和 Check results 只保留跨 Check 通用契约。本文只提供任务路由，不复制该清单。

## 权威性与状态

`docs/` owner 文档承接当前稳定规则；代码、测试和 release artifact 证明当前实现状态；活动决策
承接已确认且跨 change 持续有效的方向；active Change Plan 承接单次 change 的实施上下文；调查
报告保存形成时认识。完整载体分工、调查与实施交接、Decision / Change 协作和历史读取边界只见
[项目知识与变更治理](governance/knowledge-maintenance.md)。

除非文档明确标注 Current 或已实现，目标性 `MUST` / `SHALL` 只表示目标契约或决策要求，不证明
当前二进制已经支持。发现材料不一致时，先判断它是稳定规则、未来方向、当前计划、实现证据还是
历史记录，再更新对应 owner；归档材料不参与当前规范、计划或验证。

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
