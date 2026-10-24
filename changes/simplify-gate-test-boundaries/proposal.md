# Proposal

按真实证明责任简化测试与 Gate 自动选择，并以实测交付；本文是本次实施计划。

## Why

本 Change 针对测试层级过高、重复准备和自动验收职责混杂的问题：路径规则、取消或容量判断经过完整流程，layout 锁定目录组织和构建源码写法，分组名称难以区分产品测试、仓库扫描和安装验收。实施按硬约束清理、测试降层、命名与频率调整推进；当前追加清理保留独立证明，减少重复执行和无关 fixture。

## Outcome

公开 API 与四项质量扫描不变，测试用适当层级和小规模输入证明保留的行为；常规 Gate 不自动执行 consumer types 或 admission workbench，发布 receipt 验收仍含 types，workbench 仅在明确指定时执行。交付实际耗时与剩余性能边界。

## Scope

### Intended Change

依次删除目录硬约束及构建源码正则锁，保留真实依赖边界；降低 package 错入口测试与 Git fixture 重复工作；以私有策略缩小容量、以确定性同步或时钟替代无关等待；最后按责任命名现有 Check 并收敛 routine/release-only/explicit-only 选择。

追加清理覆盖 Gate 重复证明、未被消费的 Git/安装 fixture、hash 次数锁定及错层规则矩阵。性能策略、duplicate area/blocking、Markdown collector、类型配置和 manifest 静态批准值由已有直接入口证明；真实 scanner/cache、日志、产物及安装验收保留独立的接线证明。

当前第三版收窄 installed waiver 重复变体、builtin 的通用 Run/发布证明和 aggregation 规则矩阵，移除 artifact 中的私有重导出路径锁定。保留独立 façade 字节批准值、真实默认 scanner、warm-cache 重算、timer/I/O、compiler 物理边界及代表性 Run/安装接线。

### Resulting Impacts

同步校验器、package 私有依赖、相关 Product 私有测试接线、Case 和内部 owner。修订 Gate 自动验收方向的长期记录，保留唯一候选、installed docs/runtime、四项扫描、原性能预算与统计口径。前两版已按授权完成 AI-ready-docs、完整编码规范复核与 Git 保存；第三版继续按这些规范复核变化范围。

追加测试清理同步实体映射与 `Proves`，生产代码、公开 API、Gate 选择及预算保持不变。前两版已保存为 `91903719`；当前授权包含第三版文档/代码复核、必要 Git 提交及 hook 推送。完整 Gate 性能验收按实际结果交接；Change 删除另需授权。

## Success Criteria

- 目录偏离和等价构建源码写法不再由 layout 自动拒绝；仍有效的跨层依赖由可证伪测试覆盖。
- 取消/容量/缓存/输入 guard 的证明不因降层丢失；默认生产限额及公开 API 不变，无跨运行共享可变 fixture。
- 日常 fast/changed/all 不自动选择 types 或 workbench；正式 all + release receipt 包含 types，显式 focused 选择保持可诊断；docs/runtime 验收不随 types 移走。
- 命名表达职责，不为了 mean/P95 切碎 Check、增加 runner 或放宽预算。
- 独立代码/文档/测试证据审查与工程验证完成；前后同类 workload 实测，完整 Gate 功能与性能结果分别报告，失败现场保留且不自动重试取绿。
- 文档能恢复当前 owner、执行路径和状态；代码复核以编码规范为依据，覆盖完整变化模块及直接调用方，不以邻近代码或临时用途豁免。

## Affected Owners

[Workspace](../../docs/tooling/workspace.md)、[Architecture](../../docs/development/architecture.md)、[Coding style](../../docs/development/coding-style.md)、[Package artifact](../../docs/tooling/package-artifact.md)、[Package lifecycle](../../docs/tooling/package-lifecycle.md)、[Project Gate](../../docs/tooling/project-gate.md)、[Package release](../../docs/tooling/package-release.md)、[Admission workbench](../../docs/tooling/admission-workbench.md)、[Scheduler](../../docs/development/scheduler.md)、[Testing](../../docs/testing/strategy.md)与相关 Case。
