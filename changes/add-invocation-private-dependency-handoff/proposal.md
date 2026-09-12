# Proposal

本 Plan 为 direct `dependsOn` 增加 typed invocation-private handoff，使 provider 能在同一终态中分别交付可发布 facts 与保持 identity 的运行时引用。

## Why

现有 `dependencies.get(checkId)` 只返回经 canonicalize、detach 和 deep-freeze 的 final data；它适合 Core、RunResult 与 machine publication，却不能保留 `Map`、typed bytes、handle、callable 或 snapshot 的 identity。Release workflow 等场景因而只能重复构造对象，或借 Base64、临时文件、caller-global registry 建立第二套不受 dependency graph 管理的生命周期。

## Outcome

Provider 用 `handoff: defineCheckHandoff<T extends object>()` 声明 invocation-private 类型，并仅在 `passed` result 中返回 `handoff: T`。声明该 provider 为 direct `dependsOn` 的 consumer 可用 `dependencies.get(provider)` 一次取得 canonical `data` 与原始 `handoff` 引用；string `get(checkId)`、`list()` 和所有 Run publication surface 继续只处理 canonical facts。

## Scope

### Intended Change

- 增加 package-root `defineCheckHandoff<T extends object>()` 与 opaque `CheckHandoff<T>` marker；marker 是 same-package-runtime 识别的无配置 token，不执行 parser 或领域验证。
- 扩展 `CheckResult<FinalData, Handoff>` 与 `defineCheck` authoring matrix：声明 marker 的 executable provider 必须在 `passed` branch 返回同型非 null reference；ordinary provider 及所有非 `passed` branch 不得返回 handoff。
- 增加 `dependencies.get(provider)` overload。成功分支固定为 provider literal `checkId`、`status: "passed"`、canonical `data` 与 typed `handoff`；consumer 仍显式调用 provider `parseData` 恢复 canonical data 的业务类型。
- 每次 check execution 建立独立 private store；只有 terminal grammar 与 canonical settlement 都接受后才提交 marker/value，同一 Run 的 direct `dependsOn` fan-out 读取同一引用，并在 execution graph 关闭时无条件清空 store。

### Resulting Impacts

- `Check` / `CheckResult` generics、`defineCheck` overload、Definition closed grammar、normalization/materialization 与 terminal-result parser 必须同步，同时保护 ordinary Check、options/preflight 和 parser inference。
- Dependency reader 必须分别保留 effective `dependsOn` 与 `observes`：provider-object overload 只授权前者；string overload 与 `list()` 仍授权现有 direct union。
- Declarative snapshot/fingerprint、Core snapshot、RunResult、machine v4、progress、diagnostics、aggregation 与 cache 不得获得 marker、handoff 或 presence metadata；通过 owner seam 与代表性 publication 回归证明边界，而不是为每个无数据下游建立重复实现。
- Package-root exports/JSDoc、API/dependency/custom-Check guides、internal owner、changelog、Semantic Cases、public API inventory 和 external-consumer fixtures 必须同步。

## Success Criteria

- TypeScript 从 marker 推断精确 handoff 类型，并拒绝声明后 `passed` 缺失、类型不匹配、ordinary provider 多余 handoff，以及任何非 `passed` branch 携带 handoff；现有 `CheckResult<FinalData>` 与 `defineCheck` 用法保持 source compatible。
- Runtime 只接受当前 package runtime 创建的 genuine marker，以及非 null 的 object/function reference；marker 缺失、伪造、container 使用、branch/key 不合法、canonical settlement 拒绝或取消均不发布 partial handoff。
- Provider-object read 只对 effective direct `dependsOn` 成功，fan-out consumer 与 provider result `strictEqual`；`observes`、transitive、未声明、marker 不匹配和 repeated Run 均 fail closed，且不泄露 handoff。
- Provider-object success 仍返回 Core-owned canonical data；existing string `get` 的 shape/error codes、`list()` 的四态 observations 与 parser 调用方式完全不变。
- Store 在 completed、cancelled、admission-policy failure 和 invariant failure 路径都释放引用；该清空不是资源 disposer，文档把领域有效性、immutable observation 与真实资源 cleanup 明确归给 producer/caller。
- 目标类型/Definition/execution/publication 测试、Test Evidence、文档与 package material 校验、Product typecheck/lint、默认 Gate 和完整 `--all` Gate 全部通过。

## Affected Owners

- Public contract：`docs/api-mechanics.md`、`docs/guides/check-dependencies.md`、`docs/guides/extending-check-lifecycle.md` 与 `src/check/check.ts` JSDoc/package-root exports。
- Internal contract：`docs/development/{architecture,project-definition,project-run,check-results}.md`，Definition check-tree、check execution、terminal settlement 与 dependency reader。
- Publication/evidence：machine v4 与 diagnostic absence 回归、`docs/testing/cases/**`、package API projection/public inventory、external-consumer type/runtime/docs fixtures 和 `docs/changelog.md`。
- Decision handoff：完整方向成为 current fact 后，将 `260909-provide-invocation-private-dependency-handoff` 从 `active/unaligned` 标记为 `active/aligned`。
