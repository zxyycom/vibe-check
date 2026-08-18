# Proposal

将 Vibe Check 的治理记录迁移到已更新上游 Skill 的当前契约，并把决策的旧 domain 分类转换为 tags。

## Why

更新后的 `decision-records` 与 `investigation-report` 不再接受当前仓库的派生索引格式。决策集合仍使用五个 domain 目录和 definition version 5，而新契约要求以稳定 basename 为 Decision ID、以 tags 分类、以根目录与 `archive/` 表达位置，并使用 definition version 6；调查索引也需要从 version 4 重建为 version 5。

## Outcome

所有既有决策保持内容、状态、对齐和演进含义，在新布局中可由最新 CLI 严格检查和查询；每条旧 domain 成为该记录的 tag，所有链接、项目适配器和治理文档指向新契约。调查主题不改写，派生索引由当前 CLI 重建并通过校验。

## Scope

- 迁移 `docs/decisions/` 的 114 条 Markdown、索引、关系目标、位置和分类表达，并删除旧 domain catalog。
- 增加记录这项长期分类选择的决策，更新受路径与 CLI 契约影响的项目文档、脚本适配器和链接。
- 用新版 `investigation-report` 重建 `docs/investigations/investigation-index.json`。
- 不改变产品 runtime、既有决策的实质内容或生命周期含义，也不改写调查报告正文。

## Success Criteria

- `bun run decisions:check` 与 `bun run decisions:list` 成功，索引为 definition version 6 且可按 tag 查询。
- 所有原决策均保留且只有原 domain 对应的 tag；关系、状态、alignment、创建时间和 Markdown 正文未丢失。
- `bun run investigations:check` 与 `bun run investigations:list` 成功，索引为 definition version 5。
- 链接、脚本类型与受影响的工作区验证通过，且没有 Git pending、提交或无关文件覆盖。

## Affected Owners

- `docs/decisions/` 的长期决策集合与 `scripts/decision-records.ts` 适配器。
- `docs/script-tooling.md`、`docs/decision-and-change-governance.md`、导航和引用旧决策路径的 Change artifacts。
- `docs/investigations/` 的派生索引，以及 `changes/migrate-governance-record-contracts/` 的交接与验证材料。
