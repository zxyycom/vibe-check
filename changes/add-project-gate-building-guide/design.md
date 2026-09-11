# Design

本设计以一篇任务级随包指南和可执行案例承接推荐用法，让读者先恢复完整构建路径，再按需进入迁移说明和各能力的契约 owner。

## Context

- [`README.md`](../../README.md) 已提供最小自定义 Check，并把使用者路由到 API、callback、dependency、output 和 scheduling 专题；这些专题拥有单项公开契约，但没有从质量目标到完整 Gate 的设计过程。
- [`structure-package-documentation-by-user-task`](../../docs/decisions/structure-package-documentation-by-user-task.md) 和 [`declare-document-audience-publication-and-contract-ownership`](../../docs/decisions/declare-document-audience-publication-and-contract-ownership.md) 已确定：README 是唯一总入口，独立用户任务可以形成随包专题；教程给出任务路径，精确规则仍由对应契约 owner 完整定义。
- Product 的公开入口是 package-root 程序化 API。项目入口负责 argv、help、preset 和 process exit mapping；指南在实施时只使用已经公开并验证的 Current 能力。

## Goals / Non-Goals

### Goals

- 从项目希望证明的质量结果出发，给出划分 Check、组成 Gate、运行和判断结果的推荐默认路径。
- 用同一案例解释 Check relations、resource constraints、flags、callbacks、aggregation 和 caller adapter 分别接管什么责任，以及重组前后哪些行为保持不变。
- 让受管代码示例在当前 public package API 上通过独立运行或类型检查，并与最终 Markdown 精确同步。
- 为每项推荐说明适用条件和替代路径，使读者能按项目约束作出不同选择。

### Non-Goals

- 本 Change 交付使用指南与示例，不新增 Product API、CLI、脚手架或 Gate runtime abstraction。
- 指南不以仓库私有 Project Gate 作为 consumer 模板，也不把尚未实现的方向描述成 Current 能力。
- 精确字段、失败语义和高级调度继续由 declarations 与现有专题拥有；指南只保留完成主路径需要的摘要和直接链接。

## Decisions

### Intended Change

1. 新增并随包发布 `docs/guides/building-project-gate.md`，以“从零构建项目 Gate”为主叙事；README 在任务阅读入口直接链接该指南。
2. 指南按一个稳定顺序组织推荐路径：确定 Gate 要证明的质量结果；按独立结算与复用边界划分 Check；用 relations 和 scheduling constraints 组成 Check 图；建立 Definition 并运行；读取 aggregation；最后由项目入口映射 argv、presets 和 process exit。
3. 每个机制都通过责任变化引入：独立质量结论拆为 Check，同一结论的机械步骤留在 execution；`dependsOn` / `observes` 表达结果关系，`mutex` / named resources 表达并发约束，flags 表达 selection preset，callbacks 承接其所在阶段的准备、执行、呈现或观察。
4. 迁移作为可选入口单独说明：先保留既有流程的检查覆盖、顺序、参数、结果和诊断，形成可比较基线；随后回到上述主路径，按质量结论重新划分责任并逐步验证等价性。过渡结构不是最终推荐架构。
5. 提供至少一个受管的完整 TypeScript example source，并只在能独立证明重组效果时增加阶段性 source 或 region。示例步骤说明采用理由、接管的责任、可观察变化和保留不变量。
6. 将新指南登记到 `docs/package-documents.json`，同步示例投影 registry、README、文档导航和 package/installed-consumer 材料验收。实施前重新核对 public exports 和相关 active Changes，只使用届时已对齐并验证的 Current API。

### Resulting Impacts

- README、随包 Markdown 映射、文档导航和链接闭合需要同步；package staging、tarball 与 installed copy 必须包含新指南的精确内容。
- 示例投影 registry 及其 runtime/typecheck evidence 需要覆盖完整案例，并继续拒绝 Markdown 与 source 漂移。
- 指南跨越多个公开 owner；每处摘要需要链接到完整契约，语义审查需要确认没有形成第二套 flags、resources、callbacks、aggregation 或 RunResult 规则。
- 这是使用方案变化，实施时需要分别审查公开用户路径与内部文档责任，并由非实施代理基于实际 diff 反查。

## Risks / Trade-offs

- 推荐案例可能被误读为固定架构；每项选择需要同时说明适用条件、替代方式和不变结果。
- 迁移基线会暂时保留粗粒度或串行结构；该章节必须明确进入主设计路径的重组出口与逐步验证方法。
- 完整案例与多个阶段性示例之间存在维护成本取舍；最终只保留能够独立证明关键行为差异的最少 source 和 projection。高级 admission、simulation 和 learned scheduling 继续由独立专题承接。

## Open Questions

- 示例应采用一个完整 source 配合局部演进片段，还是采用多个可独立运行的阶段性 source；选择需同时满足阅读连续性、无共享隐藏状态和独立验证。
- 完整案例需要覆盖哪些普通能力才能证明推荐路径，同时避免把低频高级能力带入主线；callback 只在案例中存在自然职责时加入。
