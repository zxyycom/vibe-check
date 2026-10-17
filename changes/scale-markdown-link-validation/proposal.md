# Proposal

将 Markdown Link 重构为需求驱动的引用图，在完整验证范围内支持持续增长的文档索引。

## Why

调查报告、证据附件和多层文档索引会持续增加本地引用。当前逐引用验证已复用部分解析事实，
但目标需求与节点操作仍分散在引用处理流程中，重复引用会反复触发路径授权与目标探测。

节点事实与引用边分离后，可按目标需求统一组织工作，同时保留每次引用的独立判断。
总量预算作为配套契约，由调用方显式选择。

## Outcome

同一次检查按引用需求取得并复用节点事实，逐边生成稳定、安全的验证结果；仓库 Gate 可关闭总量预算，
完整处理增长后的文档。图式重构及其操作量证明是完成出口，预算调整是配套能力。

## Scope

### Intended Change

- 在 Markdown Link Check 内建立路径节点、独立引用边和派生需求，分阶段取得事实并逐边结算。
- 固定单次节点观察，在阶段、节点和边批次边界协作式让步，支持 timer/I/O 触发的取消。
- 为两项总量预算提供 `number | false`，保持 Product 默认值；Gate 显式关闭它们。

### Resulting Impacts

- 更新 options 类型、物化与校验、节点观察和多故障首错契约，保持现有计数口径与 machine DTO。
- 同步公开指南、内部 owner、Gate 配置、Case、示例和安装后消费验收。
- 在产品修改前保存可比较基线并演进相关长期决策，再实施图式重构与完整验证。

## Success Criteria

1. 同一路径及授权域的目标观察至多取得一次；源节点事实可复用，重复边保留各自位置和 Finding。
2. 完整输入、direct-only、离线、路径授权、单文件字节边界和完整发布语义均得到证明。
3. 总量预算关闭后，超过旧目标配置最大值的真实执行可以完成；显式有限预算继续超限阻断。
4. 操作量达到 [Design](design.md) 的硬门禁，完成同输入性能对照、取消验证及完整 Gate 验收。

## Affected Owners

| Owner | 本次责任 |
| --- | --- |
| [Markdown Link 指南](../../docs/checks/markdown-link-validation.md)与源码 JSDoc | options、观察、错误与取消的用户契约。 |
| [解析与授权 owner](../../docs/development/markdown-link-resolution.md) | `src/package-checks/markdown-link-validation/**` 内的图、事实和执行。 |
| [Project Gate](../../docs/tooling/project-gate.md) | 仓库配置、配置测试及完整 corpus。 |
| [测试策略](../../docs/testing/strategy.md) | 相邻测试、Case 账本、公开类型与安装后消费验收。 |
| [Decision 维护](../../.codex/skills/decision-records/SKILL.md) | 观察复用、缓存与预算方向的演进。 |
