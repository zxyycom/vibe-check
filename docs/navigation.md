# 文档导航

先按任务找到规则 owner，再读相关实现和测试。本文负责路由与交付验证，不复述领域契约。

## 读者、发布范围与规则归属

三个维度分别判断：**读者**决定解释方式，**随包范围**决定消费者能取得的材料，**owner**决定规则的完整定义位置。
用户文档也是公开行为的规范输入；维护者修改实现前必须读取对应承诺。入口、教程和示例不因发布而自动成为规范。

一个规则保留一个完整定义位置，其它页面用有明确引用的摘要或设计推导连接。发布事实以[材料 registries](tooling/documentation.md#documentation-validation-and-package-material)为准，导航不新增发布项。

### 随包用户材料

本组面向 package 集成用户、Check 作者和产物消费者；下列已注册 Markdown 随包提供，维护者也须读取相关公开契约。

| 文档 | 用户任务与规则范围 |
| --- | --- |
| [README](../README.md) | 唯一用户总入口：安装、支持范围、最小路径与专题直链。 |
| [变更日志](changelog.md) | 版本净变化、升级影响与提交追溯；具体行为规范由对应专题拥有。 |
| [API 机制](api-mechanics.md) | Run 生命周期、Definition/Controls、组合、aggregation 和结果分支。 |
| [回调位置](guides/callbacks.md) | 按任务选扩展点；具体契约引用对应专题。 |
| [自定义 Check](guides/extending-check-lifecycle.md) | preflight/execution authoring、callback context、flags 与协作取消。 |
| [依赖与类型化数据](guides/check-dependencies.md) | direct relations、get/list 授权、typed provider 与 parser。 |
| [Run 输出与诊断](guides/run-outputs.md) | 输出配置、progress/console/diagnostic、readback 与失败优先级。 |
| [调度 Check](guides/scheduling.md) | 资源与准入、simple/prepared lifecycle、终态 measurement。 |
| [模拟调度分支](guides/simulating-admission.md) | 独立静态图、immutable successor 与假设资源状态。 |
| [本地时长历史调度](guides/learned-scheduling.md) | learned strategy 的 identity、history、安全、退化与 observation。 |
| [选择与收集项目文件](guides/collecting-project-files.md) | 共同 selection、默认基线与同步 collectProjectFiles 的完整契约。 |
| [缓存计算结果](guides/cache-results.md) | cacheJsonByKey 的 key、结果、并发与信任边界。 |
| [Finding waiver](guides/finding-waivers.md) | 通用 reconciliation 与 audit；Check-specific identity 引用各指南。 |
| [Finding 呈现](guides/presenting-findings.md) | message helper、数量与省略结果，不定义 Check outcome。 |
| [八项 Check 指南](../README.md#随包提供的-check) | 每篇完整拥有该 Check 的 options、默认值、执行、结果、Records/messages、不可用及安全边界。 |
| [机器输出契约](output.md) | publication set、DTO 语义、版本与消费边界。 |

随包文档由 [JSON 映射](package-documents.json)声明源文件与包内路径：current [schemas](schemas/) 拥有精确机器结构；[artifact example](examples/artifacts/mixed-outcomes/)与 API example sources 证明用法，不新增规则。
类型声明拥有精确签名，source JSDoc 提供局部说明；只发布已注册的 schema、示例与声明/源码包材料。
投影维护见[文档材料](tooling/documentation.md)，机器材料维护见[输出维护](development/output-maintenance.md)。

### 仅工作区维护材料

下节的 development、tooling、testing、governance，以及本文和 AGENTS 均不随包发布。
它们面向维护者与编码代理，分别拥有实现不变量、工程规则、工具流程、测试证据和知识交接；不能成为用户完成公开任务的隐式前提。
Decision、当前 Change 与 Investigation 按明确任务进入，不作用户指南或第二套当前规范。

## 如何阅读这些文档

产品任务先读上表公开 owner，再用下表进入内部责任。纯工具或治理任务直接进入对应行。
实现或脚本改动另读[编码规范](development/coding-style.md)，随后只读目标附近的源码与测试。

### 产品开发

| 修改对象 | 内部 owner / 验证线索 |
| --- | --- |
| 总体架构、组件职责、依赖方向 | [Architecture](development/architecture.md)与相邻组件测试 |
| Project Definition、validation、normalization、inherit | [Project Definition](development/project-definition.md)与 authoring tests |
| Run adapter、root、Controls 与接线 | [Project Run](development/project-run.md)与 Run tests |
| Check 状态、Record facts 与 aggregation | [Check results](development/check-results.md)与 settlement tests |
| 文件收集、默认排除与 exact inputs | [Project files](development/project-files.md)与 selection/collection tests |
| Markdown occurrence、direct target 与 cache | [Markdown 链接解析](development/markdown-link-resolution.md)与相邻 adapter tests |
| 调度 reducer、资源、shell 与 measurement | [Scheduler](development/scheduler.md)与 scheduler/simulation tests |
| Check scanner、工具替换、availability 与 cache identity | [Scanner dependencies](development/scanner-dependencies.md)及对应 Check guide / adapter tests |
| console、progress、diagnostic 实现 | [Human output](development/human-output.md)与 output tests |
| machine schema、serialization、publication 或 artifact | [Output maintenance](development/output-maintenance.md)、[公开契约](output.md)及独立 schema/example 验收 |

### 仓库工具与测试

| 修改对象 | owner / 验证入口 |
| --- | --- |
| 根命令、脚本目录、共享 capability、环境 | [Workspace tooling](tooling/workspace.md)与 scripts tests |
| Gate selection、candidate binding、afterGate、exit | [Project Gate](tooling/project-gate.md)与 adapter tests |
| Gate native/process diagnostics、Record 投影 | [Gate diagnostics](tooling/gate-diagnostics.md)与各 producing owner tests |
| 本地候选包状态、准备、安装与 external consumer | [Package lifecycle](tooling/package-lifecycle.md)与 candidate / consumer acceptance |
| package 构建、manifest、ESM 布局与随包法律材料 | [Package artifact](tooling/package-artifact.md)与 artifact acceptance |
| 正式发布、冻结 source、receipt 与发布后交接 | [Package release](tooling/package-release.md)与同产物完整 Gate |
| translated source inventory、identity 与派生 pin | [来源映射维护](tooling/source-mapping.md)与 source identity audit |
| Markdown 正文、Check 指南、可执行示例 | [Documentation](tooling/documentation.md)、目标正文与示例源 |
| 示例投影器、docs 校验器或材料验收 | [Documentation validation](tooling/documentation-validation.md)、provider/validator 与测试 |
| Lizard 性能测量 | [性能测量](tooling/lizard-performance.md)的显式 evidence workflow |
| Lizard 上游维护查询 | [上游查询](tooling/lizard-upstream.md)；仅显式运行时联网 |
| 测试、fixture、Case 或测试工具 | [测试策略](testing/strategy.md)、[Case 维护](testing/case-maintenance.md)、行为 owner 与目标测试 |

### 知识与变更

| 任务 | 先做什么 |
| --- | --- |
| 恢复、审阅或维护长期判断 | `decision-records` skill；`bun run decisions -- list` |
| 跨文件或 owner 的当前 Change | `change-plan` skill；`bun run change-plan -- list changes`，再读目标 artifacts |
| 协调 Change 依赖、合入或 worktree | [Change 协调](governance/change-coordination.md)与目标 artifacts |
| 复杂/严重 Bug 或用户明确要求持久报告 | [自动沉淀条件](governance/knowledge-maintenance.md#复杂或严重-bug-的自动调查沉淀)与 `investigation-report` skill |

## 文档变更审查

产品行为、使用方案或内部职责变化时，按[文档影响审查](governance/knowledge-maintenance.md#行为变更的交付审查)分别核对公开承诺与内部说明，由非实施代理基于实际 diff 反查。
新增、移动或改变发布范围时，同步阅读路径、JSON 映射、README 直链和包内链接；机械校验不代替语义审查。

## 随包 Check 指南

唯一逐项索引在 [README](../README.md#随包提供的-check)，由 JSON 的 `checkGuides` 与公开 Check 函数、已发布 guides 完整闭合。
通用 Check Definition / results 只保留跨 Check 契约；本页不复制逐项清单。

## 权威性与状态

当前 owner 文档定义稳定规则，代码、测试和 release artifact 证明实现；活动 Decision 承接长期方向，当前 Change 承接本次实施，Investigation 保存形成时认识。
完整载体边界见[知识治理](governance/knowledge-maintenance.md)。历史只在明确审计任务中从版本历史取得，不参与当前规范、计划或验证。

目标性 `MUST` / `SHALL` 不证明当前二进制已支持，除非文档明确标为 Current 或已实现。材料不一致时先判断其类型，再修正对应 owner。

## 交付验证

先选最窄覆盖边界的命令，跨边界再升级：

| 改动面 | 验证入口 |
| --- | --- |
| 文档、schema、examples 或 whitespace | `bun run validate`；局部文档可先 `bun run validate -- docs` |
| Decision | `bun run decisions -- check` |
| Change | `bun run change-plan -- check changes/<change>` |
| Investigation | `bun run investigations` |
| 测试或 Case | 最窄目标测试，再运行 `bun run test-evidence -- check --root .` |
| 产品或脚本 | owner 的 test、typecheck、lint、dependency 与入口检查 |
| 跨产品行为、Change、schema、示例、输出或多个包 | `bun run check` |
| 发布前或大范围重构 | `bun run check -- --all`，包含 package artifact / external consumer 验收 |

报告实际执行、未执行项及影响；工具细分命令见[Workspace verification](tooling/workspace.md#verification)。
