# Design

本设计以一个递归字符串-leaf AST 和一个 invocation-effective flag set 替代 authoring、normalized 与来源差异层。

## Context

当前 builder 已生成带字符串 child 的 operator node，但 Definition 随后将字符串转为 `{ kind: "flag" }`；因此 builder output 不是最终 AST。legacy `{ flags, mode }` 可由现有 builder 完整表达。Run 已将 caller 与 derived change tokens 合并用于 selection，却仍把 caller-only flags 投影给 callback。`ProjectChangeSource.kind` 只有 `git` 一个合法值，runtime 不存在 source dispatch；`compareWith` 实际作为 `${revision}...HEAD` 的 revision 参数交给 Git。

## Goals / Non-Goals

### Goals

1. 让公开类型、builder output、normalized condition 与 evaluator input 使用同一 AST。
2. 让 change flag 只在产生与保护边界特殊，注入后成为普通 effective flag。
3. 删除没有当前消费者价值的 compatibility 与 future-proofing 字段。

### Non-Goals

本 Change 不增加新的 condition operator、非 Git change provider、revision expression language、change evidence shape、caller prefix escape hatch 或第二套 callback flags。

## Decisions

### Intended Change

最终 AST 为：

```ts
type CheckFlagCondition =
  | string
  | {
      kind: "all" | "any" | "none" | "not-all" | "exactly-one";
      conditions: readonly [CheckFlagCondition, ...CheckFlagCondition[]];
    }
  | { kind: "not"; condition: CheckFlagCondition };
```

`all` / `any` / `none` / `notAll` / `exactlyOne` / `not` 返回同一类型；Definition 复制、验证、冻结而不改写 leaf。`enabledByFlags` 只接受 `{ when, propagateDependsOn? }`。raw JSON AST 使用相同字符串 leaf，不再保留 `{ kind: "flag" }`、input/canonical 双层类型或 shorthand normalization。

Run 在 change preparation 后形成唯一 `effectiveFlags = canonical(callerFlags ∪ derivedFlags)`。它既供 effective selection 使用，也进入每个 Check 的同一 frozen `project.flags`。`project.changes` 只承接文件与 unavailable evidence。protected prefix 的 caller rejection 属于 Controls；condition 中 protected token 到 declared region 的交叉引用属于 Definition；两者都不进入通用 AST evaluator。

`changes.source` 保留 Git acquisition 的 closed configuration object，但删除单值 `kind`，完整形状为 `{ compareWith: string }`；它不选择 provider。Definition validation 继续拒绝 empty、leading-dash 与 U+0000；Git runtime 决定 revision 是否可解析。committed comparison 使用 `<revision>...HEAD`，再合并 staged、unstaged、untracked。branch、hash、relative revision 与 tag 都是同一个 `compareWith` field 的 revision values，不形成不同配置类型。

### Resulting Impacts

| Owner | Required result | Evidence |
| --- | --- | --- |
| Check API / Definition | 单一 AST、无 shorthand、closed recursive validation | type/normalization/fingerprint tests |
| Project Run | selection 与 callbacks 共享 effective flags | lifecycle/context tests |
| Git changes | 无 source kind、revision forms 与 conservative failure | real repository fixtures |
| Gate / package | 无旧 grammar 的真实 consumer | Gate + installed type/runtime acceptance |
| Docs / Decisions / Cases | 当前契约、演进理由与证据映射一致；guide/Definition/Run 分别拥有 public grammar、normalization、invocation flow | semantic review + docs validation + Test Evidence |

### Documentation ownership

AI 或 author 需要恢复当前契约时，按问题而非历史叙述读取下列 owner；Change artifact 只说明这次同步范围，不取代它们：

| 需要回答的问题 | 权威 owner | 可核对材料 |
| --- | --- | --- |
| `when` AST、builders、propagation 和 callback 的 authoring boundary | `docs/guides/extending-check-lifecycle.md` | executable `docs/examples/package-api/project-changes.ts` |
| closed grammar、freeze/fingerprint、protected change-token reference | `docs/development/project-definition.md` | Definition/condition tests 与 `WB-PROJECT-DEFINITION-FLAG-ENABLEMENT-001` |
| `caller flags → Git evidence → derived flags → effective project.flags` 的 invocation flow | `docs/development/project-run.md` | Git/change lifecycle tests 与 `WB-RUNTIME-CHECK-CATALOG-001` |
| Gate 如何作为真实 consumer 使用最终 AST 和 effective selection | `docs/tooling/project-gate.md` | Gate definition tests 与 `AUX-PROJECT-GATE-CATALOG-001` |
| upgrade impact | `docs/changelog.md` | public inventory、installed external type/runtime acceptance |

## Risks / Trade-offs

- 删除已提交但尚未进入公开 release tag 的 shorthand、flag node 与 source kind 是 breaking source change；当前目标选择在下一 release 前收敛，而不是维护无独立价值的双 grammar。
- canonical fingerprint 的 leaf representation 会改变；同一 revision 内所有 Definition normalization 与 consumers 同步迁移，不承诺复用旧 local candidate/cache identity。
- `project.flags` 新增 derived tokens 是有意的 callback behavior change；需要证明可信、零命中与 unavailable 三种 change preparation 结果。

## Open Questions

无。字符串 leaf、删除 shorthand、effective callback flags、Git-only source shape 与 revision范围已由当前请求确认。
