# Proposal

本 Plan 交付公共 Core 文件—区域索引：合并多份来源数据，提供统一的只读双向定位。

## Why

内部文件收集已有区域到文件的集合，多个 Check 又分别构建反向索引。调用方需要共同的关系工具，
让 Core、随包工具和外部消费者共享成员关系，同时各自保留数据获取、筛选和领域策略。

## Outcome

调用方提供多份文件源与区域源的数据，取得同一关系对象：

- 从文件定位全部所属区域，从区域定位全部成员文件，保留零命中和重叠。
- 支持批量接入及显式追加来源；初版合并已接收数据后重建关系，取得新视图，保留旧视图。
- 构造和查询均为无 I/O 的纯计算；规则匹配与已知实际成员使用同一结果契约。

方向归[索引决策](../../docs/decisions/provide-readonly-file-region-index.md)，接口与验收准备归 [Design](design.md)。
[change flag 调试](../add-change-flag-debugging/proposal.md)由下游 Change 交付。

## Scope

### Intended Change

- 新增无 I/O 的公共 Core 值数据索引，支持多文件源、多区域源、批量构造、显式追加后重建和只读双向定位。
- 规则区域消费已迁移的共同 patterns matcher，已知实际成员直接建立关系；保留来源获取和领域 policy 的 owner。
- 按 Design 的 Readiness 调查确定精确类型、输入校验、私有存储和必要内部消费；临时输入可构造独立结果，不新增试算机制。

### Resulting Impacts

- 同步 package root exports、声明、JSDoc、公开入口、受管示例及实际复用的内部 owner。
- 对最小内部复用验证 accepted/rejected、exact inputs 与领域 policy 不变；函数指标关系索引迁移不作为必需项。
- 规则实现和验收继承收集 Change 的完整 matcher 迁移稳定提交；共享文件和包材料串行实施、合入。

## Success Criteria

- 双向结果一致，保留零命中、重叠、已知空与未知键差异；稳定排序去重并隔离运行时修改。
- 批量与逐次追加结果一致，新文件与已有规则、新规则与已有文件均重建；实际成员不被其它来源扩大，旧视图不变。
- 构造、查询和追加无 I/O 或来源刷新，显式不存在/已删除路径仍可参与；安装后消费者独立可用。
- Readiness 报告与代表性重建成本证据闭合，无未经证据的性能收益承诺；所有必要 owner、测试和包材料通过对应验收。

## Affected Owners

- [Architecture](../../docs/development/architecture.md#能力分层与扩展方式)、[Project files](../../docs/development/project-files.md)及实际复用的 Check owner。
- [文件收集公开契约](../../docs/guides/collecting-project-files.md)、[文档材料](../../docs/tooling/documentation.md)、[包产物](../../docs/tooling/package-artifact.md)与[测试策略](../../docs/testing/strategy.md)。
- 两条 active Decision 仍为未对齐方向，完整交付前不改为 aligned。
