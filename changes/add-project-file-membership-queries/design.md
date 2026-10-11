# Design

本 Plan 设计公共 Core 文件—区域索引：多来源合并、显式追加后重建，以及共享只读双向查询。公共 API 尚未交付，先完成下述 Readiness 调查。

## Context

- [索引决策](../../docs/decisions/provide-readonly-file-region-index.md)拥有长期方向；
  [文件范围决策](../../docs/decisions/unify-file-selection-with-default-excludes.md)拥有共同匹配契约。
- [project-files](../../docs/development/project-files.md)已有区域文件集合；
  [file-metrics](../../src/package-checks/file-metrics/execution.ts)、
  [function-metrics](../../src/package-checks/function-metrics/records.ts)和
  [duplicate-detection](../../src/package-checks/duplicate-detection/area-policy.ts)分别建立反向关系或 policy 索引。
- [架构](../../docs/development/architecture.md#能力分层与扩展方式)拥有 Core 归属与依赖方向。
  文件获取由[当前收集契约](../../docs/guides/collecting-project-files.md)拥有，完整 matcher 与宿主身份机制见[Project files](../../docs/development/project-files.md)。
  本索引可先处理调用方提供的值数据；规则实施与验收须继承收集最终验收后的稳定提交，合入边界见[Change 协调](../../docs/governance/change-coordination.md#文件关系与-change-flag-调试)。

## Goals / Non-Goals

### Goals

- 提供一致的文件到区域、区域到文件查询，保留零命中、重叠和已知空结果。
- 支持多份来源的批量接入与显式追加，先采用合并后重建的简单路径。
- 通过必要的内部复用和安装后消费者证明公共契约独立可用。

### Non-Goals

- 文件枚举、剪枝、Git 事实和数据刷新归来源 owner；Check 筛选、阈值、accepted/rejected 与结算归消费者。
- 实时成员增删、跨调用文件状态管理和 change flag 调试工具不在本 Change 范围。

## Decisions

### Intended Change

#### 输入与关系计算

“文件源”和“区域源”指来源 owner 提供的值数据。文件路径采用共同坐标，合并后去重；
区域使用具名身份，ID 冲突明确校验，不静默覆盖。显式路径可尚不存在或已删除。

| 区域数据 | 关系计算 |
| --- | --- |
| 具名区域与完整 patterns | 使用 Product 生效的共同 matcher，按完整正/负列表和共同匹配参数计算。 |
| 已取得的实际成员 | 直接建立关系，保留来源筛选；其它来源新增路径不会扩大这份实际成员集合。 |

构造入口校验并复制输入，两个查询方向使用同一组关系。查询结果稳定排序、去重，
区分未知键与已知空结果；修改通道封闭，内部存储保持私有。构造与查询均无 I/O，
磁盘收集的默认排除只作用于来源获取，不再隐式过滤 Core 显式输入。

#### 来源追加与视图生命周期

初版流程为：

1. 接收批量来源，或继续显式追加来源数据。
2. 合并已接收的值输入，校验路径、身份和输入组合。
3. 重建双向关系，交付新的只读视图。

旧视图保持原输入对应的结果。重建只处理已提供的数据，不重新扫描或调用旧来源；
需要刷新时由来源 owner 重新获取数据。结果是关系快照，不承诺实时或原子的文件系统状态。
双向定位是核心职责，接口数量和内部索引布局由实际使用需求决定。

临时文件或区域值可用同一纯计算入口构造独立结果，不登记到既有视图。
这不是独立试算功能要求，不为此增加公共入口或机制。

### Resulting Impacts

- **内部复用**：按[模块归属](../../docs/development/architecture.md#source-module-boundaries)确定最小消费迁移，
  保持 collection API、必要候选共享、Check 筛选与 exact inputs。携带阈值等业务数据的 policy 索引仍归消费者。
  函数指标的关系索引迁移不是本轮必需项，其算法与读取优化独立推进。
- **公开材料**：同步 package root exports、声明、JSDoc、README 入口及受管示例，
  按实际复用更新内部 owner；文档影响审查见[知识治理](../../docs/governance/knowledge-maintenance.md#行为变更的交付审查)。

验收按[文档导航](../../docs/navigation.md#交付验证)覆盖：

| 边界 | 证明内容 |
| --- | --- |
| 基础关系 | 双向一致、零/多重命中、空输入、未知键、路径归一、非法输入与运行时修改隔离；不存在路径也可参与无 I/O 计算。 |
| 多来源与追加 | 批量与逐次追加结果一致；文件去重、ID 冲突校验、实际成员筛选和旧视图保持原义；新文件与既有规则区域、新规则区域与既有文件均参与重建。 |
| 消费与 Runtime | accepted/rejected 和领域 policy 保持原义；共同 patterns 匹配一致，Run 的零命中、rename/delete、unavailable 语义保持原义，扫描默认排除不删掉显式输入。 |
| 公开面与成本 | 安装后独立消费；构造、查询、重建不执行来源获取或 I/O；代表性输入下核验重建耗时与内存。 |

## Risks / Trade-offs

- 路径坐标与输入范围是共享前提；相同 root 不代表磁盘全集、Git 变更和 Check 实际输入可以互换。
- TypeScript readonly 不等于运行时修改隔离，需直接验证输入、结果和旧视图。
- 全量重建的复制与计算成本取决于文件、区域及关系总量；当前尚无测量，是否需要局部增量优化由证据决定。

## Open Questions

无已知待用户决定项。精确名称/类型、普通输入校验、存储与消费点由 Readiness 工程调查收敛，
不把它们转为新增公共策略；须改变既定行为、显著扩大成本或削减交付能力时再讨论。

## Readiness Investigation

下一步是 `tasks.md` 的 0.3，按 investigation-report 创建并发布本轮 API/消费与重建准备报告：

- **问题与输入**：读取两条 active Decision、当前 Architecture、project-files 和相邻消费点，
  明确公共入口/查询/追加类型、共同相对路径坐标、非法路径与 ID 冲突、已知空/未知键约定、
  descriptor-safe 输入复制和结果修改隔离；列出最小内部复用与实际成员来源适配。
- **产物**：报告给出可实现的签名/校验表、Core owner/私有存储选择、消费迁移清单和代表性重建 workload；
  同步本 design 的精确方案及 tasks，指定局部测试、支持宿主安装后验收与成本评估方法。
- **成功处理**：约束闭合且能以简单合并/重建满足契约后，解除 API 实施门禁。
  报告不声称实现已验证；规则实现及最终验收须继承收集已验收的完整 matcher 迁移提交。
- **失败处理**：记录不满足项及替代方案，保留未勾的实施门禁；若需要改变公开方向或显著增加复杂度，
  说明影响并请求决定，不靠弱化只读/来源筛选或隐藏成本问题推进。

纯值数据与 API Readiness 可先于收集实施；共享 matcher、project-files、Case、包材料与文档的改动串行。
默认实现/合入顺序为收集完整迁移、Core 接线与验收、调试继承两项稳定提交。
