# Design

以当前正式索引和上一阶段终态 ledger 为覆盖基线，先生成只读机械信号与分区清单，再由语义审阅者逐条判断五维问题并按需编辑，最后独立复核和分层验收。

## Context

工作区基线为 `main`、HEAD `9a5be25bf02886e5271b96b31da35ae98c3ca680`；已有上一阶段未提交记录维护改动。上一阶段 ledger 含504项，二阶段开始时索引为378 Decision（127 active、251 archived）和126 Investigation；504项均与第一阶段终态ledger闭合。二阶段结束时当前索引已由公开入口同步；Decision 全量 check 378项通过、Investigation 全量 check 126项且索引 current。独立 reviewer 对504项 before/current SHA 和五份 stage patch 的内存应用结果全部核对一致；其coverage区分61篇完整正文/实际差异、71篇纯空行、372篇字节未变。fresh final workspace/resource-tree validator 已 pass：504项身份、路径、保护字段及phase hashes闭合，974资源owner树与HEAD一致；validator采集时cached为空且无越界（其后root开始必要的版本保存准备）；全部指定命令exit 0，具体证据见phase-two/validation/final-check/。历史调查只保留形成时认识，不按当前情况重验或覆盖。

五维审阅按 AI-ready skill 的用途执行：1) 文档承诺与内容重心；2) 负向表述承担的是必要安全/契约边界还是重复/过时排除；3) 迁移、历史与坏例子对当前主线或参考区的作用；4) 篇幅、段落与信息分层是否妨碍定位；5) Markdown 标题、表格、列表与局部结构是否清晰一致。长度、否定词、标题空行、列表混用等统计只是注意力线索；不作为自动判错、删除或格式强制规则，历史事实/旧术语也不自动算迁移残留。

## Goals / Non-Goals

目标是让 AI 能从每份记录恢复其用途、判断、适用范围和形成时边界，并使必要内容易于定位；只进行有依据的表达、组织和 Markdown 编辑。
不目标：重验历史调查的结论/外部事实，不改变记录 identity、lifecycle、alignment、dates、tags、relations、索引规则或治理 owner；title/question 可按既有含义作摘要性完善，本阶段仅两份 Investigation question 实际变化。不改产品实现、测试、依赖与 hooks。必要 commit 已获用户授权由root保存；不主动额外 push，但接受既有 hook 的推送副作用；不 finalize/delete Change。

## Decisions

### Intended Change

本 Change 保留两个阶段的证据边界：第一阶段治理交付由原 review ledger/summary/review 保持历史快照；第二阶段以阶段前 inventory 为基线，五个分区对504项逐条完成五维审阅。132项正文差异按需编辑，独立 reviewer 关闭R1/R2/R3并核验before→final；372篇未改不声称独立全文复读。机械结果不授权批量格式化；可能改变长期判断、记录生命周期、历史结论或范围的事项交协调者决定。索引同步、两种记录全量 strict check、fresh mechanical validator、Change check/check-all及whitespace验收均已通过。必要commit已获授权但尚待root执行；不把其标作已完成。

### Resulting Impacts

忽略目录 `tmp/governance-ai-ready/` 保存二阶段工作输入与可重建材料；504项phase-two ledger、before→final stage patch、独立review/coverage/final-verification、索引同步和fresh终验命令证据均持久位于 Change 的 `phase-two/`。既有 `review-ledger.json` 与第一阶段 `review/` 证据未改；`review-summary.md` 仅标明其第一阶段快照身份并链接二阶段摘要。正式知识内容由各自 Decision/Investigation owner 承接。fresh mechanical validator 通过；必要commit授权有效但尚未由root执行，hook可产生推送；不主动额外push，finalize/delete未获授权。

## Risks / Trade-offs

机械关键词会命中合法的禁止条款、历史术语和形成时结论；长度会受表格/示例等结构影响；结构信号可能是契约要求。降低风险的方法是逐篇恢复用途与当前语境，编辑理由关联实际问题，独立审阅按 diff 反查；不能确认时保留并升级，不自动简化。

## Open Questions

没有待解决的设计选择。Fresh mechanical validator 与Change全量验收均通过；提交由root在已授权范围内执行。若后续操作发现会改变长期方向、记录lifecycle、历史事实或授权范围的问题，暂停并交协调者，不作为编辑性整理自行决定。
