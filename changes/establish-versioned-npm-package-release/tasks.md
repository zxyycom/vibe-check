# Tasks

先冻结上游public materials，再依次建立staging build、最小package interface、exact-tarball acceptance和release governance；只有实际产物与证据完成后才勾选 Implementation 或 Verification。

## Readiness

- [x] 0.1 已核对 proposal、design与tasks共享“同一npm package version交付CLI、public declarations和明确resources，并以exact tarball验收”的目标。
- [x] 0.2 已读取当前root manifest、Product/runtime owners、直接相关活动决策、三个foundation plans和历史release材料，并区分worktree可运行事实与尚未建立的release artifact。
- [x] 0.3 已确认target identity、Bun runtime、staging/private边界、public surface、`0.0.x`规则、candidate acceptance与publish授权出口；external publish facts不阻塞local implementation。

## Implementation

- [ ] 1.1 确认 Check/Record、Task orchestration与Project Definition已同步待发布的public entries/types/resources；建立一个owner-to-package manifest，不从历史或tarball偶然paths推断public surface。
- [ ] 1.2 在保持root `private: true`的前提下实现clean staging build，从权威Product/public sources生成Bun runtime、`vibe-check/project` runtime/helpers、`.d.ts`、owner-declaredresources、legal files和candidate manifest。
- [ ] 1.3 配置最小candidate interface：`vibe-check` name/bin、explicit `./project`和逐项resource exports、files allowlist、minimum tested Bun engine、production dependencies、license/provenance；不导出root embedding API或internal Core。
- [ ] 1.4 建立runtime import/dependency audit，确保installed CLI不读取repository root、`scripts/**`、tests/fixtures或dev-only packages，并为缺失Bun/platform prerequisite提供可行动diagnostic。
- [ ] 1.5 核对owned release history并选择唯一next `0.0.<patch>`；生成包含breaking-risk/precise-pin说明的release notes，不把root旧`0.1.0`或Change完成度解释为稳定承诺。
- [ ] 1.6 实现candidate build/`npm pack --json`/inventory/digest/provenance scripts；所有package lifecycle默认止于pack/verify且不读取registry credentials、不执行publish。
- [ ] 1.7 建立safe temporary consumer acceptance：安装exact tarball，运行installed CLI help/init/neutral/configured scans，typecheck `vibe-check/project` consumer并访问每个explicit public resource。
- [ ] 1.8 更新CLI/Architecture/Testing/navigation和release procedure owners、CI/workspace gate与语义Case catalog，明确public/accidental paths、Bun prerequisite、`0.0.x`兼容语义和future publish授权流程。

## Verification

- [ ] 2.1 重复clean build并比较manifest、runtime/declaration/resource inventory与provenance，证明除明确时间无关材料外candidate可重现且没有hand-edited distribution source。
- [ ] 2.2 检查实际tarball archive和`npm pack --json`，证明只含allowlisted files，无source/test/cache/artifact/secret/credential/undeclared workspace material，且undeclared internal subpaths不可作为supported imports。
- [ ] 2.3 在隔离consumer中运行installed CLI与TypeScript authoring acceptance，确认command、types、runtime validators、built-in identities和resources均来自同一package version。
- [ ] 2.4 运行product/package target tests、typecheck、lint、`bun run test-evidence:check`、`bun run decisions:check`、`bun run validate`与针对本Change的`bun run change-plan -- check changes/establish-versioned-npm-package-release`。
- [ ] 2.5 运行`bun run verify:vibe-check-workspace:full`和candidate dogfood；审计scripts没有publish side effect，并记录“pack/verify通过、未执行registry publish”的准确交付边界。
