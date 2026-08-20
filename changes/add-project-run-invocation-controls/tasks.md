# Tasks

本 Plan 先将已选定的 public-contract direction 写入长期 Decision owner，再按 validation、context、consumer evidence 与文档的依赖顺序实施；所有 checkbox 仅在实际产物和验证存在后勾选。

## Readiness

- [ ] 0.1 创建、审阅并建立 <code>use-string-flags-for-project-run-controls.md</code> 为 <code>active + unaligned</code> Decision；它记录本 Plan 已选择的 <code>flags</code> field、non-empty token、presence/absence boolean semantics、set canonicalization 与“不扩张为 value payload”的边界，并通过 <code>bun run decisions -- check</code>。
- [x] 0.2 已于 2026-08-20 审计精确 owner/reference：<code>src/product/definition/project.ts</code>、<code>src/product/definition/custom-check.ts</code>、<code>src/product/run/control-validation.ts</code>、<code>src/product/run/project-context.ts</code>、<code>src/product/run/index.test.ts</code>、public-contract/package candidate evidence 与稳定 Configuration/Architecture owner。当前不存在 <code>RunControls.flags</code>、<code>CheckProjectContext.flags</code> 或 callback use；package entry 已导出 <code>RunControls</code>，consumer 只需补行为证据；下游 Gate Draft 未定义冲突 grammar。

## Implementation

- [ ] 1.1 在 Product public types 和 closed control validation 中加入 optional <code>flags</code>；实现 non-empty string array 校验、copy、dedupe、canonical ordering、freeze 与 <code>controls.flags</code> failure path。
- [ ] 1.2 在一次性 project-context construction 中加入 required frozen <code>flags</code> snapshot，使所有 Check callback 都通过 <code>context.project.flags</code> 读取它，且不保留 caller input reference。
- [ ] 1.3 在 <code>src/product/run/index.test.ts</code> 增加最小 project-owned Check fixture：它根据 local static rule 检查 flag，并在 work 前返回 <code>not-applicable</code>；不得增加 Product CLI、scheduler selection 或 dependency propagation。
- [ ] 1.4 同步 <code>scripts/package-candidate/isolated-consumer.test.ts</code> 的 consumer evidence，以及实施后才成为事实的 Configuration/Architecture owner 文档；只有实际新增已批准的 named export 时才修改 <code>src/product/public-contract/current.ts</code> inventory。

## Verification

- [ ] 2.1 运行并扩展最窄 Product tests，覆盖 flag canonicalization、immutability、invalid input pre-callback rejection，以及 Check-local <code>not-applicable</code> 不改变 static graph semantics。
- [ ] 2.2 运行 exact-package/public-contract consumer evidence，证明外部 TypeScript consumer 能传入 <code>flags</code> 并在 callback 中读取它；确认没有未批准的新 export 或 runtime operation。
- [ ] 2.3 在测试正文变更前后运行 <code>bun run test-evidence -- check --root .</code>，并运行 <code>bun run change-plan -- check changes/add-project-run-invocation-controls</code>、<code>bun run validate -- docs</code> 与 <code>bun run verify:vibe-check-workspace:required</code>；记录实际结果和未覆盖边界。
