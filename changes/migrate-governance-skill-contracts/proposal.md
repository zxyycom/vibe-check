# Proposal

本 Plan 将三套上游治理 Skill 升级到最新完整分发契约，并把项目治理数据与无历史归档的 Change 生命周期迁移到同一版本。

## Why

当前 `change-plan` 19、`decision-records` 36 和 `investigation-report` 25 已落后于上游 release。直接覆盖会使现有 Change archive、307 条 Decision、37 份 Investigation 与项目适配器失效；用户已明确授权完成身份迁移，并删除旧 Change 与 OpenSpec 归档。

## Outcome

项目使用最新版完整治理 Skill；Decision 与 Investigation 具有由形成日期派生的显式稳定 ID，关系、资源 owner、索引和项目适配器保持一致；已完成 Change 与历史 OpenSpec 不再保留，当前治理入口和完整 Gate 可验证通过。

## Scope

### Intended Change

- 将 `change-plan`、`decision-records`、`investigation-report` 通过各自 updater 升级到同一最新 release。
- 按 `createdAt` / `formedAt` 将全部既有 Decision 与 Investigation 从 basename identity 迁移为 `YYMMDD-<name>` 显式 ID，并同步关系、资源 owner、索引、引用与项目适配器。
- 删除整个 `changes/archive/` 和 `archive/` 历史树，不保留 Change 或 OpenSpec 历史副本；把仍有当前价值的引用改为稳定 owner 或当前事实表述。
- 更新 AGENTS、知识治理、Change 协调、导航与 tooling owner，使新建、完成、查询和验证流程与新版上游契约一致。

### Resulting Impacts

- 307 条 Decision、37 份 Investigation 的领域身份和派生索引发生一次性迁移；旧 basename 只保留为语义 name / source locator，不再作为正式 ID。
- 131 个已完成 Change 目录和完整历史 OpenSpec 树从版本控制删除，依赖它们的当前文档、调查和活动计划必须不再产生失效链接或把历史材料当作事实来源。
- Decision Records 项目 adapter 需要适配新版导出类型，治理 Gate、脚本类型检查及安全诊断投影必须保持闭合。
- 当前 5 个既有 active Change 保留，其 artifacts 按需去除已删除历史路径依赖，并继续通过新版 collection check。

## Success Criteria

- 三个 Skill 分别处于上游最新版本，包内文件无项目本地修改。
- 全部 Decision 和 Investigation 使用合法 dated ID；关系、资源链接/owner、sourcePath 与 schema v4 索引一致，严格检查通过。
- `changes/archive/`、`archive/` 与全部指向它们的本地链接均不存在；当前 Change collection 只包含有效直接成员。
- 项目治理文档、root commands、Decision Gate adapter、typecheck、lint、docs validation、test evidence 和完整 Project Gate 全部通过。

## Affected Owners

- `.codex/skills/{change-plan,decision-records,investigation-report}/`：完整上游分发单元。
- `docs/decisions/`、`docs/investigations/`：权威治理记录与派生索引。
- `changes/`、`archive/`：当前 Change 与已授权删除的历史集合。
- `AGENTS.md`、`docs/governance/**`、`docs/navigation.md`、`docs/tooling/workspace.md`：项目路由、生命周期和验证说明。
- `scripts/decision-records/command.ts` 及相邻 Gate adapter/tests：项目绑定与安全诊断投影。
