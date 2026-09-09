# AI-Ready Docs 复审

本复审按 `ai-ready-docs` 的消费契约、主承诺、信息恢复、owner、语义保真与可验证性原则，检查本 Change 直接涉及的两个 skill、Decision 集合和审计交接材料。

## 消费契约

| 文档组 | 目标 AI 与实际文本 | 预期任务 | 可观察结果 |
| --- | --- | --- | --- |
| `decision-records` / `investigation-report` | Codex 从 `SKILL.md` 按读取路径取得相邻契约、恢复手册、Schema 和 CLI help | 选择正确查询或维护动作，并区分语义判断、授权、来源、索引和事务结果 | 不把索引当来源、不把机械通过当语义证明，维护后运行对应严格检查 |
| `docs/decisions/**/*.md` | agent 通过 list/search/show 定位后读取权威 Markdown；索引是派生查询视图 | 恢复采用方向、理由、适用边界、alignment 和直接演进关系 | 能从每条记录的摘要、三节正文和 relation summary 得到一致结论 |
| `changes/audit-decision-record-evolution/**` | 当前 Change 的实施者或审阅者直接读取固定 artifacts、审计报告与 JSON 证据 | 判断本轮改变、形成时 baseline、最终状态、例外路径和验证边界 | 不再把已实施项误读为建议、受阻项或未来工具工作 |

## 发现与处理

### 1. 审计材料重心偏移与状态残留

原关系和 tags 报告分别用 223 行与 316 行重复逐项证据，正文重心落在形成时建议；实施完成后仍出现“受阻”“等待工具扩展”“未运行写入”等过期状态。AI 需要跨越报告尾部和索引才能恢复当前结论。

处理结果：

- `relationship-audit.md` 从 322 行收敛为 71 行，按“结论—覆盖—实施路径—保持边界—验证”组织。
- `tag-audit.md` 从 414 行收敛为 68 行，保留 taxonomy、13 项实际变化和未扩张边界，删除 303 条重复 keep 行。
- `lifecycle-audit.md` 从 88 行收敛为 56 行，把已执行的 mark-aligned 与最终 108/2 active alignment 状态放在主线。
- 逐项关系与 tags 证据保留在 JSON；字段改为 `baseline*`、`final*` 和显式 `implementation`，避免把形成时 `current*` 或 `review-only` 误读为当前状态。

### 2. Decision Markdown 样式不一致

39 份记录的 191 个决策条目使用全角 `采用：`，其余条目和正式模板使用 `采用:`；另有一处 `采用:` 后缺空格。虽然现有 parser 可以识别，但混用会削弱固定三节正文的局部一致性。

处理结果：全部采用条目统一为 `- 采用: `，未改变条目内容、顺序、frontmatter 或采用方向。所有 316 份记录仍严格符合固定章节结构。

### 3. 过长的单一语义单元

扫描发现 4 份记录含 5 行超过 600 字符的 adopted clause，另有 5 份记录含 7 行超过 500 字符。单行同时承担多个对象、条件和例外，增加跨从句恢复成本。

处理结果：按原有句子边界拆成同级 adopted clauses，保留对象、条件、例外和顺序；一段非列表正文拆成三个连续段落。当前 Decision 最长文件 63 行，最长物理行 500 字符；没有为追求固定行宽机械改写其余精确契约。

### 4. 负向描述

两个 skill 的负向措辞集中在安全、权限、索引权威性、事务恢复和失败语义；Decision 中的“不发布”“不得泄漏”“不自动授权”等内容定义了受保护对象或闭合契约。它们与正向目标和验收条件共同出现，不属于无目标的禁止清单。

处理结果：保留会改变行为或风险边界的否定条件；拆分超长条目时保留原有否定条件，并把不同对象或验收边界独立成条目；没有把精确 fail-closed、权限或兼容性约束改成模糊正向愿望。

### 5. 迁移与历史内容

- skill 中的 legacy ID 与 `migration-required` 是当前可执行兼容契约，不是已退出的迁移说明。
- archived Decision 的历史判断和 alignment 是长期演进证据，不是普通文档残留。
- active 的 OpenSpec 删除政策、prestable hard-cut 和兼容性边界仍约束当前治理或发布方式。

处理结果：保留上述 owner 内容；删除或改写的迁移残留只限于本 Change 审计报告中过期的实施状态和未来 CLI 扩展建议。一次性手工 summary 例外在关系报告与设计中明确标为本轮实施事实，不升级成长期维护规则。

## 未修改的 Skill 结论

`decision-records` v53 与 `investigation-report` v43 的入口承诺、读取路径、工作流和参考 owner 一致：入口文件负责触发与动作选择，详细契约和恢复路径按需展开。两个 skill 的篇幅分别为 119 行和 137 行；最长参考文件分别为 228 行和 288 行。没有发现需要项目本地偏离上游分发内容的重心、层级或 Markdown 缺陷，因此本复审不手工改写 skill 文件。

## 语义保真与残余边界

- 本轮 Decision 正文编辑只统一 marker、拆分长语义单元和补一个中英文空格；记录 ID、status、alignment、createdAt、摘要字段、tags、relation type/target 与采用含义不因这些编辑改变。
- relation summary 的 20 条手工写入是用户明确授权的一次性绕过；严格检查证明最终集合合法，但不证明发生了 CLI relation transaction。
- 500 字符上限不是项目契约；它只作为本次定位极端密度的审阅阈值。其余较长条目保留，是为了避免在没有领域 owner 新判断时重写精确规格。
- JSON 是可追溯的 Change 证据，不取代权威 Decision Markdown 或索引生成关系。

## 代表性使用验证

1. 从关系报告开头即可恢复 223/223 summary 完成、203 条 CLI 写入、20 条一次性手工写入及其边界，无需读取形成时过程叙述。
2. 从 tags 报告可恢复 9 项 taxonomy、13 项具体增加和 303 项不变；需要逐项前后值时再读取 JSON。
3. 从生命周期报告可恢复当前 108 aligned / 2 unaligned active 状态、唯一已执行变化及两条保留条件。
4. 从任一 Decision 的 frontmatter 与三个固定正文节可恢复摘要和完整方向；所有 adopted clause 使用相同 marker。

## 验证结果

- `bun run decisions -- check`：316 条通过；active 110（108 aligned / 2 unaligned），archived 206。
- `bun run investigations`：41/41 通过。
- 两个更新后 skill 的 `quick_validate.py`：通过。
- `bun test` 的 secret-detection 与 native-projections 目标测试：10/10 通过。
- `bun run typecheck`、`git diff --check` 与 Change Plan 检查：通过。
- `bun run check`：31 项通过、0 失败、5 项因 selection 不适用。
