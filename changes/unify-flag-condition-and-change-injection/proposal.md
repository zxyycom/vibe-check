# Proposal

本 Change 将 flag condition、change flag 注入与 callback 可见集合收敛为同一个字符串 flag 模型，并删除尚未发布的重复 authoring grammar。

## Why

当前实现同时存在字符串 authoring leaf、`{ kind: "flag" }` normalized leaf、`CheckFlagConditionInput` 与 `CheckFlagCondition` 两层类型，以及可由 builder 完整替代的 `{ flags, mode }` shorthand。change-derived flag 已与 caller flag 一起驱动 selection，却没有进入 callback 的 `project.flags`；唯一 Git source 还携带没有真实分派作用的 `kind: "git"`。这些差异增加了 API、normalization 与文档成本，但没有增加用户能力。

## Outcome

字符串成为唯一 flag leaf，builder 直接生成正式递归 AST；caller 与 change-derived token 在注入后形成同一个 effective flag set，并同时驱动 selection 与 callback context。change acquisition 仍是 Git-only Product behavior，但 source configuration 不再暴露虚假的 kind；`compareWith` 明确接受安全且可解析的 Git revision。

## Scope

### Intended Change

1. 将 `CheckFlagCondition` 定义为字符串 leaf 或六种 operator node；builder 直接返回该 AST，删除 `{ kind: "flag" }` 与 `CheckFlagConditionInput`。
2. 删除 `enabledByFlags` 的 `{ flags, mode }` shorthand 与 `CheckFlagEnablementMode`，只保留 `{ when, propagateDependsOn? }`。
3. change preparation 将 derived tokens 与 caller tokens 合成唯一 canonical effective flags；同一集合用于 predicate evaluation 和 `project.flags`，AST/evaluator/callback 不解释 token 来源。
4. change flag 的特殊责任仅保留在 producer 与 protection boundary：内置派生、reserved prefix、declared producer reference 和 unavailable conservative injection；`project.changes` 继续单独提供 evidence。
5. 删除唯一 Git source 上没有分派价值的 `kind: "git"`；保留 `source.compareWith` 并明确 branch、commit hash、relative revision 与 tag 都是合法 Git revision 候选。

### Resulting Impacts

1. Definition parser、fingerprint、change-reference validation、condition evaluator、Run invocation context 与相关类型需要同步单一 AST/effective-flags 数据流。
2. 仓库 Gate、Checks、fixtures 与测试中的 legacy shorthand/raw flag node/source kind 需要迁移，不能留下兼容双读。
3. Package root inventory、installed type/runtime acceptance、公开示例、指南、内部 owner、changelog 与 Semantic Cases需要反映删除后的精确 API。
4. 已采用方向发生实质修订，需要用新的 active Decision 保留 string-leaf/effective-flags 与 Git-specific source simplification 的长期判断。

## Success Criteria

1. `when: "flag"` 与任意 builder 只产生字符串 leaf 的同一 AST；Definition validation/normalization 保持 child 顺序与 multiplicity，并在 fingerprint 中保留同一结构。
2. Public package 不再导出 `CheckFlagConditionInput`、`CheckFlagEnablementMode`，也不接受 `{ kind: "flag" }` 或 `{ flags, mode }`。
3. change-derived token 注入后与 caller token 一起去重、排序、冻结；selection、`prepare`、`execute` 观察同一 `project.flags`，unavailable fallback 同样包含保守注入的全部 declared change flags。
4. AST evaluator 不包含 change-specific 分支；unknown protected token 由 Definition producer-reference validation 拒绝，caller reserved-prefix controls 继续失败。
5. `changes.source` 的完整形状是 `{ compareWith }`；真实 Git fixture 覆盖 branch、commit hash、`HEAD~N` 与 tag revision。无效 revision 保持 unavailable conservative behavior。
6. Gate 与 package external consumers 使用最终 API，raw JSON AST 与 builder output 同构，完整 repository Gate 通过。

## Affected Owners

- [`docs/guides/extending-check-lifecycle.md`](../../docs/guides/extending-check-lifecycle.md)：最终 flag condition 与 callback authoring contract。
- [`docs/development/project-definition.md`](../../docs/development/project-definition.md)：AST validation、normalization、fingerprint 与 protected reference。
- [`docs/development/project-run.md`](../../docs/development/project-run.md)：effective flags、Git acquisition 与 callback projection。
- [`docs/tooling/project-gate.md`](../../docs/tooling/project-gate.md)：repository consumer 与 selection evidence。
- [`docs/examples/package-api/project-changes.ts`](../../docs/examples/package-api/project-changes.ts)：executable public example；其 package API projection 只能经 `bun run docs:api:write` 更新。
- [`docs/changelog.md`](../../docs/changelog.md)：released API migration boundary。
- [`docs/testing/cases/scan-configuration.md`](../../docs/testing/cases/scan-configuration.md)、[`docs/testing/cases/quality-runtime.md`](../../docs/testing/cases/quality-runtime.md) 与 [`docs/testing/cases/repository-tooling.md`](../../docs/testing/cases/repository-tooling.md)：Definition、Run、Git、Gate 与 package evidence。
