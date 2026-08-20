# Tasks

本 Plan 先将已选定的 public-contract direction 写入长期 Decision owner，再按 validation、context、consumer evidence 与文档的依赖顺序实施；所有 checkbox 仅在实际产物和验证存在后勾选。

## Readiness

- [x] 0.1 <code>use-string-flags-for-project-run-controls.md</code> 已审阅，当前为 <code>active + aligned</code>。它固化本 Plan 的 <code>flags</code> field、non-empty token、presence/absence boolean semantics、set canonicalization 与“不扩张为 value payload”的边界；<code>bun run decisions -- check</code> 已通过。
- [x] 0.2 已于 2026-08-20 审计并实施精确 owner/reference：<code>src/product/definition/project.ts</code>、<code>src/product/definition/custom-check.ts</code>、<code>src/product/run/control-validation.ts</code>、<code>src/product/run/project-context.ts</code>、<code>src/product/run/flags.test.ts</code>、<code>src/product/run/check-execution.test.ts</code> 的显式 context fixtures、public-contract/package candidate evidence 与稳定 Configuration/Architecture owner。<code>RunControls.flags</code>、<code>CheckProjectContext.flags</code> 与 callback use 均已存在；package entry 继续导出既有 <code>RunControls</code>，下游 Gate Draft 未定义冲突 grammar。

## Implementation

- [x] 1.1 已在 <code>src/product/definition/project.ts</code> 与 <code>src/product/run/control-validation.ts</code> 加入 optional <code>flags</code>；validation 接受稠密 array（<code>[]</code> 合法且表示 no flags），拒绝 sparse hole，并要求每个 token 为 non-empty string；随后复制、去重、字典序排序并冻结，错误按 <code>controls.flags</code> / <code>invalid-run-controls</code> 返回。
- [x] 1.2 已在 <code>src/product/definition/custom-check.ts</code> 与 <code>src/product/run/project-context.ts</code> 提供 required frozen <code>flags</code> snapshot；所有 Check callback 通过 <code>context.project.flags</code> 读取它，且不保留 caller input reference。
- [x] 1.3 已在 <code>src/product/run/flags.test.ts</code> 增加最小 project-owned Check fixture：它以 local static token 检查 flag，并在 work 前返回 <code>not-applicable</code>；未增加 Product CLI、scheduler selection 或 dependency propagation。
- [x] 1.4 已同步 <code>scripts/package-candidate/isolated-consumer.test.ts</code> 的 consumer evidence，以及实施后成为事实的 Configuration/Architecture owner 文档与 Case evidence；<code>src/product/public-contract/current.ts</code> inventory 未变，因为没有新增 approved named export。

## Verification

- [x] 2.1 已运行 <code>bun test src/product/run/flags.test.ts</code>（3 passed, 0 failed）与 <code>bun run test -- product</code>（131 passed, 0 failed）；它们覆盖 canonicalization、immutability（含 sparse hole）、invalid input pre-callback rejection，以及 Check-local <code>not-applicable</code> 不改变 static graph admission/dependency semantics。
- [x] 2.2 已运行 <code>bun test scripts/package-candidate/isolated-consumer.test.ts</code>（1 passed, 0 failed）和 public-contract evidence；外部 TypeScript consumer 能传入 <code>flags</code> 并在 callback 中读取它，且没有未批准的新 export 或 runtime operation。
- [x] 2.3 测试正文完成后及 artifact 收口后，<code>bun run test-evidence -- check --root .</code> 均通过（160 current test entities、40 Cases）。最终通过 <code>bun run typecheck</code>、<code>bun run lint</code>、<code>bun run decisions -- check</code>、<code>bun run change-plan -- check changes/add-project-run-invocation-controls</code>、<code>bun run validate -- docs</code>、<code>bun run verify:vibe-check-workspace:required</code>（11 passed, 0 warning, 0 failed）与 <code>git diff --check</code>。未运行 full verifier；本 Change 不交付 CLI/gate policy 或 package 发布，归档须在所有任务完成后另获明确授权。<code>bun run test -- product</code> 的 131 tests 全部通过，但曾报告 7 次 <code>git ls-files</code> fallback warning。
