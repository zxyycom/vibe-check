# Proposal

本 Change 为现有 flag condition AST 补充直接导出的组合函数和字符串 atom 输入，使常见 TypeScript authoring 不再手写 `{ kind: "flag" }`，同时保留 raw AST 作为可序列化契约。

## Why

当前 DSL 已支持 `all`、`any`、`none`、`not-all`、`exactly-one` 与 `not`，但每个 atom 都必须展开为对象。公开示例因此暴露 normalization 使用的结构细节，简单组合也需要大量样板代码。

普通 caller flag 与 change-derived flag 在表达式中都只是完整 token；差异只在 change token 需要安全生成保留前缀。让字符串成为共同 atom，并让 `changeFlag(id)` 返回字符串，可以减少输入层级而不建立第二套求值语言。

## Outcome

Check author 可以用直接导出的 `all`、`any`、`none`、`notAll`、`exactlyOne` 与 `not` 组合字符串或嵌套条件，并用 `changeFlag(id)` 生成受保护 token。builder 只形成保留 child input 的 operator authoring node；语义等价的字符串、builder output 与 raw AST 均由唯一的 Definition normalization 形成同一个 canonical AST、fingerprint 和 evaluator input。

## Scope

### Intended Change

1. `when` 与递归 child 接受完整 flag token 字符串或现有 AST node；字符串规范化为 `{ kind: "flag", flag }`。
2. Package root 直接导出六个组合函数；它们接受非空多态参数、只形成保留 child input 的 operator authoring node，不增加 namespace 聚合或 `flag()`。
3. `changeFlag(id)` 返回带 `vibe-check:change:` 前缀的字符串 literal type，不建立 change-specific AST node。
4. Raw AST 与 legacy `{ flags, mode }` 保持合法；所有输入继续进入唯一 Definition normalization、selection 与 fingerprint。
5. Project Gate 和公开示例优先使用 builder，raw AST 留作序列化与生成器场景说明。

### Resulting Impacts

1. Public authoring types、Definition parser、root exports、JSDoc 与 fingerprint tests 增加 string atom grammar。
2. Builder runtime、类型验收和 installed consumer 需要证明直接导入、非空参数、嵌套与 change token literal type。
3. Gate、API example、指南、changelog、inventory 与 Semantic Cases同步主要使用路径。

## Success Criteria

1. 语义等价的单个 `when: "flag"`、raw AST 与 builder output 规范化为相同 canonical AST 与 fingerprint。
2. 六个组合函数接受字符串与嵌套条件，保持 child 顺序和 multiplicity；空参数在类型与运行边界均不形成合法 Definition。
3. `changeFlag("source")` 的值和类型均为 `vibe-check:change:source`，并继续受 Definition 声明引用与 caller Controls 保留前缀规则约束。
4. 不导出 `flag()` 或 builder namespace；使用方可以按普通 ESM 规则 alias 直接导出的重名函数。
5. 现有 raw AST、legacy shorthand、selection、dependency propagation、context 和 unavailable fallback 行为不变。
6. Gate 与随包可执行示例使用 builder 作为主要 authoring 形式，package artifact 和 external consumer 验收通过。

## Affected Owners

- [`docs/guides/extending-check-lifecycle.md`](../../docs/guides/extending-check-lifecycle.md)：字符串 atom、组合函数与 raw AST 边界。
- [`docs/development/project-definition.md`](../../docs/development/project-definition.md)：normalization 与 canonical identity。
- [`docs/tooling/project-gate.md`](../../docs/tooling/project-gate.md)：builder 的真实 repository consumer。
- [`docs/tooling/documentation.md`](../../docs/tooling/documentation.md)：API example projection 与 package material。
- [`docs/testing/cases/quality-runtime.md`](../../docs/testing/cases/quality-runtime.md) 与 [`docs/testing/cases/repository-tooling.md`](../../docs/testing/cases/repository-tooling.md)：产品、Gate 与 package evidence。
