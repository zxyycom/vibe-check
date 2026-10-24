# Proposal

按真实证明责任简化测试与 Gate 自动选择，并以实测交付；本文是本次实施计划。

## Why

本 Change 针对测试层级过高、重复准备、弱断言和自动验收职责混杂的问题。判断每项测试的保留层级时，先明确再降一层会失去什么不可替代的观察，再选择直接领域入口或必要的真实边界。

## Outcome

测试用最窄的充分观察层和小规模输入证明行为，保留公开 API 与四项质量扫描。changed 按受影响范围、all 完整验收 installed docs/runtime；consumer types 由正式发布及显式入口验收，admission workbench 按需执行。交付实际耗时与剩余性能边界。

## Scope

### Intended Change

1. 将路径、配置、选择、聚合、加载语法及 Gate 性能规则矩阵放到已有直接入口；用代表性 Run、模块解析和安装验收证明接线。
2. 保留真实 Git、文件身份与故障、scanner/cache、timer/I/O、compiler、制品字节和 installed Node/Worker 边界，减少未消费的 fixture 与重复准备。
3. 用独立精确断言证明取消阶段、预取消零调用、MD052 位置、history 写入失败、prepared 异步收尾和工具链材料敏感性。
4. 以私有限额和可控同步缩小测试输入；按职责命名 Gate Check，并区分 routine/release-only/explicit-only 选择。目录组织由人工审查负责，自动验证保留真实依赖边界。
5. 复用既有生产入口，在现有测试内加固非法请求零 Worker 创建、完整 Check outcome 投影、结构化 Record 身份与真实 installed README 漂移的 assessment 接线。

### Resulting Impacts

同步 Case 的实体映射与实际 `Proves`、相关 owner 和 Gate 选择方向的长期记录。测试移动继承原 lane 与输入 region；唯一候选、installed docs/runtime、四项扫描、原预算及统计口径保持完整。

当前交付为第六版四处证明加固及提交前复核：用 ai-ready-docs 收敛六份文档，按完整编码规范检查四个变化代码模块及直接上下文，再保存 Git，允许既有 hook 推送。公开 API、生产默认值、Gate 资格和预算保持不变。性能及冷集成超时的扩大修复范围、Change 删除另行确认；实际证据和未完成项见 [tasks](tasks.md#当前验证与未完成项)。

## Success Criteria

- layout 自动检查可证伪的跨层依赖，目录形状和等价构建写法由人工审查。
- 降层后保留取消、容量、缓存和输入 guard 的观察；fixture 按调用隔离，生产限额及公开 API 保持不变。
- routine、release-only 与 explicit-only 按职责选择，docs/runtime 由 changed/all 承接，正式 receipt 验收包含 types。
- Check 粒度与命名表达证明责任，性能按原预算及统计边界判断。
- 独立代码/文档/测试证据审查与工程验证完成；前后同类 workload 实测，完整 Gate 功能与性能结果分别报告，失败现场保留且不自动重试取绿。
- 文档能恢复当前 owner、执行路径和状态；代码复核以编码规范为依据，覆盖完整变化模块及直接调用方，不以邻近代码或临时用途豁免。

## Affected Owners

[Workspace](../../docs/tooling/workspace.md)、[Architecture](../../docs/development/architecture.md)、[Coding style](../../docs/development/coding-style.md)、[Package artifact](../../docs/tooling/package-artifact.md)、[Package lifecycle](../../docs/tooling/package-lifecycle.md)、[Project Gate](../../docs/tooling/project-gate.md)、[Package release](../../docs/tooling/package-release.md)、[Admission workbench](../../docs/tooling/admission-workbench.md)、[Scheduler](../../docs/development/scheduler.md)、[Testing](../../docs/testing/strategy.md)与相关 Case。
