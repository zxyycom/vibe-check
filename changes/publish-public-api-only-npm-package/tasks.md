# Tasks

任务按“恢复当前事实与输入 → 建立 formal artifact → same-artifact full Gate → 单独授权 publish → registry consumer acceptance”执行；只有直接证据支持时才勾选。

## Readiness

### Current checkpoint

本节记录 2026-08-31 最后一次本地审阅后的恢复点；继续执行前仍须按 design 的恢复顺序核对 current source、artifact 与授权事实。

- Lifecycle 是 `plan`，当前完成 7/17；本地 tooling、manifest/legal contract、receipt grammar、Gate handoff 及其最窄测试已经实现。
- 已通过的 full Gate 只消费 fingerprint local candidate，不是 formal artifact evidence。当前没有冻结 exact patch/tag/mechanism，也没有 formal tarball、release receipt、registry fact 或外部操作授权。
- 本轮 local implementation 与规范审阅结果将形成 Git revision；恢复时先用 current HEAD/status 确认该 revision 仍是 clean source baseline。下一可恢复动作是取得 0.4 的 registry-read 当次授权；任何 registry/authentication/publish/install 操作都必须重新确认范围。

- [x] 0.1 已在 2026-08-31 按 current docs/source/tests、active Decisions 和 `package:status` 恢复 Plan baseline，确认 root workspace 与 `0.0.0-local.*` candidate 均不是正式 publish input，并排除四项 post-release active Changes。
- [x] 0.2 已用 AI-ready consumer contract 重写 proposal/design，明确 owner、单向状态链、authorization checkpoints、same-artifact 证据、失败恢复和可检查 Success Criteria；Plan formation 未授予任何外部操作，后续新增的 local implementation/validation 授权已单独记录且仍不包含 registry 或 credential access。
- [x] 0.3 用户已确认 GitHub username 作为个人项目权利人，own MIT notice 固定为 `Copyright (c) 2026 zxyycom`；current Git remote 确认 canonical repository 为 `zxyycom/vibe-check`，本地 full consumer matrix 在 pinned Bun `1.3.14` 通过，因此 manifest lower bound 取 `>=1.3.14`。Formal tarball 与 registry consumer 仍须在同一版本复验该 lower bound。
- [ ] 0.4 获得 registry-read 的当次授权后，核验 npm CLI/registry、authenticated publisher 对 unscoped `vibe-check` 的 authority、可用且递增的 `0.0.<patch>`、explicit dist-tag/public access 与 direct/staged/Trusted Publishing mechanism；不读取或记录 credential material。
- [ ] 0.5 在 formal artifact build 前重新检查 current HEAD、clean index/worktree、active Decisions、public inventory、dependency/license inputs、README/docs projection 与 Project Gate owner；确认已完成的 local tooling 仍符合当前 Plan、post-release Changes 仍不进入本 release，并记录任何会使 Plan 或 receipt input 失配的新事实。

## Implementation

- [x] 1.1 已在 `scripts/package/release/**` 和根 scripts 实现无网络的 formal release prepare/verify 入口、closed version/tag、clean-source check、portable sanitized receipt、SHA-256/SHA-512 与 local/formal staging/cache 隔离；默认 `package:build`/`package:verify` 行为保留。
- [x] 1.2 已扩展 closed generated manifest、staging/tar/install audits 与 tests，加入 own MIT `LICENSE`、Bun `>=1.3.14`、canonical repository 和 explicit public npm target，并机械拒绝额外 `private`、`bin`、lifecycle script 与 subpath exports。
- [x] 1.3 `scripts/project/gate/run.ts` 已提供只允许 unmodified full selection 的 explicit `--release-receipt` source；receipt preparer 重验相对路径、clean commit、fingerprint、inventory、SHA-256/SHA-512、staging/tar bytes 后安装 exact tarball，且测试证明不会调用 local preparer。
- [ ] 1.4 在 authorized registry preflight 冻结 exact version/tag/mechanism 后，更新 README exact-install 与 `0.0.x`/Bun-only 说明、release-ready notes、`docs/script-tooling.md` 和交付导航；不在 publish 成功前声称 registry 版本已经存在。
- [ ] 1.5 从 clean reviewed commit 仅构建一次 formal tarball，生成 receipt 并复核 manifest、own/third-party legal texts、production dependency closure、public inventory、README/docs/declarations/runtime/source/machine materials 与全部 digests；任何 byte 变化都重建并重新开始验证。
- [ ] 1.6 Same-artifact full Gate 通过且最终 preflight 仍匹配后，取得逐项列明 registry/access/version/tag/absolute tarball/digests/mechanism 的 publish 授权，只执行该授权的 tarball publish；保存脱敏结果，网络/CLI 结果不明确时停止并先请求 exact-version read 授权，绝不盲目重试。

## Verification

- [x] 2.1 Release version/tag、receipt/path/digest、manifest/legal/host、artifact drift、local/formal 隔离、clean Git source、root command 与 Gate explicit-input 的最窄 tests 已通过；Test Evidence 报告 295/295 entities 映射到 85 Cases。Formal success path 仍由 clean reviewed commit 后的 tasks 1.5、2.2、2.3 承接。
- [ ] 2.2 对 receipted formal tarball 运行 package staging/packed audits 与 ancestry-external local consumer types/documentation/runtime acceptance，证明 only-root export、四项首发 Checks、exact dependencies、license/Bun contract 和无 workspace/ancestor fallback。
- [ ] 2.3 运行 `bun run verify:vibe-check-workspace:full`，确认同一 formal tarball 覆盖完整 package/Gate assurance，并逐项处置当次 file/function/Markdown link repository-quality findings；最后一个 byte-affecting 变化后必须重跑。
- [ ] 2.4 运行 `bun run validate -- docs`、`bun run decisions -- check`、`bun run change-plan -- check changes/publish-public-api-only-npm-package` 及受影响的 typecheck/lint/dependency/entry checks，检查局部 diff 与 release receipt/evidence 均无 credential 或临时 consumer identity 泄露。
- [ ] 2.5 Publish 成功后取得新的 registry read/install 授权，核验 exact version/tag/public access、`dist.integrity` 与 receipt SHA-512；若采用 provenance 则验证 source commit/repository。随后在全新 ancestry-external 目录用 Bun exact-install registry version 并通过 types、documentation、runtime acceptance，清理临时目录。
- [ ] 2.6 将 sanitized publish/post-install evidence 写入本 Change，更新 README/交付导航为已发布事实，并仅在 current owners 与验证完整时审阅相关 Decision alignment；逐项复核 Success Criteria，归档仍需单独明确授权。
