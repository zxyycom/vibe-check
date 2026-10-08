# Design

本 Draft 设计随包 change flag 调试工具，复用公共 Core 关系快照完成文件全集映射和人读展示。

## Context

- [API 机制](../../docs/api-mechanics.md#按文件变化选择-check)拥有 change regions 与 token；`project.changes` 的成功 evidence 只含命中的实际变更路径。
- [文件收集指南](../../docs/guides/collecting-project-files.md)拥有 `collectProjectFiles(...)` 的显式来源、范围和失败语义；[Core Change](../add-project-file-membership-queries/design.md)规划共享关系快照，公共能力尚待交付。
- [收集 Change](../switch-project-file-collection-backend/design.md)正在评估统一枚举与文件事实策略，并处理[进入前剪枝缺口](../../docs/investigations/fast-glob-git-collection-boundaries.md)；候选尚未实施。
- [架构](../../docs/development/architecture.md#能力分层与扩展方式)、[统一 effective flags 判断](../../docs/decisions/unify-project-change-flags-as-effective-flags.md)及[按需收集](../../docs/decisions/retain-on-demand-project-file-collection.md)约束公共依赖、token 语义和工具生命周期。

## Goals / Non-Goals

### Goals

- 展示所选全集的逐文件 flags、命中数与反向查询，保留零命中和重叠。
- 用来源、范围和快照说明帮助调用方解释结果。
- 复用公共文件收集与 Core 关系结果，提供独立可用的调试呈现。

### Non-Goals

- Core 关系、收集与既有消费者迁移归各自 owner，本工具消费公共契约。
- 实际 Git delta、effective flags 与 Check 选择归 Run；覆盖判断与配置修改归调用方。
- 不增加常驻状态、Product CLI/bin、配置发现或 Run machine-output 协议。

## Decisions

### Intended Change

暂定提供同步程序化工具，按以下流程组织；公开名称及报告/呈现接口待 Plan 收敛。

| 阶段 | 输入与结果 |
| --- | --- |
| 收集 | 接收显式 project root、完整文件选择与当前 change regions；按所选基线的 `collectProjectFiles(...)` 契约取得当前文件全集。 |
| 映射 | 用公共 Core 匹配入口生成一次关系快照，按 `changeFlag(id)` 投影 token。 |
| 展示 | 逐文件与按 flag 查询共用快照；命中数由成员查询派生，提供结果值及按需人读呈现。 |

- **全集与命中**：报告保留生效文件选择及策略，零命中指已收集路径的空成员关系。文件选择及剪枝独立于 regions；不能用 regions 并集或隐藏默认排除缩小全集，否则漏配路径会消失。
- **策略分层**：收集契约中的来源、ignore/追踪/链接策略决定路径域，region include/exclude 决定命中。未枚举路径不属于零命中结果。
- **调用生命周期**：每次调用重新收集文件，使用调用方提供的规则；同次查询基于一份快照且无 I/O。配置重载由调用方负责，结果不承诺原子或实时文件状态。
- **明确失败**：非法输入和来源失败明确失败，不切换来源或伪造空全集；合法空全集与失败可区分。
- **输出归属**：匹配解释路径作为候选时的 region 命中；打印、写文件或分享由调用方显式选择。

实施依赖已验收的公共 Core 能力。Plan 前选定收集基线：当前契约使用完整 source/include/exclude；若同批采用新契约，先收敛其形状再冻结调试输入，并继承已验收迁移提交。接口只表达已采用的能力，合入关系见[Change 协调](../../docs/governance/change-coordination.md#文件关系与-change-flag-调试)。

### Resulting Impacts

- **工具与公开面**：新增 Non-core 调试 owner，按[随包工具规则](../../docs/development/package-tools.md)消费公共 collection/Core 能力；同步 package root exports、声明与 JSDoc。
- **说明与示例**：从 README 及相关指南提供入口，讲清全集、零命中、token 和快照；受管示例证明独立调试用法，内部 package-tools 说明新 owner。按[知识治理](../../docs/governance/knowledge-maintenance.md#行为变更的交付审查)独立反查实际 diff，保持 Run evidence 与选择契约不变。

验收按[文档导航](../../docs/navigation.md#交付验证)，分别证明：

| 边界 | 验收重点 |
| --- | --- |
| 映射与报告 | 零/单/多命中、exclude 优先、双向及数量一致；漏配路径可见，同一候选路径与 regions 的匹配与 Runtime 一致。 |
| 收集与生命周期 | 合法空全集与来源失败可区分；按生效契约覆盖来源/ignore/追踪/链接差异；重复调用反映新文件/新规则，同次查询无 I/O。 |
| 公开消费 | 安装后消费者独立取得完整结果，并按需使用人读呈现。 |

## Risks / Trade-offs

- 全集受生效收集策略限制；逐文件命中不等于所有应运行 Check 已覆盖。已删除文件及 rename 旧路径可能不在当前全集中，假想映射不替代实际 Git evidence。
- 收集剪枝缺口可能使范围外访问阻断报告；本工具保持明确失败，修复由收集 Change 验收。
- 报告包含项目路径信息；导出和外部分享需由调用方选择。
- 收集迁移可能改变文件选择接口与共同 grammar，需一起复核输入适配、报告策略和 Core/Runtime 匹配一致性。

## Open Questions

1. 报告值与人读 formatter 的最小公开接口是什么？如何保留完整结果并直接复用 Core 查询？
2. 接收 `changes.flags` mapping 还是窄适配输入？如何复用 region 校验，保持闭合字段边界？
3. 第一版是否有真实用例需要额外的假想路径入口，还是只需枚举当前文件？
4. 第一版采用当前收集契约还是同批新契约？据此固定输入和报告的范围说明。

保持 `draft`；上游契约和工具接口收敛后再派生 tasks、进入 Plan。
