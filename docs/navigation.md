# 文档导航

改动前用本文定位任务主规范、规则 owner 和交付验证入口；规则细节进入对应 owner 文档。

## 如何阅读这些文档

按任务进入对应主规范；跨模块、边界、状态或规则归属不清时，补读“规范状态与实现状态”和“规则所有权”。

| 角色 / 任务 | 必读 | 需要时再读 |
| --- | --- | --- |
| 讨论或调整组件职责、输出分层、调用链和运行边界 | [架构](architecture.md)、[编码规范](coding-style.md) | [CLI](cli.md)、Core / Scanner、[Output](output.md)、[Configuration](configuration.md) |
| 修改完整 JSON 配置、默认配置、选择规则或 CLI precedence | [Configuration](configuration.md)、[编码规范](coding-style.md) | [CLI](cli.md)、[Scan Scope](scan-scope.md)、相邻 config tests |
| 讨论或调整 scanner 依赖、结构扫描基座、LOC 或重复检测方案 | [Scanner 依赖选择](scanner-dependencies.md)、[架构](architecture.md) | [Quality Metrics](quality-metrics.md)、`scripts/quality/**`、相关 adapter 验证和 fixture |
| 讨论或调整文件收集、scan scope、默认排除、supported file 分类或 scope diagnostic | [Scan Scope](scan-scope.md)、[编码规范](coding-style.md) | [架构](architecture.md)、[Scanner 依赖选择](scanner-dependencies.md) |
| 修改 TypeScript/Bun 产品实现、重构或 `src/product/**` 边界 | [架构](architecture.md)、[编码规范](coding-style.md) | 对应 owner 文档、相邻代码和测试 |
| 修改正式命令、project root、scan flags、console 或进程状态 | [CLI](cli.md)、[Output](output.md)、[编码规范](coding-style.md) | 产品入口测试、dogfood wrapper 测试 |
| 修改质量扫描、指标、warning、baseline 或最终 status | [Quality Metrics](quality-metrics.md)、[编码规范](coding-style.md) | [Scanner 依赖选择](scanner-dependencies.md)、`src/product/**` |
| 讨论或调整开发脚本工具、共享 toolkit、workspace verifier、docs validators 或 quality dogfood wrapper | [脚本工具](script-tooling.md)、[编码规范](coding-style.md) | `scripts/tools/**`、`scripts/vibe-check-workspace/**`、正式产品入口 |
| 新增或修改测试、fixture 或验证脚本 | [编码规范](coding-style.md)、[测试策略](testing.md)、[测试用例维护](testing/case-maintenance.md) | [测试用例编号账本](testing/cases.md)、示例、schema、相邻测试 |
| 审计历史或规划较大 change | `openspec/changes/` | 对应 proposal、design、tasks 和 spec delta |

## 交付验证

按改动面选择最窄验证。常用入口：

- 文档、schema、examples、OpenSpec 和 whitespace：`bun run validate`。
- 跨产品行为、OpenSpec、schema、示例、输出边界或多个包边界：`bun run verify:vibe-check-workspace:required`。
- 大范围重构、发布前或需要完整 quality 与产品测试：`bun run verify:vibe-check-workspace:full`。
- 脚本工具细分命令见 [脚本工具](script-tooling.md)。

局部改动可以选择更窄命令，但验证必须覆盖受影响边界。文档改动至少用 `bun run validate:docs`、局部 diff 或关键词搜索确认结构和范围。

## 文档分层

| 类型 | 文档 | 使用时机 |
| --- | --- | --- |
| 文档导航 | 本文档 | 定位任务主规范、规则 owner 和验证入口 |
| 架构 | [架构](architecture.md) | 讨论组件职责、输出分层、调用链和运行边界 |
| 工程规范 | [编码规范](coding-style.md) | 修改 TypeScript/Bun 产品、脚本、测试或验证工具 |
| CLI | [CLI](cli.md) | 修改 operation、project root、scan flags、stdout/stderr 或进程状态 |
| Configuration | [Configuration](configuration.md) | 修改默认或显式完整配置、路径、替换、CLI precedence 或配置错误 |
| Scan Scope | [Scan Scope](scan-scope.md) | 修改文件收集、默认排除、supported file 分类、ignore 规则处理或 collection diagnostic |
| Quality Metrics | [Quality Metrics](quality-metrics.md) | 修改 metrics aggregation、warning channels、baseline、accepted warning 或最终 status |
| Output | [Output](output.md) | 修改 console、metrics/report/warning/raw artifacts、empty/failure state 或通道 |
| Scanner 依赖选择 | [Scanner 依赖选择](scanner-dependencies.md) | 讨论或调整多语言结构扫描、LOC 统计和重复检测依赖 |
| 脚本工具 | [脚本工具](script-tooling.md) | 讨论或调整开发脚本工具、共享 toolkit、workspace verifier、docs validators、quality dogfood wrapper 和脚本依赖 |
| 测试策略 | [测试策略](testing.md) | 新增或修改测试、fixture、测试归属、覆盖目标或验证入口 |
| 测试资料 | [测试用例维护](testing/case-maintenance.md)、[测试用例编号账本](testing/cases.md) | 测试变更流程、case 条目、证明目标或 `@case` 标记 |
| 变更工作流 | `openspec/changes/` | 规划、验收、归档或审计较大 change |

脚本和验证材料不重新定义产品语义。与主规范不一致时，先判断是主规范缺口、验证材料漂移还是有意 contract 变更。

## 规范状态与实现状态

`docs/` 是长期规范基础；代码、测试和 release artifact 证明实现状态。除非文档明确标注 Current 或已实现，目标性 `MUST` / `SHALL` 表示目标契约或决策要求，不自动表示当前二进制已经支持。

OpenSpec 用于按 change 规划和审计较大改动；小功能可以直接同步 docs、代码和测试。冲突时按 owner 判断：长期方向以 owner 主规范为准，实现状态以代码和测试为准，schema、示例和脚本默认作为验证材料同步。

### 当前产品状态

产品 runtime 由 `src/product/**` 唯一拥有，正式入口是
`bun run product:cli -- scan [project-root]`。`quality:*` 与
`scripts/quality/scan.ts` 只作为显式传入 Vibe Check 仓库根的单向 dogfood wrapper。
Rust crate、根 Cargo 产品 workspace 和 quality-core gitlink 已移除；当前实现和验证按
[架构](architecture.md)、[CLI](cli.md) 与 [脚本工具](script-tooling.md) 的 TypeScript/Bun
边界执行。

## 规则所有权

关键规则只由一个主文档拥有，其它文档只摘要或引用。

| 规则面 | Owner |
| --- | --- |
| 组件职责、输出分层、调用链和运行边界 | [架构](architecture.md) |
| 实现质量、边界处理、模块组织和验证层级 | [编码规范](coding-style.md) |
| Product CLI operation、project root、scan flags、console 和进程状态 | [CLI](cli.md) |
| 默认配置、显式完整 JSON 配置、选择、替换和配置错误 | [Configuration](configuration.md) |
| 文件收集、scan scope、默认排除、supported file 分类和 collection diagnostic | [Scan Scope](scan-scope.md) |
| 扫描计划、指标模型、warning channels、baseline 和最终 status | [Quality Metrics](quality-metrics.md) |
| 多语言结构扫描基座、LOC 统计和重复检测依赖选择 | [Scanner 依赖选择](scanner-dependencies.md) |
| Console、metrics/report/warning/raw artifacts 和已退役 Rust schema 材料 | [Output](output.md) |
| 开发脚本工具、共享 toolkit、workspace verifier、docs validators 和 quality dogfood wrapper | [脚本工具](script-tooling.md) |
| 测试层级、fixture、case 归属和验证脚本 | [测试策略](testing.md)、[测试用例维护](testing/case-maintenance.md)、[测试用例编号账本](testing/cases.md) |

## 术语

| 术语 | 定义 |
| --- | --- |
| owner 文档 | 某类规则的完整解释和维护位置；其它文档只保留摘要或引用。 |
| Product CLI | `bun run product:cli -- scan [project-root]` 正式入口，负责 operation、project root、scan flags、console 和进程状态映射。 |
| Dogfood wrapper | 显式传入 Vibe Check 仓库根并单向调用 Product CLI 的 `quality:*` 或脚本入口。 |
| Core | 扫描计划、文件收集、指标聚合、warning 生成和报告数据的实现归属。 |
| Scanner | 内置检测或外部工具适配，负责采集、解析和归一化检测结果。 |
| Output | 人读报告、机器输出、CI 摘要和 annotation 的实现归属。 |
