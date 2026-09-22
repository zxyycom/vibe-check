# Proposal

让 Project Gate 使用 `repository-material` 的 changed-path facts，并以现有 flag DSL 选择可安全增量运行的材料 Checks。

## Why

Project Definition 已能从 `origin/main` 形成变更文件事实，也已提供 `changeFlag`、`all` 和 `any`。当前项目只用 `product-runtime`，材料 Checks 仍按静态 required/preset 运行，实际项目尚未验证第二类 region 的选择、回退和依赖闭包。

## Outcome

- Project Gate 同时拥有 `product-runtime` 与 `repository-material` 两类变更事实。
- 默认 required 路径按可信材料变化选择可增量 Checks；`--materials` 和 `--all` 保留明确的全量路径。
- change facts、effective flags、callback context 和 Check selection 来自同一次 Product preparation。
- Git evidence 不可用时保守选择并发布 unavailable evidence；不会伪造“无变化”。
- 继续使用现有 flag grammar 和 resolver；Check-ID CLI 另行评估。

## Scope

### Intended Change

在稳定的 [repository-material owner](../../docs/tooling/repository-material-validation.md) 所定义的 `materials` preset、Check identity 与输入边界上新增 `repository-material` region，冻结 include/exclude corpus，并在 Gate eligibility 中使用现有 `changeFlag`、`all`、`any` 和 `propagateDependsOn`。

### Resulting Impacts

修改 Project Definition、Gate eligibility、selection tests、Project Gate 文档和 Test Evidence Cases；材料 Checks 的默认执行量与 not-applicable facts 会改变，显式 preset/all、Product public DSL 和 dependency closure 保持原契约。

## Success Criteria

- region 的匹配范围、exclude-first、overlap、rename/delete 和 unavailable 行为由可重复 corpus 固定。
- changed、unchanged、zero-match、focused materials、all 和 runtime change 的 selection 矩阵通过测试。
- effective flags、`project.changes`、callback context、dependency closure 和 aggregate 保持一致。
- 目标测试、Test Evidence、材料校验和完整 Project Gate 通过。

## Affected Owners

- `/workspace/vibe-check/scripts/project/gate/definition.ts`
- `/workspace/vibe-check/scripts/project/gate/runtime/eligibility.ts`
- `/workspace/vibe-check/scripts/project/gate/runtime/catalog.ts`
- `/workspace/vibe-check/scripts/project/gate/definition.test.ts`
- `/workspace/vibe-check/src/project-definition/project-changes.ts`（contract 核对）
- `/workspace/vibe-check/docs/development/project-definition.md`
- `/workspace/vibe-check/docs/development/project-run.md`
- `/workspace/vibe-check/docs/tooling/project-gate.md`
