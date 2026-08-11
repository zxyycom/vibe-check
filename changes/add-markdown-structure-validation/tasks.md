# Tasks

任务按共同 Markdown document事实、Structure Check政策、records和跨入口证据顺序实施。

## Readiness

- [x] 0.1 已将 proposal、design和tasks核对为“GFM structure measurements + independent policy violations”，并按活动决策统一使用 QualityRecord、CheckResult和 Project Definition。
- [x] 0.2 已核对当前 docs owners、`src/product/**`、四个基础 Changes及 Markdown link共用需求；共同 parser只拥有格式事实，Structure owner保持唯一。
- [x] 0.3 已固定 GFM/prose语义、单位、十六个 policy leaves、四个 record types、subject identity、neutral behavior、comparison/cache和完整验收；没有阻塞实施的问题。

## Implementation

- [ ] 1.1 在基础 ports可用后，注册 `markdown-structure-validation` CheckDefinition、四个 record types、private binding、neutral built-in reference及 owner-validated base/file policy；不建立平行 identity或policy入口。
- [ ] 1.2 按测试证据流程先建立 GFM/front matter/code/table/list/Unicode/source-span失败证据，再建立唯一 Product-owned Markdown document boundary并输出 normalized headings、paragraphs、visible text、link facts和locations，供 Link Change下游复用。
- [ ] 1.3 实现 document/section/paragraph prose projection、semantic subject identities、words/characters measurements、四类 heading规则和 twelve size rules，并投影 closed measurement/violation records与 CheckResult。
- [ ] 1.4 接入 per-file static TaskPlan、acknowledgement、resource budgets、violation named-reference matching和 single-document cache；Task/parser identity不得进入 public contract。
- [ ] 1.5 同步 Architecture、Configuration、Scan Scope、Output、Project Definition starter、测试 Cases、canonical Check/Record materials和正式 consumer docs。

## Verification

- [ ] 2.1 运行最窄 parser、projection、policy、record catalog/identity、TaskPlan、comparison/cache和正式 CLI tests；覆盖 GFM extensions、front matter、tables/lists/code、Unicode、empty/no-heading、duplicate headings、所有阈值边界与heading组合。
- [ ] 2.2 运行 `bun run test-evidence:check`、product import/typecheck/lint/tests、`bun run validate`和`bun run verify:vibe-check-workspace:required`，修复范围内失败。
- [ ] 2.3 用空行移动、重复 section插入、超大/deep document和 Structure/Link同时启用 fixtures复核 identity、资源预算、单 parser owner和无 backend泄漏；确认 Success Criteria与owner同步后再评估 lifecycle，未经授权不归档。
