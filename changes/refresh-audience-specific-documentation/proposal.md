# Proposal

本 Change 让用户能从随包文档完成深入扩展任务，同时保留维护者所需的设计解释，并让后续行为变更显式审查两类说明。

## Why

README 的调度进阶示例打断首次集成路径，单一深入页面的硬限制妨碍专题增长。内部设计与用户使用有真实不同的叙述责任，不能靠删除同主题文字消除同步问题。现有投影、指南清单与包内链接校验不能证明手写说明已跟随行为变化。

## Outcome

用户从 README 进入任务导向的生命周期扩展与调度专题；维护者保留内部设计理由，并能在每次变更验收中说明受影响用户文档、内部说明和对应验证。

## Scope

### Intended Change

重整 README、通用机制与显式随包专题，核对实际公开回调和深入用法；建立按受众审查文档影响的交付规则，演进不再适用的单篇深入文档限制。后续 AI-ready-docs 审阅纳入用户语义修正，并按维护职责整理内部文档目录、文件命名与长文拆分。

### Resulting Impacts

迁移示例自然 heading 投影和相对链接；扩展显式 package Markdown inventory、artifact 与 installed-consumer 验收；维护对应 Case 与文档工具根短命令。内部 owner 移动后同步导航和当前引用；保留历史证据原意，不改变 Product runtime、公开 API 或历史 Change。

## Success Criteria

用户专题说明适用场景、输入、回调作用、失败/取消边界与可执行用法；项目内设计说明不因同主题而删除。README 可直接找到各专题。投影、包材料、示例执行、链接、Case、Decision 与 Change 校验通过，并完成独立语义审查及全量 Gate。

## Affected Owners

README、API mechanics、Check 指南和新任务专题；文档导航、项目知识治理与 AGENTS 路由；package API documentation providers、artifact/candidate acceptance、Case、Decision 与本 Change。
