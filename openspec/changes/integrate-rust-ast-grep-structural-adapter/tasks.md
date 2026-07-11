# integrate-rust-ast-grep-structural-adapter tasks

本清单只交付 Rust ast-grep structural adapter 与第一条 non-blocking function parameter warning；当前只在本 change 目录形成临时变更计划。阻塞级实现前审计已完成，可以执行 source audit；第 4 组 characterization gate 通过前仍不得执行 Vibe Check model、adapter 或 runtime application code，归档前也不修改现有主规范。

第 1 组是阻塞级实现前审计。第 1 组全部完成并记录审计结论前，不得执行第 2 组及之后的 source audit、文档、依赖或应用代码任务。

## 1. Blocking implementation audit

- [x] 1.1 审计 proposal、design、三个 spec deltas 和 tasks 是否都围绕“为现有四种 supported source 接入 Rust structural scanner，并以一个 non-blocking parameter warning 完成用户可见闭环”这一核心句，删除任何无关扩展。
- [x] 1.2 确认 capability IDs 使用新增 `structural-scanning` 与既有 `quality-metrics`、`test-fixtures`，delta operation、requirement 名称、scenarios 和归档 owner 均一致。
- [x] 1.3 确认本 change 在创建阶段只是 `openspec/changes/integrate-rust-ast-grep-structural-adapter/` 下的待审计临时计划，创建阶段没有修改或影响现有 docs、主 specs、schema、examples 或其它 changes。
- [x] 1.4 审计 `design.md` 的 `## Open Questions`：不得存在未回答问题或仅用“已收敛”掩盖的歧义；exact dependency version / features 必须由 source audit gate 明确解决，不能在应用代码阶段临时猜测。
- [x] 1.5 确认 CLI/config、额外语言、anonymous callbacks、complexity、function NLOC、baseline/cache、accepted/suppressed、schema expansion 和 scanner registry 均保持 change 外，structural adapter 只消费 normalized Core input。
- [x] 1.6 确认验证路径能分别证明 dependency facts、adapter normalization、Core policy 和真实 CLI contract；完成本组审计并记录结论后，才解除后续任务的阻塞状态。

审计结论（2026-07-11）：用户已确认 Decision 3、4、5；capability、delta、scope、owner、开放问题和验证路径一致。阻塞级实现前审计已解除，change 可以进入 source audit；第 4 组 characterization gate 通过前仍不得实现 Vibe Check model、adapter 或 runtime application code。

## 2. Source audit and dependency decision

- [x] 2.1 在本 change 下新增 `source-audit.md`，引用官方 crate metadata、docs.rs / upstream source 与 resolved Cargo source，记录候选 `ast-grep-core` / `ast-grep-language` versions、license、MSRV、features 和 dependency relationship。
- [x] 2.2 审计 Rust parse / root / node / range API、built-in language mapping、syntax error / missing node representation、UTF-8 input、panic / error behavior 和 thread-safety，并记录实现只可使用的 public symbols。
- [x] 2.3 为 TypeScript、Go、Rust 和 Python 列出目标 function forms、grammar node kinds、stable name来源、body presence、receiver位置和 parameter slot extraction rules。
- [x] 2.4 选择相互兼容的 exact dependency versions 与最小 Cargo features；记录升级触发条件和重新 characterization 要求，不把未验证的 semver range 当作实现基线。
- [x] 2.5 将 source facts 与 proposal、design、specs 对账；若 API、grammar、build 或 error behavior 不能满足契约，先更新 artifacts 并重新完成第 1 组审计，不继续 owner docs 或 Cargo implementation。

Source audit 结论（2026-07-11）：exact `ast-grep-core = 0.44.1` / `ast-grep-language = 0.44.1`、MIT、MSRV 1.85 与四个最小 parser features满足当前 capability contract。Syntax recovery、range、panic和 disabled-parser边界已显式进入 characterization与 fatal/partial policy；未发现需要重开第 1 组审计的 contract冲突。

## 3. Owner docs and planned test contract

- [x] 3.1 更新 `docs/scanner-dependencies.md`，先记录 exact dependencies、source-audited API boundary、supported forms、exact-input ownership、diagnostic categories 和 characterization gate，并把实施状态标为 change 目标而非已实现事实。
- [x] 3.2 更新 `docs/quality-metrics.md`，先记录 `FunctionMetric`、parameter count、内置 threshold `5`、`function.too_many_parameters` fields、warning ordering、summary / gate 与 LOC compatibility policy。
- [x] 3.3 更新 `docs/testing.md` 与 `docs/testing/case-maintenance.md`，增加 structural characterization / adapter / CLI 证明边界和 `STRUCTURAL` responsibility；只在 owner routing 变化时修改 `docs/navigation.md`。
- [x] 3.4 在 `docs/testing/cases.md` 预先登记 dependency characterization、adapter normalization 和 CLI warning 的 planned cases，写清 fixture responsibility，暂不添加源码 `@case` marker 或 `Code:`。
- [x] 3.5 在修改 Cargo manifest 或 Rust application code 前运行 `bun run validate` 和 strict OpenSpec validation；文档、delta specs、planned cases 或 whitespace 失败时先修正 contract gate。

Contract gate 结果（2026-07-11）：`bun run validate`、change strict validation与
`git diff --check` 均通过，可以进入 exact Cargo dependency与 characterization fixtures。

## 4. Cargo dependency and characterization gate

- [x] 4.1 在 workspace Cargo metadata 中加入 source-audited exact `ast-grep-core` / `ast-grep-language` dependencies 与最小 features，并检查 `Cargo.lock` resolution、license、MSRV 和 transitive dependency impact。

Dependency resolution 结论（2026-07-11）：`cargo check -p vibe-check` 通过；lockfile只加入
四个目标 grammar及其共享 tree-sitter基础依赖。Resolved Rust grammar为 compatible
`0.24.2`，目标 node contract复查无变化；license与 MSRV满足 owner要求，详情已回写
`source-audit.md`。
- [x] 4.2 新增 hand-written、checked-in、offline characterization fixtures，覆盖四种 supported language、nested / method / constructor / stable-bound forms、declaration-only forms、receivers、compound parameters、syntax error 和 UTF-8 path。
- [x] 4.3 编写直接调用 ast-grep public API 的 dependency tests，证明 exact individual-file parsing、language mapping、1-based inclusive range conversion 和 executable-body detection，不使用 Vibe Check model 或 warning assertions。
- [x] 4.4 用 characterization tests 证明 Go / Rust / TypeScript / Python receiver exclusion，以及 default、optional、destructured、rest / variadic parameter 各计一个 slot。
- [x] 4.5 用 characterization tests 证明 parser error / missing node 可检测、signature-only / anonymous forms 可区分、同一行多个 nodes 具有稳定 source range，并记录任何与 source audit 的差异。
- [x] 4.6 运行最窄 dependency characterization test；该 gate 通过前不得执行第 5 组及之后任务，失败时回到 artifacts 与 source audit 而不是增加 adapter workaround。

Characterization gate 结果（2026-07-11）：
`cargo test -p vibe-check --test ast_grep_characterization` 通过 5/5。RED阶段发现并记录
TypeScript modifier range、UTF-8 character column，以及 missing / `ERROR` node需要分别覆盖；
这些差异不改变产品契约。第 5 组及之后的 application code门禁已解除。

## 5. Vibe Check-owned model and adapter boundary

- [x] 5.1 定义 Vibe Check-owned `FunctionKind`、source range、`FunctionMetric`、`StructuralScanOutcome`、structural diagnostic 和 fatal failure types，不在 public/Core signatures 中命名 ast-grep types。
- [x] 5.2 新增可注入的 `StructuralScannerAdapter` trait / module boundary，使 structural scanning 与 LOC、duplicate adapters 分离，并允许 runtime tests 使用 fake outcome。
- [x] 5.3 实现 project-root-relative `/` path normalization、1-based inclusive range validation、stable display name / identity 和 `(file, range, kind, name)` deterministic ordering helpers。
- [x] 5.4 为 zero-function、zero-supported-input、partial diagnostics 和 fatal failure 定义明确 outcome，不用 empty vector 混淆 clean、skipped 和 failed states。

## 6. ast-grep structural adapter

- [x] 6.1 只读取 normalized scan scope 提供的 exact supported file paths，并把 `.ts`、`.go`、`.rs`、`.py` 映射到 source-audited ast-grep language；不递归扫描 project root 或重新应用 ignore rules。
- [x] 6.2 按 per-language module 实现 TypeScript、Go、Rust 和 Python 的 supported function / method / constructor extraction，并将第三方 nodes 限制在 adapter 内。
- [x] 6.3 实现 stable name、kind、body presence、source range 与 cross-language parameter slot normalization，包含 Python `@staticmethod` 和各语言 receiver 边界。
- [x] 6.4 排除 signature-only declaration、abstract / no-body member、无稳定 name 的 anonymous callback / closure；这些正常不支持形态不得产生 diagnostic。
- [x] 6.5 在 parse 前执行 existence、regular-file、readability 和 UTF-8 preflight；读取 / syntax error / missing node 时跳过整文件 metrics 并生成 warning-severity `STRUCTURAL_SCAN_PARTIAL` diagnostic。
- [x] 6.6 将 adapter initialization、panic unwind、supported language mapping 缺失、project root 外 path、invalid range 和 normalization invariant failure 映射为 scanner fatal。
- [x] 6.7 对 normalized metrics 做 deterministic sort 和 duplicate identity检查；相同源码与 scope 重复扫描必须返回相同数量、内容和顺序。

## 7. Core warning and runtime integration

- [x] 7.1 在 scan scope collection 后将 normalized Core input 传给 structural adapter；zero-supported-input 时跳过 adapter，并保持 CLI/config 参数获取只由合并后的既有 owner 负责。
- [x] 7.2 将 structural outcome 接入 report assembly：合并 diagnostics、设置 partial status，并在 structural fatal 时沿用 scanner fatal exit code `3` 与 empty stdout boundary。
- [x] 7.3 从 `parameter_count >= 5` 的 normalized metrics 生成 `function.too_many_parameters` warning，设置 stable file / `lines START-END` / message、`medium`、non-blocking、not accepted 和 not suppressed。
- [x] 7.4 合并 LOC、duplicate 和 function warnings 后按 `(file, location, rule, message)` 排序，并从统一 list 计算 summary counts 与 gate。
- [x] 7.5 保持 LOC totals、language summaries、`metrics.files_measured`、`metrics.supported_scanner_findings`、duplicate behavior、schema version 和现有 report field shape 不变。

## 8. Contract evidence and owner reconciliation

- [x] 8.1 增加 adapter tests，覆盖四语言 inventory、stable binding、receiver / compound parameter semantics、range / path normalization、ordering、normal exclusions、partial diagnostics 和 fatal invariants。
- [x] 8.2 增加 Core tests，覆盖 parameter count `4` / `5` threshold、warning fields、统一 ordering、summary counts、non-blocking gate 和 LOC compatibility counters。
- [x] 8.3 增加 fixture-backed CLI contract tests，证明 human / JSON report 可定位 function warning、JSON 通过现有 schema、function-only report gate passed，且测试只读 checked-in project fixture。
- [x] 8.4 覆盖 syntax-error / all-structural-input-partial report，以及 adapter invariant fatal exit code `3` / empty stdout；unsupported / excluded files 不进入 structural input。
- [x] 8.5 将 planned cases 更新为 implemented，补 `Code:` 与唯一源码 `@case` markers，并对账 fixture responsibility、proof target 和实际测试路径。
- [x] 8.6 更新 owner docs 的实施状态和 verification section；如 representative examples 无需变化，用 schema tests 证明兼容，不为 function metrics 新增 schema field。
- [x] 8.7 在代表性 checked-in fixtures 上记录 structural scanning 前后的可复现 scan timing，确认每个 supported file 只执行一次 parse / traversal；没有明确性能基线前不引入 cache 或并行 scheduler，发现不可接受回归时先记录证据并重新评估设计。

## 9. Final verification

- [x] 9.1 运行 `cargo fmt --all --check`。
- [x] 9.2 运行 `cargo clippy --all-targets --all-features -- -D warnings`。
- [x] 9.3 运行 `cargo test --all`。
- [x] 9.4 运行 `bun run validate`，覆盖 docs、OpenSpec、schema/examples 和 whitespace。
- [x] 9.5 运行 `openspec validate integrate-rust-ast-grep-structural-adapter --type change --json --strict --no-interactive`，并确认 `openspec status` / `instructions apply` 可消费最终 artifacts。
- [x] 9.6 运行 `bun run verify:vibe-check-workspace:required`；dependency、Rust、output、testing 或 OpenSpec 任一 gate 失败时修正后重跑。
- [x] 9.7 检查 local diff 与 Cargo lockfile diff，确认只修改目标范围、没有恢复 ad-hoc CLI/config 参数获取、没有未回答 Open Questions，并记录残余 performance / grammar upgrade 风险。
