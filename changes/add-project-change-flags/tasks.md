# Tasks

任务先固定并审计可实施契约，再按 Definition、Run、Gate 与交付材料顺序实现，最终以产品、项目和完整 Gate 证据退出。

## Readiness

- [x] 0.1 审计 proposal、design 与长期 Decision 的重心、负向描述、迁移残留、篇幅和 Markdown 结构；删除临时推荐/退出说明，并确认没有产品级开放问题。
- [x] 0.2 固定 V1 的 Git comparison、`vibe-check:change:` namespace、file-centric Result context、raw DSL child multiplicity 和首个 `tests-product-runtime` consumer 的保守 `src/**` region。
- [x] 0.3 核对 Project Definition、Project Run、Check lifecycle、project files、Project Gate、public materials 与 Semantic Case owners，并将全部影响映射到 Implementation 和 Verification。

## Implementation

- [ ] 1.1 在 Project Definition owner 实现 `changes` 与 recursive flag DSL 的 public types、closed validation、normalization、freeze、declarative snapshot 和 fingerprint。
- [ ] 1.2 实现一次 Git changed-path preparation、region matching、reserved flag derivation、file-centric `ProjectChanges` result 与 unavailable safety fallback。
- [ ] 1.3 将 caller/derived flags 接入现有 effective selection，并向 `prepare` 与 `execute` 投影同一 Project changes context，保持 dependency、progress 和 aggregation owner 不变。
- [ ] 1.4 将 `tests-product-runtime` 接入保守覆盖 `src/**` 的 `product-runtime` region 与 combined DSL，保留 `--test`、`--all` 和 unavailable force paths。
- [ ] 1.5 同步 root exports/JSDoc、公开与内部 owner docs、API examples、changelog、package materials 和 installed-consumer acceptance。
- [ ] 1.6 按行为 owner 新增或修改产品与 Gate tests，并同步 Semantic Case ledger。

## Verification

- [ ] 2.1 运行 Definition、Controls、flag selection、raw DSL duplicate semantics、callback preparation/context 与 Project Gate 的最窄目标测试。
- [ ] 2.2 运行 `bun run test-evidence -- check --root .`，确认新增或修改测试与 Case owners 闭合。
- [ ] 2.3 以 lane resolver 反查 `product-runtime` region completeness，并用相同 build/profile 的 unchanged、runtime-changed、source-unavailable、`--test` 和 `--all` workloads 记录 selected lanes、change preparation 与 outer wall time。
- [ ] 2.4 运行产品与脚本 typecheck、lint、dependency/entry checks，以及 `bun run validate -- docs`。
- [ ] 2.5 运行 `bun run check`，复核 Success Criteria、长期 Decision alignment 与最终 diff。
