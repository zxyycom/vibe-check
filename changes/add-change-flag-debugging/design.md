# Design

本 Plan 设计同步程序化调试工具：复用公共收集与 Core 索引，映射所选当前文件并按需呈现结果。上游继承门禁已用 Git ancestry 确认，精确接口由 Readiness 调查收敛。

## Context

- [API 机制](../../docs/api-mechanics.md#按文件变化选择-check)拥有 change regions 与 token；
  当前 `project.changes` evidence 只包含命中的实际变更路径。
- [Core 索引指南](../../docs/guides/file-region-index.md)拥有多来源只读关系的公共契约，
  API/消费与验收依据见[索引 Readiness 报告](../../docs/investigations/project-file-region-index-readiness.md)；
  [收集指南](../../docs/guides/collecting-project-files.md)与[内部 owner](../../docs/development/project-files.md)拥有纯磁盘范围与共同 matcher。
  收集的接入、修正与成本见[收集 Readiness 报告](../../docs/investigations/project-file-collection-readiness.md)。
  收集已验收提交为 `2b2489cf`；Core 已验收提交为 `7302349e`。实施须实际继承两项已验收稳定提交，
  不以当前工作树或报告通过代替该门禁。
- [随包工具规则](../../docs/development/package-tools.md)、
  [effective flags 决策](../../docs/decisions/unify-project-change-flags-as-effective-flags.md)及
  [按需收集](../../docs/decisions/retain-on-demand-project-file-collection.md)约束依赖、token 与调用生命周期。

## Goals / Non-Goals

### Goals

- 呈现逐文件 flags、命中数及按 flag 查询，保留零命中与重叠。
- 让调用方能从报告恢复所选文件范围和快照边界。
- 用公共 collection/Core 能力提供独立可用的调试结果。

### Non-Goals

- Core 关系、文件获取和消费者迁移归上游 owner；本工具消费公共契约。
- 实际 Git delta、effective flags、Check 选择及 Run machine output 归 Run；
  覆盖判断和配置修改归调用方。

## Decisions

### Intended Change

#### 调用流程

| 阶段 | 输入与结果 |
| --- | --- |
| 收集 | 接收显式 root、patterns、可省略的 `useDefaultExcludes` 与当前 regions，取得所选普通文件。 |
| 映射 | 将文件与 regions 值数据交给 Core，构造关系视图，按 `changeFlag(id)` 投影 token。 |
| 展示 | 文件定位区域、区域定位文件和命中数共用同一视图，提供结果值与按需人读 formatter。 |

Core 负责来源组合、区域身份和冲突校验；单份输入也可直接使用。
调试输入遵守收集的默认防呆契约。采用 `debugChangeFlags({ projectRoot, selection, regions })`，
regions 可直接传 Definition `changes.flags`，closed 非空映射保留 Run 的非空 ID 域。
`ChangeFlagDebugReport` 包含 scope、完整 files `{ path, flags, hitCount }`、regions `{ id, flag, patterns, files }`，
以及可解构的 `flagsForFile(path)` / `filesForFlag(token)`；已知空 [] 与合法未知 undefined 分离。
`formatChangeFlagDebugReport(report)` 按需返回中文、JSON 转义的文本，不是机器协议。
精确字段与输入/失败契约见[调试指南](../../docs/guides/debugging-change-flags.md)，
适配依据和实际验收见[本轮报告](../../docs/investigations/change-flag-debugging-readiness.md)。

#### 报告范围与生命周期

报告保留本次 project root、patterns、开关生效值、实际默认排除列表，
说明普通文件、no-follow 和快照边界。文件全集由收集范围决定，独立于 regions；
每个已收集文件都保留，即使零命中。未收集路径不属于零命中结果。

region patterns 与收集使用共同 grammar，但扫描默认排除只控制文件全集，不叠加到 region 规则。
报告解释的是“这些当前文件作为变更候选会命中什么”，不是实际 Git evidence 或 Check 覆盖证明。

每次调用重新收集文件，使用调用方提供的规则；同次定位与展示无 I/O。
输入和必要读取失败沿用上游明确失败契约，合法空全集仍是正常结果。
配置重载、打印、写文件和分享由调用方负责。

实施基线须继承已验收的 Core 与收集迁移稳定提交；合入关系见
[Change 协调](../../docs/governance/change-coordination.md#文件关系与-change-flag-调试)。

### Resulting Impacts

- **工具与公开面**：新增 Non-core owner，消费公共 collection/Core，接入 package root exports、声明与 JSDoc。
- **说明与示例**：提供 README 和相关指南入口、受管示例与内部 owner 说明；
  按[知识治理](../../docs/governance/knowledge-maintenance.md#行为变更的交付审查)核对用户任务与文档影响。

验收按[文档导航](../../docs/navigation.md#交付验证)覆盖：

| 边界 | 证明内容 |
| --- | --- |
| 映射与报告 | 零/单/多命中、正/负列表、双向与数量一致；漏配路径可见，相同候选路径的 region 匹配与 Runtime 一致，报告范围完整。 |
| 收集与调用 | 上游普通文件、no-follow、默认 omitted/true/false 与自有 patterns 边界；合法空全集与失败可区分；重复调用反映新文件/规则，同次定位无 I/O。 |
| 公开消费 | 安装后独立取得完整结果并按需呈现，formatter 不自动打印、写文件或分享。 |

## Risks / Trade-offs

- 当前全集可能缺少已删除文件和 rename 旧路径；假想映射不替代实际 Git evidence，也不证明所有应运行 Check 已覆盖。
- 上游收集和 matcher 变化会影响范围及映射，须继承验收并核对本工具的输入适配。
- 报告含项目路径信息，导出和外部分享需显式选择；快照不承诺原子或实时文件系统状态。

## Open Questions

无已知待用户决定项。精确结果值、formatter 与 regions 适配类型已经由 Readiness 工程调查收敛；
不新增公共试算机制，不借调试改变上游匹配、Run evidence 或 effective flags。

## Readiness Investigation

已发布[接口与验收 Readiness 报告](../../docs/investigations/change-flag-debugging-readiness.md)
（`261011-change-flag-debugging-readiness`），基于实际继承的上游验收提交固定最小同步入口、closed regions、
完整 files/scope/regions、token 双向查询和按需 formatter，未发现公共能力缺口，不复制 private engine。
报告拥有本轮准备依据、实现探索转折和真实验收；稳定公开契约由[调试指南](../../docs/guides/debugging-change-flags.md)拥有。
若后续发现缺口仍回到 owning Change；改变公开行为、显著扩展成本或削减交付能力时先讨论。

## Implementation Observations

实施基线 HEAD `41600617`：两次 `git merge-base --is-ancestor` 确认 `2b2489cf` 与 `7302349e`，退出均为 0。
报告 scope 固定 absolute root、patterns、有效开关与实际默认列表及 regular/no-follow/per-call-non-atomic 边界。
先用公共 Core 验证规则，再收集并追加文件；本次查询和 formatter 只采用最终一个冻结关系视图。

实现与用户材料新增仅影响本工具：Run machine output、effective flags 和既有 matcher/collector 不变。
README、导航和上游专题加任务入口，新随包指南完整定义工具，JSDoc/受管例子/包映射同步；
changelog 记录净新增能力。主线程已汇合基于实际 diff 的独立正确性审查，无 blocker；
最终独立优化保持产品语义，优化后的完整 Gate 与治理证据见本轮报告。
