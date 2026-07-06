# Local Tool Contract Scope

## 适用范围

处理 CLI、local tool、adapter/service wrapper、machine-readable protocol、readable output、schema/example、identifier、pagination/continuation 或 error mapping 时读取本 reference。REST、GraphQL、TypeScript interface 和 component props 使用 `web-interface-patterns.md`。

## Contract Surfaces

- **Machine output / protocol**：request/response fields、envelope、error shape、pagination metadata、version 和 stable identifiers。
- **Readable output**：section framing、label、ordering、empty state、warning/error text、truncation hint 和 continuation instruction。
- **CLI surface**：command、flag、default、config lookup、exit code、stdout/stderr split、help/version behavior。
- **Adapter/service boundary**：format detection、routing、argument/result mapping、capability discovery、timeout/error mapping。
- **Identifier/ref/token**：owning layer 生成和解析；外层只校验存在性、类型、长度和边界，并原样传递。
- **Pagination/continuation**：page/cursor、limit、ordering、truncation indicator、resume instruction 和终止条件。
- **Schema/example/fixture**：用于校验或展示 observable behavior 的 source of truth。
- **Error mapping**：domain/service/tool error 到 machine code、exit code、readable message 和 logs 的一致映射。

## Ownership Rules

1. Core/router layer owns command routing、shared defaults、config lookup、capability selection 和 top-level error mapping。
2. Parser/adapter/service layer owns domain-specific parsing、lookup、identifier semantics、pagination result 和 direct behavior。
3. Machine output and readable output share business semantics, not transport wrappers or validation promises。
4. Schema、examples、fixtures、docs 和 tests that validate or display an observable change must be updated with the same work item。
5. Generated identifiers、continuation tokens 和 opaque refs 不应被 non-owning layer parse、rewrite 或 synthesize。

## Design Checks

- 新字段优先 optional；新 mode/command/section 优先 additive。
- Breaking change 必须写清 affected consumers、migration path、fallback/rollback 和验证更新。
- Sorting、pagination、error code、exit code 和 readable labels 要 deterministic。
- External input、tool output、browser output、logs 和 generated text 都是 untrusted data。
- Help text、examples 和 docs 中公开的命令行为必须与实现同步。

## Verification Scope

Choose the smallest repository-declared checks that prove the changed surface. Prefer commands from package scripts, repository docs, nearby tests, owner docs, or current agent instructions.

- Markdown-only skill/reference changes：run available Markdown shape/link checks, then diff/whitespace checks over changed files。
- Schema/example changes：run validation command documented beside the artifact。
- CLI/API or adapter/service boundary changes：run relevant smoke/integration checks covering command/request, output, error path and exit/status behavior。
- Cross-boundary changes：run workspace verifier when available, or record narrow checks and the reason wider verification was skipped。
