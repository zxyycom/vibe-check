# 文档导航

本文只负责把任务路由到稳定规则的唯一 owner、必要工作流和交付验证入口。行为细节、当前实现
快照、schema 字段和工具机械契约均在对应 owner 中维护，不在本文复述。

## 如何阅读这些文档

先按任务读取“主入口”，再读取目标附近的源码与测试。“需要时再读”只用于确实跨越对应边界的
任务；不要为获取上下文遍历全部文档。

| 任务                                                                                                                                                   | 主入口                                                                                           | 需要时再读                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| 修改 TypeScript/Bun 产品实现、组件职责、调用链或运行边界                                                                                               | [架构](architecture.md)、[编码规范](coding-style.md)                                             | 下列对应行为 owner、`src/**` 与相邻测试                                                                                     |
| 修改项目 Run adapter、project root 或 Run Controls                                                                                                     | [Configuration](configuration.md)、[编码规范](coding-style.md)                                  | [Output](output.md)、`src/index.ts` 与项目 wrapper 测试                                                                     |
| 修改 Project Definition、`defineConfig` defaults、ordinary Check grammar、validation、normalization、precedence 或 legacy JSON migration              | [Configuration](configuration.md)、[编码规范](coding-style.md)                                   | [Project files and Check exact inputs](scan-scope.md) 与 Project Definition tests                                           |
| 修改 Check-owned file selection、项目文件收集、默认排除、supported file 分类、exact inputs 或 collection diagnostic                                   | [Project files and Check exact inputs](scan-scope.md)、[编码规范](coding-style.md)                | [架构](architecture.md)、[Check-owned scanner dependencies](scanner-dependencies.md) 与相邻 Check/collection tests          |
| 修改 Check final status、final/supplemental Record data、Run aggregation 或 repository Gate exit mapping                                               | [Quality Metrics](quality-metrics.md)、[编码规范](coding-style.md)                               | [Output](output.md)、[Scanner 依赖选择](scanner-dependencies.md)与相关测试                                                  |
| 修改 package-provided Check 的 scanner command、owner-local adapter、eligibility、exact-input handoff、cache identity 或 tool 替换                    | [Check-owned scanner dependencies](scanner-dependencies.md)、[架构](architecture.md)             | [Quality Metrics](quality-metrics.md)、对应 Check owner 内的 adapter tests 与 fixtures                                      |
| 修改 machine DTO/schema、contract-valid set / published set、serialization、validator、publication/evidence、console/report、artifact 或 effect status | [Output](output.md)、[编码规范](coding-style.md)                                                 | [Configuration](configuration.md)、[Quality Metrics](quality-metrics.md)、`docs/schemas/`、`docs/examples/` 与 output tests |
| 修改 package README template、可验证 API 示例、projection registry/renderer/command 或 generated README/JSDoc example                | [脚本工具](script-tooling.md)、[编码规范](coding-style.md)                                       | 先区分可编辑输入（template、examples、registry、source JSDoc）与 generated output（root README、managed JSDoc example）；再读 [Configuration](configuration.md)、[Output](output.md)、`docs/examples/package-api/`、declaration owners 与 candidate tests |
| 修改开发脚本、Project Gate、共享 toolkit、docs validator 或 quality wrapper                                                                            | [脚本工具](script-tooling.md)、[编码规范](coding-style.md)                                       | 对应 `scripts/**`、正式产品入口及其 consumer contract                                                                       |
| 新增或修改测试、fixture、Case 或验证脚本                                                                                                               | [测试策略](testing.md)、[测试证据维护](testing/case-maintenance.md)、[编码规范](coding-style.md) | `docs/testing/cases/`、`test-evidence-review` skill、行为 owner 与相邻测试                                                  |
| 恢复、审阅或维护跨任务沿用的长期判断                                                                                                                   | `decision-records` skill、`bun run decisions -- list`、目标决策与相关行为 owner                  | 与 Change 交接时读[决策与 Change 治理](decision-and-change-governance.md)                                                   |
| 创建、恢复、实施、搁置、验收或归档较大 change                                                                                                          | `change-plan` skill、`bun run change-plan -- list changes`、目标 `changes/<change>/`             | [决策与 Change 治理](decision-and-change-governance.md)、相关决策与行为 owner                                               |
| 创建、更新或审阅持久调查报告                                                                                                                           | `investigation-report` skill                                                                     | [Governance and Test Evidence adapters](script-tooling.md#governance-and-test-evidence-adapters)、目标报告与按需随附资源     |

## 权威性与状态

`docs/` owner 文档承接当前稳定规则；代码、测试和 release artifact 证明当前实现状态；活动决策
承接已确认且跨 change 持续有效的方向；active Change Plan 承接单次 change 的实施上下文；调查
报告保存形成时认识。完整载体分工、Decision / Change 协作和历史读取边界只见
[决策与 Change 治理](decision-and-change-governance.md)。

除非文档明确标注 Current 或已实现，目标性 `MUST` / `SHALL` 只表示目标契约或决策要求，不证明
当前二进制已经支持。发现材料不一致时，先判断它是稳定规则、未来方向、当前计划、实现证据还是
历史记录，再更新对应 owner；归档材料不参与当前规范、计划或验证。

## 交付验证

先运行最窄验证，再按改动跨越的边界升级：

| 改动面                                                            | 验证入口                                                                                              |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 文档、schema、examples 或 whitespace                              | `bun run validate`；局部 docs 可先运行 `bun run validate -- docs`                                     |
| 决策 Markdown、生命周期、关系或索引                               | `bun run decisions -- check`                                                                          |
| Change Plan                                                       | `bun run change-plan -- check changes/<change>`                                                       |
| 测试正文、实体或语义 Case                                         | 最窄目标测试，再运行 `bun run test-evidence -- check --root .`                                        |
| 产品行为或脚本工具                                                | 按 owner 与 package scripts 运行目标 test、typecheck、lint、dependency 和入口检查                     |
| 跨产品行为、Change Plan、schema、示例、输出或多个包边界           | `bun run verify:vibe-check-workspace:required`                                                        |
| 大范围重构、发布前或显式全量 Project Gate 验收              | `bun run verify:vibe-check-workspace:full`（显式选择 full profile；当前与 required 共用同一 assurance identity set）             |

验证必须覆盖受影响边界；无法运行的检查及其影响应在交付时明确说明。脚本工具的细分命令见
[脚本工具](script-tooling.md#verification)。
