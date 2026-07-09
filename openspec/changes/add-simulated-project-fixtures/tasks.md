# Tasks: add-simulated-project-fixtures

本任务清单用于实现 `add-simulated-project-fixtures`：先把首批产品支持范围收敛到 TypeScript `.ts`、Go `.go`、Rust `.rs` 和 Python `.py`，再用 checked-in 手写 fixture projects 作为测试环境，证明 scan scope、metrics、warning、gate 和 JSON schema 契约。

## 1. Change Audit Gates

- [x] 1.1 审核 proposal、design、delta specs 和 tasks 的主承诺是否一致：首批产品支持只包含 `.ts`、`.go`、`.rs`、`.py`，fixture environment 用于验证该支持集。
- [x] 1.2 审核 capability owner 是否清晰：产品语义属于 `scan-scope`、`quality-metrics`、`output-contract` 和 CLI owner，测试环境与测试资产属于 `test-fixtures`。
- [x] 1.3 审核已发现的不一致是否在 change 中显式说明：docs、scanner dependency 文档、OpenSpec 主 spec、schema/examples、Rust 实现和 tests 当前仍包含 `.tsx`、`.js`、`.jsx` / `javascript` 首批支持声明。
- [x] 1.4 审核 fixture 规则是否避免重新定义产品语义，只记录 fixture environment、owner-defined proof targets 和文件分类集合。
- [x] 1.5 审核 fixture project 语义是否收敛：project 是测试环境，文件、函数或测试断言承接具体测试用例。
- [x] 1.6 审核 output 边界是否收敛：本 change 只同步 JSON schema/examples 的当前语言枚举，不调整 human/readable rendering contract。
- [x] 1.7 审核 open questions 是否收敛；实现前不需要再确认 JavaScript、JSX 或 TSX 是否进入首批支持。
- [x] 1.8 审核验证路径是否覆盖 OpenSpec strict、Rust tests、docs/schema/examples validation 和 required workspace profile。

## 2. Product Support Scope Convergence

- [ ] 2.1 更新 `docs/scan-scope.md`，把 supported file classification 收敛为最终扩展名 `.ts`、`.go`、`.rs` 和 `.py`，说明 `.d.ts` 按 `.ts` supported input 处理，且 `.tsx`、`.js`、`.jsx` 是 unsupported ordinary files。
- [ ] 2.2 更新 `docs/quality-metrics.md`，把 MVP language identifiers 收敛为 `go`、`python`、`rust` 和 `typescript`，并移除 JavaScript LOC fixture 要求。
- [ ] 2.3 更新 `docs/scanner-dependencies.md`，把当前首批产品支持与后续 JavaScript / JSX / TSX 依赖覆盖目标区分开，避免把 JavaScript 写成首批支持或首批 fixture 必需覆盖。
- [ ] 2.4 更新 `docs/schemas/vibe-check-report.schema.json`，从 `metrics.languages[].language` enum 移除 `javascript`。
- [ ] 2.5 更新 `docs/examples/json/*.json`，确保示例不再包含 `javascript` language summary。
- [ ] 2.6 更新 Rust scan scope implementation，使 supported extensions 只包含 `ts`、`go`、`rs` 和 `py`。
- [ ] 2.7 更新 Rust metrics language normalization，移除首批 `JavaScript` language id 以及 `.tsx`、`.js`、`.jsx` 映射。
- [ ] 2.8 更新现有 unit tests、CLI contract tests 和 `docs/testing/cases.md`，使 supported extension、language summary 和 schema 示例证明目标与首批支持范围一致。
- [ ] 2.9 用关键词搜索确认 `javascript`、`.js`、`.jsx`、`.tsx` 的剩余引用只出现在后续支持说明或 unsupported ordinary-file 边界场景中。

## 3. Fixture Project Assets

- [ ] 3.1 创建 `crates/vibe-check/tests/fixtures/projects/`，并为每个 fixture 使用稳定 kebab-case id。
- [ ] 3.2 新增 `typescript-app` fixture environment，只包含 TypeScript supported source；必须包含 `.d.ts` 证明纯扩展名规则，但不得加入 `.tsx`、`.js` 或 `.jsx`。
- [ ] 3.3 新增 `go-service` fixture，包含至少两个 `.go` files，用于覆盖 Go source collection 和 language summary。
- [ ] 3.4 新增 `rust-crate` fixture environment，包含 `.rs` source 和应被默认排除的 `target` 输入。
- [ ] 3.5 新增 `python-package` fixture，包含 `.py` source、普通 unsupported non-code file 和应被默认排除的 `.venv` 输入。
- [ ] 3.6 新增 `mixed-scope-boundaries` fixture，作为唯一主动混合代码的 fixture，覆盖 `.gitignore`、generated/vendor/cache、unsupported Markdown、unsupported `.tsx`/`.js`/`.jsx` 和四种首批 supported language 汇总。
- [ ] 3.7 为 blocking `file.too_many_lines` gate 行为新增手写并提交的 supported source file；该文件可以放在合适 fixture environment 中，也可以使用专门 threshold fixture environment，不得由测试代码或运行时逻辑生成。
- [ ] 3.8 确认 fixture project 不需要 npm、go、cargo、pip 或网络依赖即可被 `vibe-check scan` 读取。
- [ ] 3.9 确认所有 fixture source、配置和 ignore 文件都是手写并入库的测试输入；不得存在 build script、测试代码或运行时生成/复制测试源码的路径。

## 4. Fixture Proof Targets And Scan Execution

- [ ] 4.1 按 `docs/testing.md`、`docs/testing/case-maintenance.md` 和 `docs/testing/cases.md` 的现有规则记录 fixture environment、文件/函数级测试用例、证明目标和文件分类集合；不要把测试代码或 fixture metadata 作为长期测试语义 owner。
- [ ] 4.2 让 fixture-backed tests 直接以 checked-in fixture project path 作为 `vibe-check scan` 的 project root，不创建 fixture 副本。
- [ ] 4.3 确认测试代码只允许运行 CLI、读取 stdout/stderr 和解析 report，不允许创建、复制、拼接、追加、改写或生成任何 source/config/ignore fixture 文件。
- [ ] 4.4 确认 threshold test 直接使用 checked-in 手写长文件，不存在生成 long file 的测试分支。
- [ ] 4.5 让 JSON report 验证复用 owner schema，并只断言格式、language presence/absence、文件分类可观察结果和 gate 状态；不引入完整 JSON snapshot、LOC totals snapshot、手写 scope count snapshot 或 human/readable rendering 文案断言。

## 5. CLI Contract Tests

- [ ] 5.1 增加 fixture-backed CLI contract test，覆盖 `.ts`、`.go`、`.rs` 和 `.py` fixture 的 scan success、schema validation 和 measured language identifiers。
- [ ] 5.2 增加 mixed scope fixture test，覆盖 `.gitignore`、默认排除目录、unsupported ordinary files、unsupported `.tsx`/`.js`/`.jsx` 示例和 supported language classification。
- [ ] 5.3 增加 threshold stress test，覆盖 blocking `file.too_many_lines` warning、failed gate、exit code `1` 和 stdout/stderr 边界。
- [ ] 5.4 保留更适合直接构造输入的 path/error tests，避免为了复用 fixture 引入不必要间接层。
- [ ] 5.5 确认 fixture-backed tests 的证明目标能追溯到 `docs/scan-scope.md`、`docs/quality-metrics.md`、JSON schema/examples 或 `docs/cli.md`；human/readable rendering 不作为本 change 的证明目标。

## 6. Test Documentation Sync

- [ ] 6.1 按 `docs/testing/case-maintenance.md` 审计新增或调整的测试函数是否需要新增 case 条目或更新 `@case` 标记。
- [ ] 6.2 更新 `docs/testing/cases.md`，记录首批支持范围收敛、fixture-backed CLI contract tests 的证明目标、fixture environment 责任和文件/函数级测试用例归属。
- [ ] 6.3 如 fixture 目录成为长期测试入口，更新 `docs/testing.md` 的 fixture 维护说明，并保持测试文档不重新定义产品语义。
- [ ] 6.4 用局部 diff 确认文档更新只覆盖 owner docs、测试资料和 fixture 维护范围。

## 7. Validation

- [ ] 7.1 运行 `openspec validate add-simulated-project-fixtures --type change --strict --no-interactive`。
- [ ] 7.2 运行 `cargo fmt --all --check`。
- [ ] 7.3 运行 `cargo test --all`。
- [ ] 7.4 运行 `bun run validate`。
- [ ] 7.5 运行 `bun run verify:vibe-check-workspace:required`。
- [ ] 7.6 用 `git diff --stat` 和关键 diff 确认实现只改首批支持范围、fixture、测试、测试资料和本 change 需要的 OpenSpec artifact。
