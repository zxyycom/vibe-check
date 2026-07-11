# integrate-rust-jscpd-adapter tasks

本清单只实现 duplicate scanning。上游 API 事实已记录在 `source-audit.md`；用户配置、可变 threshold、warning suppression 和 graph coalescing 不属于本 change。

执行顺序固定为：owner docs -> dependency characterization gate -> Vibe Check model / adapter -> Core integration -> contract evidence -> final verification。owner docs 先记录目标契约，并明确 change 归档前不代表当前 binary 已实现；文档 gate 通过后再修改 Cargo manifest 或 Rust application code。

## 1. 已完成的前置探索

- [x] 1.1 在本 change 内新增 `source-audit.md`，记录 jscpd Rust source snapshot、source URLs、crate metadata、API fields、result model、scope constraints、error behavior 和 fixture proof targets。
- [x] 1.2 将 dependency release target 固定为 `cpd-finder 0.1.8`，并决定 manifest 使用 exact requirement `cpd-finder = "=0.1.8"`。
- [x] 1.3 记录 upstream MSRV `1.87`，并验证当前环境默认 stable 工具链为 `rustc/cargo 1.96.0`。
- [x] 1.4 固定第一版内置 scanner profile：`min_tokens = 50`、`min_lines = 5`、audited defaults，以及 Vibe Check-owned scope overrides。
- [x] 1.5 记录 upstream pairwise clone model、canonical source ids 和 silent-skip failure semantics。

## 2. 已完成的实现入口审计

- [x] 2.1 已确认 `source-audit.md` 是本 change 的 source/API authority，后续实现从该文档进入。
- [x] 2.2 已审计 proposal、design、spec deltas、source audit 和 tasks，主承诺一致：用户能看到 deterministic duplicate warnings，scanner 问题不会表现为 clean。
- [x] 2.3 已确认 capability IDs：新增 `duplicate-scanning`，修改 `quality-metrics` 和 `test-fixtures`。
- [x] 2.4 已确认本 change 不新增 duplicate scanner 用户配置，第一版只使用 adapter-owned 内置 profile。
- [x] 2.5 已确认项目工具链使用当前环境默认 stable Rust `1.96.0`，独立于 dependency MSRV。
- [x] 2.6 已固定第一版 pairwise 语义、warning 用户体验、deterministic ordering、partial diagnostic 和 fatal failure 边界。
- [x] 2.7 已确认 `metrics.supported_scanner_findings = metrics.files_measured` 的 LOC compatibility 语义保持不变。
- [x] 2.8 已固定冲突处理规则：Cargo resolution、编译或 fixture 行为与 source audit 冲突时，先更新 artifacts，再继续实现。

## 3. 文档先行 contract gate

- [ ] 3.1 更新 `docs/scanner-dependencies.md`，先记录 exact `cpd-finder 0.1.8`、upstream MSRV `1.87`、项目 toolchain `1.96.0`、adapter boundary、source-audit constraints 和 dependency characterization gate。
- [ ] 3.2 更新 `docs/quality-metrics.md`，先记录 built-in profile、pairwise warning、deterministic ordering、diagnostic behavior、gate policy 和 LOC compatibility counter，并区分目标契约与当前实现状态。
- [ ] 3.3 更新 `docs/testing.md`、`docs/testing/case-maintenance.md` 和 `docs/testing/cases.md` 中必要的 owner / case materials，预先登记默认 threshold、用户可见 proof targets、planned case IDs 和 fixture responsibility。
- [ ] 3.4 只有 owner routing 变化时才更新 `docs/navigation.md`。
- [ ] 3.5 在任何 Cargo manifest 或 Rust application code 变更前运行 `bun run validate`；文档、OpenSpec、schema/example compatibility 和 whitespace validation 全部通过后进入 dependency characterization。

## 4. Toolchain、dependency 和 characterization gate

- [ ] 4.1 新增 `rust-toolchain.toml`，固定 `channel = "1.96.0"`、`profile = "minimal"` 和 `rustfmt` / `clippy` components；运行 `rustc --version --verbose` 和 `cargo --version --verbose` 确认生效。
- [ ] 4.2 在 workspace Cargo dependency metadata 中加入 `cpd-finder = "=0.1.8"`，让 `Cargo.lock` 记录实际 resolved source。
- [ ] 4.3 检查 resolved `cpd-core` / `cpd-tokenizer` 版本和 public API；确认第一版不需要 direct dependency，只有实现必须命名 public types 时才新增并记录原因。resolution 或 API 与 source audit 冲突时回到文档阶段更新 artifacts，不继续实现。
- [ ] 4.4 增加最小 checked-in characterization fixtures 和直接调用 `cpd_finder` 的 tests，证明 individual exact file paths、cross-file / same-file pairs、supported format mapping、`50` token / `5` line-span 边界、`no_gitignore` scope ownership 和 canonical source ids；该 gate 通过前不实现 Vibe Check model、adapter 或 runtime integration。

## 5. Vibe Check-owned model 和 boundary

- [ ] 5.1 定义 Vibe Check-owned duplicate scanner types，覆盖 pair identity、两个 locations、token count、scanner diagnostics 和 fatal failures。
- [ ] 5.2 增加 duplicate adapter trait / module boundary，让 LOC metrics 与 duplicate scanning 保持分离，同时允许 runtime pipeline 注入 fake adapter tests。
- [ ] 5.3 在 project-relative path normalization 后实现 pair location sorting、finding ordering 和内部 deterministic identity。

## 6. jscpd Rust adapter

- [ ] 6.1 把 Vibe Check supported scan scope files 映射为 `RunConfig.paths` 中的 exact absolute file paths，不把 project root 作为 jscpd scan path。
- [ ] 6.2 构造不可变内置 profile：`50` tokens、`5` line span、audited mode/defaults、supported formats、`no_gitignore = true`、empty ignore/patterns、no blame 和 `follow_symlinks = false`。
- [ ] 6.3 将每个 pairwise `CpdClone` 归一化为一个 finding，包含 project-relative `/` paths、line/column spans、token count 和 deterministic identity，不做 graph coalescing。
- [ ] 6.4 对 collected files 做 existence、regular-file、readability 和 UTF-8 preflight，覆盖 upstream silent-skip 文件问题。
- [ ] 6.5 部分 preflight 失败且仍有可扫描输入时，为失败文件生成 warning-severity `DUPLICATE_SCAN_PARTIAL` diagnostics。
- [ ] 6.6 将所有输入失效、`FinderError`、panic unwind、越界 source id、无效 location 和 normalization invariant failure 映射为 scanner fatal error。
- [ ] 6.7 将 raw jscpd data、`Statistics`、`SourceFile`、`Token` 和 reporter structures 限制在 adapter boundary 内。
- [ ] 6.8 scan scope 没有 supported files 时跳过 duplicate adapter，并返回无 duplicate diagnostic 的正常 outcome。

## 7. Core warning、metrics 和 gate

- [ ] 7.1 在 duplicate scanner execution 之后、gate calculation 之前，把 normalized pair findings 输入 warning generation。
- [ ] 7.2 每个 pair 生成一条 `duplicate.code_fragment` warning：primary file / line range、secondary path / line range、token count、`medium`、non-blocking、not accepted、not suppressed。
- [ ] 7.3 合并 LOC 和 duplicate warnings 后按 `(file, location, rule, message)` deterministic sorting。
- [ ] 7.4 duplicate warnings 计入 `summary.warning_count`，不计入 `summary.blocking_warning_count`，也不单独让 gate failed。
- [ ] 7.5 保持 `metrics.supported_scanner_findings = metrics.files_measured`，duplicate finding 数量不进入 LOC compatibility counter。
- [ ] 7.6 保持现有 `file.too_many_lines` warning、metrics totals、scope counts 和 gate 行为不变。

## 8. Contract evidence 和文档对账

- [ ] 8.1 增加 adapter / unit tests，覆盖 trait outcome、pair normalization、deterministic ordering、source-id path normalization 和 adapter boundary 不泄漏 upstream types。
- [ ] 8.2 增加 fixture-backed CLI contract tests，证明 supported duplicates 在 human / JSON report 中可定位，且 duplicate-only report 保持 gate passed。
- [ ] 8.3 证明 `.mts`、`.cts`、`.pyx`、`.pxd`、`.pxi`、JS/JSX/TSX、Markdown、Vue、Svelte、Astro 不进入第一版 duplicate scanner input。
- [ ] 8.4 覆盖 zero-supported-input completed、partial preflight diagnostic、all-input fatal、`FinderError` fatal 和 invalid normalized result fatal。
- [ ] 8.5 添加对应 `@case` markers，并将 `docs/testing/cases.md` 中预先登记的 case、fixture responsibility 和实际 proof target 对账；实现证据与文档契约不一致时先修正文档或实现，不保留双重语义。
- [ ] 8.6 如新增或修改 representative warning examples，同步验证 JSON schema 和 examples；不为 duplicate finding 新增 schema field。

## 9. Final verification

- [ ] 9.1 运行 `cargo fmt --all --check`。
- [ ] 9.2 运行 `cargo clippy --all-targets --all-features -- -D warnings`。
- [ ] 9.3 运行 `cargo test --all`。
- [ ] 9.4 再次运行 `bun run validate`，覆盖实现后的 docs、schema、examples、OpenSpec 和 whitespace。
- [ ] 9.5 运行 strict OpenSpec validation，并确认 `openspec show`、`openspec status` 和 `openspec instructions apply` 都能消费该 change。
- [ ] 9.6 运行 `bun run verify:vibe-check-workspace:required`，覆盖跨 Rust、OpenSpec、输出和测试边界。
- [ ] 9.7 检查 local diff，确认只修改目标范围，文档只保留当前执行方案且 Open Questions 已收敛。
