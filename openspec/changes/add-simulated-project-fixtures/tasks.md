本 tasks 清单把 `add-simulated-project-fixtures` 拆成可审计、可验证的实现步骤；目标是把 Vibe Check 首批产品支持范围收敛到 `.ts`、`.go`、`.rs` 和 `.py`，并用模拟项目 fixture 证明这些输入的 scan 行为。

当前 change 只在 `openspec/changes/add-simulated-project-fixtures/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## 1. 实现前审计门禁

- [ ] 1.1 阻塞级审计 proposal、design、`scan-scope` delta spec、`quality-metrics` delta spec、`output-contract` delta spec、`test-fixtures` delta spec 和 tasks 是否都围绕“首批产品支持 `.ts`、`.go`、`.rs`、`.py` 并用模拟项目验证”展开；审计未完成前不得执行任何实现任务。
- [ ] 1.2 审计 capability ID 是否正确：产品契约收窄只能修改 `scan-scope`、`quality-metrics` 和 `output-contract`，测试资产只能新增 `test-fixtures`，不得把 change name 当作长期 capability。
- [ ] 1.3 审计当前 change 是否仍只是待审计临时计划；除本 change artifacts 外，尚未修改主 spec、docs、schema、examples 或应用代码。
- [ ] 1.4 审计 `design.md` 的 Decisions 与 spec delta 是否一致，特别是首批四个扩展名、`.tsx`/`.js`/`.jsx` unsupported 处理、schema language enum、fixture 位置、scope 边界、expected invariants 和 threshold stress file 生成策略。
- [ ] 1.5 审计 `## Open Questions` 是否没有未回答问题或已收敛歧义；首批产品支持和首批 fixture 均不得加入 JavaScript、JSX、TSX 或其它非 `.ts`、`.go`、`.rs`、`.py` supported inputs。
- [ ] 1.6 审计验证路径是否覆盖 owner docs、OpenSpec specs、JSON schema/examples、Rust implementation、fixture 文件、CLI contract tests、case 账本、OpenSpec strict validation、Rust tests 和 workspace required profile。

## 2. 产品支持范围收敛

- [ ] 2.1 更新 `docs/scan-scope.md`，把当前 supported file classification 收敛为 `.rs`、`.ts`、`.py` 和 `.go`，并说明 `.tsx`、`.js`、`.jsx` 在首批属于 unsupported ordinary files。
- [ ] 2.2 更新 `docs/quality-metrics.md`，把 MVP language identifiers 收敛为 `rust`、`typescript`、`python` 和 `go`，并移除首批 JavaScript LOC fixture 要求。
- [ ] 2.3 更新 `docs/schemas/vibe-check-report.schema.json`，移除 `metrics.languages[].language` enum 中的 `javascript`。
- [ ] 2.4 更新 `docs/examples/json/*.json`，确保示例不再包含 `javascript` language summary。
- [ ] 2.5 更新 Rust scan scope implementation，使 `SUPPORTED_EXTENSIONS` 只包含 `rs`、`ts`、`py` 和 `go`。
- [ ] 2.6 更新 Rust metrics language normalization，移除首批 `JavaScript` language id 和 `.tsx`、`.js`、`.jsx` 映射。
- [ ] 2.7 更新现有 unit / CLI contract tests 和 `docs/testing/cases.md`，让 supported extension、language summary 和 schema 示例证明目标与首批支持范围一致。

## 3. Fixture 目录与项目结构

- [ ] 3.1 创建 `crates/vibe-check/tests/fixtures/projects/` 目录，并为每个 fixture 使用稳定 kebab-case id。
- [ ] 3.2 新增 `typescript-app` fixture，只包含 `.ts` supported source 文件；可加入 `.tsx`、`.js` 或 `.jsx` 作为 unsupported 输入，但不得把它们计入 expected supported files。
- [ ] 3.3 新增 `go-service` fixture，包含至少两个 `.go` 文件，用于覆盖 Go source collection 和 language summary。
- [ ] 3.4 新增 `rust-crate` fixture，包含 `.rs` 源文件和应被默认排除的 `target` 输入。
- [ ] 3.5 新增 `python-package` fixture，包含 `.py` 源文件、普通 unsupported 文件和应被默认排除的 `.venv` 输入。
- [ ] 3.6 新增 `mixed-scope-boundaries` fixture，覆盖 `.gitignore`、generated/vendor/cache 边界、unsupported Markdown 和四种首批 supported language 汇总。
- [ ] 3.7 确认 fixture project 不需要 npm、go、cargo、pip 或网络依赖即可被 `vibe-check scan` 读取。

## 4. Expected Invariants 与 Test Helper

- [ ] 4.1 为 fixture suite 建立集中 expected invariant 定义，记录 scope counts、supported counts、measured languages、warning count、gate status 和 diagnostic status。
- [ ] 4.2 实现 fixture copy helper，把 checked-in fixture 复制到测试临时目录后再运行真实 `vibe-check` binary。
- [ ] 4.3 实现 threshold stress helper，在临时 fixture copy 中生成 deterministic long source file，用于覆盖 `file.too_many_lines` high blocking 分支。
- [ ] 4.4 确认 helper 不修改 checked-in fixture source，不把生成的 long file 写回仓库。
- [ ] 4.5 让 JSON report 验证复用 owner schema，并只断言稳定 invariant，不引入完整 JSON snapshot。

## 5. CLI Contract Tests

- [ ] 5.1 增加 fixture-backed CLI contract test，覆盖 `.ts`、`.go`、`.rs` 和 `.py` fixture 的 scan success、schema validation 和 measured language set。
- [ ] 5.2 增加 mixed scope fixture test，覆盖 `.gitignore`、默认排除目录、unsupported ordinary files、unsupported `.tsx`/`.js`/`.jsx` 示例和 supported file counts。
- [ ] 5.3 增加 threshold stress test，覆盖 blocking `file.too_many_lines` warning、failed gate、exit code `1` 和 stdout/stderr 边界。
- [ ] 5.4 保留当前更适合临时构造的 path/error tests，避免为了复用 fixture 引入不必要间接层。
- [ ] 5.5 确认 fixture-backed tests 的证明目标能追溯到 `docs/scan-scope.md`、`docs/quality-metrics.md`、`docs/output.md` 或 `docs/cli.md`。

## 6. 测试资料与文档同步

- [ ] 6.1 按 `docs/testing/case-maintenance.md` 审计新增或调整的测试函数是否需要新增 case 条目或更新 `@case` 标记。
- [ ] 6.2 更新 `docs/testing/cases.md`，记录首批支持范围收敛、fixture-backed CLI contract tests 的证明目标和 fixture 责任。
- [ ] 6.3 如 fixture 目录成为长期测试入口，更新 `docs/testing.md` 的 fixture 维护说明，保持测试文档不重新定义产品语义。
- [ ] 6.4 用局部 diff 确认文档更新只覆盖 owner docs、测试资料和 fixture 维护范围。

## 7. 验证

- [ ] 7.1 运行 `cargo fmt --all --check`。
- [ ] 7.2 运行 `cargo test --all`，确认支持范围收敛和 fixture-backed CLI contract tests 通过。
- [ ] 7.3 运行 `openspec validate add-simulated-project-fixtures --type change --strict --no-interactive`。
- [ ] 7.4 运行 `bun run validate`，确认 docs、OpenSpec、schema examples 和 whitespace 校验通过。
- [ ] 7.5 运行 `bun run verify:vibe-check-workspace:required`，确认 required profile 没有因 fixture suite 增加不稳定或过慢检查。
- [ ] 7.6 用 `git diff --stat` 和关键 diff 确认实现只改首批支持范围、fixture、测试、测试资料和本 change 需要的 OpenSpec artifact。
