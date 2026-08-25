# Tasks

任务按“先收敛可公开契约与 parser 证据，再实现 private boundary/default Check，最后闭合 package 与 Gate 证据”的顺序推进；checkbox 只在对应产物和验证实际完成后勾选。

## Readiness

- [x] 0.1 已对照当前 Configuration、Scan Scope、Quality/Output 与源码重建 ordinary Check、options、Record 和 exact-input seam。
- [x] 0.2 已将首版范围缩小为严格 UTF-8/grammar/duplicate-key 与安全 counts/Records，删除旧 shared policy、comparison/reference、cache 和 Record catalog 假设。
- [ ] 0.3 运行 `bun run test-evidence -- check --root .` 起点检查，并用 focused spike 审计 parser candidate 的 strict errors、decoded duplicate-key、offset、Bun compatibility、license 与 installed-runtime 条件；若没有候选满足边界，记录最小自有 parser 的理由和审计结果。
- [ ] 0.4 在新增实现测试前收敛 `maximumBytes` grammar/default、`.json` eligibility literal、issue cardinality/cap/truncation、final/Record data field schema、JSON Pointer/位置表示；将选择及其测试义务写回 proposal/design，不建立 Product-wide Record catalog 或 policy layer。

## Implementation

- [ ] 1.1 先新增 strict bytes/UTF-8/BOM/grammar/full-consumption/decoded-duplicate fixtures 与 boundary tests，并覆盖 limit、issue-cap、pointer/position 和 deterministic ordering 的已确认契约。
- [ ] 1.2 实现 package-private strict JSON document boundary：bounded read、fatal UTF-8、grammar/full-consumption、duplicate-key normalization 与受控 protocol-failure mapping；不泄漏 raw source、parser types 或 native messages。
- [ ] 1.3 新增 `jsonValidation` value、`JsonValidationOptions`、完整 runtime option validation、global-scope exact-input filtering、safe Check-local Records、normal-completion final counts 与四态 settlement。
- [ ] 1.4 同步 public exports/contract、Configuration/Scan Scope/Quality/Output owner docs、README/JSDoc/examples、package dependency/license、semantic Cases 与 isolated consumer；让 JSON Schema Change 只通过 private helper 复用 document semantics。

## Verification

- [ ] 2.1 运行 strict bytes/grammar/duplicate/scope/limit/cap/failure/default-option 最窄 tests，并运行 `bun run test-evidence -- check --root .`；确认新增或变更 native test/Cases 的闭合证据。
- [ ] 2.2 运行受影响的 product typecheck、lint、tests、public import/package candidate、isolated Bun consumer 与 docs validation；确认 candidate 使用声明的 production parser dependency，而非祖先或 ambient installation。
- [ ] 2.3 运行 `bun run verify:vibe-check-workspace:required` 与 `bun run verify:vibe-check-workspace:full`，并复核 artifacts、logs、errors 与 machine output 不含原始 JSON、parser-native message、absolute/越界 path 或未声明 public surface。
