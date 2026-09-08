# Design

本设计以先恢复新版可读基线、再使用领域 rename 事务迁移标准 ID、最后删除历史集合的顺序保持每个治理 owner 可单独验证。

## Context

上游最新契约允许显式 legacy ID 作为迁移中间态，并为 Decision 与 Investigation 提供 `rename` 事务；正式 dated ID 分别由 `createdAt` 与 `formedAt` 的 UTC 日期派生。Change Plan 最新契约只发现 Change root 的直接当前成员，以 `complete` 删除完成计划，不再支持 `archive/`。当前仓库有 307 条 Decision、37 份 Investigation、5 个既有 active Change、131 个已完成 Change 目录，以及仅承载历史 OpenSpec 的 `archive/` 树。

## Goals / Non-Goals

**Goals**

- 保留每条治理记录的正文、状态、时间、分类和关系语义，只改变身份表示、source locator 和派生投影。
- 通过上游完整包与领域 CLI 完成迁移，不在 Skill 包内保存项目 fork。
- 删除用户明确指定的两类历史归档，并让当前文档不依赖被删历史才能解释现行规则。

**Non-Goals**

- 不重新解释、合并或删减 Decision / Investigation 的语义内容。
- 不实施或重排现有 5 个 active Change 的产品目标。
- 不创建历史归档替代物，也不重写 Git 历史。

## Decisions

### Intended Change

1. 先升级完整 Skill 包；通过确定性转换为既有记录补入 legacy `id`、移除 relation target 的 `.md` 后缀并重建新版索引，形成新版 CLI 可严格读取的中间基线。
2. 对每条 legacy Decision / Investigation 使用新版 `rename` 的 recorded-object 明确确认迁移到日期 ID；让事务同步全部关系、索引及 Investigation 资源链接和 owner 目录。迁移映射从权威时间字段计算并先检查冲突，不从文件时间或 Git 猜测。
3. 新增两条 active + aligned 长期 Decision，分别拥有 dated governance identity 方向与完成 Change / OpenSpec 不保留历史副本的方向，并用真实直接修订关系连接既有判断。
4. 删除 `changes/archive/` 和整个 `archive/`，修正当前文档中的 28 处直接路径依赖；现行事实只由代码、当前 owner、活动 Decision、Investigation 与 active Change 承接。
5. 项目 adapter 只适配新版公开类型，不复制新版 parser、索引或 rename 语义；所有包外说明按新版命令和完成模型更新。

### Resulting Impacts

- 迁移中间态与最终态分别运行严格治理检查；任一 rename 报告 `partial-or-unknown` 或 cleanup 未完成时停止后续 mutation 并按恢复手册对账。
- 大量身份变化将使 Decision/Investigation 间 Markdown 普通链接继续依赖语义 basename，而结构化关系与资源 owner 使用 dated ID；验证同时覆盖链接和领域索引。
- 删除历史证据后，仍在当前说明中保留的完成结论必须由现行 owner 或活动记录支撑，不能改成无依据断言。
- 当前迁移 Change 在所有任务完成后仍需按新版 `complete` 的独立删除授权处理；本次已获授权只覆盖既有归档和 OpenSpec 历史删除。

## Risks / Trade-offs

- 逐条领域 rename 会重复扫描完整集合，但能使用上游事务与恢复边界，优先于一次未经 owner 保护的批量最终改写。
- 删除 893 个历史文件不可从工作树恢复，但可由当前 Git `HEAD` 审计；执行前保持精确路径范围，绝不扩大到 `docs/decisions/archive`。
- 部分调查资源包含形成时复现说明，删除 Change harness 后只能作为历史描述保留；引用必须去链接化并明确其不再可执行。

## Open Questions

无。用户已明确授权 dated ID 迁移，并直接删除既有 Change archive 与全部历史 OpenSpec archive；迁移 Change 自身的最终 `complete` 删除授权仍独立保留。
