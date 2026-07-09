本 tasks 清单列出 `integrate-rust-jscpd-adapter` 的实现步骤。上游 jscpd Rust source exploration 已前置完成并记录在 `source-audit.md`；实现阶段消费该文档，只有 Cargo resolution、编译或 fixture 行为与 audit 冲突时才回写 change 文档。

## 1. 已完成的前置探索

- [x] 1.1 在本 change 内新增 `source-audit.md`，记录 jscpd Rust source snapshot、source URLs、crate metadata、API fields、result model、scope integration constraints、error behavior 和 fixture proof targets。
- [x] 1.2 将依赖 target 固定为 `cpd-finder = "0.1.8"`，并记录 `cpd-core 0.1.6`、`cpd-tokenizer 0.1.7` 的相关 metadata。
- [x] 1.3 记录 MSRV / license 事实：upstream crates 为 MIT，要求 Rust `1.87`。
- [x] 1.4 记录 `RunConfig` 推荐默认值：exact file paths、`formats`、`no_gitignore = true`、不使用 jscpd ignore/pattern filtering、不启用 blame、threshold 由 Vibe Check owning。
- [x] 1.5 记录 upstream model 和 failure semantics：`CpdClone` 是 pairwise，source id 是 canonical string，upstream 会在若干文件级失败场景中 silent skip。

## 2. 已完成的实现入口审计

- [x] 2.1 已确认 `source-audit.md` 是本 change 的 source/API authority，后续实现从该文档进入。
- [x] 2.2 已审计 `proposal.md`、`design.md`、所有 spec delta、`source-audit.md` 和本任务清单，目标一致：接入 jscpd v5 Rust engine 为 duplicate scanner adapter，同时不把第三方结构泄漏到 stable output。
- [x] 2.3 已确认 capability IDs 正确：新增 `duplicate-scanning`，修改 `quality-metrics` 和 `test-fixtures`。
- [x] 2.4 已确认 `design.md` 的 Open Questions 收敛，不再需要用户决定 scope、output shape、severity、blocking policy 或 dependency selection。
- [x] 2.5 已固定实现阶段冲突处理规则：如果 Cargo resolution、编译或 fixture 行为与 `source-audit.md` 冲突，先停止实现并更新 `source-audit.md`、`design.md` 和相关 spec delta。

## 3. 依赖和模型

- [ ] 3.1 在 workspace Cargo dependency metadata 中加入 `cpd-finder = "0.1.8"`，让 `Cargo.lock` 记录实际 resolved source。
- [ ] 3.2 确认第一版不需要直接依赖 `cpd-core` 或 `cpd-tokenizer`；只有实现必须命名其 public types 时才新增 direct dependency，并记录原因。
- [ ] 3.3 定义 Vibe Check-owned duplicate scanner types，覆盖 pair/group identity、locations、token threshold evidence、scanner diagnostics 和 fatal failures。
- [ ] 3.4 增加 adapter trait 或 module boundary，让 LOC metrics 与 duplicate scanning 保持分离，同时允许 runtime scan pipeline 调用两者。
- [ ] 3.5 在 project-relative path normalization 后实现 deterministic sorting 和 group identity。

## 4. jscpd Rust adapter

- [ ] 4.1 实现 jscpd Rust adapter，把 Vibe Check supported scan scope files 映射为 `RunConfig.paths` 中的 exact file paths；不要把 project root 作为 jscpd scan path。
- [ ] 4.2 按 `source-audit.md` 配置 `RunConfig`：supported `formats`、Vibe Check duplicate thresholds、`no_gitignore = true`、不使用 ignore/pattern filtering、不启用 blame、明确 symlink 行为。
- [ ] 4.3 将 pairwise `CpdClone` 归一化为 Vibe Check duplicate findings，包含 project-root-relative `/` paths、line spans、token count 和 deterministic group identity。
- [ ] 4.4 对 collected files 做 Vibe Check-owned preflight，覆盖 upstream 会 silent skip 的文件级问题。
- [ ] 4.5 将 `FinderError` 和 adapter-wide invalid states 映射为 scanner fatal errors；不要把 scanner failure 转成 empty duplicate result。
- [ ] 4.6 将 raw jscpd data、`Statistics`、`SourceFile`、`Token` 和 reporter structures 限制在 adapter boundary 内。

## 5. Core warning 和 gate 行为

- [ ] 5.1 在 scanner execution 之后、gate calculation 之前，把 normalized duplicate findings 输入 warning generation。
- [ ] 5.2 实现 `duplicate.code_fragment`：每个 normalized duplicate group 生成一条 `medium`、non-blocking warning。
- [ ] 5.3 确认 duplicate warnings 会计入 `summary.warning_count`，但不计入 `summary.blocking_warning_count`，也不会单独让 gate failed。
- [ ] 5.4 确认现有 `file.too_many_lines` warning 和 gate 行为不变。

## 6. Fixtures 和 tests

- [ ] 6.1 增加 checked-in duplicate-code fixtures，覆盖 cross-file duplicates、same-file duplicates、below-threshold text 和 excluded duplicate-looking paths。
- [ ] 6.2 增加 adapter/unit tests，覆盖 exact-file-path input、language/format mapping、threshold filtering、pair normalization、deterministic ordering、recoverable diagnostics 和 fatal failure mapping。
- [ ] 6.3 增加 fixture-backed CLI contract tests，证明 supported duplicate code 会出现 duplicate warnings，unsupported 或 excluded inputs 不会出现。
- [ ] 6.4 证明 `.mts`、`.cts`、`.pyx`、`.pxd`、`.pxi`、JS/JSX/TSX、Markdown、Vue、Svelte、Astro 等 jscpd 认识但 Vibe Check 第一版不支持的输入不会进入 duplicate scanner input。
- [ ] 6.5 更新 `docs/testing/cases.md` 和 `@case` markers，记录 duplicate scanner proof targets。
- [ ] 6.6 如新增或修改 representative warning examples，同步验证 JSON schema 和 examples。

## 7. 文档和验证

- [ ] 7.1 更新 `docs/scanner-dependencies.md`，记录 `cpd-finder = "0.1.8"`、MSRV `1.87`、adapter boundary 和 source-audit constraints。
- [ ] 7.2 更新 `docs/quality-metrics.md`，记录 duplicate warning rule、severity、blocking policy、diagnostics behavior 和 verification expectations。
- [ ] 7.3 只有 owner routing 变化时才更新 `docs/navigation.md`。
- [ ] 7.4 运行 `cargo fmt --all --check`。
- [ ] 7.5 运行 `cargo clippy --all-targets --all-features -- -D warnings`。
- [ ] 7.6 运行 `cargo test --all`。
- [ ] 7.7 如果 docs、schema、examples、OpenSpec 或 whitespace validation materials 有变更，运行 `bun run validate`。
- [ ] 7.8 检查 local diff，确认只修改目标范围。
