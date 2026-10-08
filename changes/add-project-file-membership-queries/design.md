# Design

本 Draft 设计公共 Core 路径—区域关系工具：接收值输入，生成供多个消费者共享的只读双向查询快照。

## Context

- [架构](../../docs/development/architecture.md#能力分层与扩展方式)拥有 Core 工具及依赖方向；[共同 matcher](../../src/data-boundary/config-glob.ts)已被 Run changes 与 project-files 消费。
- [project-files](../../docs/development/project-files.md)的 `collectProjectFileSets(...)` 返回区域到路径的集合；[file-metrics](../../src/package-checks/file-metrics/execution.ts)、[function-metrics](../../src/package-checks/function-metrics/records.ts)和[duplicate-detection](../../src/package-checks/duplicate-detection/area-policy.ts)各自构建反向索引。
- [公开收集指南](../../docs/guides/collecting-project-files.md)拥有来源与失败语义；活动判断[显式来源](../../docs/decisions/select-check-files-from-explicit-sources.md)、[同步单份工具](../../docs/decisions/provide-synchronous-single-selection-file-collection.md)及[按需收集](../../docs/decisions/retain-on-demand-project-file-collection.md)构成输入获取与生命周期基线。
- [收集 Change](../switch-project-file-collection-backend/design.md)正在评估统一枚举、文件事实策略和进入前剪枝；当前基线仍是双来源与 minimatch。

## Goals / Non-Goals

### Goals

- 提供一致的双向只读查询，保留零命中、重叠和已知空结果。
- 让规则匹配与已知成员构造共用结果契约，同一次操作共享快照与索引。
- 通过 Core、必要的既有消费者和外部 package caller 证明公共契约可独立使用。

### Non-Goals

- 路径枚举、剪枝、ignore/追踪/链接策略及来源失败归输入 owner；Check 筛选、领域策略和结算归消费者。
- change flag 调试由独立 Change 交付；本项仅迁移证明共享契约所需的既有消费点。
- 不增加实时更新、跨调用缓存、Definition 字段或 Run 全局文件上下文。

## Decisions

### Intended Change

已确认采用无状态计算与共享快照；公开名称、输入形状和迁移清单待 Plan 收敛。

| 对象 | 设计责任 |
| --- | --- |
| 规则匹配输入 | 显式候选路径与具名区域的 include/exclude，使用 Product 生效的共同 matcher；路径可尚不存在或已删除。 |
| 已知成员输入 | 已取得的区域文件集合，直接建立关系，保留其实际来源和输入筛选结果。 |
| 关系快照 | 保存路径域、区域域与成员关系；双向查询稳定排序去重，区分未知键与已知空结果。 |

- **纯计算**：公共入口校验并复制值输入，构造和查询均无 I/O。规则输入使用共同 matcher；已知成员直接建索引，不能用全局 glob 重新推断。
- **只读共享**：消费者共享同一查询对象及内部双向索引；封闭输入与结果的修改通道，索引布局保持私有，不直接暴露可变 Map。
- **快照生命周期**：一次操作中的查询基于同一份输入；下一次操作由 owner 重新获取路径和规则并计算。结果只说明输入时点，不承诺实时文件状态或原子文件系统快照。

### Resulting Impacts

- **内部复用**：按[架构归属](../../docs/development/architecture.md#source-module-boundaries)固定最小迁移清单与依赖方向，保持生效基线的 collection API、候选共享、Check 筛选与领域语义。function-metrics 迁移仅涉及关系索引，保留 accepted/rejected 和 policy；measurement/Worker、取消与算法仍归其 owner。Run 复用保留[既有 change 语义](../../docs/api-mechanics.md#按文件变化选择-check)。
- **公开材料**：同步 package root exports、声明、JSDoc、README 入口及受管示例；公开说明讲清输入与快照，内部 owner 按实际迁移更新。文档独立反查按[知识治理](../../docs/governance/knowledge-maintenance.md#行为变更的交付审查)。

验收按[文档导航](../../docs/navigation.md#交付验证)，分别证明：

| 边界 | 验收重点 |
| --- | --- |
| 关系与快照 | 双向一致、零/多重命中、空域、未知键、路径规范化、修改隔离；构造/查询无 I/O，包含不存在路径。 |
| 消费复用 | 多个消费者共享结果；实际成员、accepted/rejected 与领域 policy 保持原义。 |
| Run 与公开面 | 零匹配、rename/delete、unavailable 保持原义；安装后消费者独立使用公共契约。 |

## Risks / Trade-offs

- 共享要求路径域、区域规则及筛选语义一致：全部文件、实际 Git 变更和经筛选的 Check 输入是不同快照，相同 root 不能证明可互换。
- TypeScript 只读类型不能单独证明运行时不可修改，公开边界需直接验证修改隔离。
- 收集 Change 可能改变 selection 与共同 grammar；关系输入与 source 形状解耦，匹配消费生效 matcher。共享 owner 的合入边界见[Change 协调](../../docs/governance/change-coordination.md)。

## Open Questions

1. 两种生产方式采用独立入口还是输入变体？公开名称、区域 ID、非法输入及未知查询键如何定义？
2. 已知成员集合的路径域如何定义？显式候选域与区域集合不一致时采用什么可审计处理？
3. Core 模块 owner、最小内部复用清单和修改隔离实现是什么？哪些 policy 索引仍有独立职责？

保持 `draft`；公共契约与复用范围收敛后再派生 tasks、进入 Plan。
