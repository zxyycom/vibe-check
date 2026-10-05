# Design

本设计将已审阅的最小运行路径和多场景例子接入[正式指南](../../docs/guides/building-project-gate.md)、受管投影及安装包验收，并将 change region 的空排除改为可省略配置。

## Context

- [`README.md`](../../README.md) 已提供最小自定义 Check，并把使用者路由到 API、callback、dependency、output 和 scheduling 专题；这些专题拥有单项公开契约，但没有从质量目标到完整 Gate 的设计过程。
- [`structure-package-documentation-by-user-task`](../../docs/decisions/structure-package-documentation-by-user-task.md) 和 [`declare-document-audience-publication-and-contract-ownership`](../../docs/decisions/declare-document-audience-publication-and-contract-ownership.md) 已确定：README 是唯一总入口，独立用户任务可以形成随包专题；教程给出任务路径，精确规则仍由对应契约 owner 完整定义。
- Product 的公开入口是 package-root 程序化 API。项目入口负责 argv、help、preset 和 process exit mapping；指南在实施时只使用已经公开并验证的 Current 能力。
- [Gate 演进调查](../../docs/investigations/derive-gate-guide-scenarios-from-history.md)从 19 组历史素材提炼十类候选场景。当前正文按反馈收敛为基础说明与九个场景，其中诊断分为文本解析和既有结构映射；素材分类不固定最终章节、源文件或示例数量。
- 用户已认可正文结构并授权正式落地，同时明确要求 `changes.flags.*.exclude` 可省略；其它类似字段由[独立审计 Draft](../audit-public-authoring-optional-fields/proposal.md)调查，不预先授权批量放宽。

## Goals / Non-Goals

### Goals

- 从项目希望证明的质量结果出发，给出划分 Check、组成 Gate、运行和判断结果的推荐默认路径。
- 用各自适用的小例子解释 Check relations、resource constraints、flags、callbacks、aggregation 和 caller adapter 分别接管什么责任；共享讲解框架，保留场景间的真实差异。
- 让受管代码示例在当前 public package API 上通过独立运行或类型检查，并与最终 Markdown 精确同步。
- 为每项推荐说明适用条件和替代路径，使读者能按项目约束作出不同选择。

### Non-Goals

- 除 `changes.flags.*.exclude` 可省略外，不扩张其它 Product 配置，不新增 CLI、脚手架或 Gate runtime abstraction。
- 指南不以仓库私有 Project Gate 作为 consumer 模板，也不把尚未实现的方向描述成 Current 能力。
- 精确字段、失败语义和高级调度继续由 declarations 与现有专题拥有；指南只保留完成主路径需要的摘要和直接链接。

## Decisions

### Intended Change

1. 将已审阅正文迁入 `docs/guides/building-project-gate.md`，由 README 直接链接并登记随包映射；Change 不保留草稿副本。
2. 先用最小完整脚本展示 Check → Definition → Run → aggregate → caller exit，再按用户问题路由到独立场景。每节交代情境、选择理由、最小例子、预期结果与适用边界；相关场景可共享背景，但不强制拼成一个完整业务案例。
3. 每个机制都通过责任变化引入：独立质量结论拆为 Check，同一结论的机械步骤留在 execution；`dependsOn` / `observes` 表达结果关系，`mutex` / named resources 表达并发约束，flags 表达 selection preset，callbacks 承接其所在阶段的准备、执行、呈现或观察。
4. 已有脚本接入作为场景入口：先保留检查覆盖、必要顺序、参数、结果和诊断，再按独立质量结论重组。例子使用当前公开 API；历史源码和演进过程保留在调查材料中。
5. 十个代码片段各有独立示例来源与受管 region；真实 fixture、运行及结果断言在 region 外，投影仍只呈现任务用法。共用验收职责放入非投影 support 源，以同一显式名单纳入 consumer 复制和 fingerprint，并覆盖 required package-test selection。沿用现有 runner，不把示例或支持 `.ts` 额外随包分发。
6. 将新指南登记到 `docs/package-documents.json`，同步示例投影 registry、README、文档导航和 package/installed-consumer 材料验收。使用现有锁定 Node 类型材料验证新示例的 Node 标准库调用，保持隔离安装及精确 candidate 边界。
7. `ProjectChangeFlagRegion.exclude` 的 authoring 字段可省略，边界归一化为冻结空数组；内部使用必有 exclude 的 normalized region。自有 `undefined`、`null` 和错误类型仍拒绝，`include` 仍必填；省略与显式 `[]` 的 normalized selection/fingerprint 等价。
8. 完整 Gate 发现单页指南超过统一行数上限后，用户明确选择保留单页，并批准仅该文件 `code-lines` 的精确 waiver。保留实际测量和 Finding，不提高阈值、不删减教学或安全说明；例外与验证交给 Project Gate owner。
9. 新增材料使完整文档输入超过 Markdown Link 的默认 logical target-read 预算；按实测规模仅在 Gate caller 设置 `maxTargetReads: 1_500`，保持完整输入、其它安全限制和超限失败语义，不改变 Product defaults。

### Resulting Impacts

- README、随包 Markdown 映射、文档导航和链接闭合需要同步；package staging、tarball 与 installed copy 必须包含新指南的精确内容。
- 示例投影 registry 及其 runtime/typecheck evidence 需要覆盖完整案例，并继续拒绝 Markdown 与 source 漂移。
- 指南跨越多个公开 owner；每处摘要需要链接到完整契约，语义审查需要确认没有形成第二套 flags、resources、callbacks、aggregation 或 RunResult 规则。
- 这是使用方案变化，实施时需要分别审查公开用户路径与内部文档责任，并由非实施代理基于实际 diff 反查。
- change region 的公开声明、closed runtime grammar、内部消费类型、选择与 fingerprint 证据以及 owner 说明需要一致；系统可选字段审计只形成独立 Draft。

## Risks / Trade-offs

- 场景平铺可能增加阅读负担；用问题索引支持按需阅读，重复 setup 保留在明确的公共运行说明中。
- 共享背景可能掩盖差异；依赖与观察、选择与缓存、判定与诊断分别保留预期结果或反例。
- 代码数量与维护成本随场景增长；只为真实差异增加独立 source/region。高级 admission、simulation 和 learned scheduling 继续由独立专题承接。

## Open Questions

当前实施范围无待用户决定的阻断问题。保持单页九场景；测试输入一节用表格，其余片段接入受管来源。其它可选字段的采用方向待独立 Draft 审阅，不扩大本次实施。

## Implementation Observations

- 前期草稿的十个片段已做当前源码类型与 Node 运行核对，并按六项反馈完成独立语义审阅；这些证据不替代本轮的受管投影、optional exclude 与安装后验收。
- optional exclude 已通过锁定工具链下的 25 项 Definition/Git/lifecycle/API inventory 测试、Product/scripts typecheck、Product lint，以及 669 个实体 / 161 Cases 闭合；独立代理对该 API 与正式文档路由反查无实质阻断。
- 首次完整 Gate 的 exact candidate `0.0.0-local.fd367a36db68` 已通过 artifact、installed types、documentation 与 runtime 验收；43 项中 40 项通过，仍由三组示例重复、指南行数与链接读取预算阻断，不能据此宣称整体通过。证据位于 `.log/project-gate/2026-10-05T07-13-23.458Z-970621-30ac892b-7470-43b3-acc7-dd086896628c/`。
- 独立预算对照使用同一完整输入策略：HEAD `68a25bc` 为 280 个源 / 882 logical target reads，当前材料为 285 个源 / 1,011 reads；默认 1,000 在当前输入失败，而 Gate 的有限 1,500 配置通过且零 Finding。该调整不减少检查范围，也不放宽 Product 默认安全边界。
- 示例共用验收去重后保留十个独立教学 region，原重复检测四个区域均为零 Finding；锁定 Node 24.18 的十个源码运行、六组异常清理对照和 hostile ambient Git 目标隔离均通过。独立复核补齐了支持源的 required selection，七项选择回归及 670 个实体 / 161 Cases 闭合通过。
- 落地阶段通过 `bun run check -- --all`：exact local candidate `0.0.0-local.a0836f091807`，43 项全部通过，包括 artifact、installed types、全部受管文档示例及 runtime。指南 554 行的 Finding 按用户批准的精确 waiver 保留为非阻断；无其它新增豁免。该阶段证据位于 `.log/project-gate/2026-10-05T07-28-13.997Z-994964-be12897e-b2ef-46d3-ba2a-64c1735b692a/`。
- AI-ready 复核后补齐公共运行锚点与场景内引用，将测试输入一节收敛到触发、跳过和独立验收目的，并清理 package lifecycle / Project Gate owner 的迁移措辞；十个受管 TypeScript 片段逐字不变，安全边界保留。独立语义复核通过；exact local candidate `0.0.0-local.d0c87bf2967e` 的完整 Gate 再次 43/43 通过，含安装后文档示例验收。指南 560 行继续使用同一精确 waiver；本次仅有非阻断的 Check 耗时警告（mean 2,135.7ms、p95 6,094.8ms），未调整性能预算。证据位于 `.log/project-gate/2026-10-05T07-47-43.817Z-1008820-dfdb5383-60fa-4911-8a9c-19e6ae91bf39/`。
- 本轮执行与验证按 [tasks](tasks.md) 记录。用户已授权提交全部当前改动、执行仓库 hook 并结项本 Change；先提交完整 Plan 的可恢复 tree，再经 `finalize --preflight` 与 `finalize` 删除。独立可选字段审计保留 Draft；本次授权不包含 npm 发布或该 Draft 的产品实施。
