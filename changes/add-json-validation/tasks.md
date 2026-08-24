# Tasks

任务先验证 strict parser 选择，再实现 JSON document boundary、default Check、公共同步与首版 candidate 证据。

## Readiness

- [x] 0.1 已对照当前 Configuration、Scan Scope、Quality/Output 与源码重建 ordinary Check、options、Record 和 exact-input seam。
- [x] 0.2 已将首版范围缩小为严格 UTF-8/grammar/duplicate-key与安全 counts/Records，删除旧 shared policy、comparison/reference、cache和 Record catalog 假设。
- [ ] 0.3 运行 Test Evidence 起点检查，并用 focused spike 确认 parser dependency 的 strict errors、duplicate-key、offset、Bun、license 与 installed-runtime条件。

## Implementation

- [ ] 1.1 先新增 strict JSON boundary tests/fixtures，再实现 bounded read、fatal UTF-8、grammar/full-consumption 与 duplicate-key normalized result。
- [ ] 1.2 新增 `jsonValidation` value、`JsonValidationOptions`、完整 runtime option validation、exact-input filtering、safe Records、final counts 与四态结果。
- [ ] 1.3 同步 public exports/contract、Configuration/Scan Scope/Quality/Output、README/JSDoc/examples、package dependency/license 与 isolated consumer。
- [ ] 1.4 新增或更新 current semantic Cases，并保持 JSON Schema Change 只复用 private document boundary。

## Verification

- [ ] 2.1 运行 strict bytes/grammar/duplicate/scope/limit/failure/default-option 最窄 tests 与 `bun run test-evidence -- check --root .`。
- [ ] 2.2 运行 product typecheck、lint、tests、public import/package candidate 与 docs validation。
- [ ] 2.3 运行 required/full Project Gate，复核 artifacts 不含原始 JSON、parser-native message、越界 path 或未声明 public surface。
