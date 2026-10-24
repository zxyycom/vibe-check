# Proposal

按真实证明责任简化测试与 Gate 自动选择，并以实测交付；本文是本次实施计划。

## Why

本 Change 针对测试层级过高、重复准备、弱断言和自动验收职责混杂的问题。判断每项测试的保留层级时，先明确再降一层会失去什么不可替代的观察，再选择直接领域入口或必要的真实边界。

## Outcome

公开 API 与四项质量扫描不变，测试用适当层级和小规模输入证明保留的行为；常规 Gate 不自动执行 consumer types 或 admission workbench，发布 receipt 验收仍含 types，workbench 仅在明确指定时执行。交付实际耗时与剩余性能边界。

## Scope

### Intended Change

1. 将路径、配置、选择、聚合、加载语法及 Gate 性能规则矩阵放到已有直接入口；用代表性 Run、模块解析和安装验收证明接线。
2. 保留真实 Git、文件身份与故障、scanner/cache、timer/I/O、compiler、制品字节和 installed Node/Worker 边界，减少未消费的 fixture 与重复准备。
3. 用独立精确断言证明取消阶段、预取消零调用、MD052 位置、history 写入失败、prepared 异步收尾和工具链材料敏感性。
4. 以私有限额和可控同步缩小测试输入；按职责命名 Gate Check，并区分 routine/release-only/explicit-only 选择。目录组织由人工审查负责，自动验证保留真实依赖边界。

### Resulting Impacts

同步 Case 的实体映射与实际 `Proves`、相关 owner 和 Gate 选择方向的长期记录。测试移动继承原 lane 与输入 region；唯一候选、installed docs/runtime、四项扫描、原预算及统计口径保持完整。

当前交付范围为第四、五版测试整理及提交前复核：用 AI-ready-docs 收敛文档，以完整编码规范审查变更模块和直接上下文，再保存 Git 提交，允许既有 hook 推送。Product API、生产默认值和真实依赖安装不变；性能修复的扩大范围与 Change 删除另行授权。实际证据和未完成项见 [tasks](tasks.md#当前验证与未完成项)。

## Success Criteria

- 目录偏离和等价构建源码写法不再由 layout 自动拒绝；仍有效的跨层依赖由可证伪测试覆盖。
- 取消/容量/缓存/输入 guard 的证明不因降层丢失；默认生产限额及公开 API 不变，无跨运行共享可变 fixture。
- 日常 fast/changed/all 不自动选择 types 或 workbench；正式 all + release receipt 包含 types，显式 focused 选择保持可诊断；docs/runtime 验收不随 types 移走。
- 命名表达职责，不为了 mean/P95 切碎 Check、增加 runner 或放宽预算。
- 独立代码/文档/测试证据审查与工程验证完成；前后同类 workload 实测，完整 Gate 功能与性能结果分别报告，失败现场保留且不自动重试取绿。
- 文档能恢复当前 owner、执行路径和状态；代码复核以编码规范为依据，覆盖完整变化模块及直接调用方，不以邻近代码或临时用途豁免。

## Affected Owners

[Workspace](../../docs/tooling/workspace.md)、[Architecture](../../docs/development/architecture.md)、[Coding style](../../docs/development/coding-style.md)、[Package artifact](../../docs/tooling/package-artifact.md)、[Package lifecycle](../../docs/tooling/package-lifecycle.md)、[Project Gate](../../docs/tooling/project-gate.md)、[Package release](../../docs/tooling/package-release.md)、[Admission workbench](../../docs/tooling/admission-workbench.md)、[Scheduler](../../docs/development/scheduler.md)、[Testing](../../docs/testing/strategy.md)与相关 Case。
