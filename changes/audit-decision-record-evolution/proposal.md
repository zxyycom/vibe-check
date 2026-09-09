# Proposal

本 Change 计划把升级后的 Decision Records 集合恢复为可验证、可准确回读的状态，并系统审计关系、生命周期边界、分类和文档交接质量。

## Why

`decision-records` v53 要求已建立记录保留非空 alignment，并支持在直接演进关系上保存摘要；起始集合仍有旧版空 alignment，且既有关系、记录边界与 tags 尚未按新能力完整复核。全量审计实施后，形成时报告仍保留“建议、受阻、未写入”等过程状态，并用大表重复逐项证据，容易让后续 AI 误读最终结果。

## Outcome

Decision 集合满足 v53 契约，能够从记录与索引恢复可信的 alignment、直接演进关系及其摘要；审计材料能直接区分形成时 baseline、最终状态、一次性例外与长期维护边界。

## Scope

### Intended Change

恢复 22 条旧 archived Decision 的可信 alignment 并重建 v11 索引；由独立 Terra 审计切面覆盖既有关系摘要、合并/拆分/演进/对齐判断和 tags，再由主代理核对并实施有充分依据且属于当前授权的最小修正。对现有 CLI 不能表达的 20 条闭合事件 summary，按用户一次性授权直接补入权威 frontmatter，不修改工具源码。最后按 `ai-ready-docs` 收敛本 Change 直接涉及的 skill、Decision 与交接材料。

### Resulting Impacts

Decision Markdown 与派生索引会发生变更；正常生命周期与关系维护仍使用 Decision CLI 事务入口，tags 与不改变采用方向的编辑性修正可在权威 Markdown 中完成后统一同步。一次性 summary 例外须保留明确实施证据，不成为长期规则。审计 Markdown 与 JSON 会区分 baseline、final 和实施路径。产品运行时、测试语义和 Investigation 集合不在修改范围，但项目 Gate 必须验证集成结果。

## Success Criteria

- 两个更新后的 skill 保持最新且结构有效。
- 所有已建立 Decision 具有可信的非空 alignment，v11 索引与来源一致。
- 既有直接演进关系的 summary、关系真实性、记录边界、alignment 与 tags 已完成全量审计；实施项均有正文或历史证据，未实施建议明确保留边界。
- 223 条直接关系均有非空 summary；一次性手工例外与 CLI 事务范围可独立复核。
- Decision 正文与审计材料不存在已确认的主线偏移、过期迁移状态或混乱 adopted-clause 样式；详细证据按需展开而不在 Markdown 重复全量清单。
- `bun run decisions -- check`、相关目标测试、类型检查与 `bun run check` 通过。

## Affected Owners

- `.codex/skills/decision-records/**` 的技能契约和 CLI。
- `docs/decisions/**` 的权威 Decision Markdown 与派生索引。
- `docs/governance/knowledge-maintenance.md` 与 `docs/navigation.md` 的治理入口（仅审查影响，除非实际行为说明需要同步）。
- `scripts/decision-records/command.ts` 与 Project Gate Decision adapter（验证，不预设修改）。
- `changes/audit-decision-record-evolution/**` 的当前 Change 交接与审计证据。
