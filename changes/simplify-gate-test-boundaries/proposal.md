# Proposal

按真实证明责任简化测试与 Gate 自动选择；当前第七版补强测试质量并隔离材料漂移测试，本文保存本 Change 的实施范围与验收条件。

## Why

本 Change 针对测试层级过高、重复准备、弱断言和自动验收职责混杂的问题。判断每项测试的保留层级时，先明确再降一层会失去什么不可替代的观察，再选择直接领域入口或必要的真实边界。

## Outcome

测试用最窄的充分观察层和小规模输入证明行为，保留公开 API 与四项质量扫描。changed 按受影响范围、all 完整验收 installed docs/runtime；consumer types 由正式发布及显式入口验收，admission workbench 按需执行。交付实际耗时与剩余性能边界。

## Scope

### Intended Change

当前第七版在既有测试实体与生产入口内完成：

1. 补强递归 critical-path、路径及换行指纹、Git clean-source 和 workbench 文件保护四处断言。
2. 删除文档层重复指纹测试，由已有 manifest 与 compiler 测试分别证明材料敏感性和真实工具链资格。
3. 将 machine drift 写入隔离到两份 schema、Definition 和 two-file output 的私有副本；字节负例使用直接 checker，Definition 到生成结果比较保留真实 public Run。
4. 以 ai-ready-docs 审核这批文档，按完整编码规范复核全部变化代码模块及直接调用方，完成必要优化与版本保存。

前六版已完成的降层、fixture 减重、断言加固与 Gate 选择分工继续作为本 Change 的基线；设计与形成时证据从 [tasks 的版本索引](tasks.md#证明范围与历史依据)恢复。

### Resulting Impacts

本 Change 已同步降层后的 Case、相关 owner 和 Gate 选择方向的长期记录；测试移动继承原 lane 与输入 region。唯一候选、installed docs/runtime、四项扫描、原预算及统计口径继续保持完整。

本轮同步 Case、内部材料 owner 与当前计划，完成独立代码/文档审查及受影响验证；公开 API、生成器默认行为、Gate 资格和预算保持不变。当前授权覆盖必要优化、Git 提交及既有 hook 推送；Change 删除、性能预算与冷集成的扩大修复须另行确认。实际证据和未完成项见 [tasks](tasks.md#当前验证与未完成项)。

## Success Criteria

- layout 自动检查可证伪的跨层依赖，目录形状和等价构建写法由人工审查。
- 降层后保留取消、容量、缓存和输入 guard 的观察；fixture 按调用隔离，生产限额及公开 API 保持不变。
- routine、release-only 与 explicit-only 按职责选择，docs/runtime 由 changed/all 承接，正式 receipt 验收包含 types。
- Check 粒度与命名表达证明责任，性能按原预算及统计边界判断。
- 独立代码/文档/测试证据审查与工程验证完成；前后同类 workload 实测，完整 Gate 功能与性能结果分别报告，失败现场保留且不自动重试取绿。
- 文档能恢复当前 owner、执行路径和状态；代码复核以编码规范为依据，覆盖完整变化模块及直接调用方，不以邻近代码或临时用途豁免。
- 第七版四处补强能识别已确认的弱断言反例；去重后保留材料敏感性和真实工具链资格的独立证据。漂移负例只改五份私有材料，字节校验执行零次 Run，Definition 健康基线及单因素变化各执行一次真实 Run；漂移验证链保持进程内执行。

## Affected Owners

[Workspace](../../docs/tooling/workspace.md)、[Architecture](../../docs/development/architecture.md)、[Coding style](../../docs/development/coding-style.md)、[Package artifact](../../docs/tooling/package-artifact.md)、[Package lifecycle](../../docs/tooling/package-lifecycle.md)、[Project Gate](../../docs/tooling/project-gate.md)、[Package release](../../docs/tooling/package-release.md)、[Admission workbench](../../docs/tooling/admission-workbench.md)、[Scheduler](../../docs/development/scheduler.md)、[Package tools](../../docs/development/package-tools.md)、[Project files](../../docs/development/project-files.md)、[Output maintenance](../../docs/development/output-maintenance.md)、[Testing](../../docs/testing/strategy.md)与相关 Case。
