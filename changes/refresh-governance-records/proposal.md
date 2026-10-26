# Proposal

本 Change 在保留前阶段治理记录维护交付的基础上，重新审阅 504 份当前 Decision 与 Investigation 正文的 AI-ready 可恢复性，并完成经逐条判断的编辑性整理与验收。

## Why

前阶段已对 Decision 与 Investigation 的分类、关系与正文进行专项维护；用户随后要求重新检查内容重心、负向表述、迁移残留、篇幅与 Markdown 样式。机械信号可用于分配复核注意力，但不能代替语义判断；调查报告仍只保存形成时认识，不按当前状态重验或覆盖。

## Outcome

504 项当前记录均已按五维 AI-ready 关注点完成逐条审阅；132 项正文调整经独立复核，372 项未改正文不声称独立全文复读。Decision/Investigation 索引同步、两套全量 strict check、fresh workspace/resource-tree mechanical validation、Change 单项/全集检查及 whitespace 验收均通过。历史调查的形成时边界得到保留；完整终验结果见 phase-two/validation/final-check/。

## Scope

### Intended Change

对当前索引中的 127 active Decision、251 archived Decision、126 Investigation 逐条复核：主承诺与正文重心、负向表达职责、迁移/历史信息位置、篇幅与段落、Markdown 样式一致性。仅按内容 owner 与现有依据实施编辑性维护；不将负向词计数、长度或格式统计视作缺陷规则，不把历史数字、术语或结论自动判作残留。

### Resulting Impacts

二阶段维护范围限于当前 Decision 与 Investigation 正文的表达/结构、`docs/governance/change-coordination.md` 中已授权的专项入口、Change artifacts，以及 `tmp/governance-ai-ready/` 的短期工作材料。记录 identity、lifecycle、alignment、createdAt/formedAt、tags、relations及资源保持不变；允许对既有 frontmatter title/question 作忠实的摘要性完善，本阶段仅两份 Investigation 的 question 发生此类变化。若复核发现需改变长期方向、状态、历史认识或扩大 owner 范围的实质问题，暂停并交回协调者，不自行扩权。独立审阅、索引同步与机械验证分别记录。必要 commit 已获授权，由 root 执行；不主动额外 push，但允许既有 hook 产生推送；Change finalize/delete 未获授权且不执行。

## Success Criteria

- 504 项身份/路径与基线及两阶段 ledger 逐项闭合；phase-one final SHA 与 phase-two before SHA 相等，phase-two final SHA 与当前正式源文件 hash 相等，并与最终索引路径及 Decision 状态/alignment 对齐；Investigation 索引不提供状态字段。异常单独报告，不被覆盖。
- 每项均有五维语义判断与处置结论；任何编辑保留原意、事实依据及历史认识边界，不以机械信号自动触发。
- 非实施者基于实际差异独立复核覆盖、编辑理由与边界；适用机械检查通过并与语义结果分开报告。
- 遵守版本保存与操作授权边界：必要 commit 已获授权、由 root 执行，实际提交与推送结果以 Git 记录和任务交付为准；不主动额外 push，允许既有 hook 产生推送；Change finalize/delete 未获授权且不执行。

## Affected Owners

`docs/decisions/`、`docs/investigations/` 及其正式索引；`docs/governance/change-coordination.md` 的专项范围入口；`ai-ready-docs` skill 与 principles 提供语义审阅方法；本 Change 负责计划与证据交接；`change-plan` skill 承接计划校验。历史报告只维持形成时认识，不触发重验。产品源码、测试、依赖与正式索引/知识 owner 规则不在正文编辑范围。
