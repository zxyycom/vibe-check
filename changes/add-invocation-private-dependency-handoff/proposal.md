# Proposal

本 Plan 为 direct Check dependency 增加 typed invocation-private handoff，让同一 provider 分别交付可发布 facts 与保持 identity 的原始对象。

## Why

`dependencies.get(checkId)` 只返回经 canonicalize、detach 和 deep-freeze 的 final data，无法承载 `Map`、文件字节、handle 或需保持 identity 的 snapshot。Release workflow 等场景需要 direct dependent 复用 provider 已验证的同一对象，而不是通过 Base64、临时文件或 caller-global registry 建立第二套生命周期。

## Outcome

Provider 用 `defineCheckHandoff<T extends object>()` 声明 handoff 类型，并仅在 `passed` result 中交付原始对象；direct `dependsOn` consumer 通过 provider-aware read 获得同一引用。Canonical `data` 仍是唯一可发布边界，handoff 仅存在于单次 Run 且无需 parser。

## Scope

### Intended Change

- 增加只关联 TypeScript 类型的 `defineCheckHandoff<T extends object>()` marker，并让 typed `defineCheck`、`CheckResult` 与 provider-aware dependency read 共享其泛型。
- Provider 在 `passed` result 中交付声明类型的非空 object；Product 在 canonical settlement 成功后才向 direct `dependsOn` consumer 发布该引用。
- `dependencies.get(provider)` 返回 canonical data 与 typed handoff；string `get(checkId)` 和 `list()` 保持 canonical-only。
- 每次 Run 使用独立的 private store。Product 管理授权与生命周期，producer 管理 opaque object 的领域有效性、immutable observation 和资源清理。

### Resulting Impacts

- `Check`、`CheckResult`、`defineCheck` overload、Definition validation 与 dependency reader 需要同步，同时保持 ordinary Check、parser inference 和 string read 兼容。
- Check execution 在 settlement seam 增加 private store；failure、cancellation、fan-out、relation authorization、repeated Run 与 terminal cleanup 需要证据。
- Package-root exports、dependency 指南、JSDoc、declarations 和 installed-consumer fixtures 需要增加 handoff authoring 与 readback 说明。
- Core snapshot、RunResult、machine v4、diagnostics、declarative snapshot、fingerprint 和 cache 保持 canonical-only，并以回归证明没有新增字段。

## Success Criteria

- TypeScript 推断 marker 泛型，并拒绝 handoff 类型不匹配、声明后缺失及未声明时返回。
- Runtime 仅在 genuine marker、非空 object、provider `passed` 且 canonical settlement 成功时发布 handoff。
- Direct `dependsOn` fan-out consumers 获得与 provider result `strictEqual` 的引用；其他 relation 和其他 Run 不可读取。
- String `get`、`list` 及全部 publication surfaces 保持 handoff-free 和现有兼容行为。
- 文档明确 marker 不执行 runtime domain validation，producer 对 object validity、immutable observation 与 cleanup 负责。
- Test Evidence、目标测试、docs/package validation、Product checks、默认 Gate 与 `--all` Gate 全部通过。

## Affected Owners

- Public contract：`docs/api-mechanics.md`、dependency/custom-Check guides，以及 Definition/Run/architecture/check-results owners。
- Product implementation：`src/check/**`、Definition normalization、Run execution、settlement 与 `src/index.ts`。
- Evidence/package material：相关 Semantic Cases、package API projection、external-consumer fixtures 与 changelog。
