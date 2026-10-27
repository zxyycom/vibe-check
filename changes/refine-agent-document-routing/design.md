# Design

本设计记录已确认的局部文档修订及验证，不改变 AGENTS、导航、领域 owner 和 Skill 的既有分工。

## Context

- 目标消费者是执行仓库维护任务的编码代理。起始材料是当前任务、实际注入的 AGENTS 与可用 Skill 描述；代理可按链接读取仓库文档，但不能假定它已知道领域 owner。
- [AGENTS](../../AGENTS.md) 指向文档导航，并保留 `main`、发布和 Change 协调摘要；[文档导航](../../docs/navigation.md)拥有公开与内部 owner、特殊流程和交付验证的路由。
- 活动 Decision 已确认：[导航作为维护任务总路由](../../docs/decisions/organize-maintainer-documentation-by-responsibility.md)、[区分受众、发布范围与契约归属](../../docs/decisions/declare-document-audience-publication-and-contract-ownership.md)，以及 [Skill 触发与项目接线的边界](../../docs/decisions/261026-maintain-distinct-project-skills-with-test-design.md)。本项沿用这些判断，不重新开放已确认的分层。
- 已完成当前文档链的只读审查：59 份入口、owner、指南和变更日志均可达，三位 6.1 Terra 子代理分组阅读全文，主代理复核重点发现。没有证据支持全仓压缩或机械删除负向边界。
- 用户已授权按发现实施局部修订，并在本轮明确授权整理提交及正常结项。提交遵循当前 checkout 的 hook 边界；发布和其它独立外部写入不在授权内。

## Goals / Non-Goals

目标是让代理按任务找到必要规则、知道何时继续展开及何时停止，并让路由维护责任可恢复。

不以行数、链接数或固定跳转次数作为优化目标；不改变领域契约、Skill 安装集合、发布材料或运行时行为。
索引、召回、上下文注入和工具权限属于外部交付链路，本项只说明发现的限制，不修改这些机制。

## Decisions

### Intended Change

**既有责任基线**：

- AGENTS 提供常驻项目语境、工作约定和导航入口；导航连接维护任务、领域 owner 与验证入口。
- 领域 owner 完整定义规则；其他页面只保留有用途、有引用的摘要或推导。
- Skill 描述拥有通用触发条件，项目文档补充本项目的 owner、命令和验证接线，不复制整套 Skill 说明。

**本轮采用的修订**：

| 已确认问题 | 实施位置与边界 |
| --- | --- |
| 提交副作用没有动作前的定向入口 | AGENTS 与导航连接 Workspace hook owner；不复制授权例外，也不修改 Git 配置或 hook。 |
| 内部文档与随包文档路由混合、Change 前置核对入口偏弱 | 导航区分两类文档任务，并连接知识治理的 Decision/Change 交接；领域规则保留在 owner。 |
| evidence README 只有文本引用 | Scanner owner 改为直接链接当前 README 与偏差说明。 |
| 正文编辑也被要求运行全部投影写入 | Documentation 分开正文与受管示例路径，正文只读检查，示例变化才运行 write。 |
| 当前材料选择仍使用未定义的 required 档位 | 按当前 Gate owner 和 selection 接线表达 changed、强制 presets 与保守回退，不机械改成 fast。 |
| Scanner 主承诺和输出引用标签不准确 | 校准开头覆盖范围和链接标签，保留现有责任及精确规则。 |
| 优化细节挡在行为规则之前 | Scheduler 与 Project files 在同页内重排；既有锚点、排序、取消、失败和复杂度限制保持。 |
| 完整可执行示例实际只定义 Check | 扩展 custom-check 的受管 region，包含 Definition、Run 与结果检查；教学代码不引入私有支持依赖。 |

本轮不合并为不同读者服务的 Gate/材料选择说明，不改历史 changelog，也不把 Finding waiver、JSON Schema 的可选教学扩充纳入实施。普通链接和说明修正不新增 Decision。

### Resulting Impacts

| 影响 | 处理与验证 |
| --- | --- |
| 入口摘要与领域规则可能漂移 | 每项修正定位完整定义 owner，核对摘要没有改变条件、例外或授权。 |
| 改动入口、标题或链接影响阅读路径 | 同步直接引用，并用相同任务复核到达 owner 的路径；必要时说明无须修改公开材料的理由。 |
| 实施与结项影响跨 Change 协调 | 保存最终全勾 Plan 后，以 finalize 预检和正常门禁退出当前集合，并移除协调视图中的本项引用；不保留完成态副本。 |
| 可能形成新的长期判断 | 仅在确有超出现有 Decision 的取舍时，按 `decision-records` 交接；本轮不建立或更改决策。 |
| 文档改动需要双重证据 | 文档检查按[交付验证](../../docs/navigation.md#交付验证)执行，Change 运行单项检查；协调视图另按其维护入口检查。任务走查与独立语义审查单独记录。 |
| 受管示例同步至指南和公开 JSDoc | 从源码 region 生成，不手改投影；运行投影、类型/工程与 installed docs/runtime 验收。无产品逻辑或新 public API 变化，schema 和 changelog 无需同步。 |

## Risks / Trade-offs

- 入口过细会重复规则，过薄可能隐藏前置约束；以任务能否在动作前找到必要信息裁决，而非只比较字数。
- 当前目录可读取，不代表其他代理环境一定取得相同文本；发现链接目标或 Skill 不可访问时，记录交付链路缺口，不以审查者已有知识补齐。
- 实施者熟悉 owner，容易高估可发现性；最终语义验收须有独立走查，自查不冒充独立证据。
- 本轮证据只支持已列出的局部修订，不能声称已证明普遍误路由、或能降低特定比例的阅读成本。

## Open Questions

无阻塞实施的开放问题。若验证发现超出当前责任分层或产品契约的变化，另行说明范围，不以文案调整隐含采用。

## Representative Tasks

下表是实施后的阅读复核任务与预期落点，不是已通过的测试结果。落点用于审查答案，不作为提示提前交给走查代理。
每项从 AGENTS 与任务描述出发，只沿实际可取得的入口继续读取；记录路径、答案所在文本、缺口和结论。

| 任务 | 必须恢复的信息 / 预期落点 |
| --- | --- |
| 修改 Project Definition 的公开配置行为 | 从导航同时找到 [API 机制](../../docs/api-mechanics.md)与 [Project Definition](../../docs/development/project-definition.md)，再进入编码规范、相邻实现与适用验证，不能只看内部实现说明。 |
| 修改 Project Gate 的 selection | 找到 [Workspace tooling](../../docs/tooling/workspace.md)和 [Project Gate](../../docs/tooling/project-gate.md)，区分仓库脚本入口与 Product API，以及局部检查与交付验收。 |
| 准备正式发布并提出创建 worktree | 找到 [Change 协调](../../docs/governance/change-coordination.md)与 [Package release](../../docs/tooling/package-release.md)，区分日常 `main` 与发布流程，并在副作用前识别所需授权；走查不执行这些动作。 |
| 恢复一个当前 Change，发现共享 owner | 找到 Change 查询入口、[知识治理](../../docs/governance/knowledge-maintenance.md)和协调规则，读取目标 artifacts 与相关活动 Decision，区分计划状态、依赖和本次授权。 |
| 新增或修改自动化测试 | 找到行为 owner、[测试策略](../../docs/testing/strategy.md)、[Case 维护](../../docs/testing/case-maintenance.md)及两个测试 Skill，区分测试设计、证据审查、最窄测试和全树闭合。 |
| 修改随包指南中的可执行示例 | 找到 [Documentation](../../docs/tooling/documentation.md) 的源文件与投影入口，以及导航中的文档验证；不直接修改受管投影，也不把内部维护说明当作用户可取得的材料。 |
| 新增领域 owner，或没有找到 owner 文档 | 从导航和知识治理确定路由维护位置，或按 AGENTS 退回近邻代码、测试、示例与当前请求并暴露假设；不复制完整规则到多个入口。 |
| 整理并提交本轮改动 | 在提交前找到 hook 启用状态、潜在 auto-push 与授权例外 owner；只回答流程，不执行提交。 |
| 编写并执行自定义 Check | 从回调指南进入公开片段，能恢复 Definition、run、预期失败结果及安全的输出配置，不依赖未发布的源码尾部。 |

通过要求是恢复任务所需的 owner、前置条件、授权与验证边界，并能给出文本依据；合理的多跳阅读本身不判失败。
证据记录留在本 Change：每项包含任务、起始材料、阅读路径、结论与限制。它不创建产品测试 Case、永久路由账本或新的规范 owner。

## Implementation Observations

- 本轮列出的局部修订、独立文档影响反查和受影响包材料验收已完成，实际证据与未覆盖边界见 [tasks](tasks.md#验收证据2026-10-27)。
- 自定义 Check 的公开片段使用默认严格 aggregation；固定输入仍得到原来的预期 `failed`，并显式检查 completed、aggregate、单项 outcome 与 deniedCount。输出关闭，片段不依赖内部 support 源码。
- 当前 owner 文档已承接规则和引用修正，长期责任分层未改变，无需新 Decision。任务全勾本身不授予提交、发布或删除权限；本轮按用户已确认的范围保存完成态并结项。
