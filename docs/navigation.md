# 文档导航

改动前用本文定位任务主规范、规则 owner 和交付验证入口；规则细节进入对应 owner 文档。

## 如何阅读这些文档

按任务进入对应主规范；跨模块、边界、状态或规则归属不清时，补读“规范状态与实现状态”和“规则所有权”。

| 角色 / 任务 | 必读 | 需要时再读 |
| --- | --- | --- |
| 修改 Rust 实现、重构或模块边界 | [编码规范](coding-style.md) | 对应模块文档、相邻代码和测试 |
| 修改 CLI 行为、输出或退出码 | [编码规范](coding-style.md) | CLI 主规范、示例、schema、集成测试 |
| 修改质量扫描、warning 或报告逻辑 | [编码规范](coding-style.md) | `..\docnav\scripts\quality\**`、`..\docnav\scripts\tools\quality\**` |
| 新增或修改测试、fixture 或验证脚本 | [编码规范](coding-style.md) | 测试策略、示例、schema、相邻测试 |
| 审计历史或规划较大 change | `..\openspec\changes\` | 对应 proposal、design、tasks 和 spec delta |

## 交付验证

Rust 行为改动默认按范围运行：

```bash
cargo fmt
cargo clippy --all-targets --all-features
cargo test --all
```

局部改动可以选择更窄命令，但验证必须覆盖受影响边界。文档改动至少用 `docnav outline <path>`、局部 diff 或关键词搜索确认结构和范围。

## 文档分层

| 类型 | 文档 | 使用时机 |
| --- | --- | --- |
| 文档导航 | 本文档 | 定位任务主规范、规则 owner 和验证入口 |
| 工程规范 | [编码规范](coding-style.md) | 修改 Rust、脚本、测试或验证工具 |
| 参考实现 | `..\docnav\scripts\quality\**` | 对照质量检测行为、指标模型、warning 和报告设计 |
| 变更工作流 | `..\openspec\changes\` | 规划、验收、归档或审计较大 change |

参考实现和验证材料不重新定义产品语义。与主规范不一致时，先判断是主规范缺口、验证材料漂移还是有意 contract 变更。

## 规范状态与实现状态

`docs/` 是长期规范基础；代码、测试和 release artifact 证明实现状态。除非文档明确标注 Current 或已实现，目标性 `MUST` / `SHALL` 表示目标契约或决策要求，不自动表示当前二进制已经支持。

OpenSpec 用于按 change 规划和审计较大改动；小功能可以直接同步 docs、代码和测试。冲突时按 owner 判断：长期方向以 owner 主规范为准，实现状态以代码和测试为准，schema、示例和脚本默认作为验证材料同步。

## 规则所有权

关键规则只由一个主文档拥有，其它文档只摘要或引用。

| 规则面 | Owner |
| --- | --- |
| Rust 实现质量、边界处理、模块组织和验证层级 | [编码规范](coding-style.md) |
| CLI 参数、配置、路径、退出码和输出模式 | CLI 主规范 |
| 扫描计划、指标模型、warning 和报告数据 | Core / Scanner 主规范 |
| 机器输出、schema、示例和兼容性 | 对应 schema、examples 和输出规范 |
| 测试层级、fixture、case 归属和验证脚本 | 测试策略 |

## 术语

| 术语 | 定义 |
| --- | --- |
| owner 文档 | 某类规则的完整解释和维护位置；其它文档只保留摘要或引用。 |
| CLI | 用户和脚本调用入口，负责参数、配置、路径、退出码和输出分发。 |
| Core | 扫描计划、文件收集、指标聚合、warning 生成和报告数据的实现归属。 |
| Scanner | 内置检测或外部工具适配，负责采集、解析和归一化检测结果。 |
| Output | 人读报告、机器输出、CI 摘要和 annotation 的实现归属。 |
