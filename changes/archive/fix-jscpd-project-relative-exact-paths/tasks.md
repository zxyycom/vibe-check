# Tasks

任务按已完成的失败机制审计、adapter/cache 修改、真实 public handoff 回归和发布级验证执行；每项未勾选任务都有明确实现出口。

## Readiness

- [x] 0.1 已在当前 Plan 基线的隔离项目完成复现：绝对 paths 直调 jscpd adapter 得到一个 measurement；同一文件经 public Check 的 project-relative handoff 得到零 Finding 与 `passed` aggregate。
- [x] 0.2 已审计 `project-files` relative identity、jscpd 临时-config invocation、report normalization/exact-scope reconciliation、duplicate raw-cache identity、adapter protocol decision 与现有 test-evidence Case；确认 conversion 只应发生在 adapter，且只须提升 `RAW_SCAN_CONFIGURATION_VERSION`。
- [x] 0.3 已审计实施决策完整性与 installed external-consumer runtime owner：无需新增 public option、config-location policy、consumer wrapper 或长期 decision；Plan 形成时 fixture 已写两份重复 source、runtime acceptance 错误断言零 Finding，`parserEvidence.duplicate` 是独立零值 parser-contract，因此 implementation 和 verification 已覆盖 adapter、cache、测试正文/Case、发布物 Record evidence 与 parserEvidence 边界。

## Implementation

- [x] 1.1 在 `jscpd/scanner.ts` 将 invocation `cwd` 传入 config preparation，并以 `resolve(cwd, path)` 写入每个 approved exact path；保留 temp cleanup、process `cwd`、`absolute: true` report、normalization、reconciliation 与 failure mapping。
- [x] 1.2 在 `cache/identity.ts` 递增 `RAW_SCAN_CONFIGURATION_VERSION`，不改 cache directory、payload schema 或其它 identity fields；更新 cache assertions，以旧 version key miss 和新 version entry hit 证明局部 invalidation。
- [x] 1.3 更新 `jscpd/scanner.test.ts` 的 real-jscpd regression，使其以 relative `a.ts`/`b.ts` 输入并证明一个 measurement 与 relative normalized locations；更新 fake config inspection 断言为 `resolve(root, path)`，并在 `jscpd/parser.test.ts` 覆盖只剥离 report `format` 对应的 `:format` suffix。
- [x] 1.4 在 `default-check.test.ts` 增加或改造 public real-jscpd regression：project-relative inputs、blocking policy、trusted duplicate Record、failed Check 和 failed explicit `all` aggregate 必须在同一次测试路径中断言。每次测试正文或 entity 变动都按 `test-evidence-review` 重审 `check-owned-scanners` 的 Case owner、membership、Proves 与证明信号；按语义更新但不创建重复 Case。
- [x] 1.5 更新 `scripts/package/candidate/external-consumer/runtime.ts`、`fixtures/runtime.mjs` 与 `runtime-evidence.ts`：保留两份重复 fixture files，投影 installed candidate 的 `duplicate-detection` Record evidence，并断言 non-blocking `passed`、`{ blockingFindingCount: 0, findingCount: 1 }` 与恰好一个 trusted non-blocking Record，且 locations 为两份 fixture files。保留 `parserEvidence.duplicate` 的独立零值 parser-contract；除非其输入契约改变，不修改它。

## Verification

- [x] 2.1 在任何测试正文、entity 或 Case 修改前后运行 `bun run test-evidence -- check --root .`；运行 jscpd adapter、duplicate default Check、cache store 和 external-consumer runtime 的最窄测试，覆盖 relative handoff、failure projections、cache miss/hit、exact-scope rejection，以及 candidate 的 one trusted non-blocking duplicate Record，且 locations 为两份 fixture files。
- [x] 2.2 运行 `bun run format`、`bun run typecheck`、`bun run lint`、`bun run validate -- docs` 与 `bun run verify:vibe-check-workspace:required`，证明局部工程、文档和 required workspace Gate 一致。
- [x] 2.3 仅通过公开入口 `bun run package:verify` 完成最终验证；确认它闭合 full candidate、installed external-consumer runtime acceptance 与 full Project Gate，并证明 installed package 而非源码树输出 `duplicateOutcome: "passed"`、精确 one-finding final data 和一个 trusted Record，且 locations 为两份 fixture files，且独立 `parserEvidence.duplicate` 仍通过。
