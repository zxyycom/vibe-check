# Proposal

按真实证明责任简化测试与 Gate 自动选择，并以实测交付；本文是本次实施计划。

## Why

当前部分测试为路径规则、取消或容量判断经过完整准备流程、重复真实工具链读取或生产容量文件；layout 还机器锁定目录组织和构建源码写法。测试分组名称不能清楚区分产品测试、仓库扫描和安装验收。用户明确授权先移除这些硬约束，再降低测试层级与规模，最后调整命名和执行频率。

## Outcome

公开 API 与四项质量扫描不变，测试用适当层级和小规模输入证明保留的行为；常规 Gate 不自动执行 consumer types 或 admission workbench，发布 receipt 验收仍含 types，workbench 仅在明确指定时执行。交付实际耗时与剩余性能边界。

## Scope

### Intended Change

依次删除目录硬约束及构建源码正则锁，保留真实依赖边界；降低 package 错入口测试与 Git fixture 重复工作；以私有策略缩小容量、以确定性同步或时钟替代无关等待；最后按责任命名现有 Check 并收敛 routine/release-only/explicit-only 选择。

### Resulting Impacts

同步校验器、package 私有依赖、相关 Product 私有测试接线、Case 和内部 owner。修订 Gate 自动验收方向的长期记录，保留唯一候选、installed docs/runtime、四项扫描、原性能预算与统计口径。已有未提交工作作为当前输入保留，不代为提交或结项。

## Success Criteria

- 目录偏离和等价构建源码写法不再由 layout 自动拒绝；仍有效的跨层依赖由可证伪测试覆盖。
- 取消/容量/缓存/输入 guard 的证明不因降层丢失；默认生产限额及公开 API 不变，无跨运行共享可变 fixture。
- 日常 fast/changed/all 不自动选择 types 或 workbench；正式 all + release receipt 包含 types，显式 focused 选择保持可诊断；docs/runtime 验收不随 types 移走。
- 命名表达职责，不为了 mean/P95 切碎 Check、增加 runner 或放宽预算。
- 独立代码/文档/测试证据审查与工程验证完成；前后同类 workload 实测，完整 Gate 功能与性能结果分别报告，失败现场保留且不自动重试取绿。

## Affected Owners

[Workspace](../../docs/tooling/workspace.md)、[Architecture](../../docs/development/architecture.md)、[Coding style](../../docs/development/coding-style.md)、[Package artifact](../../docs/tooling/package-artifact.md)、[Package lifecycle](../../docs/tooling/package-lifecycle.md)、[Project Gate](../../docs/tooling/project-gate.md)、[Package release](../../docs/tooling/package-release.md)、[Admission workbench](../../docs/tooling/admission-workbench.md)、[Scheduler](../../docs/development/scheduler.md)、[Testing](../../docs/testing/strategy.md)与相关 Case。
