# ast-grep Rust structural adapter source audit

最后检查日期：2026-07-11

本文是 `integrate-rust-ast-grep-structural-adapter` 的依赖与 grammar source audit。后续实现只使用本文列出的版本、features、public symbols 和 node / field names。若 workspace Cargo resolution、编译结果或 characterization fixture 与本文冲突，必须先更新本文、`design.md` 和受影响的 spec delta，再继续 Vibe Check model、adapter 或 runtime 实现。

## 结论

可以接入。第一版固定使用：

```toml
ast-grep-core = { version = "=0.44.1", default-features = false, features = ["tree-sitter"] }
ast-grep-language = { version = "=0.44.1", default-features = false, features = [
  "tree-sitter-go",
  "tree-sitter-python",
  "tree-sitter-rust",
  "tree-sitter-typescript",
] }
```

两个 crate 均为 MIT、Rust edition 2024、MSRV 1.85；Vibe Check workspace 使用 MIT、
edition 2021 和固定 Rust 1.96.0，因此 toolchain 满足 dependency MSRV。
`ast-grep-language 0.44.1` 要求 `ast-grep-core 0.44.1` 和 `tree-sitter 0.26.3`
compatible ranges；workspace lockfile 实际解析为 exact `ast-grep-core 0.44.1`、
`tree-sitter 0.26.10`。关闭 `builtin-parser` 默认 feature、只启用四个 parser，避免把未支
持语言的 grammar 编入 binary。

方便程度：中等。public node traversal、field access、text、position 和 error / missing-node inspection 足以完成 adapter；但 tree-sitter syntax error 会恢复成一棵包含 `ERROR` 或 missing node 的树，而不是稳定返回 parse error，所以必须有 dependency characterization 和 Vibe Check-owned whole-file partial policy。

## 已验证来源

- `ast-grep-core 0.44.1` metadata: https://crates.io/crates/ast-grep-core/0.44.1
- `ast-grep-language 0.44.1` metadata: https://crates.io/crates/ast-grep-language/0.44.1
- `ast-grep-core` Rust API: https://docs.rs/ast-grep-core/0.44.1/ast_grep_core/
- `Node` traversal / field / range / error API: https://docs.rs/ast-grep-core/0.44.1/ast_grep_core/struct.Node.html
- `Node::is_named` API: https://docs.rs/ast-grep-core/0.44.1/ast_grep_core/struct.Node.html#method.is_named
- `Position` zero-based character-coordinate API: https://docs.rs/ast-grep-core/0.44.1/ast_grep_core/struct.Position.html
- tree-sitter integration module and `StrDoc`: https://docs.rs/ast-grep-core/0.44.1/ast_grep_core/tree_sitter/
- built-in language enum: https://docs.rs/ast-grep-language/0.44.1/ast_grep_language/enum.SupportLang.html
- `LanguageExt` parser boundary: https://docs.rs/ast-grep-language/0.44.1/ast_grep_language/trait.LanguageExt.html
- published ast-grep source commit: https://github.com/ast-grep/ast-grep/tree/26f784516b4a9a07f6969b1d5c3020ce42dbf7ed
- Go grammar node types: https://github.com/tree-sitter/tree-sitter-go/blob/1547678a9da59885853f5f5cc8a99cc203fa2e2c/src/node-types.json
- Python grammar node types: https://github.com/tree-sitter/tree-sitter-python/blob/293fdc02038ee2bf0e2e206711b69c90ac0d413f/src/node-types.json
- Resolved Rust grammar node types: https://github.com/tree-sitter/tree-sitter-rust/blob/e2bee853694a1d3e0f6ef308fe3674542fec95d7/src/node-types.json
- TypeScript grammar node types: https://github.com/tree-sitter/tree-sitter-typescript/blob/f975a621f4e7f532fe322e13c4f79495e0a7b2e7/typescript/src/node-types.json
- TypeScript generated grammar extras: https://github.com/tree-sitter/tree-sitter-typescript/blob/f975a621f4e7f532fe322e13c4f79495e0a7b2e7/typescript/src/grammar.json

本地官方 package snapshot 由以下命令下载并复查：

- `cargo info ast-grep-core@0.44.1 --verbose`
- `cargo info ast-grep-language@0.44.1 --verbose`
- `cargo info tree-sitter-go@0.25.0 --verbose`
- `cargo info tree-sitter-python@0.25.0 --verbose`
- `cargo info tree-sitter-rust@0.24.0 --verbose`
- `cargo info tree-sitter-typescript@0.23.2 --verbose`
- `cargo check -p vibe-check`
- `cargo tree -p ast-grep-language --depth 2`

两个 ast-grep package 的 `.cargo_vcs_info.json` 均解析到 commit
`26f784516b4a9a07f6969b1d5c3020ce42dbf7ed`。初始 audit 检查了
`tree-sitter-rust 0.24.0` candidate；Cargo 根据 upstream compatible requirement 实际解析
`0.24.2`（commit `e2bee853694a1d3e0f6ef308fe3674542fec95d7`）。Resolved
`function_item`、`function_signature_item`、`parameters`、`parameter`、`self_parameter`、
`impl_item` 与 `trait_item` node / fields 仍与本契约一致，因此不需要修改 capability。

## Dependency 与 feature 决策

`ast-grep-core` 只有 `tree-sitter` feature，且默认启用；manifest 显式关闭 default features 后重新启用它，使解析边界可审计。`ast-grep-language` 默认 feature `builtin-parser` 会启用全部内置 parser；第一版只启用以下 transitive grammar：

| Vibe Check language | `SupportLang` | feature | upstream requirement | lock resolution |
| --- | --- | --- | --- | --- |
| TypeScript `.ts` / `.d.ts` | `TypeScript` | `tree-sitter-typescript` | `0.23.2` | `0.23.2` |
| Go `.go` | `Go` | `tree-sitter-go` | `0.25.0` | `0.25.0` |
| Rust `.rs` | `Rust` | `tree-sitter-rust` | `0.24.0` | `0.24.2` |
| Python `.py` | `Python` | `tree-sitter-python` | `0.25.0` | `0.25.0` |

`Cargo.lock` 新增 11 个 packages：两个 direct ast-grep crates、四个启用的 grammar、
`tree-sitter 0.26.10`、`tree-sitter-language 0.1.7`、`bit-set 0.10.0`、`bit-vec 0.9.1` 和
`streaming-iterator 0.1.9`。没有未支持语言 grammar。Direct crates 与 tree-sitter crates
为 MIT；bit-set / bit-vec / streaming-iterator 为 MIT / Apache-2.0 dual license。新增依赖
最高 MSRV 是 ast-grep 的 1.85，低于项目 Rust 1.96.0。四个 grammar 通过 `cc` build
dependency 编译 bundled C parser；这是预期的 native build 成本，不需要系统级 language
package。

`ast-grep-language` 仍公开其它 `SupportLang` variants；当对应 feature 关闭时，其 parser function 使用 `unimplemented!()`。adapter 只能通过 extension 显式构造上述四个 variants，且整个 dependency call 必须位于 panic boundary 内。未映射 supported extension 或 dependency panic 是 scanner fatal，不是 clean / partial result。

升级触发条件：任一 exact crate version、feature name、MSRV、public method、grammar node kind / field、position semantics 或 syntax recovery behavior变化。升级必须更新本文、重新解析 lockfile、重跑全部 dependency characterization，并在 grammar mapping 改变时重新审计 adapter fixtures；不得把未验证的 semver range 当作实现基线。

## 允许使用的 public Rust API

第一版只允许 dependency adapter 使用：

- `ast_grep_core::{AstGrep, Node, Position}`；
- `ast_grep_core::tree_sitter::{StrDoc, LanguageExt}`；
- `ast_grep_language::SupportLang`；
- `AstGrep::<StrDoc<SupportLang>>::try_new`、`AstGrep::root`；
- `Node::{dfs, children, parent, field, field_children, kind, text, start_pos, end_pos, range, is_named, is_error, is_missing}`；
- `Position::{line, column}`。

不使用 pattern DSL、native tree-sitter `Node`、raw S-expression、parser internals或第三方 error type作为 Core / Output contract。Characterization tests 可以读取 node kind、field、text 和 position 来证明 dependency facts，但不得断言 Vibe Check warning。

### Parse、UTF-8 与 panic behavior

- `StrDoc::try_new` / `AstGrep::try_new` 为 parser initialization / tree unavailable 返回 `Result`；`LanguageExt::ast_grep` 经 `expect` 构造 tree，可能 panic，因此 production adapter 不使用该 convenience method。
- 普通 syntax error 通常仍返回 tree；adapter 必须对 root 做一次 DFS，只要任一 node `is_error()` 或 `is_missing()` 就跳过该文件全部 metrics。
- 输入 API 接收 `&str`。adapter 在 parse 前以 bytes 读取并执行严格 UTF-8 decode；无效 UTF-8 不传给 dependency，而是生成文件级 `STRUCTURAL_SCAN_PARTIAL`。
- `Node::text` 对同一 UTF-8 source 和 tree 可安全使用；dependency panic 仍由 adapter 最外层 `catch_unwind` 映射为 scanner fatal。
- `Node`、`SupportLang` 的 0.44.1 rustdoc auto traits包含 `Send` / `Sync`。第一版仍逐文件顺序 parse，不引入共享 parser、cache 或 scheduler；每棵 tree 及其 borrowed nodes只在一次 adapter traversal 内存活。

### Range normalization

`Node::range()` 返回 half-open byte range；`start_pos()` / `end_pos()` 返回 zero-based row 和 character column，其中 end position 是 parser 的 exclusive endpoint。Vibe Check 只输出 1-based inclusive source coordinates：

- `start_line = start.line + 1`；
- `start_column = start.column(node) + 1`；
- `end_line = end.line + 1`；
- 对正常非空 node，`end_column = end.column(node)`，即 exclusive zero-based column数值等于最后一个字符的 1-based inclusive column；
- zero-width、倒序或无法形成有效 inclusive range 的 function node 是 normalization invariant failure，映射为 scanner fatal。

Characterization fixture 必须覆盖 multi-line function、UTF-8 名称 / path 和同一行多个 functions，证明 line / column 转换及排序稳定。

Characterization 观测（2026-07-11）：TypeScript `export function` 的
`function_declaration` range 从 `function` token开始，不包含 parent `export` token；UTF-8
Python fixture的 end column按 Unicode character而不是 byte计数。两者均符合上述 public
`Node` / `Position` contract，adapter直接使用 function node range，不向外扩到 modifiers。
Malformed TypeScript signature可恢复为 missing node而没有 `ERROR` node；unexpected token
fixture可产生 `ERROR` node。因此 adapter必须检查 `is_missing() || is_error()`，不能只依赖
其中一种 representation。

### Named syntax extras

Resolved `tree-sitter-go 0.25.0` 的 `node-types.json` 将 `comment` 标记为
`named: true`、`extra: true`；resolved TypeScript generated grammar同样把 `comment`列入
`extras`，且 `node-types.json` 将其标记为 named。`Node::children()` 会返回这些 direct
children，因此 `filter(Node::is_named)` 不能等价表示 parameter slots。

Go / TypeScript parameter traversal必须先忽略 unnamed punctuation，再显式忽略
source-audited `comment` extra，只计算下列对应语言的 parameter node kinds。这两个 mapping
中的其它 named child表示 grammar漂移或 normalization invariant failure，映射为 scanner
fatal；合法 comment本身不产生 diagnostic或 fatal。Characterization与 adapter fixtures
必须在 Go / TypeScript parameter list中保留 comment，防止再次把 named syntax extra误计
为 parameter。

## Grammar mapping

下表中的 kind / field names 来自四个 exact grammar package 的 `node-types.json`。只有带 executable `body`、稳定 name / binding 且通过 characterization 的形态进入 metric。

### TypeScript

| Form | Node / fields | Stable name | Body / parameters | Policy |
| --- | --- | --- | --- | --- |
| named function | `function_declaration`; `name`, `body`, `parameters` | `name` identifier | `statement_block`; `formal_parameters` | include as `function` |
| class method / constructor | `method_definition`; `name`, `body`, `parameters` | property/private/string/number key; `constructor` marker | `statement_block`; `formal_parameters` | include as `method` / `constructor` |
| direct-bound arrow | `variable_declarator.value = arrow_function` | declarator `name` only when identifier | expression or `statement_block`; `parameter` or `parameters` | include as `function` |
| direct-bound function expression | `variable_declarator.value = function_expression` | declarator identifier | `statement_block`; `formal_parameters` | include as `function` |
| declaration-only | `function_signature`, `method_signature`, `abstract_method_signature` | available but no body | no executable body | exclude without diagnostic |

`formal_parameters` named children are `required_parameter` / `optional_parameter`; each child is one slot. A single-parameter arrow uses field `parameter` and counts one. Destructured/default/rest forms stay inside one parameter node and count once. A parameter whose `pattern` field is kind `this` is the TypeScript pseudo-receiver and counts zero. Anonymous callbacks and non-identifier variable bindings are excluded.
Direct `comment` children are named syntax extras and count zero；unnamed punctuation同样忽略，
其它 named child是 normalization invariant failure。

### Go

| Form | Node / fields | Stable name | Body / parameters | Policy |
| --- | --- | --- | --- | --- |
| function | `function_declaration`; `name`, optional `body`, `parameters` | identifier | body must be `block`; `parameter_list` | include as `function` |
| method | `method_declaration`; `name`, `receiver`, optional `body`, `parameters` | field identifier | body must be `block`; receiver is separate | include as `method` |

Receiver field never contributes to `parameter_count`. In `parameters`, each `variadic_parameter_declaration` counts one. A `parameter_declaration` with N `name` fields represents N call-site slots and counts N; an unnamed declaration counts one. Go declarations without `body` are excluded without diagnostic.
Direct `comment` children are named syntax extras and count zero；unnamed punctuation同样忽略，
其它 named child是 normalization invariant failure。

### Rust

| Form | Node / context | Stable name | Body / parameters | Policy |
| --- | --- | --- | --- | --- |
| free / nested function | `function_item` outside `impl_item` / `trait_item` | `name` identifier | required `body`; `parameters` | include as `function` |
| impl method | `function_item` under `impl_item` | `name` identifier | required `body`; `parameters` | include as `method` |
| trait default method | `function_item` under `trait_item` | `name` identifier | required `body`; `parameters` | include as `method` |
| trait signature | `function_signature_item` | name exists, no body | `parameters` | exclude without diagnostic |

Each `parameter` and `variadic_parameter` is one slot except a `parameter` whose `pattern` field is kind `self`; `self_parameter` also counts zero. Attributes and type children do not contribute to the count.

### Python

| Form | Node / context | Stable name | Body / parameters | Policy |
| --- | --- | --- | --- | --- |
| sync / async free or nested function | `function_definition` outside direct class body | `name` identifier | required `block`; `parameters` | include as `function` |
| direct class-body method | `function_definition` directly owned by class body, optionally through `decorated_definition` | `name` identifier | required `block`; `parameters` | include as `method`; `__init__` is `constructor` |

Python sync and async functions share `function_definition`; `async` is syntax inside that node. Decorators are siblings of the `definition` field in `decorated_definition`. Direct class-body methods exclude the first parameter slot as receiver, except when a decorator text is exactly `@staticmethod` or ends in `.staticmethod`. `@classmethod` remains receiver-excluding. Each named parameter child counts one; identifiers, default / typed default parameters, typed parameters, list splat and dictionary splat each remain one slot. Nested functions inside a method are functions, not methods.

## Error、diagnostic 与 fatal mapping

文件级 recoverable conditions：exact input在 parse 前不存在、不是 regular file、读取失败、不是 UTF-8，或 parsed tree 含 `ERROR` / missing node。每个文件生成 warning-severity `STRUCTURAL_SCAN_PARTIAL`，跳过该文件全部 metrics。即使所有 structural inputs 都被跳过，只要 LOC / duplicate report data可信，仍返回 partial report。

Scanner fatal conditions：enabled language initialization失败、dependency panic、supported extension没有映射、project-root-relative path normalization失败、function source range无效、stable identity重复或 deterministic ordering invariant失败。fatal 沿用 exit code 3 / empty stdout，不转换为空 metrics。

正常不支持形态（signature-only、abstract / no-body、anonymous callback / closure、非 identifier direct binding）不产生 metric，也不产生 diagnostic。

## Characterization gate

在新增 Vibe Check-owned structural model前，checked-in、hand-written、offline tests必须直接调用上述 public API 并证明：

1. 四种 extension 映射到 exact enabled language且逐个 source只 parse / traverse一次。
2. 上表 node kind、name / body / parameter fields与 actual parsed tree一致。
3. TypeScript `this`、Go receiver、Rust self和 Python non-static receiver排除；default、optional、destructured、rest / variadic各按一个 call-site slot计数；Go / TypeScript parameter-list comment作为 named extra可观察但计数为零。
4. signature-only / anonymous forms可区分且不依赖 warning模型。
5. syntax error / missing node可由 DFS 检测。
6. 1-based inclusive line / column、UTF-8 source和同一行多 node range稳定。
7. compile-time type assertion或等价 evidence确认所用 parser/root/node边界满足当前顺序执行模型。

该 gate 失败时回到本文和 change artifacts；不得用 adapter workaround掩盖 grammar / dependency差异。
