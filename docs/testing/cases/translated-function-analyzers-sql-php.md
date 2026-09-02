# translated-function-analyzers-sql-php

## Case FM-ANALYZER-READERS-F-001: PHP 与 PL/SQL reader 保持 Lizard 1.23 直接函数指标

Owner: `docs/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/function-metrics/analyzer/readers/php-plsql.test.ts|PHP and PL/SQL readers preserve every checked-in suffix and edge fixture`
- `bun|src/package-checks/function-metrics/analyzer/readers/php-plsql.test.ts|PHP preserves code blocks, namespace/use skipping, traits, closures, arrow suppression, and conditions`
- `bun|src/package-checks/function-metrics/analyzer/readers/php-plsql.test.ts|PL/SQL preserves package procedures/functions/nesting/exception/control flow/parameters and triggers`

Proves:

- PHP 的 `php` 和 PL/SQL 的六个当前 suffix 对 Lizard 1.23 normal/edge oracle fixture 给出相同 function name、range、NLOC、CCN 与 parameter count。
- PHP 保留 code-block tokenizer、namespace/use 的 source state、class/trait 方法、closure assignment、arrow-function omission 和 condition 的直接观察；PL/SQL 保留 package、procedure/function/trigger、nested declaration、exception、compound END、loop/control-flow 和 parameter 形状。
- 这些实体仅证明显式 reader 的 in-memory 行为；reader registry、Check integration、资源/取消约束和 Lizard runtime hard cut 仍是独立边界。

## Case FM-ANALYZER-READER-REGISTRY-001: reader registry 保持 Lizard 1.23 顺序与 suffix 选择

Owner: `docs/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/function-metrics/analyzer/reader-registry.test.ts|reader registry retains the 27-reader Lizard source order`
- `bun|src/package-checks/function-metrics/analyzer/reader-registry.test.ts|reader registry dispatches every canonical suffix case-insensitively and leaves unknown suffixes unsupported`
- `bun|src/package-checks/function-metrics/analyzer/reader-registry.test.ts|reader registry merges R/r only at case-insensitive dispatch while retaining source reader metadata`

Proves:

- 内部 registry 保留 `lizard_languages.languages()` 的 27-reader source order，并对 55 个 canonical suffix 进行大小写无关的选择；R/r 只在 canonical dispatch 合并而不改 reader metadata。
- 未知 suffix 在 registry 内明确返回 `undefined`，不伪造 upstream CLike fallback；Product admission、fallback 或 public behavior 不由本 Case 证明。

## Case FM-ANALYZER-CLIKE-OVERRIDE-SEAM-001: shared CLike declaration lifecycle 可被 source reader 正确覆写

Owner: `docs/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/function-metrics/analyzer/shared/clike.test.ts|Lizard C-like shared states > dispatches CLike source override seams through declaration and implementation transitions`

Proves:

- `CLikeStates` 的 declaration、declaration-to-implementation、old-C parameter、entering-implementation 和 implementation source seams 均可由派生 reader 以 `super` 保留 default transition，并由 entering transition 实际分派至派生 implementation。
- 该 Case 只证明 shared in-memory override lifecycle，不证明任一 concrete C-like reader、reader registry 或 Product integration。
