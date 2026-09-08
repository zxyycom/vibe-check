# 本轮文档审阅覆盖

本文件是本 Change 的一次性交付记录，不是新文档 registry 或长期验证门禁。范围是当前人读说明；Decision/Investigation 实体、其它 Change、Case 账本和机器材料按各自用途保留，仅处理受影响引用。

## 基线逐篇结果

| 文档 | 处理 | 依据 |
| --- | --- | --- |
| [AGENTS.md](../../AGENTS.md) | 调整 | 既有执行入口保持；按追加用户要求记录 Terra 默认、Sol 条件与禁用 Astra。 |
| [README.md](../../README.md) | 调整 | 去重起步与多处专题索引，保留最小运行、CI 判断和全部随包直链。 |
| [docs/api-mechanics.md](../../docs/api-mechanics.md) | 调整 | 公共生命周期主线收敛，调度、simulation 等完整规则交给专题。 |
| [docs/checks/duplicate-detection.md](../../docs/checks/duplicate-detection.md) | 调整 | 去 area/default/executable 重复解释，保留 overlap/threshold/cache/waiver。 |
| [docs/checks/file-metrics.md](../../docs/checks/file-metrics.md) | 调整 | 精简默认/waiver 重述，保留 SCC、最严格 overlap 与完整结果。 |
| [docs/checks/function-metrics.md](../../docs/checks/function-metrics.md) | 调整 | 集中指标定义；按源码补 counts/rejection/audit，保留失败部分证据。 |
| [docs/checks/json-schema-validation.md](../../docs/checks/json-schema-validation.md) | 调整 | 共享 files grammar 改引用，保留 bindings、远端授权与完整原因。 |
| [docs/checks/json-validation.md](../../docs/checks/json-validation.md) | 调整 | 去 files grammar 副本，保留 strict parsing、拒绝输入与 partial evidence。 |
| [docs/checks/maintenance-reminders.md](../../docs/checks/maintenance-reminders.md) | 调整 | 收敛 CI/基线/machine row 重述，保留完整 assessment 与 Git 边界。 |
| [docs/checks/markdown-link-validation.md](../../docs/checks/markdown-link-validation.md) | 调整 | 去共享 grammar/cache/outcome 重述，保留 snapshot、计数、限额与安全。 |
| [docs/checks/secret-detection.md](../../docs/checks/secret-detection.md) | 调整 | 分解巨段，保留敏感信息/coverage/no-follow；按源码补 messages/audit。 |
| [docs/development/architecture.md](../../docs/development/architecture.md) | 调整 | 保留总体边界，调度实现归入独立 Scheduler 专题。 |
| [docs/development/check-results.md](../../docs/development/check-results.md) | 调整 | 去除公开四态与 Check-specific 副本，保留 canonical facts 与 closure。 |
| [docs/development/coding-style.md](../../docs/development/coding-style.md) | 调整 | 去重导言/验收复述，保留规则强度、例外、模型和命名硬约束。 |
| [docs/development/human-output.md](../../docs/development/human-output.md) | 调整 | 正文职责独立，保留；仅更新 collector owner 链接。 |
| [docs/development/output-maintenance.md](../../docs/development/output-maintenance.md) | 调整 | 机器材料主线保留，人读输出副本改引既有 owner。 |
| [docs/development/project-definition.md](../../docs/development/project-definition.md) | 调整 | 去除公开参数副本，保留 normalization、preflight、fingerprint 等内部不变量。 |
| [docs/development/project-files.md](../../docs/development/project-files.md) | 调整 | 保留共同 collection/exact inputs；Markdown resolver 独立成篇。 |
| [docs/development/project-run.md](../../docs/development/project-run.md) | 调整 | 保留路径/capability/覆盖接线，引用唯一公开规则。 |
| [docs/development/scanner-dependencies.md](../../docs/development/scanner-dependencies.md) | 调整 | 合并 adapter 重述，保留 Worker、provenance、cache 和验收。 |
| [docs/governance/change-coordination.md](../../docs/governance/change-coordination.md) | 调整 | 协调表明确不是成员/状态清单，去动态 stage 副本，前置条件保留。 |
| [docs/governance/knowledge-maintenance.md](../../docs/governance/knowledge-maintenance.md) | 调整 | 去载体/授权/交接重复，保留全部自动报告与生命周期边界。 |
| [docs/guides/cache-results.md](../../docs/guides/cache-results.md) | 保留 | 保留：示例、key/结果与缓存安全边界均服务单一任务。 |
| [docs/guides/callbacks.md](../../docs/guides/callbacks.md) | 调整 | 链接进入选择表，删除重复下一步清单。 |
| [docs/guides/check-dependencies.md](../../docs/guides/check-dependencies.md) | 调整 | 删除重复选法与 get/list 复述，保留直接授权与 parser 契约。 |
| [docs/guides/collecting-project-files.md](../../docs/guides/collecting-project-files.md) | 调整 | 收敛默认/省略字段解释，完整同步收集边界保留。 |
| [docs/guides/extending-check-lifecycle.md](../../docs/guides/extending-check-lifecycle.md) | 保留 | 保留：完整 authoring/flags/preflight/取消契约各有独立价值。 |
| [docs/guides/finding-waivers.md](../../docs/guides/finding-waivers.md) | 调整 | 原生 identity 的重复表改引各 Check owner，通用 audit 保留。 |
| [docs/guides/learned-scheduling.md](../../docs/guides/learned-scheduling.md) | 调整 | 去重复前提与尾部概述，保留 identity/history/退化和观察。 |
| [docs/guides/presenting-findings.md](../../docs/guides/presenting-findings.md) | 调整 | 重复 progress 数量改引用，helper 与各 Check 的上限责任保留。 |
| [docs/guides/run-outputs.md](../../docs/guides/run-outputs.md) | 调整 | 去重 preview 数字与 Finding 索引；既有配置诊断整节不变。 |
| [docs/guides/scheduling.md](../../docs/guides/scheduling.md) | 调整 | 模拟移入独立任务；真实调度保留，并明确既有数值默认/继承。 |
| [docs/navigation.md](../../docs/navigation.md) | 调整 | 共同受众/发布声明前置，窄表分任务路由，补全独立专题。 |
| [docs/output.md](../../docs/output.md) | 调整 | 保留精确双文件消费契约，示例形成过程不再复述源码。 |
| [docs/testing/case-maintenance.md](../../docs/testing/case-maintenance.md) | 调整 | 去对象/closure/交付复述，保留精确 grammar 和语义连续性。 |
| [docs/testing/strategy.md](../../docs/testing/strategy.md) | 调整 | 层级表只列直接证明，域特定 Scheduler 验证要求交回行为 owner。 |
| [docs/tooling/documentation.md](../../docs/tooling/documentation.md) | 调整 | 日常编辑/发布主线缩短，生成器与校验器维护归入专题。 |
| [docs/tooling/lizard-upstream.md](../../docs/tooling/lizard-upstream.md) | 保留 | 保留：短小独立的显式查询任务与完整 transport 边界。 |
| [docs/tooling/package-lifecycle.md](../../docs/tooling/package-lifecycle.md) | 保留 | 保留：前轮已分清 artifact/安装审计，构建与 release 的精确约束有必要。 |
| [docs/tooling/project-gate.md](../../docs/tooling/project-gate.md) | 调整 | 配置/运行/退出主线保留，native/process 诊断协议归入专题。 |
| [docs/tooling/workspace.md](../../docs/tooling/workspace.md) | 调整 | 命令表去重复接线列，独立性能测量移出常规工作流。 |

## 独立专题与承接

| 新专题 | 原规则来源与独立任务 |
| --- | --- |
| [docs/guides/simulating-admission.md](../../docs/guides/simulating-admission.md) | scheduling/API：不运行真实 Check 的假设分支分析。 |
| [docs/development/scheduler.md](../../docs/development/scheduler.md) | architecture/testing strategy：调度 reducer、shell、measurement 与验证。 |
| [docs/development/markdown-link-resolution.md](../../docs/development/markdown-link-resolution.md) | project-files：Markdown source/target resolver 与 cache。 |
| [docs/tooling/documentation-validation.md](../../docs/tooling/documentation-validation.md) | documentation：投影语法、验证结果与安装后材料验收。 |
| [docs/tooling/gate-diagnostics.md](../../docs/tooling/gate-diagnostics.md) | project-gate：native/process 安全投影与日志通道。 |
| [docs/tooling/lizard-performance.md](../../docs/tooling/lizard-performance.md) | workspace：显式 Lizard 性能测量的 layer/temperature/资源解释。 |

## 保真与审查

- 全部原代码围栏逐字保留，包括跨页搬迁；已有输出配置诊断与四项严格 CI 示例不回退。
- 19 个 Case 仅改变 Owner，ID、Entities 与 Proves 逐字不变；受影响当前链接同步。
- 用户公开文档、内部设计、项目工具/治理/测试分别由非实施者完成全文增量和代表任务审查；旧 waiver/resolver 链接已修复。
- 子代理模型偏好是本轮追加授权的独立项目规则，已写入 AGENTS 与已对齐 Decision；不改变文档整理的产品行为边界。

## 验收证据

以下为首次全量整理的验收快照；后续三处补正另记于下节。

- `bun run docs:api`、`bun run validate -- docs`、`bun run format -- check`、`bun run decisions -- check` 与 `bun run test-evidence -- check --root .` 通过；Case 闭合为 569 个实体、131 个 Case、15 个 Topic。
- 受影响 Case 对应 43 个测试文件：绑定 `VIBE_CHECK_NODE_CMD` 后 147/147 通过；首次直接运行缺少该环境绑定，146 通过、1 失败，未通过改写测试绕开。
- `bun run check -- --all`：36/36 通过，包含 artifact、external consumer 和 documentation acceptance。日志批次为 `2026-09-08T06-44-51.002Z-1265899-d5cece17-8b01-4844-a260-b1847d3abf0f`。
- `bun run package:status`：candidate `0.0.0-local.d387fb4752fa` 为 current。22 篇随包 Markdown 在源码、构建包与 installed consumer 中逐字一致；47 篇当前说明在完整 Gate 后未变化。
- 范围审计：原 81 个代码围栏全部逐字保留；10 个既有非说明文件（含既有 Case 改动）与任务开始快照相同。41 篇基线说明加六篇新专题，UTF-8 正文总量从 495,003 降为 413,771 字节（约 16.4%）；该统计不替代语义审查。
- 本轮未改产品实现，未执行 Git stage/commit、远端发布或 Change 删除。Plan 保持 `plan`，全部任务完成；历史实体及其他 Change 正文未纳入重写。

## AI-ready 复审补正

按用户追加授权，仅修正模拟分支语义、性能测量副作用和中文规则范围。三篇分别为 55、53、327 行，合计净增 637 字节；无新增标题、专题或代码示例，原 fences 不变。其余实现、测试与既有改动保持不变。

独立增量复审通过；`graph.test.ts` 3/3、文档投影与链接检查通过，完整 Gate 再次 36/36 通过。日志批次 `2026-09-08T07-02-40.271Z-1279084-7d0700ec-6af3-4c07-87be-abaf11177443`；candidate `0.0.0-local.47404e90e692` 为 current，更新的模拟指南在源码、构建包与 installed consumer 中逐字一致。未运行性能测量、提交、发布或删除 Plan。
